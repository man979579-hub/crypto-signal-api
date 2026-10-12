
export default async (request) => {
  const url = new URL(request.url);
  const symbol = (
    url.searchParams.get("symbol") || "BTCUSDT"
  ).toUpperCase();

  if (!/^[A-Z0-9]{5,20}$/.test(symbol)) {
    return Response.json(
      { error: "Simbol crypto tidak valid" },
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
        { error: "Data Binance tidak tersedia", symbol },
        { status: 502 }
      );
    }

    const candles = await response.json();

    if (!Array.isArray(candles) || candles.length < 20) {
      return Response.json(
        { error: "Data historis tidak mencukupi" },
        { status: 502 }
      );
    }

    const closes = candles.map((c) => Number(c[4]));
    const price = closes[closes.length - 1];

    const average = (values) =>
      values.reduce((sum, value) => sum + value, 0) /
      values.length;

    const sma10 = average(closes.slice(-10));
    const sma20 = average(closes.slice(-20));

    let signal = "HOLD";

    if (price > sma10 && sma10 > sma20) {
      signal = "BUY";
    } else if (price < sma10 && sma10 < sma20) {
      signal = "SELL";
    }

    return Response.json({
      success: true,
      symbol,
      interval: "1h",
      price,
      sma10: Number(sma10.toFixed(6)),
      sma20: Number(sma20.toFixed(6)),
      signal,
      strategy: "SMA 10/20",
      warning: "Sinyal indikator sederhana, bukan jaminan profit.",
      updatedAt: new Date().toISOString()
    });
  } catch {
    return Response.json(
      { error: "Gagal mengakses data pasar" },
      { status: 502 }
    );
  }
};
