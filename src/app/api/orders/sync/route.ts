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

    // Fetch active boost orders (pending or processing)
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id, details, status')
      .eq('user_id', user.id)
      .eq('service_type', 'boost')
      .in('status', ['pending', 'processing']);

    if (!orders || orders.length === 0) {
      return NextResponse.json({ message: 'No orders to sync' });
    }

    const japOrderIds = orders
      .filter(o => o.details?.provider_order_id)
      .map(o => o.details.provider_order_id);

    if (japOrderIds.length === 0) {
      return NextResponse.json({ message: 'No JAP orders to sync' });
    }

    const apiKey = process.env.JAP_API_KEY;
    if (!apiKey) throw new Error("JAP_API_KEY is missing");

    const japRes = await fetch('https://justanotherpanel.com/api/v2', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*'
      },
      body: JSON.stringify({
        key: apiKey,
        action: 'status',
        orders: japOrderIds.join(',')
      })
    });

    if (!japRes.ok) throw new Error('JAP API failed');
    const japData = await japRes.json();

    // Mapping JAP statuses to our internal statuses
    const updates = [];

    for (const order of orders) {
      const pid = order.details?.provider_order_id;
      if (!pid || !japData[pid] || japData[pid].error) continue;

      const japStatus = String(japData[pid].status).toLowerCase();
      const japStartCount = japData[pid].start_count;
      const japRemains = japData[pid].remains;

      let newLocalStatus = order.status;

      if (japStatus === 'pending') {
        newLocalStatus = 'pending';
      } else if (japStatus === 'processing' || japStatus === 'in progress') {
        newLocalStatus = 'processing';
      } else if (japStatus === 'completed' || japStatus === 'partial') {
        newLocalStatus = 'completed';
      } else if (japStatus === 'canceled' || japStatus === 'cancelled') {
        newLocalStatus = 'failed_provider';
      }

      const needsStatusUpdate = newLocalStatus !== order.status;
      const needsDetailsUpdate = order.details.start_count !== japStartCount || order.details.remains !== japRemains;

      if (needsStatusUpdate || needsDetailsUpdate) {
        updates.push(
          supabaseAdmin
            .from('orders')
            .update({ 
              status: newLocalStatus,
              details: {
                ...order.details,
                start_count: japStartCount,
                remains: japRemains
              }
            })
            .eq('id', order.id)
        );
      }
    }

    await Promise.all(updates);

    return NextResponse.json({ message: 'Sync complete' });
  } catch (err: any) {
    console.error('Sync error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
