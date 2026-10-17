const Operation = require('../../models/Operation');
const Position = require('../../models/Position');

const performanceService = {
    async getAllOperations(limit = 100, offset = 0) {
        try {
            const operations = await Operation.find()
                .sort({ timestamp: -1 })
                .skip(offset)
                .limit(limit);
            return operations;
        } catch (error) {
            console.error('Error fetching operations:', error);
            return [];
        }
    },

    async getOperationByTicker(symbol) {
        try {
            const operation = await Operation.findOne({ symbol });
            return operation;
        } catch (error) {
            console.error('Error fetching operation:', error);
            return null;
        }
    },

    async getPerformanceSummary() {
        try {
            const operations = await Operation.find();
            const positions = await Position.find({ status: 'OPEN' });
            
            return {
                totalOperations: operations.length,
                openPositions: positions.length,
                summary: 'Performance data'
            };
        } catch (error) {
            console.error('Error fetching performance:', error);
            return { totalOperations: 0, openPositions: 0 };
        }
    }
};

module.exports = performanceService;
