const fs = require('fs').promises;
const path = require('path');

const LOGS_DIR = path.join(process.cwd(), 'logs');

const logService = {
    async addLog(ticker, logEntry) {
        const tickerDir = path.join(LOGS_DIR, ticker);
        await fs.mkdir(tickerDir, { recursive: true });
        
        const logFile = path.join(tickerDir, 'logs.json');
        let logs = [];
        
        try {
            const data = await fs.readFile(logFile, 'utf8');
            logs = JSON.parse(data);
        } catch (error) {
            logs = [];
        }
        
        const newLog = {
            id: Date.now().toString(),
            ...logEntry
        };
        
        logs.push(newLog);
        
        await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
        return newLog;
    },

    getLogStats() {
        return { message: 'Log stats endpoint' };
    },

    getLogs(ticker, limit = 100, offset = 0) {
        return { ticker, limit, offset, logs: [] };
    },

    getLogById(ticker, id) {
        return null;
    },

    clearLogs(ticker) {
        return { success: true };
    }
};

module.exports = logService;
