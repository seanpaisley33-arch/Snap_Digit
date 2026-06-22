import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
      }
    });

    if (!simRes.ok) {
      return NextResponse.json({ error: 'Failed to poll provider' }, { status: 502 });
    }

    const simData = await simRes.json();
    
    // simData returns: { id, phone, status, sms: [{ code: "123456", text: "..." }] }
    
    // 3. Handle 5sim response
    if (simData.status === 'CANCELED' || simData.status === 'TIMEOUT') {
      // Refund the user!
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
