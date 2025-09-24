# ETH/BTC Trading System - API Documentation

## Overview

This document provides comprehensive documentation for the ETH/BTC Trading System's Vercel serverless API endpoints. The system implements a mega-optimal trading strategy based on Z-score mean reversion analysis, optimized through 250 iterations of genetic algorithm optimization.

## Base URL

```
Production: https://your-project.vercel.app
Development: http://localhost:3000
```

## Authentication

⚠️ **Current Implementation**: No authentication (demo only)

🔒 **Production Requirements**:
- API Key authentication (`X-API-Key` header)
- JWT tokens for user sessions
- Rate limiting (100 requests/hour per IP)
- HTTPS only

## API Endpoints

### 1. Trading Signal API

**Endpoint**: `GET /api/signal`

**Description**: Returns current ETH/BTC trading signal based on mega-optimal strategy

**Parameters**: None

**Response Structure**:
```json
{
  "timestamp": "2024-09-24T12:00:00.000Z",
  "currentMarket": {
    "ethBtcRatio": 0.063247,
    "ethPrice": 2456.78,
    "btcPrice": 38834.12,
    "dataAge": 300000
  },
  "signal": {
    "action": "BUY_ETH_SELL_BTC",
    "shouldTrade": true,
    "zScore": -1.425,
    "strength": "Strong",
    "confidence": 0.85,
    "reasoning": "ETH undervalued relative to BTC based on historical mean"
  },
  "strategy": {
    "zScoreThreshold": 1.258,
    "rebalanceAmount": "49.79%",
    "transactionCost": "1.66%"
  },
  "recommendation": "Execute BUY ETH / SELL BTC with 49.79% of portfolio",
  "metadata": {
    "processingTimeMs": 1247,
    "dataPoints": 365,
    "dataSource": "cached",
    "apiVersion": "1.0.0"
  }
}
```

**Signal Actions**:
- `BUY_ETH_SELL_BTC`: ETH is undervalued, sell BTC to buy ETH
- `SELL_ETH_BUY_BTC`: ETH is overvalued, sell ETH to buy BTC  
- `HOLD`: No strong signal, maintain current allocation

**Error Responses**:
```json
{
  "error": "Failed to generate trading signal",
  "message": "No market data available from any exchange",
  "category": "data_collection",
  "timestamp": "2024-09-24T12:00:00.000Z",
  "suggestion": "Try again in a few minutes or check exchange APIs"
}
```

**Usage Examples**:

```javascript
// Basic signal check
const signal = await fetch('/api/signal').then(r => r.json());
console.log(`Action: ${signal.signal.action}, Confidence: ${signal.signal.confidence}`);

// Trading bot integration
if (signal.signal.shouldTrade && signal.signal.confidence > 0.7) {
  console.log(`Execute ${signal.signal.action} with ${signal.strategy.rebalanceAmount}`);
}
```

---

### 2. Backtesting API

**Endpoint**: `GET /api/backtest` | `POST /api/backtest`

**Description**: Run strategy backtests with mega-optimal or custom parameters

#### GET Request (Mega-Optimal Parameters)

**Parameters**: None (uses optimized parameters)

#### POST Request (Custom Parameters)

**Request Body**:
```json
{
  "rebalanceThreshold": 0.3,
  "transactionCost": 0.02,
  "zScoreThreshold": 1.5
}
```

**Parameter Ranges**:
- `rebalanceThreshold`: 0.0 - 1.0 (percentage of portfolio to trade)
- `transactionCost`: 0.0 - 0.1 (trading fees as decimal)
- `zScoreThreshold`: 0.1 - 5.0 (standard deviations for signal trigger)

