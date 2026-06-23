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

    // 1. Fetch order details
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.status !== 'processing') {
       return NextResponse.json({ error: 'Only processing orders can be cancelled' }, { status: 400 });
    }

    const providerOrderId = order.details?.provider_order_id;
    if (!providerOrderId) return NextResponse.json({ error: 'Provider order ID not found' }, { status: 400 });

    const apiKey = process.env.FIVESIM_API_KEY;
    if (!apiKey) throw new Error("FIVESIM_API_KEY is missing");

    // 2. Call 5sim to cancel
    const simRes = await fetch(`https://5sim.net/v1/user/cancel/${providerOrderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      }
    });

    if (!simRes.ok) {
      return NextResponse.json({ error: 'Failed to cancel on provider' }, { status: 502 });
    }

    const simData = await simRes.json();
    
    // simData returns: { status: "CANCELED" }
    if (simData.status === 'CANCELED') {
      // Refund the user
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
        .update({ status: 'cancelled', details: { ...order.details, error: 'Cancelled by user' } })
        .eq('id', order.id);

      return NextResponse.json({ status: 'cancelled', message: 'Order cancelled and refunded.' });
    }

    return NextResponse.json({ error: 'Provider refused to cancel the number.' }, { status: 400 });

  } catch (err: any) {
    console.error('Cancel order error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
