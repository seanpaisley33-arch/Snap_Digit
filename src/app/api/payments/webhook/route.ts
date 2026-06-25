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
      // First, get the transaction to ensure it's pending and get the user_id
      const { data: transaction, error: fetchError } = await supabaseAdmin
        .from('transactions')
        .select('user_id, status, amount')
        .eq('id', externalId)
        .single();

      if (fetchError || !transaction) {
        console.error('Transaction not found', externalId);
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
      }

      // Idempotency check: don't credit twice
      if (transaction.status === 'success') {
        return NextResponse.json({ message: 'Already processed' });
      }

      // We need to safely update both the transaction and the user's wallet.
      // Since Supabase REST doesn't support complex standard transactions in a single call without a stored procedure,
      // We will do a simple sequenced update. For absolute financial safety, a custom RPC function in PostgreSQL is recommended.

      // Update Transaction to success
      const { error: txError } = await supabaseAdmin
        .from('transactions')
        .update({ status: 'success', fapshi_trans_id: transId })
        .eq('id', externalId);

      if (txError) throw txError;

      // Update User Wallet Balance (RPC function recommended in prod, using raw fetch for quick implementation)
      // We must query current balance then add, or better, rely on Postgres constraint/RPC.
      
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('wallet_balance')
        .eq('id', transaction.user_id)
        .single();
        
      if (profile) {
        const newBalance = Number(profile.wallet_balance) + Number(transaction.amount);
        await supabaseAdmin
          .from('profiles')
          .update({ wallet_balance: newBalance })
          .eq('id', transaction.user_id);
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
