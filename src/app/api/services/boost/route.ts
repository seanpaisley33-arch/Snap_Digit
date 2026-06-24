import { NextResponse } from 'next/server';

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const apiKey = process.env.JAP_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'JAP_API_KEY is not configured' }, { status: 500 });
    }

    const usdToXafRate = Number(process.env.USD_TO_XAF_RATE) || 600;
    const profitMultiplier = Number(process.env.NEXT_PUBLIC_BOOST_MULTIPLIER) || 4;

    const JAP_SERVICE_MAP: Record<string, number> = {
      'tk_views': 8970,
      'tk_likes': 8101,
      'tk_followers': 8610,
      'ig_likes': 10130,
      'ig_followers': 10129,
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

    // Hit JAP API
    const japRes = await fetch('https://justanotherpanel.com/api/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: apiKey,
        action: 'services',
      })
    });

    if (!japRes.ok) {
      throw new Error('Failed to fetch from JAP');
    }

    const services = await japRes.json();

    const ratesXAF: Record<string, number> = {};
    const ratesUSD: Record<string, number> = {};

    // Fallback static rates for dummy IDs (9999) or if JAP fails parsing
    const STATIC_FALLBACKS: Record<string, number> = {
      'yt_subs': 2.08, // Approx USD cost to make retail ~5000 XAF
      'fb_views': 0.125,
      'fb_reviews': 1.66
    };

    // Pre-fill fallbacks
    for (const [key, val] of Object.entries(JAP_SERVICE_MAP)) {
      if (val === 9999) {
        const costUsd = STATIC_FALLBACKS[key] || 1.0;
        ratesUSD[key] = costUsd * profitMultiplier;
        ratesXAF[key] = Math.ceil(ratesUSD[key] * usdToXafRate);
      }
    }

    // Parse JAP services
    if (Array.isArray(services)) {
      for (const service of services) {
        const internalKey = Object.keys(JAP_SERVICE_MAP).find(k => JAP_SERVICE_MAP[k] === Number(service.service));
        
        if (internalKey) {
          const wholesaleUsd = Number(service.rate);
          const retailUsd = wholesaleUsd * profitMultiplier;
          const retailXaf = Math.ceil(retailUsd * usdToXafRate);
          
          ratesUSD[internalKey] = retailUsd;
          ratesXAF[internalKey] = retailXaf;
        }
      }
    }

    return NextResponse.json({ ratesXAF, ratesUSD });

  } catch (err: any) {
    console.error('Dynamic Pricing Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
