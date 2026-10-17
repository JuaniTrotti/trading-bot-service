const express = require('express');
const router = express.Router();
const webhook = require('./webhook');
const positions = require('./positions');

router.use('/', webhook);
router.use('/positions', positions);

router.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Trading Bot API - Testnet',
        endpoints: {
            webhook: 'POST /testnet/webhook/:ticker',
            positions: {
                open: 'GET /testnet/positions/open',
                closed: 'GET /testnet/positions/closed',
                performance: 'GET /testnet/positions/performance'
            },
            health: 'GET /testnet/health'
        }
    });
});

module.exports = router;
