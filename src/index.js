require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./shared/config/db');
const prodRoutes = require('./prod');
const testnetRoutes = require('./testnet/routes');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

connectDB();

app.use(cors());
app.use(express.json());

// ============================================
// RUTAS DE PRODUCCIÓN (/prod)
// ============================================
app.use('/prod', prodRoutes);

// ============================================
// RUTAS DE TESTNET (/testnet)
// ============================================
app.use('/testnet', testnetRoutes);

app.listen(PORT, HOST, () => {
    console.log(`\n🚀 Trading Bot API running on http://${HOST}:${PORT}\n`);
    console.log(`\n=== ENDPOINTS ===`);
    console.log(`\n[PROD]`);
    console.log(`  GET  /prod/                       - Welcome JSON`);
    console.log(`\n[TESTNET]`);
    console.log(`  POST /testnet/webhook/:ticker    - Receive TradingView webhook + Binance context`);
    console.log(`  GET  /testnet/health             - Health check`);
});
