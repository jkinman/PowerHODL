# 🚀 Neon Database Setup Guide

This guide walks you through setting up Neon as your cloud PostgreSQL database for the ETH/BTC trading system.

## 🎯 Why Neon?

- **Serverless PostgreSQL**: Scales to zero when not in use
- **Branching**: Create database branches like git branches
- **Fast**: Sub-second cold starts
- **Cost-effective**: Pay only for what you use
- **Compatible**: Standard PostgreSQL, works with all tools

## 📋 Step 1: Create Neon Account

1. Go to [neon.tech](https://neon.tech)
2. Click "Get Started" or "Sign Up"
3. Sign up with GitHub, Google, or email
4. Verify your email if needed

## 🗄️ Step 2: Create Database

1. **Create New Project**:
   - Click "Create Project" in dashboard
   - Name: `eth-btc-trading-system`
   - Region: Choose closest to your users
   - PostgreSQL version: Latest (15+)

2. **Get Connection Details**:
   ```
   Database URL will look like:
   postgresql://username:password@host.neon.tech/database?sslmode=require
   ```

3. **Save Connection String**:
   - Copy the full connection string
   - You'll need this for environment variables

## 🏗️ Step 3: Set Up Database Schema

### Option A: Using Neon Console (Recommended)

1. Go to your Neon project dashboard
2. Click "SQL Editor" in the left sidebar
3. Copy and paste the entire contents of `/database/schema.sql`
4. Click "Run" to execute the schema

### Option B: Using Local Tool

```bash
# Install psql if you don't have it
brew install postgresql  # macOS
sudo apt-get install postgresql-client  # Ubuntu

# Run schema setup
psql "postgresql://username:password@host.neon.tech/database?sslmode=require" < database/schema.sql
```

## 🔧 Step 4: Configure Environment Variables

### For Vercel Deployment:

1. Go to your Vercel project dashboard
2. Click "Settings" → "Environment Variables"
3. Add these variables:

```env
# Neon Database
DATABASE_URL=postgresql://username:password@host.neon.tech/database?sslmode=require

# Trading API Keys (for live trading)
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET=your_binance_secret

# Optional: Enhanced data sources
COINGECKO_API_KEY=your_coingecko_api_key

# Cron Security (generate a random string)
CRON_SECRET=your_random_secret_string
```

### For Local Development:

Create `.env` file in project root:

```env
# Copy from .env.example and fill in your values
DATABASE_URL=postgresql://username:password@host.neon.tech/database?sslmode=require
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET=your_binance_secret
COINGECKO_API_KEY=your_coingecko_api_key
CRON_SECRET=your_random_secret_string
NODE_ENV=development
```

## 🧪 Step 5: Test Database Connection

### Using Node.js:

```bash
# Install dependencies
npm install

# Test database connection
node -e "
import { DatabaseService } from './lib/services/DatabaseService.js';
const db = new DatabaseService();
db.testConnection().then(success => {
  console.log('Database connection:', success ? '✅ Success' : '❌ Failed');
  process.exit(success ? 0 : 1);
});
"
```

### Using SQL:

```sql
-- Test basic functionality
SELECT COUNT(*) FROM portfolios;
SELECT COUNT(*) FROM market_snapshots;
SELECT COUNT(*) FROM trading_signals;
```

## 📊 Step 6: Initialize Portfolio

```sql
-- Insert initial portfolio (if not already done by schema)
INSERT INTO portfolios (eth_amount, btc_amount, total_value_btc, initial_value_btc, is_active)
VALUES (0.5, 0.5, 1.0, 1.0, true)
ON CONFLICT DO NOTHING;
```

## 🔍 Database Tables Overview

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `market_snapshots` | Historical price data | `eth_btc_ratio`, `z_score`, `collected_at` |
| `trading_signals` | Generated signals | `action`, `should_trade`, `confidence` |
| `portfolios` | Current balances | `eth_amount`, `btc_amount`, `is_active` |
| `trades` | Executed trades | `trade_type`, `from_amount`, `to_amount` |
| `system_events` | System logs | `event_type`, `severity`, `message` |
| `performance_snapshots` | Performance metrics | `total_return_pct`, `sharpe_ratio` |

## 🚀 Step 7: Deploy and Test

1. **Deploy to Vercel**:
   ```bash
   git add .
   git commit -m "Add Neon database configuration"
   git push
   ```

2. **Test API Endpoints**:
   ```bash
   # Test signal generation
   curl https://your-app.vercel.app/api/signal
   
   # Test portfolio status
   curl https://your-app.vercel.app/api/portfolio
   
   # Test backtest
   curl https://your-app.vercel.app/api/backtest
   ```

3. **Monitor Cron Jobs**:
   - Check Vercel Functions tab for cron job execution
   - View logs in Vercel dashboard
   - Monitor database for new data

## 💰 Neon Pricing

### Free Tier:
- 512 MB storage
- 1 database
- Shared compute
- Perfect for development and testing

### Pro Tier ($19/month):
- 10 GB storage included
- Autoscaling compute
- Read replicas
- Better for production

## 🔧 Troubleshooting

### Connection Issues:
```bash
# Test connection string
psql "your_connection_string" -c "SELECT version();"
```

### Permission Issues:
```sql
-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

### SSL Issues:
- Ensure `?sslmode=require` is in your connection string
- Neon requires SSL connections

## 📚 Resources

- [Neon Documentation](https://neon.tech/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

## 🎉 Next Steps

Once your database is set up:

1. **Deploy your app**: `vercel --prod`
2. **Monitor the dashboard**: Visit your deployed URL
3. **Check cron jobs**: Watch for automated trading signals
4. **Start with paper trading**: Test the system before live trading

Your ETH/BTC trading system is now ready with Neon as the database backend! 🚀
