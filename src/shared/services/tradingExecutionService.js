const Position = require('../../models/Position');
const TradeHistory = require('../../models/TradeHistory');

const tradingExecutionService = {

    /**
     * Registra una compra abierta
     */
    async executeBuy(symbol, signal) {
        try {
            const position = new Position({
                ticker: symbol,
                side: 'buy',
                entryPrice: signal.price,
                stopLoss: signal.stop_loss,
                takeProfit: signal.take_profit,
                status: 'open',
                openedAt: new Date()
            });

            await position.save();

            console.log(`\n========== COMPRA REGISTRADA ==========`);
            console.log(`Activo: ${symbol}`);
            console.log(`Precio entrada: ${signal.price}`);
            console.log(`======================================\n`);

            return position;
        } catch (error) {
            console.error(`[TradingExecution] Error al registrar compra:`, error);
            throw error;
        }
    },

    /**
     * Registra una venta y cierra la posición
     * @param {string} symbol
     * @param {number} exitPrice
     * @param {string} closedBy
     * @param {string} closedReason
     * @param {Object} buyTrace - Trace completo del BUY_SIGNAL confirmado
     * @param {Object} sellTrace - Trace completo del CHECK_SELL
     */
    async executeSell(symbol, exitPrice, closedBy = 'agent', closedReason = '', buyTrace = null, sellTrace = null) {
        try {
            const position = await Position.findOne({ ticker: symbol, status: 'open' });

            if (!position) {
                console.error(`[TradingExecution] No se encontró posición abierta para ${symbol}`);
                return null;
            }

            // Calcular PnL
            const pnlPct = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;

            const openedAt = position.openedAt;

            position.exitPrice = exitPrice;
            position.pnlPct = pnlPct;
            position.status = 'closed';
            position.closedBy = closedBy;
            position.closedReason = closedReason;
            position.closedAt = new Date();

            await position.save();

            // Crear TradeHistory con traces completos
            const tradeHistory = new TradeHistory({
                symbol,
                entryPrice: position.entryPrice,
                exitPrice,
                pnlPct,
                side: 'buy',
                closedBy,
                openedAt,
                closedAt: new Date(),
                buyTrace,
                sellTrace
            });

            await tradeHistory.save();

            console.log(`\n========== VENTA REGISTRADA ==========`);
            console.log(`Activo: ${symbol}`);
            console.log(`Precio entrada: ${position.entryPrice}`);
            console.log(`Precio salida: ${exitPrice}`);
            console.log(`PnL: ${pnlPct.toFixed(2)}%`);
            console.log(`Cerrado por: ${closedBy}`);
            console.log(`======================================\n`);

            return position;
        } catch (error) {
            console.error(`[TradingExecution] Error al registrar venta:`, error);
            throw error;
        }
    },

    /**
     * Obtiene la posición abierta para un símbolo
     */
    async getOpenPosition(symbol) {
        try {
            return await Position.findOne({ ticker: symbol, status: 'open' });
        } catch (error) {
            console.error(`[TradingExecution] Error al buscar posición:`, error);
            throw error;
        }
    },

    /**
     * Obtiene todas las posiciones abiertas
     */
    async getOpenPositions() {
        try {
            return await Position.find({ status: 'open' })
                .sort({ openedAt: -1 });
        } catch (error) {
            console.error(`[TradingExecution] Error al buscar posiciones abiertas:`, error);
            throw error;
        }
    },

    /**
     * Obtiene todas las posiciones cerradas
     */
    async getClosedPositions(limit = 20) {
        try {
            return await Position.find({ status: 'closed' })
                .sort({ closedAt: -1 })
                .limit(limit);
        } catch (error) {
            console.error(`[TradingExecution] Error al buscar posiciones cerradas:`, error);
            throw error;
        }
    },

    /**
     * Obtiene el historial de operaciones completas con traces
     */
    async getTradeHistory(limit = 50) {
        try {
            return await TradeHistory.find()
                .sort({ closedAt: -1 })
                .limit(limit);
        } catch (error) {
            console.error(`[TradingExecution] Error al buscar historial:`, error);
            throw error;
        }
    },

    /**
     * Resume de operaciones cerradas
     */
    async getPerformanceSummary() {
        try {
            const positions = await Position.find({ status: 'closed' });

            const totalOperations = positions.length;
            const wins = positions.filter(p => p.pnlPct > 0).length;
            const losses = positions.filter(p => p.pnlPct <= 0).length;
            const totalPnl = positions.reduce((sum, p) => sum + p.pnlPct, 0);
            const avgPnl = totalOperations > 0 ? totalPnl / totalOperations : 0;
            const winRate = totalOperations > 0 ? (wins / totalOperations) * 100 : 0;

            return {
                totalOperations,
                wins,
                losses,
                winRate: winRate.toFixed(2),
                avgPnl: avgPnl.toFixed(2),
                totalPnl: totalPnl.toFixed(2)
            };
        } catch (error) {
            console.error(`[TradingExecution] Error al generar resumen:`, error);
            throw error;
        }
    }
};

module.exports = tradingExecutionService;
