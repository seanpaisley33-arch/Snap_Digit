import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error('Failed to fetch exchange rate');
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Exchange rate proxy error:', err);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
