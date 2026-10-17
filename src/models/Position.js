const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
    ticker: {
        type: String,
        required: true,
        uppercase: true
    },
    side: {
        type: String,
        enum: ['buy'],
        default: 'buy'
    },
    entryPrice: {
        type: Number,
        required: true
    },
    stopLoss: {
        type: Number,
        required: true
    },
    takeProfit: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['open', 'closed'],
        default: 'open'
    },
    pnlPct: {
        type: Number,
        default: null
    },
    exitPrice: {
        type: Number,
        default: null
    },
    closedBy: {
        type: String,
        enum: ['sl', 'tp', 'manual', 'agent', null],
        default: null
    },
    closedReason: {
        type: String,
        default: null
    },
    openedAt: {
        type: Date,
        default: Date.now
    },
    closedAt: {
        type: Date,
        default: null
    }
});

positionSchema.index({ ticker: 1, status: 1 });

const Position = mongoose.model('Position', positionSchema);

module.exports = Position;