import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://5sim.net/v1/guest/countries', { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error('Failed to fetch from 5sim');
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('5sim countries proxy error:', err);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
