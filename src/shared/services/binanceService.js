// URL base de Binance Futures API
const BASE_FUTURES_URL = 'https://fapi.binance.com';

/**
 * Función para obtener datos contextuales de Binance API
 * @param {string} symbol Par a analizar (ej. "BTCUSDT")
 * @returns {Object} Objeto con symbol_price, order_flow, derivatives, order_book y btc_context
 */
async function getBinanceContextData(symbol) {
    try {
        // Helper para hacer fetch con query params
        const fetchJson = async (url) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
            return res.json();
        };

        // Realizamos las llamadas a la API en paralelo para minimizar la latencia
        const [
            tickerPriceRes,
            aggTradesRes,
            openInterestRes,
            topLongShortRes,
            depthRes,
            btcKlinesRes,
            premiumIndexRes
        ] = await Promise.all([
            // 0. Precio actual en tiempo real del activo
            fetchJson(`${BASE_FUTURES_URL}/fapi/v1/ticker/price?symbol=${symbol}`),

            // 1. Delta de Volumen / Flujo de Órdenes (Últimos 100 trades de Futuros)
            fetchJson(`${BASE_FUTURES_URL}/fapi/v1/aggTrades?symbol=${symbol}&limit=100`),

            // 2. Open Interest actual
            fetchJson(`${BASE_FUTURES_URL}/fapi/v1/openInterest?symbol=${symbol}`),

            // 3. Ratio Long/Short de las Cuentas Top
            fetchJson(`${BASE_FUTURES_URL}/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=5m&limit=1`),

            // 4. Libro de Órdenes (Order Book Depth) - 100 niveles
            fetchJson(`${BASE_FUTURES_URL}/fapi/v1/depth?symbol=${symbol}&limit=100`),

            // 5. Contexto Macro: Velas de 5m de BTCUSDT
            fetchJson(`${BASE_FUTURES_URL}/fapi/v1/klines?symbol=BTCUSDT&interval=5m&limit=3`),

            // 6. Funding Rate actual
            fetchJson(`${BASE_FUTURES_URL}/fapi/v1/premiumIndex?symbol=${symbol}`)
        ]);

        // --- PROCESAMIENTO DE DATOS ---

        // Precio del activo
        const currentPrice = parseFloat(tickerPriceRes.price);

        // A. Cálculo del Delta de Volumen
        let buyerVolume = 0;
        let sellerVolume = 0;
        aggTradesRes.forEach(trade => {
            const qty = parseFloat(trade.q);
            if (trade.m) {
                sellerVolume += qty;
            } else {
                buyerVolume += qty;
            }
        });
        const volumeDelta = buyerVolume - sellerVolume;

        // B. Análisis del Order Book
        const bids = depthRes.bids;
        const asks = depthRes.asks;

        const bestAsk = parseFloat(asks[0][0]);
        const bestBid = parseFloat(bids[0][0]);
        const upper1PercentLimit = currentPrice * 1.01;

        let askLiquidityWithin1Pct = 0;
        for (const [priceStr, qtyStr] of asks) {
            const price = parseFloat(priceStr);
            if (price <= upper1PercentLimit) {
                askLiquidityWithin1Pct += parseFloat(qtyStr);
            } else {
                break;
            }
        }

        // C. Tendencia Reciente de BTC
        const btcCandles = btcKlinesRes;
        const btcLastClose = parseFloat(btcCandles[btcCandles.length - 1][4]);
        const btcPrevClose = parseFloat(btcCandles[btcCandles.length - 2][4]);
        const btc5mChangePct = ((btcLastClose - btcPrevClose) / btcPrevClose) * 100;

        return {
            symbol_price: {
                symbol: symbol,
                current_price: currentPrice
            },
            order_flow: {
                buyer_taker_volume: buyerVolume,
                seller_taker_volume: sellerVolume,
                volume_delta: volumeDelta,
                buyer_dominance: buyerVolume > sellerVolume
            },
            derivatives: {
                open_interest: parseFloat(openInterestRes.openInterest),
                top_long_short_ratio: parseFloat(topLongShortRes[0]?.longShortRatio || 0),
                funding_rate: parseFloat(premiumIndexRes.lastFundingRate)
            },
            order_book: {
                ask_liquidity_next_1pct: askLiquidityWithin1Pct,
                best_bid: bestBid,
                best_ask: bestAsk,
                spread: bestAsk - bestBid
            },
            btc_context: {
                btc_price: btcLastClose,
                btc_5m_change_pct: btc5mChangePct,
                btc_is_stable_or_bullish: btc5mChangePct >= -0.15
            }
        };

    } catch (error) {
        console.error('Error consultando la API de Binance:', error.message);
        throw error;
    }
}

module.exports = {
    getBinanceContextData
};