**Response Structure**:
```json
{
  "timestamp": "2024-09-24T12:00:00.000Z",
  "parameters": {
    "rebalanceThreshold": "49.79%",
    "transactionCost": "1.66%",
    "zScoreThreshold": "1.258"
  },
  "dataInfo": {
    "totalDays": 365,
    "startDate": "2023-09-24",
    "endDate": "2024-09-24",
    "backtestPeriod": "350 trading days"
  },
  "performance": {
    "strategyReturn": "23.45%",
    "benchmarkReturn": "8.12%",
    "excessReturn": "15.33%",
    "sharpeRatio": "1.847",
    "maxDrawdown": "-12.34%",
    "totalTrades": 47
  },
  "cryptoAccumulation": {
    "startingBTC": "0.015400",
    "strategyBTC": "0.019012",
    "buyHoldBTC": "0.016656",
    "cryptoGained": "361200 sats",
    "cryptoOutperformance": "14.15%"
  },
  "opportunities": {
    "total": 47,
    "profitable": 31,
    "winRate": "65.9%",
    "avgReturn": "2.34%"
  },
  "summary": {
    "isProfit": true,
    "beatsBenchmark": true,
    "cryptoAccumulated": true,
    "recommendation": "Strategy outperforms - Recommended for live trading"
  },
  "metadata": {
    "processingTimeMs": 3456,
    "dataPoints": 365,
    "backtestEngine": "ETHBTCAnalyzer",
    "parameterSource": "mega-optimal",
    "apiVersion": "1.0.0"
  }
}
```

**Usage Examples**:

```javascript
// Quick backtest with optimal parameters
const backtest = await fetch('/api/backtest').then(r => r.json());
console.log(`Strategy Return: ${backtest.performance.strategyReturn}`);

// Custom parameter testing
const customBacktest = await fetch('/api/backtest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rebalanceThreshold: 0.4,
    transactionCost: 0.015,
    zScoreThreshold: 1.0
  })
}).then(r => r.json());

// Parameter optimization loop
const results = [];
for (let threshold = 0.5; threshold <= 2.0; threshold += 0.1) {
  const result = await fetch('/api/backtest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zScoreThreshold: threshold })
  }).then(r => r.json());
  
  results.push({
    threshold,
    excessReturn: parseFloat(result.performance.excessReturn)
  });
}
```

---

### 3. Portfolio Management API

**Endpoint**: `GET /api/portfolio` | `POST /api/portfolio`

**Description**: Manage portfolio state and execute trades

⚠️ **Demo Implementation**: Uses in-memory state. Production requires database integration.

#### GET Request (Portfolio Status)

**Parameters**: None

**Response Structure**:
```json
{
  "timestamp": "2024-09-24T12:00:00.000Z",
  "portfolio": {
    "ethAmount": "0.2000",
    "btcAmount": "0.007700",
    "ethValueBTC": "0.012649",
    "totalValueBTC": "0.020349",
    "allocation": {
      "ethPercent": "62.1%",
      "btcPercent": "37.9%"
    }
  },
  "currentMarket": {
    "ethBtcRatio": "0.063247",
    "ethPrice": 2456.78,
    "btcPrice": 38834.12
  },
  "signal": {
    "action": "SELL_ETH_BUY_BTC",
    "shouldTrade": true,
    "zScore": "1.4250",
    "confidence": "78.5%"
  },
  "stats": {
    "totalTrades": 3,
    "lastUpdate": "2024-09-24T11:30:00.000Z"
  },
  "metadata": {
    "processingTimeMs": 456,
    "portfolioInitialized": true,
    "apiVersion": "1.0.0"
  }
}
```

#### POST Request (Initialize Portfolio)

**Request Body**:
```json
{
  "action": "initialize",
  "ethAmount": 0.5,
  "btcAmount": 0.01
}
```

**Response**:
```json
{
  "message": "Portfolio initialized successfully",
  "portfolio": {
    "ethAmount": "0.5000",
    "btcAmount": "0.010000",
    "initialized": true
  },
  "timestamp": "2024-09-24T12:00:00.000Z",
  "nextSteps": {
    "checkStatus": "GET /api/portfolio",
    "executeTrade": "POST /api/portfolio with action: \"trade\""
  }
}
```

