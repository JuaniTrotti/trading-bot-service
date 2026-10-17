const express = require('express');
const router = express.Router();
const welcome = require('./welcome.json');

router.get('/', (req, res) => {
    res.json(welcome);
});

module.exports = router;
