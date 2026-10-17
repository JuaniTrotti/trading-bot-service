const express = require('express');
const router = express.Router();
const binanceService = require('../../shared/services/binanceService');
const tradingSessionService = require('../../shared/services/tradingSessionService');
const agentService = require('../../shared/services/agentService');
const agentLogService = require('../../shared/services/agentLogService');

router.post('/webhook/:ticker', async (req, res) => {
    const { ticker } = req.params;
    const tradingViewData = req.body;
    const receivedAt = new Date().toISOString();

    console.log(`\n[${receivedAt}] Webhook received from TradingView for ${ticker}`);
    console.log('TradingView payload:', JSON.stringify(tradingViewData, null, 2));

    // Responder inmediatamente a TradingView para cerrar la conexión
    res.status(200).json({
        success: true,
        received: true,
        ticker,
        timestamp: receivedAt
    });

    // Procesar en background (no bloquea la respuesta)
    setImmediate(() => {
        processWebhook(ticker, tradingViewData, receivedAt);
    });
});

router.get('/health', (req, res) => {
    res.json({ status: 'ok', environment: 'testnet/withai' });
});

async function processWebhook(ticker, tradingViewData, receivedAt) {
    try {
        // Extraer símbolo limpio (ej. "BINANCE:BTCUSDT" -> "BTCUSDT")
        const symbol = ticker.replace('BINANCE:', '').replace('.P', '');

        // Obtener contexto de Binance
        console.log(`[${receivedAt}] Fetching Binance context for ${symbol}...`);
        const binanceContext = await binanceService.getBinanceContextData(symbol);

        // Payload para el agente (sin stop_loss ni take_profit)
        const { stop_loss, take_profit, ...tradingViewDataFiltered } = tradingViewData;
        const agentPayload = {
            tradingview_data: tradingViewDataFiltered,
            binance_context: binanceContext
        };

        // Enviar al agente para confirmar señal
        console.log(`\n========== ENVIANDO AL AGENTE (BUY_SIGNAL) ==========`);
        console.log(JSON.stringify(agentPayload, null, 2));
        console.log(`========== FIN PAYLOAD AL AGENTE ==========\n`);

        const agentResponse = await agentService.agentRequest('/v1/confirm-signal', agentPayload);

        console.log(`[AGENT] Response: decision=${agentResponse.decision}, score=${agentResponse.score}`);

        // Loguear interacción
        await agentLogService.logInteraction({
            type: 'BUY_SIGNAL',
            symbol,
            requestPayload: agentPayload,
            responsePayload: agentResponse,
            decision: agentResponse.decision ? 'CONFIRMED' : 'REJECTED'
        });

        // Solo si el agente confirma, procedemos con la compra
        if (agentResponse.decision) {
            console.log(`[AGENT] Señal CONFIRMADA para ${symbol}`);
            await tradingSessionService.onBuyConfirmed(symbol, tradingViewData, agentResponse);
        } else {
            console.log(`[AGENT] Señal RECHAZADA para ${symbol}. Ignorando.`);
        }

    } catch (error) {
        console.error(`[ERROR] Processing webhook for ${ticker}:`, error);
    }
}

module.exports = router;
