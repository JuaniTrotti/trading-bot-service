const AgentLog = require('../../models/AgentLog');

const agentLogService = {
    /**
     * Log de interacción con el agente en MongoDB
     */
    async logInteraction({ type, symbol, requestPayload, responsePayload, decision }) {
        try {
            const logEntry = new AgentLog({
                type,
                symbol,
                requestPayload,
                responsePayload,
                decision,
                timestamp: new Date()
            });

            await logEntry.save();
            console.log(`[AgentLog] Logged ${type} for ${symbol} - Decision: ${decision}`);
        } catch (error) {
            console.error('[AgentLog] Error saving log:', error.message);
        }
    },

    /**
     * Obtener logs del agente por símbolo
     */
    async getLogs(symbol, limit = 100) {
        try {
            return await AgentLog.find({ symbol })
                .sort({ timestamp: -1 })
                .limit(limit);
        } catch (error) {
            console.error('[AgentLog] Error fetching logs:', error.message);
            return [];
        }
    },

    /**
     * Obtener todos los logs del agente
     */
    async getAllLogs(limit = 100) {
        try {
            return await AgentLog.find()
                .sort({ timestamp: -1 })
                .limit(limit);
        } catch (error) {
            console.error('[AgentLog] Error fetching logs:', error.message);
            return [];
        }
    }
};

module.exports = agentLogService;
