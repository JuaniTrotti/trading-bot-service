const express = require('express');
const router = express.Router();
const withaiWebhook = require('./webhook');

router.use('/', withaiWebhook);

router.get('/', (req, res) => {
    res.json({ 
        status: 'placeholder',
        message: '/testnet/withai - AI integration coming soon',
        endpoints: []
    });
});

module.exports = router;
