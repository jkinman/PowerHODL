# 📋 ETH/BTC Trading System - Scripts Guide

## 🚀 **Updated Package.json Scripts**

### **📊 Core Trading Scripts (Legacy - Still Work)**
```bash
# Run the main trading analysis
yarn start                    # Full trading system analysis

# Individual components
yarn collect                  # Collect fresh market data
yarn analyze                  # Analyze existing data  
yarn optimize                 # Run parameter optimization
yarn backtest                 # Run crypto-only backtest
yarn strategy                 # Load and display strategy
```

### **🔧 Development Scripts (New)**
```bash
# Primary development
yarn dev                      # Start Vercel dev server (APIs + dashboard)
yarn dev:dashboard            # Serve dashboard on localhost:3001
yarn dev:api                  # Run API server with nodemon
yarn dev:cron                 # Test cron job manually

# Alternative local development
npx serve dashboard           # Simple dashboard server
vercel dev                    # Full Vercel development environment
```

### **🧪 Testing Scripts (New)**
```bash
# Test everything
yarn test                     # Run comprehensive test suite
yarn test:api                 # Test API endpoint loading
yarn test:dashboard           # Instructions for dashboard testing
yarn test:all                 # Run all tests sequentially

# Manual testing
node test-scripts.js          # Detailed script validation
open dashboard/index.html     # Direct dashboard test
```

### **🚀 Deployment Scripts (New)**
```bash
# Deploy to Vercel
yarn deploy                   # Deploy to production
yarn deploy:preview           # Deploy preview build
yarn logs                     # View deployment logs
yarn domains                  # Manage custom domains

# Build and setup
yarn build                    # Prepare for deployment (serverless)
yarn clean                    # Clean cache and build files
yarn reset                    # Full reset (clean + reinstall)
```

### **📚 Utility Scripts (New)**
```bash
yarn docs                     # Open API documentation
yarn postinstall             # Post-installation message
```

---

## 🧪 **Testing Your Scripts**

### **1. Test Legacy Trading Scripts**
```bash
# These should all work with existing data
yarn start                    # ✅ Should show mega-optimal analysis
yarn collect                  # ✅ Should collect fresh market data
yarn backtest                 # ✅ Should run crypto backtest
yarn strategy                 # ✅ Should load strategy parameters
```

### **2. Test New Development Scripts**
```bash
# Install new dependencies first
yarn install

# Test local development
yarn dev:dashboard            # Dashboard on http://localhost:3001
yarn dev                      # Full Vercel dev environment

# Test API endpoints
curl http://localhost:3000/api/signal
curl http://localhost:3000/api/portfolio
curl http://localhost:3000/api/backtest
```

### **3. Test Deployment Scripts**
```bash
# Prepare for deployment
yarn build                    # Should confirm serverless ready
yarn clean                    # Should clean .vercel directory

# Deploy (requires Vercel account)
yarn deploy:preview           # Test deployment
yarn deploy                   # Production deployment
```

---

## 📁 **Directory Structure for Scripts**

```
eth-btc-arbitrage-trader/
├── src/                      # Legacy trading system
│   ├── index.js             # yarn start
│   ├── dataCollector.js     # yarn collect
│   ├── analyzer.js          # yarn analyze
│   ├── strategy.js          # yarn strategy
│   └── cryptoOnlyBacktest.js # yarn backtest
├── api/                      # New Vercel API routes
│   ├── signal.js            # /api/signal
│   ├── portfolio.js         # /api/portfolio
│   ├── backtest.js          # /api/backtest
│   └── cron/                # Automated jobs
├── dashboard/               # Dashboard UI
│   └── index.html          # yarn dev:dashboard
├── lib/                     # Service layer
│   ├── services/           # Business logic
│   └── utils/              # Utilities
├── data/                    # Historical data
├── package.json            # All scripts defined here
└── vercel.json             # Deployment config
```

---

## 🔄 **Development Workflow**

### **🧪 Local Development Flow**
```bash
# 1. Install dependencies
yarn install

# 2. Test existing system
yarn start                    # Verify core system works

# 3. Start development server
yarn dev                      # Vercel dev with APIs
# OR
yarn dev:dashboard            # Just dashboard

# 4. Test changes
yarn test:all                 # Run all tests

# 5. Deploy when ready
yarn deploy:preview           # Test deployment
yarn deploy                   # Production
```

