import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    // Setup Supabase Service Client (bypasses RLS to reliably update wallets)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    // 4. API Handoff to external provider
    try {
      if (service_type === 'number') {
        const countryName = details.country || 'any';
        const productName = details.service || 'any';
        const operatorName = details.operator || 'any';
        const apiKey = process.env.FIVESIM_API_KEY;
        
        if (!apiKey) throw new Error("FIVESIM_API_KEY is missing");

        const simRes = await fetch(`https://5sim.net/v1/user/buy/activation/${countryName}/${operatorName}/${productName}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
          }
        });

        const simText = await simRes.text();
        let simData;
        try { simData = JSON.parse(simText); } catch(e) { simData = simText; }

        // If 5sim fails (e.g., "no free phones" or "not enough user balance" or HTTP error)
        if (!simRes.ok || typeof simData === 'string') {
          // Refund the user's wallet
          await supabaseAdmin
            .from('profiles')
            .update({ wallet_balance: Number(profile.wallet_balance) })
            .eq('id', user.id);
            
          // Mark order as failed provider
          await supabaseAdmin
            .from('orders')
            .update({ status: 'failed_provider', details: { ...details, error: simData } })
            .eq('id', order.id);

          return NextResponse.json({ 
            error: typeof simData === 'string' ? `Provider Error: ${simData}` : 'Provider failed to fulfill order.' 
          }, { status: 502 });
        }

        // 5sim Success! Returns: { id, phone, operator, product, status, expires, sms: [] }
        const updatedDetails = { 
          ...details, 
          provider_order_id: simData.id, 
          phone_number: simData.phone,
          expires: simData.expires 
        };
        
        await supabaseAdmin
          .from('orders')
          .update({ status: 'processing', details: updatedDetails })
          .eq('id', order.id);

        return NextResponse.json({ 
          message: 'Number purchased successfully', 
          order: { ...order, status: 'processing', details: updatedDetails },
          newBalance: newBalance
        });

      } else if (service_type === 'boost') {
        
        // --- JUST ANOTHER PANEL INTEGRATION ---
        const apiKey = process.env.JAP_API_KEY;
        if (!apiKey) throw new Error("JAP_API_KEY is missing");

        // MAP INTERNAL IDs TO REAL JAP IDs
        // TODO: USER MUST REPLACE 9999 WITH ACTUAL IDs FROM JUSTANOTHERPANEL.COM
        const JAP_SERVICE_MAP: Record<string, number> = {
          'tk_views': 8970,
          'tk_likes': 8101,
          'tk_followers': 8610,
          'ig_likes': 10130,     // us Instagram Likes [USA]
          'ig_followers': 10129, // us Instagram Followers [USA]
          'yt_views': 5971,
          'yt_subs': 9999,
          'fb_page_followers': 7867,
          'fb_profile_followers': 10044,
          'fb_likes': 10221,
          'fb_emoji': 8240,
          'fb_shares': 9977,
          'fb_groups': 7878,
          'fb_views': 9999,
          'fb_comments': 6598,
          'fb_reviews': 9999,
          'tg_members': 7102,
          'tg_views': 8811,
        };

        const japServiceId = JAP_SERVICE_MAP[details.serviceId];
        if (!japServiceId) throw new Error("Invalid Boost Service ID mapped");

        const japRes = await fetch('https://justanotherpanel.com/api/v2', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          body: JSON.stringify({
            key: apiKey,
            action: 'add',
            service: japServiceId,
            link: details.link,
            quantity: details.quantity
          })
        });

        const japText = await japRes.text();
        let japData;
        try { japData = JSON.parse(japText); } catch(e) { japData = { error: japText }; }

        if (!japRes.ok || japData.error) {
          // Refund user
          await supabaseAdmin
            .from('profiles')
            .update({ wallet_balance: Number(profile.wallet_balance) })
            .eq('id', user.id);
            
          await supabaseAdmin
            .from('orders')
            .update({ status: 'failed_provider', details: { ...details, error: japData.error || 'JAP Error' } })
            .eq('id', order.id);

          return NextResponse.json({ error: `Provider Error: ${japData.error || 'Failed'}` }, { status: 502 });
        }

        const updatedDetails = { ...details, provider_order_id: japData.order };
        
        await supabaseAdmin
          .from('orders')
          .update({ status: 'pending', details: updatedDetails })
          .eq('id', order.id);

        return NextResponse.json({ 
          message: 'Order placed successfully', 
          order: { ...order, status: 'pending', details: updatedDetails },
          newBalance: newBalance
        });
      }

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
