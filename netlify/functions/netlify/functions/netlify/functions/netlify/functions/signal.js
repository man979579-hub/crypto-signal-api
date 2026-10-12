
export default async (request) => {
  const url = new URL(request.url);

  const symbol = (
    url.searchParams.get("symbol") || "BTCUSDT"
  ).toUpperCase();

  const allowedSymbols = /^[A-Z0-9]{5,20}$/;

  if (!allowedSymbols.test(symbol)) {
    return Response.json(
      { error: "Pair tidak valid. Contoh: BTCUSDT" },
      { status: 400 }
    );
  }

  try {
    const apiUrl = new URL(
      "https://api.binance.com/api/v3/klines"
    );

    apiUrl.searchParams.set("symbol", symbol);
    apiUrl.searchParams.set("interval", "1h");
    apiUrl.searchParams.set("limit", "50");

    const response = await fetch(apiUrl);

    if (!response.ok) {
      return Response.json(
        {
          error: "Gagal mengambil data Binance",
          status: response.status
        },
        { status: 502 }
      );
    }

    const candles = await response.json();

    if (!Array.isArray(candles) || candles.length < 20) {
      return Response.json(
        { error: "Data candle tidak mencukupi" },
        { status: 502 }
      );
    }

    const closes = candles.map(candle => Number(candle[4]));

    const average = (period) => {
      const values = closes.slice(-period);
      return values.reduce((sum, value) => sum + value, 0)
        / values.length;
    };

    const lastPrice = closes[closes.length - 1];
    const sma10 = average(10);
    const sma20 = average(20);

    let signal = "HOLD";

    if (sma10 > sma20 && lastPrice > sma10) {
      signal = "BUY";
    } else if (sma10 < sma20 && lastPrice < sma10) {
      signal = "SELL";
    }

    return Response.json({
      ok: true,
      symbol,
      interval: "1h",
      lastPrice,
      sma10: Number(sma10.toFixed(8)),
      sma20: Number(sma20.toFixed(8)),
      signal,
      strategy: "SMA10/SMA20",
      updatedAt: new Date().toISOString(),
      disclaimer: "Sinyal teknikal sederhana, bukan jaminan keuntungan."
    });
  } catch (error) {
    return Response.json(
      { error: String(error.message || error) },
      { status: 502 }
    );
  }
};