#### POST Request (Execute Trade)

**Request Body**:
```json
{
  "action": "trade",
  "executeTrade": true
}
```

**Response (Trade Executed)**:
```json
{
  "message": "Trade executed successfully",
  "trade": {
    "action": "SELL_ETH_BUY_BTC",
    "zScore": "1.4250",
    "tradeValueBTC": "0.010134",
    "feesBTC": "0.000168"
  },
  "newPortfolio": {
    "ethAmount": "0.3398",
    "btcAmount": "0.020000",
    "totalValueBTC": "0.041489"
  },
  "timestamp": "2024-09-24T12:00:00.000Z"
}
```

**Response (No Trade Signal)**:
```json
{
  "message": "No trade signal - holding current position",
  "signal": {
    "action": "HOLD",
    "zScore": "0.3421",
    "confidence": "34.2%",
    "reasoning": "Z-score within normal range - no rebalancing needed"
  },
  "currentPortfolio": {
    "ethAmount": "0.2000",
    "btcAmount": "0.007700"
  },
  "timestamp": "2024-09-24T12:00:00.000Z"
}
```

**Usage Examples**:

```javascript
// Check portfolio status
const portfolio = await fetch('/api/portfolio').then(r => r.json());
if (!portfolio.initialized) {
  // Initialize portfolio
  await fetch('/api/portfolio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'initialize',
      ethAmount: 1.0,
      btcAmount: 0.025
    })
  });
}

// Execute trade if signal is strong
if (portfolio.signal.shouldTrade && parseFloat(portfolio.signal.confidence) > 70) {
  const tradeResult = await fetch('/api/portfolio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'trade',
      executeTrade: true
    })
  }).then(r => r.json());
  
  if (tradeResult.trade) {
    console.log(`Trade executed: ${tradeResult.trade.action}`);
  }
}
```

---

## Error Handling

All endpoints return consistent error structures:

```json
{
  "error": "Operation failed",
  "message": "Detailed error description",
  "category": "error_type",
  "timestamp": "2024-09-24T12:00:00.000Z",
  "suggestion": "Recommended action to resolve"
}
```

**Common Error Categories**:
- `data_collection`: Market data unavailable
- `parameter_validation`: Invalid input parameters
- `network`: Connection issues
- `timeout`: Request timeout
- `rate_limit`: Too many requests
- `memory_limit`: Server resource limits

**HTTP Status Codes**:
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `405`: Method Not Allowed
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

---

## Rate Limiting

**Current Limits** (demo):
- No rate limiting implemented

**Production Recommendations**:
- `/api/signal`: 60 requests/hour per IP
- `/api/backtest`: 10 requests/hour per IP (computationally expensive)
- `/api/portfolio`: 100 requests/hour per authenticated user

---

## Performance Metrics

**Typical Response Times**:
- `/api/signal`: 500-2000ms (data dependent)
- `/api/backtest`: 2000-8000ms (parameter dependent)
- `/api/portfolio`: 300-800ms

**Vercel Limits**:
- Execution Time: 10s (Hobby), 60s (Pro)
- Memory: 1024MB
- Request Size: 4.5MB

---

## Security Considerations

**Current Implementation** (Demo):
- ⚠️ No authentication
- ⚠️ In-memory portfolio state
- ⚠️ No input sanitization beyond basic validation

**Production Requirements**:

1. **Authentication & Authorization**:
   ```javascript
   // API Key authentication
   headers: {
     'X-API-Key': 'your-api-key',
     'Content-Type': 'application/json'
   }
   
   // JWT for user sessions
   headers: {
     'Authorization': 'Bearer jwt-token',
     'Content-Type': 'application/json'
   }
   ```

2. **Data Storage**:
   - Database integration (PostgreSQL/MongoDB)
   - Encrypted sensitive data
   - Audit logs for all trades

