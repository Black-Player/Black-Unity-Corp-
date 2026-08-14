export const getFallbackPrice = (symbol: string): number => {
  if (!symbol) return 1.0;
  const p = symbol.toUpperCase();

  // Crypto
  if (p.includes('BTC')) return 96500 + Math.random() * 50;
  if (p.includes('ETH')) return 3350 + Math.random() * 5;

  // Stock Indices
  if (p.includes('OTC_DJI') || p.includes('US30') || p.includes('DJI')) return 43800 + Math.random() * 20;
  if (p.includes('OTC_NDX') || p.includes('NAS') || p.includes('NDX')) return 20600 + Math.random() * 15;
  if (p.includes('OTC_GDAXI') || p.includes('GER') || p.includes('DAX')) return 19450 + Math.random() * 10;
  if (p.includes('OTC_FTSE') || p.includes('UK100') || p.includes('FTSE')) return 8250 + Math.random() * 5;

  // Commodities
  if (p.includes('XAU') || p.includes('GOLD')) return 2680 + Math.random() * 2;
  if (p.includes('XAG') || p.includes('SILVER')) return 31.20 + Math.random() * 0.1;
  if (p.includes('WTI') || p.includes('OIL')) return 71.50 + Math.random() * 0.2;

  // Jump Indices
  if (p.includes('JD100')) return 214.7 + Math.random() * 0.5;
  if (p.includes('JD75')) return 8142.77 + Math.random() * 5;
  if (p.includes('JD50')) return 68102.6 + Math.random() * 20;
  if (p.includes('JD25')) return 112796.08 + Math.random() * 50;
  if (p.includes('JD10')) return 93625.1 + Math.random() * 50;
  if (p.includes('JD')) return 68102.6 + Math.random() * 20;

  // Boom & Crash
  if (p.includes('BOOM1000')) return 14317.74 + Math.random() * 10;
  if (p.includes('BOOM500')) return 5005.75 + Math.random() * 5;
  if (p.includes('BOOM300')) return 2800 + Math.random() * 5;
  if (p.includes('BOOM150')) return 15000 + Math.random() * 10;
  if (p.includes('BOOM100')) return 94915.95 + Math.random() * 20;
  if (p.includes('BOOM50')) return 106692.62 + Math.random() * 20;
  if (p.includes('CRASH1000')) return 5724.30 + Math.random() * 5;
  if (p.includes('CRASH500')) return 3086.21 + Math.random() * 5;
  if (p.includes('CRASH300')) return 2780.50 + Math.random() * 5;
  if (p.includes('CRASH150')) return 15000 + Math.random() * 20;
  if (p.includes('CRASH100')) return 95871.08 + Math.random() * 20;
  if (p.includes('CRASH50')) return 99035.82 + Math.random() * 20;

  // Step Index
  if (p.includes('STP') || p.includes('STEP')) return 7637.4 + Math.random() * 2;

  // 1-second Volatility Indices (1HZ)
  if (p.includes('1HZ25V')) return 795691.72 + Math.random() * 100;
  if (p.includes('1HZ50V')) return 262861.19 + Math.random() * 50;
  if (p.includes('1HZ75V')) return 7100.83 + Math.random() * 5;
  if (p.includes('1HZ100V')) return 703.2 + Math.random() * 1;
  if (p.includes('1HZ10V')) return 9382.88 + Math.random() * 10;

  // Volatility Indices (R_)
  if (p.includes('R_100')) return 556.82 + Math.random() * 2;
  if (p.includes('R_75')) return 47186.13 + Math.random() * 20;
  if (p.includes('R_50')) return 94.99 + Math.random() * 1;
  if (p.includes('R_25')) return 2659.22 + Math.random() * 5;
  if (p.includes('R_10')) return 4865.01 + Math.random() * 10;

  // Forex Pairs
  if (p.includes('JPY')) return 154.20 + (Math.random() * 0.20);
  if (p.includes('EURUSD')) return 1.0850 + (Math.random() * 0.0010);
  if (p.includes('GBPUSD')) return 1.2950 + (Math.random() * 0.0010);
  if (p.includes('AUDUSD')) return 0.6550 + (Math.random() * 0.0008);
  if (p.includes('USDCAD')) return 1.3850 + (Math.random() * 0.0008);
  if (p.includes('NZDUSD')) return 0.6050 + (Math.random() * 0.0008);
  if (p.includes('EURGBP')) return 0.8420 + (Math.random() * 0.0005);

  return 1.0850 + (Math.random() * 0.0020);
};
