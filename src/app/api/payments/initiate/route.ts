import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const amount = Number(body.amount);

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // 1. Log pending transaction in Supabase
    const { data: transaction, error: insertError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        amount: amount,
        type: 'deposit',
        status: 'pending',
        description: 'Fund Wallet via Fapshi',
      })
      .select('id')
      .single();

    if (insertError || !transaction) {
      console.error('Failed to log pending transaction', insertError);
      return NextResponse.json({ error: 'Failed to initiate transaction' }, { status: 500 });
    }

    const externalId = transaction.id;

    // 2. Call Fapshi API
    // Using live Fapshi URL
    const fapshiRes = await fetch('https://live.fapshi.com/initiate-pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apiuser': process.env.FAPSHI_API_USER!,
        'apikey': process.env.FAPSHI_API_KEY!,
      },
      body: JSON.stringify({
        amount: amount,
        externalId: externalId,
        message: 'SnapDigit Wallet Funding',
      }),
    });

    const fapshiData = await fapshiRes.json();

    if (!fapshiRes.ok || !fapshiData.link) {
      console.error('Fapshi API Error:', fapshiData);
      
      // Update transaction status to failed
      await supabase
        .from('transactions')
        .update({ status: 'failed', description: 'Fapshi Initialization Failed' })
        .eq('id', externalId);

      return NextResponse.json({ error: 'Payment gateway error' }, { status: 500 });
    }

    // 3. Return Redirect URL
    return NextResponse.json({ redirectUrl: fapshiData.link });

  } catch (err: any) {
    console.error('Initiate error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
