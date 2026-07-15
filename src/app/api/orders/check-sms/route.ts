import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { orderId } = body;

    if (!orderId) return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });

    // 1. Fetch order details from Supabase
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.status !== 'processing') {
       return NextResponse.json({ status: order.status, details: order.details });
    }

    const providerOrderId = order.details?.provider_order_id;
    if (!providerOrderId) return NextResponse.json({ error: 'Provider order ID not found' }, { status: 400 });

    const apiKey = process.env.FIVESIM_API_KEY;
    if (!apiKey) throw new Error("FIVESIM_API_KEY is missing");

    // 2. Poll 5sim API
    const simRes = await fetch(`https://5sim.net/v1/user/check/${providerOrderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
      cache: 'no-store'
    });

    if (!simRes.ok) {
      return NextResponse.json({ error: 'Failed to poll provider' }, { status: 502 });
    }

    const simData = await simRes.json();
    
    // Log for debugging
    console.log(`[5sim Check] Order: ${orderId}, Provider ID: ${providerOrderId}, Status: ${simData.status}, SMS Count: ${simData.sms ? simData.sms.length : 0}`);

    // simData returns: { id, phone, status, sms: [{ code: "123456", text: "..." }] }
    
    // Check for auto-cancel (>= 12 minutes elapsed without SMS)
    const now = new Date();
    const createdAt = new Date(order.created_at);
    const elapsedMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (elapsedMinutes >= 12 && (!simData.sms || simData.sms.length === 0) && simData.status !== 'CANCELED' && simData.status !== 'TIMEOUT') {
      // Cancel on 5sim to refund our API account
      await fetch(`https://5sim.net/v1/user/cancel/${providerOrderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        }
      });
      
      // Update local order status to cancelled, do NOT refund user balance
      await supabaseAdmin
        .from('orders')
        .update({ status: 'cancelled', details: { ...order.details, error: 'Order timed out automatically' } })
        .eq('id', order.id);

      return NextResponse.json({ status: 'cancelled', message: 'Order timed out automatically.' });
    }

    // 3. Handle 5sim response
    if (simData.status === 'CANCELED') {
      // Refund the user if cancelled by 5sim (e.g. number banned)
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();
        
      if (profile) {
        await supabaseAdmin
          .from('profiles')
          .update({ wallet_balance: Number(profile.wallet_balance) + Number(order.cost) })
          .eq('id', user.id);
      }

      await supabaseAdmin
        .from('orders')
        .update({ status: 'cancelled', details: { ...order.details, error: `Order ${simData.status.toLowerCase()}` } })
        .eq('id', order.id);

      return NextResponse.json({ status: 'cancelled', message: `Order was ${simData.status.toLowerCase()}. You have been refunded.` });
    }

    if (simData.status === 'TIMEOUT') {
      // Natural timeout on 5sim - DO NOT refund the user
      await supabaseAdmin
        .from('orders')
        .update({ status: 'cancelled', details: { ...order.details, error: `Order ${simData.status.toLowerCase()}` } })
        .eq('id', order.id);

      return NextResponse.json({ status: 'cancelled', message: `Order was ${simData.status.toLowerCase()}.` });
    }

    // Check if SMS arrived
    if (simData.sms && simData.sms.length > 0) {
      const smsCode = simData.sms[0].code; // Extract the verification code
      const fullSmsText = simData.sms[0].text;
      
      const updatedDetails = { ...order.details, sms_code: smsCode, sms_text: fullSmsText };
      
      // Mark as completed
      await supabaseAdmin
        .from('orders')
        .update({ status: 'completed', details: updatedDetails })
        .eq('id', order.id);

      // Finish order on 5sim to free the number
      await fetch(`https://5sim.net/v1/user/finish/${providerOrderId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
      });

      return NextResponse.json({ status: 'completed', sms_code: smsCode, details: updatedDetails });
    }

    // Still waiting for SMS
    return NextResponse.json({ status: 'processing', message: 'Waiting for SMS...' });

  } catch (err: any) {
    console.error('Check SMS error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
