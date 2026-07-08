import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get('country');
  
  if (!country) return NextResponse.json({ error: 'Missing country param' }, { status: 400 });

  try {
    const res = await fetch(`https://5sim.net/v1/guest/prices?country=${country}`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error('Failed to fetch from 5sim');
    const data = await res.json();

    const countryData = data[country];
    if (!countryData) {
      return NextResponse.json({});
    }

    const processedProducts: Record<string, { operators: { name: string, price: number, qty: number }[] }> = {};

    for (const [product, operators] of Object.entries(countryData)) {
      const opList: { name: string, price: number, qty: number }[] = [];

      for (const [opName, opData] of Object.entries(operators as any)) {
        const cost = Number((opData as any).cost);
        const count = Number((opData as any).count);
        
        if (count > 0) {
          opList.push({ name: opName, price: cost, qty: count });
        }
      }

      // Only include products that actually have stock
      if (opList.length > 0) {
        processedProducts[product] = {
          operators: opList
        };
      }
    }

    return NextResponse.json(processedProducts);
  } catch (err: any) {
    console.error('5sim products proxy error:', err);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
