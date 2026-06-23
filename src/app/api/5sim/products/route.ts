import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get('country');
  
  if (!country) return NextResponse.json({ error: 'Missing country param' }, { status: 400 });

  try {
    const res = await fetch(`https://5sim.net/v1/guest/products/${country}/any`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error('Failed to fetch from 5sim');
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('5sim products proxy error:', err);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
