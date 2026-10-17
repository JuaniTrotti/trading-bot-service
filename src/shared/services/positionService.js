const Position = require('../../models/Position');

const positionService = {
    async hasOpenPosition(ticker) {
        try {
            const position = await Position.findOne({ ticker, status: 'OPEN' });
            return !!position;
        } catch (error) {
            console.error('Error checking position:', error);
            return false;
        }
    },

    async processBuySignal(event) {
        console.log('Processing BUY_SIGNAL:', event);
        return { action: 'BUY', status: 'processed' };
    },

    async processIndicatorExit(event) {
        console.log('Processing INDICATOR_EXIT:', event);
        return { action: 'SELL', status: 'processed' };
    }
};

module.exports = positionService;
