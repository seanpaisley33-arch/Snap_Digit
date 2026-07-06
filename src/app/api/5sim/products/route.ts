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

    const processedProducts: Record<string, { Price: number, Qty: number, Operator: string }> = {};

    for (const [product, operators] of Object.entries(countryData)) {
      let bestOperator = 'any';
      let minCost = Infinity;
      let totalQty = 0;

      for (const [opName, opData] of Object.entries(operators as any)) {
        const cost = Number((opData as any).cost);
        const count = Number((opData as any).count);
        
        if (count > 0) {
          totalQty += count;
          if (cost < minCost) {
            minCost = cost;
            bestOperator = opName;
          }
        }
      }

      // Only include products that actually have stock
      if (totalQty > 0 && minCost !== Infinity) {
        processedProducts[product] = {
          Price: minCost,
          Qty: totalQty,
          Operator: bestOperator
        };
      }
    }

    return NextResponse.json(processedProducts);
  } catch (err: any) {
    console.error('5sim products proxy error:', err);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
