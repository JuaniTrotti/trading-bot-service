# Trading Bot API - Logger

> API REST para un bot de trading automatizado con TradingView, Binance Futures y un Agente IA de confirmación de señales.

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [¿Por qué existe este proyecto?](#-por-qué-existe-este-proyecto)
- [Arquitectura General](#-arquitectura-general)
- [Componentes Principales](#-componentes-principales)
- [Flujo de Trading](#-flujo-de-trading)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Modelos de Datos](#-modelos-de-datos)
- [Endpoints de la API](#-endpoints-de-la-api)
- [Configuración](#-configuración)
- [Instalación y Ejecución](#-instalación-y-ejecución)
- [Seguridad](#-seguridad)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)

---

## 📝 Descripción

**Trading Bot API - Logger** es una API REST desarrollada en Node.js/Express que actúa como el puente central entre:

1. **TradingView** (alertas y webhooks)
2. **Binance Futures API** (contexto de mercado en tiempo real)
3. **Agente IA Externo** (confirmación inteligente de señales de compra/venta)

El proyecto registra, monitorea y gestiona operaciones de trading en **Futuros de Binance** (testnet y producción), utilizando un agente de IA para validar señales antes de ejecutarlas.

---

## 🔍 ¿Por qué existe este proyecto?

Este proyecto implementa un **sistema de confirmación en 3 capas** para trading automatizado:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   TradingView   │────▶│  Trading Bot API │────▶│  Agente IA      │
│   (Webhooks)   │     │  (Logger)        │     │  (Validación)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Binance Futures │
                        │  (Ejecución)     │
                        └──────────────────┘
```

1. **Capa 1 - TradingView**: Envía webhooks con señales de compra/venta
2. **Capa 2 - Trading Bot API**: Recibe la señal y consulta contexto adicional de Binance (precio, order flow, open interest, ratio long/short, funding rate, tendencia de BTC)
3. **Capa 3 - Agente IA**: Valida la señal combinando datos de TradingView + Binance y decide si confirmar o rechazar

### Beneficios Clave

| Beneficio | Descripción |
|-----------|-------------|
| **Validación inteligente** | El agente IA valida cada señal antes de ejecutarla |
| **Contexto completo** | Combina datos de TradingView con contexto real de Binance |
| **Trazabilidad** | Cada decisión del agente queda registrada con su reasoning |
| **Monitoreo activo** | Polling periódico al agente durante posiciones abiertas |
| **Logging estructurado** | Historial completo de señales, confirmaciones y rechazos |

---

## 🏗 Arquitectura General

```
                              ┌─────────────────────────────────────┐
                              │          TRADING BOT API            │
                              │              (Logger)                │
                              │                                     │
┌─────────────┐               │  ┌─────────────┐  ┌─────────────┐  │
│ TradingView │──────────────▶│  │   Webhook   │  │  Positions  │  │
│ (Webhooks)  │               │  │   Handler   │  │   Routes    │  │
└─────────────┘               │  └──────┬──────┘  └──────┬──────┘  │
                              │         │                │         │
                              │  ┌──────▼────────────────▼──────┐  │
                              │  │       Services Layer          │  │
                              │  │                               │  │
                              │  │  ┌─────────────────────────┐  │  │
                              │  │  │   binanceService        │  │  │
                              │  │  │   (contexto de mercado) │  │  │
                              │  │  └─────────────────────────┘  │  │
                              │  │  ┌─────────────────────────┐  │  │
                              │  │  │   agentService          │  │  │
                              │  │  │   (llamadas al agente)  │  │  │
                              │  │  └─────────────────────────┘  │  │
                              │  │  ┌─────────────────────────┐  │  │
                              │  │  │ tradingSessionService   │  │  │
                              │  │  │ (control de estado)    │  │  │
                              │  │  └─────────────────────────┘  │  │
                              │  │  ┌─────────────────────────┐  │  │
                              │  │  │ tradingExecutionService │  │  │
                              │  │  │ (persistencia)          │  │  │
                              │  │  └─────────────────────────┘  │  │
                              │  └───────────────────────────────┘  │
                              └─────────────────────────────────────┘
                                        │              │
                                        ▼              ▼
                              ┌─────────────┐  ┌─────────────────────┐
                              │   MongoDB   │  │   Agente IA        │
                              │  (datos)    │  │   (validación)     │
                              └─────────────┘  └─────────────────────┘
```

---

## 🧩 Componentes Principales

### 1. Services

#### `binanceService.js`
Obtiene contexto de mercado desde Binance Futures API:

| Método | Descripción |
|--------|-------------|
| `getBinanceContextData(symbol)` | Consulta 7 endpoints de Binance en paralelo |

**Datos obtenidos:**
- `symbol_price`: Precio actual del activo
- `order_flow`: Delta de volumen (buyer vs seller)
- `derivatives`: Open Interest, Long/Short ratio, Funding Rate
- `order_book`: Best bid/ask, spread, liquidez
- `btc_context`: Precio de BTC y cambio en 5m (referencia macro)

#### `agentService.js`
Helper para comunicar con la API del Agente IA externo:

| Método | Descripción |
|--------|-------------|
| `agentRequest(endpoint, payload)` | Envía requests autenticados al agente |

#### `tradingSessionService.js`
Controla el estado del ciclo de trading:

| Método | Descripción |
|--------|-------------|
| `onBuyConfirmed()` | Registra compra y comienza polling |
| `startSellPolling()` | Inicia checks cada 40 segundos |
| `checkSellSignal()` | Consulta al agente si debe vender |
| `executeSell()` | Registra la venta y limpia el estado |
| `stopMonitoring()` | Detiene el monitoreo manualmente |

**Estados posibles:**
- `IDLE`: Sin operación activa
- `SELL_PENDING`: Compra ejecutada, esperando señal de venta

#### `tradingExecutionService.js`
Persiste las operaciones en MongoDB:

| Método | Descripción |
|--------|-------------|
| `executeBuy()` | Registra una compra abierta |
| `executeSell()` | Registra venta y cierra posición |
| `getOpenPosition()` | Obtiene posición abierta de un símbolo |
| `getOpenPositions()` | Lista todas las posiciones abiertas |
| `getClosedPositions()` | Lista posiciones cerradas |
| `getTradeHistory()` | Historial con traces completos |
| `getPerformanceSummary()` | Estadísticas de trading |
| `registerRejectedBuy()` | Log de señales rechazadas |

#### `agentLogService.js`
Logging de las interacciones con el agente IA:

| Método | Descripción |
|--------|-------------|
| `logInteraction()` | Registra request/response del agente |
| `getLogs(symbol)` | Logs por símbolo |
| `getAllLogs()` | Todos los logs del agente |

### 2. Routes

#### Testnet Routes (`/testnet`)

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/webhook/:ticker` | POST | Recibe alertas de TradingView |
| `/positions/open` | GET | Posiciones abiertas (compras confirmadas) |
| `/positions/closed` | GET | Posiciones cerradas (ventas ejecutadas) |
| `/positions/history` | GET | Historial completo con traces |
| `/positions/performance` | GET | Resumen de performance |
| `/health` | GET | Health check |

#### Prod Routes (`/prod`)

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/` | GET | Welcome JSON |

### 3. Models (MongoDB)

#### `Position`
Representa una posición abierta o cerrada.

```javascript
{
  ticker: "BTCUSDT",        // Símbolo
  side: "buy",              // Solo long por ahora
  entryPrice: 50000,        // Precio de entrada
  stopLoss: 49000,         // Stop loss
  takeProfit: 52000,       // Take profit
  status: "open",          // "open" | "closed"
  pnlPct: null,            // PnL porcentaje
  exitPrice: null,         // Precio de salida
  closedBy: null,          // "sl" | "tp" | "manual" | "agent"
  closedReason: null,      // Razón del cierre
  openedAt: Date,          // Timestamp de apertura
  closedAt: null           // Timestamp de cierre
}
```

#### `TradeHistory`
Historial de operaciones completadas con trazabilidad completa.

```javascript
{
  symbol: "BTCUSDT",
  entryPrice: 50000,
  exitPrice: 51500,
  pnlPct: 3.0,
  side: "buy",
  closedBy: "agent",       // Quién/initió el cierre
  openedAt: Date,
  closedAt: Date,
  buyTrace: { ... },        // Respuesta completa del agente en compra
  sellTrace: { ... }        // Respuesta completa del agente en venta
}
```

#### `Operation`
Agregación de operaciones por símbolo.

```javascript
{
  ticker: "BTCUSDT",
  totalOperations: 10,
  wins: 7,
  losses: 3,
  totalPnlPct: 15.5,
  trades: [ ... ]           // Array de trades individuales
}
```

#### `AgentLog`
Log de cada interacción con el agente IA.

```javascript
{
  type: "BUY_SIGNAL",       // "BUY_SIGNAL" | "CHECK_SELL"
  symbol: "BTCUSDT",
  requestPayload: { ... },  // Lo que se envió al agente
  responsePayload: { ... }, // Lo que respondió el agente
  decision: "CONFIRMED",    // "CONFIRMED" | "REJECTED" | "EXIT" | "HOLD"
  timestamp: Date
}
```

---

## 🔄 Flujo de Trading

### Flujo de Compra (BUY_SIGNAL)

```
1. TradingView detecta señal de compra
   │
   ▼
2. TradingView envía POST /testnet/webhook/:ticker
   Payload: { price, stop_loss, take_profit, ... }
   │
   ▼
3. API responde 200 OK inmediatamente
   (procesa en background con setImmediate)
   │
   ▼
4. API limpia el ticker (ej: "BINANCE:BTCUSDT.P" → "BTCUSDT")
   │
   ▼
5. API consulta Binance para obtener contexto de mercado
   - Precio actual
   - Order flow (delta de volumen)
   - Open Interest
   - Long/Short ratio
   - Order book depth
   - Funding rate
   - Contexto de BTC
   │
   ▼
6. API arma payload combinado y envía al Agente IA
   /v1/confirm-signal
   Payload: { tradingview_data, binance_context }
   │
   ▼
7. Agente IA responde con decisión:
   - decision: true/false
   - score: confianza (0-100)
   - reasoning: explicación de la decisión
   │
   ▼
8. Si CONFIRMADO (decision: true):
   ├─ Se registra compra en MongoDB (Position)
   ├─ Se inicia polling cada 40s para checks de venta
   └─ Se loguea en AgentLog como CONFIRMED
   │
   ▼
9. Si RECHAZADO (decision: false):
   ├─ Se registra en TradeHistory como "rejected"
   └─ Se loguea en AgentLog como REJECTED
```

### Flujo de Venta (CHECK_SELL - Polling)

```
1. Cada 40 segundos, API consulta contexto de Binance
   │
   ▼
2. API envía al Agente IA:
   /v1/check-sell
   Payload: { symbol, entry_price, current_price, binance_context }
   │
   ▼
3. Agente IA responde:
   - decision: true (EXIT) / false (HOLD)
   - pnl_percent: PnL actual estimado
   - score: confianza
   │
   ▼
4. Si decision: true (EXIT):
   ├─ Se registra venta en MongoDB
   ├─ Se cierra Position
   ├─ Se crea TradeHistory con buyTrace + sellTrace
   └─ Se detiene polling
   │
   ▼
5. Si decision: false (HOLD):
   └─ Se espera siguiente polling (40s)
```

---

## 📁 Estructura del Proyecto

```
logger/
├── .env                     # Variables de entorno (NO commitear)
├── .gitignore               # Archivos ignorados por git
├── env.example              # Template de variables de entorno
├── package.json             # Dependencias y scripts
├── README.md                # Este archivo
│
└── src/
    ├── index.js             # Entry point - servidor Express
    │
    ├── prod/
    │   ├── index.js         # Rutas de producción
    │   └── welcome.json     # JSON de bienvenida
    │
    ├── testnet/
    │   └── routes/
    │       ├── index.js     # Router principal de testnet
    │       ├── webhook.js   # Handler de webhooks de TradingView
    │       └── positions.js # Rutas de posiciones e historial
    │
    ├── shared/
    │   ├── config/
    │   │   └── db.js        # Conexión a MongoDB
    │   │
    │   └── services/
    │       ├── binanceService.js        # API de Binance
    │       ├── agentService.js          # Comunicación con Agente IA
    │       ├── agentLogService.js       # Logging del agente
    │       ├── tradingSessionService.js # Control de sesión
    │       ├── tradingExecutionService.js # Persistencia
    │       ├── positionService.js       # Service de posiciones
    │       ├── performanceService.js    # Estadísticas
    │       └── logService.js            # Servicio de logs (archivo)
    │
    └── models/
        ├── Position.js      # Modelo de posición
        ├── TradeHistory.js  # Modelo de historial
        ├── Operation.js     # Modelo de operaciones agregadas
        └── AgentLog.js      # Modelo de logs del agente

```

---

## 🗄 Modelos de Datos

### Position Schema

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ticker` | String | Símbolo del par (ej: "BTCUSDT") |
| `side` | String | Lado de la operación ("buy") |
| `entryPrice` | Number | Precio de entrada |
| `stopLoss` | Number | Precio de stop loss |
| `takeProfit` | Number | Precio de take profit |
| `status` | String | "open" o "closed" |
| `pnlPct` | Number | Porcentaje de ganancia/pérdida |
| `exitPrice` | Number | Precio de salida |
| `closedBy` | String | Qué(initió el cierre |
| `closedReason` | String | Razón del cierre |
| `openedAt` | Date | Timestamp de apertura |
| `closedAt` | Date | Timestamp de cierre |

**Índices:** `{ ticker: 1, status: 1 }`

### TradeHistory Schema

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `symbol` | String | Símbolo |
| `entryPrice` | Number | Precio de entrada |
| `exitPrice` | Number | Precio de salida |
| `pnlPct` | Number | PnL porcentaje |
| `side` | String | Lado |
| `closedBy` | String | Quién(initió el cierre |
| `openedAt` | Date | Inicio de la operación |
| `closedAt` | Date | Cierre de la operación |
| `buyTrace` | Mixed | Respuesta completa del agente al comprar |
| `sellTrace` | Mixed | Respuesta completa del agente al vender |

**Índices:** `{ symbol: 1, closedAt: -1 }`

### AgentLog Schema

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `type` | String | "BUY_SIGNAL" o "CHECK_SELL" |
| `symbol` | String | Símbolo |
| `requestPayload` | Mixed | Request enviado al agente |
| `responsePayload` | Mixed | Response del agente |
| `decision` | String | "CONFIRMED", "REJECTED", "EXIT", "HOLD" |
| `timestamp` | Date | Timestamp |

**Índices:** `{ symbol: 1, timestamp: -1 }`

---

## 🌐 Endpoints de la API

### Endpoints de Producción

#### `GET /prod`
Welcome endpoint.

**Response:**
```json
{
  "message": "Welcome to Trading Bot API",
  "version": "2.0.0",
  "environment": "production"
}
```

---

### Endpoints de Testnet

#### `POST /testnet/webhook/:ticker`
Recibe webhooks de TradingView.

**Parámetros:**
- `ticker` (path): Símbolo del par (ej: "BTCUSDT" o "BINANCE:BTCUSDT.P")

**Body (TradingView payload):**
```json
{
  "price": 50000,
  "stop_loss": 49000,
  "take_profit": 52000,
  "volume": 1000,
  "RSI": 45.5,
  "MACD": "bullish"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "received": true,
  "ticker": "BTCUSDT",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

#### `GET /testnet/positions/open`
Lista posiciones abiertas (compras confirmadas por el agente).

**Response:**
```json
{
  "success": true,
  "count": 2,
  "positions": [
    {
      "_id": "...",
      "type": "BUY_SIGNAL",
      "symbol": "BTCUSDT",
      "decision": "CONFIRMED",
      "requestPayload": { ... },
      "responsePayload": { ... },
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

#### `GET /testnet/positions/closed`
Lista posiciones cerradas (ventas ejecutadas).

**Query params:**
- `limit` (opcional): Límite de resultados (default: 50)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "positions": [...]
}
```

---

#### `GET /testnet/positions/history`
Historial completo de operaciones con traces.

**Query params:**
- `limit` (opcional): Límite de resultados (default: 50)

**Response:**
```json
{
  "success": true,
  "count": 15,
  "trades": [
    {
      "_id": "...",
      "symbol": "BTCUSDT",
      "entryPrice": 50000,
      "exitPrice": 51500,
      "pnlPct": 3.0,
      "closedBy": "agent",
      "openedAt": "2024-01-15T10:30:00.000Z",
      "closedAt": "2024-01-15T12:00:00.000Z",
      "buyTrace": { ... },
      "sellTrace": { ... }
    }
  ]
}
```

---

#### `GET /testnet/positions/performance`
Resumen de estadísticas de trading.

**Response:**
```json
{
  "success": true,
  "totalOperations": 25,
  "wins": 18,
  "losses": 7,
  "winRate": "72.00",
  "avgPnl": "1.85",
  "totalPnl": "46.25"
}
```

---

#### `GET /testnet/health`
Health check del servicio.

**Response:**
```json
{
  "status": "ok",
  "environment": "testnet/withai"
}
```

---

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` basado en `env.example`:

```bash
# Puerto y host del servidor
PORT=3000
HOST=0.0.0.0

# URI de MongoDB
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/

# Entorno
NODE_ENV=development

# URL del Agente IA
AGENT_API_URL=http://localhost:8000

# Secret para autenticación con el Agente IA
AGENT_API_SECRET=tu_api_secret_key
```

### env.example

```bash
PORT=3000
HOST=0.0.0.0
MONGODB_URI=mongodb+srv://your_user:your_password@your_cluster.mongodb.net/
NODE_ENV=development
AGENT_API_URL=http://localhost:8000
AGENT_API_SECRET=your_api_secret_key
```

---

## 🚀 Instalación y Ejecución

### Prerrequisitos

- Node.js 18+
- MongoDB (local o Atlas)
- Agente IA corriendo en `AGENT_API_URL`

### Instalación

```bash
# 1. Clonar el repositorio
git clone <repo_url>
cd logger

# 2. Instalar dependencias
npm install

# 3. Crear archivo .env
cp env.example .env

# 4. Editar .env con tus credenciales
```

### Ejecución

```bash
# Modo desarrollo (con --watch para auto-reload)
npm run dev

# Modo producción
npm start
```

### Verificar que está corriendo

```bash
curl http://localhost:3000/prod
curl http://localhost:3000/testnet/health
```

---

## 🔒 Seguridad

### Medidas implementadas

1. **Variables de entorno para secrets**: `.env` no se committea
2. **Autenticación con Agente IA**: Bearer token en headers
3. **CORS habilitado**: Para permitir requests de orígenes confiables
4. **No exposición de credenciales**: En responses de API

### Recomendaciones

- [ ] Implementar autenticación en endpoints (JWT/API Key)
- [ ] Validación de payloads de TradingView
- [ ] Rate limiting en endpoints
- [ ] HTTPS en producción
- [ ] Webhook signature verification (TradingView)

---

## 🛠 Tecnologías Utilizadas

| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Node.js** | 18+ | Runtime |
| **Express** | ^4.21.0 | Framework web |
| **Mongoose** | ^8.8.0 | ODM para MongoDB |
| **dotenv** | ^16.4.5 | Variables de entorno |
| **cors** | ^2.8.5 | CORS middleware |
| **uuid** | ^10.0.0 | Generación de IDs |
| **MongoDB** | - | Base de datos |
| **Binance Futures API** | - | Datos de mercado |

---

## 📊 Diagrama de Flujo Completo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TRADING BOT API                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   TRADINGVIEW                          AGENTE IA                             │
│   ──────────                           ─────────                             │
│   Webhook ──────────────────────────▶  /v1/confirm-signal                   │
│   Alert                                  │                                    │
│   with                                   ▼                                    │
│   price,                              ┌─────────┐                             │
│   stop_loss,        Context Data ◀───▶│ binance │                            │
│   take_profit                         │Service  │                            │
│                                      └────┬────┘                             │
│                                           │                                   │
│   BUY_SIGNAL ◀───────────────────────────┘                                   │
│   decision=                                           /v1/check-sell        │
│   CONFIRM/                                           ◀──────────────────────│
│   REJECT                                             40s polling            │
│        │                                                                  │
│        │ confirmed                   ┌──────────────────────┐              │
│        ▼                             │ tradingSession      │              │
│   ┌─────────┐                        │ Service             │              │
│   │Position │                        │                     │              │
│   │Created  │                        │ IDLE ────▶ MONITOR  │              │
│   └────┬────┘                        │           │         │              │
│        │                             │           ▼         │              │
│        │ 40s polling                  │       SELL_PENDING  │              │
│        ├────────────────────────────▶│           │         │              │
│        │                             └───────────┼─────────┘              │
│        │                                       │                            │
│        │ decision=EXIT                         │ executeSell               │
│        │ ◀──────────────────────────────────────┘                            │
│        │                                                                  │
│        ▼                                                                  │
│   ┌──────────┐     ┌────────────────┐                                      │
│   │ Position │     │  TradeHistory  │                                      │
│   │ Closed   │────▶│  (with traces) │                                      │
│   └──────────┘     └────────────────┘                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📌 Notas de Desarrollo

### Por qué MongoDB?

- **Flexibilidad de esquemas**: Los traces del agente pueden variar en estructura
- **Documentos embebidos**: buyTrace y sellTrace se almacenan con el documento
- **Consultas eficientes**: Índices en symbol + status y symbol + timestamp

### Por qué setImmediate()?

El webhook responde inmediatamente a TradingView para evitar timeouts, pero el procesamiento real ocurre en el siguiente ciclo de eventos. Esto es crucial porque:

1. TradingView tiene timeout de respuesta
2. Las llamadas a Binance y Agente IA pueden tardar
3. No queremos que TradingView reintente por lento ACK

### Estado SINGULAR

El sistema solo maneja UNA posición a la vez (`currentSymbol`). Esto es intencional para:
- Simplificar la lógica de trading
- Evitar conflictos de órdenes
- Mantener el polling simple

---

## 🤝 Contribuir

1. Fork el repositorio
2. Crear branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

---

## 📄 Licencia

MIT License

---

**Versión:** 2.0.0  
**Última actualización:** Enero 2024
