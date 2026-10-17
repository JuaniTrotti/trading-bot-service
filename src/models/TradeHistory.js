const mongoose = require('mongoose');

const tradeHistorySchema = new mongoose.Schema({
    symbol: {
        type: String,
        required: true,
        uppercase: true
    },
    entryPrice: {
        type: Number,
        required: true
    },
    exitPrice: {
        type: Number,
        required: true
    },
    pnlPct: {
        type: Number,
        required: true
    },
    side: {
        type: String,
        enum: ['buy'],
        default: 'buy'
    },
    closedBy: {
        type: String,
        enum: ['agent', 'sl', 'tp', 'manual'],
        required: true
    },
    openedAt: {
        type: Date,
        required: true
    },
    closedAt: {
        type: Date,
        required: true
    },
    buyTrace: {
        type: mongoose.Schema.Types.Mixed
    },
    sellTrace: {
        type: mongoose.Schema.Types.Mixed
    }
});

tradeHistorySchema.index({ symbol: 1, closedAt: -1 });

const TradeHistory = mongoose.model('TradeHistory', tradeHistorySchema);

module.exports = TradeHistory;
