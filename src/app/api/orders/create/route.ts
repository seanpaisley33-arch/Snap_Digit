import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase Service Client (bypasses RLS to reliably update wallets)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // Note: In a real app, you still need to know *who* is making this request.
    // For this Serverless Route, we can expect the user to send their JWT in Authorization header
    // Or we rely on the @supabase/ssr server client. Since we need an admin client for wallet deduction,
    // we'll extract the user from the incoming token.

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user identity
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { service_type, cost, details } = body;

    if (!['number', 'boost', 'account'].includes(service_type) || isNaN(cost) || cost <= 0) {
      return NextResponse.json({ error: 'Invalid order parameters' }, { status: 400 });
    }

    // 1. Verify wallet balance
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (Number(profile.wallet_balance) < cost) {
      return NextResponse.json({ error: 'Insufficient wallet balance. Please fund your wallet.' }, { status: 400 });
    }

    // 2. Deduct Cost
    const newBalance = Number(profile.wallet_balance) - cost;
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to deduct balance' }, { status: 500 });
    }

    // 3. Write entry to orders table
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: user.id,
        service_type: service_type,
        cost: cost,
        details: details || {},
        status: 'processing'
      })
      .select()
      .single();

    if (orderError || !order) {
      // Critical error: We deducted money but failed to save the order!
      // In production, use Postgres transactions (RPC) to prevent this split-brain scenario.
      return NextResponse.json({ error: 'Order placement failed, please contact support.' }, { status: 500 });
    }

    // 4. Simulate API Handoff to external provider
    try {
      // -- FETCH BLOCK PLACEHOLDER --
      // const apiResponse = await fetch(`https://api.external-provider.com/v1/${service_type}`, {
      //   method: 'POST',
      //   body: JSON.stringify(details),
      // });
      // const apiData = await apiResponse.json();
      
      // Simulating a 1-second API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update order to success
      await supabaseAdmin
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', order.id);

      return NextResponse.json({ 
        message: 'Order completed successfully', 
        order: { ...order, status: 'completed' },
        newBalance: newBalance
      });

    } catch (providerError) {
      // Handle Provider failure (e.g., refund user or set order to manual review)
      await supabaseAdmin
        .from('orders')
        .update({ status: 'failed_provider' })
        .eq('id', order.id);
        
      return NextResponse.json({ error: 'Provider failed to fulfill order.' }, { status: 502 });
    }

  } catch (err: any) {
    console.error('Order creation error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
