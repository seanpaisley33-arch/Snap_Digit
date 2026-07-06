import { NextResponse } from 'next/server';

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const apiKey = process.env.JAP_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'JAP_API_KEY is not configured' }, { status: 500 });
    }

    let usdToXafRate = Number(process.env.USD_TO_XAF_RATE) || 600;
    try {
      const erRes = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 3600 } });
      if (erRes.ok) {
        const erData = await erRes.json();
        if (erData?.rates?.XAF) usdToXafRate = erData.rates.XAF;
      }
    } catch (e) {
      console.warn('Failed to fetch live exchange rate for boost API, using fallback');
    }

    const defaultProfitMultiplier = Number(process.env.NEXT_PUBLIC_BOOST_MULTIPLIER) || 4;

    const getBoostMultiplier = (key: string) => {
      if (key.startsWith('tk_')) return Number(process.env.NEXT_PUBLIC_BOOST_MULTIPLIER_TIKTOK) || defaultProfitMultiplier;
      if (key.startsWith('ig_')) return Number(process.env.NEXT_PUBLIC_BOOST_MULTIPLIER_INSTAGRAM) || defaultProfitMultiplier;
      if (key.startsWith('fb_')) return Number(process.env.NEXT_PUBLIC_BOOST_MULTIPLIER_FACEBOOK) || defaultProfitMultiplier;
      if (key.startsWith('yt_')) return Number(process.env.NEXT_PUBLIC_BOOST_MULTIPLIER_YOUTUBE) || defaultProfitMultiplier;
      if (key.startsWith('tg_')) return Number(process.env.NEXT_PUBLIC_BOOST_MULTIPLIER_TELEGRAM) || defaultProfitMultiplier;
      return defaultProfitMultiplier;
    };

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

    const ratesXAF: Record<string, number> = {};
    const ratesUSD: Record<string, number> = {};

    // Comprehensive fallback static rates (approximate USD wholesale cost)
    // These ensure the site never goes down even if JAP is offline or blocking IPs.
    const STATIC_FALLBACKS: Record<string, number> = {
      'tk_views': 0.004,
      'tk_likes': 0.125,
      'tk_followers': 0.66,
      'ig_likes': 0.033,
      'ig_followers': 0.50,
      'yt_views': 0.75,
      'yt_subs': 2.08,
      'fb_page_followers': 0.41,
      'fb_profile_followers': 0.37,
      'fb_likes': 0.16,
      'fb_emoji': 0.25,
      'fb_shares': 0.33,
      'fb_groups': 0.66,
      'fb_views': 0.125,
      'fb_comments': 1.25,
      'fb_reviews': 1.66,
      'tg_members': 0.33,
      'tg_views': 0.008,
    };

    // Pre-fill all with fallbacks first
    for (const [key, _] of Object.entries(JAP_SERVICE_MAP)) {
      const costUsd = STATIC_FALLBACKS[key] || 1.0;
      const baseMultiplier = getBoostMultiplier(key);
      const effectiveMultiplier = key === 'fb_groups' ? baseMultiplier * 2 : baseMultiplier;
      ratesUSD[key] = costUsd * effectiveMultiplier;
      ratesXAF[key] = Math.ceil(ratesUSD[key] * usdToXafRate);
    }

    try {
      // Hit JAP API with browser-like headers to bypass Cloudflare blocking
      const japRes = await fetch('https://justanotherpanel.com/api/v2', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        body: JSON.stringify({
          key: apiKey,
          action: 'services',
        }),
        // Add timeout signal if supported, but fetch handles network timeout eventually
      });

      if (japRes.ok) {
        const services = await japRes.json();
        // Parse JAP services and overwrite fallbacks with live data
        if (Array.isArray(services)) {
          for (const service of services) {
            const internalKey = Object.keys(JAP_SERVICE_MAP).find(k => JAP_SERVICE_MAP[k] === Number(service.service));
            if (internalKey) {
              const wholesaleUsd = Number(service.rate);
              const baseMultiplier = getBoostMultiplier(internalKey);
              const effectiveMultiplier = internalKey === 'fb_groups' ? baseMultiplier * 2 : baseMultiplier;
              const retailUsd = wholesaleUsd * effectiveMultiplier;
              ratesUSD[internalKey] = retailUsd;
              ratesXAF[internalKey] = Math.ceil(retailUsd * usdToXafRate);
            }
          }
        }
      } else {
        console.warn('JAP API returned non-OK status. Using static fallbacks.');
      }
    } catch (fetchErr) {
      console.warn('Failed to reach JAP API (Timeout/Network). Using static fallbacks.', fetchErr);
    }

    return NextResponse.json({ ratesXAF, ratesUSD });

  } catch (err: any) {
    console.error('Dynamic Pricing Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