### **🔍 Debugging Scripts**
```bash
# If script fails, check:
yarn --version                # Yarn version
node --version                # Node version (need 16+)
ls -la node_modules/          # Dependencies installed
cat package.json | grep scripts # Script definitions

# Test individual components
node src/index.js             # Direct node execution
node api/signal.js            # Test API directly
```

---

## 📊 **Script Performance & Output**

### **✅ Expected Success Outputs**

#### **yarn start**
```
🚀 ETH/BTC MEGA-OPTIMAL TRADING SYSTEM
=========================================
🎯 Using 250-iteration optimized strategy
📊 Loading ETH/BTC historical data...
✅ Loaded 365 days of historical data
📈 CURRENT MARKET ANALYSIS:
   Current ETH/BTC Ratio: 0.063247
   Z-Score: 1.4250
   Action: SELL_ETH_BUY_BTC
🎊 Mega-optimal strategy analysis complete!
```

#### **yarn dev**
```
> vercel dev
Vercel CLI 32.0.0
> Ready! Available at http://localhost:3000
> API routes available:
  - /api/signal
  - /api/portfolio  
  - /api/backtest
  - /api/cron/*
```

#### **yarn dev:dashboard**
```
> serve dashboard -p 3001
┌─────────────────────────────────────────────────────┐
│   Serving!                                          │
│   Local:   http://localhost:3001                    │
│   Dashboard running with Cirrus UI                  │
└─────────────────────────────────────────────────────┘
```

#### **yarn deploy**
```
> vercel --prod
🔍 Inspect: https://vercel.com/...
✅ Production: https://your-project.vercel.app
🤖 Cron jobs active:
   - /api/cron/market-monitor (*/5 * * * *)
   - /api/cron/signal-generator (*/5 * * * *)
   - /api/cron/trade-executor (*/5 * * * *)
```

### **❌ Common Issues & Fixes**

#### **"Module not found" errors**
```bash
# Fix: Install dependencies
yarn install
# Or reset completely  
yarn reset
```

#### **"Port already in use" errors**
```bash
# Fix: Use different port or kill process
lsof -ti:3000 | xargs kill -9
yarn dev:dashboard  # Uses port 3001 instead
```

#### **Vercel CLI errors**
```bash
# Fix: Install Vercel CLI
yarn add -D vercel
# Or use global
npm i -g vercel
vercel login
```

#### **API endpoint errors**
```bash
# Fix: Check environment variables
cp env.example .env.local
# Add your API keys and test
```

---

## 🎯 **Script Categories Explained**

### **🏗️ Legacy Scripts (Core Trading)**
- **Purpose**: Original trading system analysis
- **Data**: Uses local JSON files in `/data`
- **Output**: Console analysis and reports
- **Use Case**: Research, backtesting, parameter tuning

### **🌐 API Scripts (New Serverless)**
- **Purpose**: Web APIs for dashboard and automation
- **Data**: Real-time from exchanges + Supabase
- **Output**: JSON responses for web interfaces
- **Use Case**: Live trading, web dashboard, mobile apps

### **⏰ Cron Scripts (Automation)**
- **Purpose**: Automated trading execution
- **Data**: Live market data + database state
- **Output**: Trade execution and logging
- **Use Case**: 24/7 automated trading

### **🎨 Dashboard Scripts (UI)**
- **Purpose**: Visual monitoring and control
- **Data**: Consumes API endpoints
- **Output**: Interactive web interface
- **Use Case**: Manual monitoring, trade oversight

---

## 🚀 **Ready to Use Scripts**

### **For Development:**
```bash
yarn dev                      # Start everything
yarn test:all                 # Test everything
```

### **For Production:**
```bash
yarn deploy                   # Deploy everything
yarn logs                     # Monitor everything
```

### **For Testing:**
```bash
yarn start                    # Test core system
yarn dev:dashboard            # Test UI
```

Your script system is now **comprehensive, organized, and ready for both development and production!** 🎉