3. **Input Validation**:
   - Schema validation (Joi, Yup)
   - SQL injection prevention
   - XSS protection

4. **Rate Limiting**:
   ```javascript
   // Redis-based rate limiting
   const rateLimit = require('express-rate-limit');
   ```

---

## Integration Examples

### Trading Bot Integration

```javascript
class ETHBTCTradingBot {
  constructor(apiBaseUrl) {
    this.apiUrl = apiBaseUrl;
    this.confidenceThreshold = 0.75;
  }
  
  async checkAndTrade() {
    try {
      // Get current signal
      const signal = await fetch(`${this.apiUrl}/api/signal`)
        .then(r => r.json());
      
      if (signal.signal.shouldTrade && 
          signal.signal.confidence > this.confidenceThreshold) {
        
        // Execute trade
        const result = await fetch(`${this.apiUrl}/api/portfolio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'trade',
            executeTrade: true
          })
        }).then(r => r.json());
        
        console.log(`Trade executed: ${result.trade?.action || 'Failed'}`);
        return result;
      }
      
      console.log('No trade signal');
      return null;
      
    } catch (error) {
      console.error('Trading bot error:', error);
      throw error;
    }
  }
  
  async runBacktest(customParams = {}) {
    const result = await fetch(`${this.apiUrl}/api/backtest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customParams)
    }).then(r => r.json());
    
    return result;
  }
}

// Usage
const bot = new ETHBTCTradingBot('https://your-project.vercel.app');
setInterval(() => bot.checkAndTrade(), 5 * 60 * 1000); // Every 5 minutes
```

### Dashboard Integration

```javascript
class TradingDashboard {
  constructor() {
    this.apiUrl = window.location.origin;
  }
  
  async updateDashboard() {
    const [signal, portfolio] = await Promise.all([
      fetch('/api/signal').then(r => r.json()),
      fetch('/api/portfolio').then(r => r.json())
    ]);
    
    this.updateSignalDisplay(signal);
    this.updatePortfolioDisplay(portfolio);
  }
  
  updateSignalDisplay(signal) {
    const signalElement = document.getElementById('current-signal');
    signalElement.className = `signal-${signal.signal.action.toLowerCase()}`;
    signalElement.innerHTML = `
      <h3>${signal.signal.action.replace('_', ' ')}</h3>
      <p>Confidence: ${(signal.signal.confidence * 100).toFixed(1)}%</p>
      <p>Z-Score: ${signal.signal.zScore.toFixed(4)}</p>
    `;
  }
  
  updatePortfolioDisplay(portfolio) {
    document.getElementById('eth-balance').textContent = portfolio.portfolio.ethAmount;
    document.getElementById('btc-balance').textContent = portfolio.portfolio.btcAmount;
    document.getElementById('total-value').textContent = portfolio.portfolio.totalValueBTC;
  }
}

// Auto-refresh dashboard
const dashboard = new TradingDashboard();
dashboard.updateDashboard();
setInterval(() => dashboard.updateDashboard(), 60000); // Every minute
```

---

## Deployment

The API is deployed as Vercel serverless functions. See `DEPLOYMENT.md` for complete setup instructions.

**Environment Variables** (production):
```bash
# Exchange API Keys (encrypted)
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET_KEY=your_binance_secret

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Authentication
JWT_SECRET=your_jwt_secret
API_KEY_HASH=bcrypt_hash_of_api_key
```

---

## Support

For API issues or feature requests:

1. Check the error response `category` and `suggestion` fields
2. Verify parameters match the documented ranges
3. Check network connectivity to exchange APIs
4. Monitor Vercel function logs for detailed error traces

**Common Solutions**:
- `data_collection` errors: Wait 5-10 minutes and retry
- `timeout` errors: Use cached data or reduce backtest period
- `parameter_validation` errors: Check parameter ranges in documentation
- `rate_limit` errors: Implement exponential backoff in your client
