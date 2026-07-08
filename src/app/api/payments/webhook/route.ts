import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    // Setup Supabase Service Client (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const whSecret = req.headers.get('x-wh-secret');

    // 1. Validate Secret
    if (whSecret !== process.env.FAPSHI_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 });
    }

    const body = await req.json();
    console.log('Fapshi Webhook Received:', body);
    
    const { status, amount, externalId, transId } = body;

    // externalId maps to our transaction.id
    if (!externalId) {
      console.error('Webhook Error: Missing externalId');
      return NextResponse.json({ error: 'Missing externalId' }, { status: 400 });
    }

    // 2. Process Successful Payment
    const paymentStatus = String(status).toUpperCase();
    if (paymentStatus === 'SUCCESSFUL') {
      // We use a PostgreSQL RPC function to atomically process the payment.
      // This prevents race conditions (double crediting) if Fapshi fires the webhook multiple times.
      const { data: processed, error: rpcError } = await supabaseAdmin.rpc('process_fapshi_payment', {
        p_transaction_id: externalId,
        p_fapshi_trans_id: transId
      });

      if (rpcError) {
        console.error('RPC Error processing payment:', rpcError);
        return NextResponse.json({ error: 'Failed to process payment atomically' }, { status: 500 });
      }

      if (!processed) {
        return NextResponse.json({ message: 'Already processed' });
      }
    } else if (status === 'FAILED') {
      // Update transaction to failed
      await supabaseAdmin
        .from('transactions')
        .update({ status: 'failed', fapshi_trans_id: transId })
        .eq('id', externalId);
    }

    return NextResponse.json({ message: 'Webhook processed' });

  } catch (err: any) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
