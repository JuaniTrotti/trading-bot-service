const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
    positionId: {
        type: mongoose.Schema.Types.ObjectId,
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
    closedBy: {
        type: String,
        enum: ['sl', 'tp', 'manual'],
        required: true
    }
});

const operationSchema = new mongoose.Schema({
    ticker: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    totalOperations: {
        type: Number,
        default: 0
    },
    wins: {
        type: Number,
        default: 0
    },
    losses: {
        type: Number,
        default: 0
    },
    totalPnlPct: {
        type: Number,
        default: 0
    },
    trades: [tradeSchema]
});

operationSchema.virtual('winRate').get(function() {
    if (this.totalOperations === 0) return 0;
    return this.wins / this.totalOperations;
});

operationSchema.virtual('avgPnlPct').get(function() {
    if (this.totalOperations === 0) return 0;
    return this.totalPnlPct / this.totalOperations;
});

operationSchema.set('toJSON', { virtuals: true });

const Operation = mongoose.model('Operation', operationSchema);

module.exports = Operation;