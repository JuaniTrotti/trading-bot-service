const mongoose = require('mongoose');

const agentLogSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['BUY_SIGNAL', 'CHECK_SELL'],
        required: true
    },
    symbol: {
        type: String,
        required: true,
        uppercase: true
    },
    requestPayload: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    responsePayload: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    decision: {
        type: String,
        enum: ['CONFIRMED', 'REJECTED', 'EXIT', 'HOLD'],
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

agentLogSchema.index({ symbol: 1, timestamp: -1 });

const AgentLog = mongoose.model('AgentLog', agentLogSchema);

module.exports = AgentLog;
