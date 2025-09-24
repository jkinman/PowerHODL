# 🚀 Vercel + Neon Deployment Guide

## Quick Deploy to Vercel

### Option 1: One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/eth-btc-arbitrage-trader)

### Option 2: Manual Deployment

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/eth-btc-arbitrage-trader.git
   git push -u origin main
   ```

2. **Deploy to Vercel**:
   - Visit [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Click "Deploy"

## 🎯 What Gets Deployed

### Frontend (Static)
- **Dashboard**: Beautiful trading dashboard at `/`
- **Real-time**: Auto-refreshing signals and data
- **Responsive**: Works on desktop and mobile

### API Routes (Serverless)
- **`/api/signal`**: Current trading signals
- **`/api/backtest`**: Strategy backtesting
- **`/api/portfolio`**: Portfolio management

### Data Storage
- Historical data included in deployment
- Strategy results cached in serverless functions
- No database required for basic functionality

## ⚙️ Environment Configuration

### Optional Environment Variables
```bash
# API Keys (for fresh data collection)
BINANCE_API_KEY=your_binance_key
BINANCE_API_SECRET=your_binance_secret
KRAKEN_API_KEY=your_kraken_key
KRAKEN_API_SECRET=your_kraken_secret

# Performance Settings
NODE_ENV=production
FUNCTION_TIMEOUT=30
```

### Set in Vercel Dashboard
1. Go to your project settings
2. Click "Environment Variables"
3. Add keys (optional - works without them using cached data)

## 🔧 Vercel Configuration

The `vercel.json` configures:
- **Function Timeouts**: 30-60 seconds for complex operations
- **CORS Headers**: Allow cross-origin requests
- **Static Routing**: Serve dashboard from `/public`
- **API Routing**: Handle `/api/*` routes

## 📊 API Endpoints

### GET `/api/signal`
Returns current trading signal:
```json
{
  "signal": {
    "action": "BUY_ETH_SELL_BTC",
    "shouldTrade": true,
    "zScore": -1.89,
    "confidence": 0.78
  },
  "currentMarket": {
    "ethBtcRatio": 0.0385,
    "ethPrice": 2500,
    "btcPrice": 65000
  },
  "recommendation": "Execute BUY ETH SELL BTC with 49.79% of portfolio"
}
```

### GET `/api/backtest`
Returns strategy performance:
```json
{
  "performance": {
    "strategyReturn": "84.73%",
    "excessReturn": "32.55%",
    "sharpeRatio": "2.34",
    "totalTrades": 23
  },
  "cryptoAccumulation": {
    "cryptoGained": "23800 sats",
    "cryptoOutperformance": "15.45%"
  }
}
```

### POST `/api/portfolio`
Manage portfolio:
```json
{
  "action": "initialize",
  "ethAmount": 0.2,
  "btcAmount": 0.0077
}
```

## 🎯 Usage Examples

### Frontend Dashboard
Visit your Vercel URL to see the live dashboard with:
- Real-time trading signals
- Market data and Z-scores
- Strategy performance metrics
- Interactive controls

### API Integration
```javascript
// Get current signal
const signal = await fetch('https://your-app.vercel.app/api/signal');
const data = await signal.json();

if (data.signal.shouldTrade) {
    console.log(`Action: ${data.signal.action}`);
    console.log(`Confidence: ${data.signal.confidence * 100}%`);
}
```

### Webhook Integration
Use Vercel functions as webhooks for trading bots:
```bash
curl -X GET https://your-app.vercel.app/api/signal
```

## 🚨 Performance Considerations

### Serverless Limits
- **Timeout**: 30-60 seconds per function
- **Memory**: 1GB RAM per function
- **Cold Starts**: ~1-2 second delay on first request

### Optimization Tips
- Historical data is pre-loaded to avoid API calls
- Results are cached between requests
- Complex optimization runs locally, not on Vercel

### Scaling Considerations
- **Free Tier**: 100GB-hours/month function execution
- **Hobby Tier**: $20/month for unlimited functions
- **Pro Tier**: $20/month + usage for teams

## 🔄 Continuous Deployment

### Auto-Deploy on Push
- Every push to `main` branch triggers deployment
- Preview deployments for pull requests
- Rollback support for failed deployments

### Deployment Checks
```bash
# Test locally before deploying
npm run dev
npm run backtest

# Verify API endpoints
curl http://localhost:3000/api/signal
```

## 🛠️ Troubleshooting

### Common Issues

1. **Function Timeout**:
   ```json
   {
     "error": "Function execution timed out"
   }
   ```
   **Solution**: Increase timeout in `vercel.json` or optimize code

2. **Import Errors**:
   ```json
   {
     "error": "Cannot resolve module"
   }
   ```
   **Solution**: Check ES modules are properly configured

3. **CORS Issues**:
   ```json
   {
     "error": "Access denied"
   }
   ```
   **Solution**: CORS headers are configured in `vercel.json`

### Debug Mode
Add to environment variables:
```bash
DEBUG=true
VERBOSE_LOGGING=true
```

## 📈 Monitoring

### Vercel Analytics
- Function execution times
- Error rates and logs
- Usage metrics

### Custom Monitoring
```javascript
// Add to API functions
console.log('Function execution time:', Date.now() - startTime);
console.log('Memory usage:', process.memoryUsage());
```

## 🎯 Next Steps

### Phase 1: Basic Deployment ✅
- [x] Deploy to Vercel
- [x] API endpoints working
- [x] Dashboard functional

### Phase 2: Enhanced Features
- [ ] Real-time WebSocket data
- [ ] Database integration (PlanetScale)
- [ ] User authentication
- [ ] Portfolio tracking

### Phase 3: Production Ready
- [ ] Multiple exchange integration
- [ ] Advanced alerting
- [ ] Mobile app
- [ ] Paid subscription features

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Serverless Functions Guide](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Custom Domains](https://vercel.com/docs/concepts/projects/custom-domains)

---

**Your ETH/BTC Mega-Optimal Trading System is now ready for the cloud! 🚀**
