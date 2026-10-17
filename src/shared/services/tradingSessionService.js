const binanceService = require('./binanceService');
const tradingExecutionService = require('./tradingExecutionService');
const agentService = require('./agentService');
const agentLogService = require('./agentLogService');

const TradingState = {
    IDLE: 'IDLE',
    MONITORING: 'MONITORING',  // Esperando confirmación de compra
    SELL_PENDING: 'SELL_PENDING'  // Buy confirmada, esperando señal de venta
};

let currentState = TradingState.IDLE;
let currentSymbol = null;
let pollInterval = null;
let lastBuySignal = null;

/**
 * Inicia el ciclo de monitoreo después de que el agente confirma la compra
 */
async function onBuyConfirmed(symbol, buySignal) {
    if (currentState !== TradingState.IDLE) {
        console.log(`[TradingSession] Ya hay una operación en curso (${currentState}). Ignorando BUY para ${symbol}`);
        return;
    }

    currentSymbol = symbol;
    lastBuySignal = buySignal;
    currentState = TradingState.SELL_PENDING;

    // Registrar compra en MongoDB
    await tradingExecutionService.executeBuy(symbol, buySignal);

    // Iniciar polling cada 40 segundos
    startSellPolling();
}

/**
 * polling para preguntar al agente si debemos vender
 */
async function startSellPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
    }

    console.log(`[TradingSession] Iniciando monitoreo en 40s para ${currentSymbol}`);

    // Primer polling en 40 segundos (no inmediatamente)
    pollInterval = setInterval(async () => {
        await checkSellSignal();
    }, 40000);
}

async function checkSellSignal() {
    try {
        console.log(`\n[${new Date().toISOString()}] Consultando contexto para ${currentSymbol}...`);
        const binanceContext = await binanceService.getBinanceContextData(currentSymbol);

        // Payload para enviar al agente
        const agentPayload = {
            action: 'CHECK_SELL',
            symbol: currentSymbol,
            entry_price: lastBuySignal.price,
            current_price: binanceContext.order_book.best_ask,
            binance_context: binanceContext,
            timestamp: new Date().toISOString()
        };

        console.log(`\n========== ENVIANDO AL AGENTE (CHECK_SELL) ==========`);
        console.log(JSON.stringify(agentPayload, null, 2));
        console.log(`========== FIN PAYLOAD AL AGENTE ==========\n`);

        // Llamar al endpoint del agente
        const agentResponse = await agentService.agentRequest('/v1/check-sell', agentPayload);

        console.log(`[AGENT] should_exit=${agentResponse.should_exit}, pnl=${agentResponse.pnl_percent}%`);

        // Loguear interacción
        await agentLogService.logInteraction({
            type: 'CHECK_SELL',
            symbol: currentSymbol,
            requestPayload: agentPayload,
            responsePayload: agentResponse,
            decision: agentResponse.should_exit ? 'EXIT' : 'HOLD'
        });

        if (agentResponse.should_exit) {
            console.log(`[AGENT] DICE VENDER - score: ${agentResponse.should_exit_score}`);
            await executeSell(binanceContext.order_book.best_ask, 'agent_exit_check');
        } else {
            console.log(`[AGENT] MANTENER - score: ${agentResponse.should_exit_score}`);
        }

    } catch (error) {
        console.error(`[TradingSession] Error en polling:`, error.message);
    }
}

/**
 * Detiene el monitoreo manualmente
 */
function stopMonitoring() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
    currentState = TradingState.IDLE;
    currentSymbol = null;
    lastBuySignal = null;
    console.log(`[TradingSession] Monitoreo detenido.`);
}

/**
 * Ejecuta la venta y vuelve a estado IDLE
 * @param {number} exitPrice - Precio de salida
 * @param {string} closedReason - Razón del cierre
 */
async function executeSell(exitPrice, closedReason) {
    if (currentState !== TradingState.SELL_PENDING) {
        console.log(`[TradingSession] No hay venta pendiente. Estado: ${currentState}`);
        return;
    }

    // Detener polling
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }

    console.log(`\n========== EJECUTANDO VENTA ==========`);
    console.log(`Symbol: ${currentSymbol}`);
    console.log(`Precio salida: ${exitPrice}`);
    console.log(`====================================\n`);

    // Registrar venta en MongoDB
    await tradingExecutionService.executeSell(currentSymbol, exitPrice, 'agent', closedReason);

    // Resetear estado
    currentState = TradingState.IDLE;
    currentSymbol = null;
    lastBuySignal = null;

    console.log(`[TradingSession] Venta completada. Esperando próximo BUY_SIGNAL...`);
}

/**
 * Obtiene el estado actual
 */
function getStatus() {
    return {
        state: currentState,
        symbol: currentSymbol,
        lastBuySignal
    };
}

module.exports = {
    TradingState,
    onBuyConfirmed,
    stopMonitoring,
    getStatus
};
