const express = require('express');
const router = express.Router();
const agentLogService = require('../../shared/services/agentLogService');
const tradingExecutionService = require('../../shared/services/tradingExecutionService');

// GET /testnet/positions/open - Señales de compra confirmadas con toda la info de la IA
router.get('/open', async (req, res) => {
    try {
        const agentLogs = await agentLogService.getAllLogs(100);
        const confirmedBuys = agentLogs.filter(log => log.decision === 'CONFIRMED');

        res.json({
            success: true,
            count: confirmedBuys.length,
            positions: confirmedBuys
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /testnet/positions/closed - Señales de venta con toda la info de la IA
router.get('/closed', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const agentLogs = await agentLogService.getAllLogs(500);
        const exitLogs = agentLogs
            .filter(log => log.decision === 'EXIT')
            .slice(0, limit);

        res.json({
            success: true,
            count: exitLogs.length,
            positions: exitLogs
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /testnet/positions/performance - Resumen de performance
router.get('/performance', async (req, res) => {
    try {
        const summary = await tradingExecutionService.getPerformanceSummary();
        res.json({
            success: true,
            ...summary
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /testnet/positions/history - Historial completo con traces de compra y venta
router.get('/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const history = await tradingExecutionService.getTradeHistory(limit);
        res.json({
            success: true,
            count: history.length,
            trades: history
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
