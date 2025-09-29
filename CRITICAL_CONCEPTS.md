# PowerHODL Critical Concepts

## 🚨 MUST READ - Core Trading Philosophy

### 1. FEES DESTROY RETURNS
- **Every trade costs money** (transaction fees + slippage + spread)
- With 1.66% fees per trade: 60 trades = 100% of capital gone!
- **Frequent trading is the enemy of profits**
- The entire system is designed to find the sweet spot between capturing opportunities and minimizing fees

### 2. THE REBALANCE THRESHOLD MISCONCEPTION
- `rebalancePercent` is NOT a target allocation percentage
- It's the DEVIATION from 50/50 that triggers a trade
- If `rebalancePercent = 5`, we trade when portfolio deviates >5% from 50/50
- Lower threshold = more trades = more fees = worse returns
- The current value (49.79) needs optimization through gradient descent

### 3. MEAN REVERSION STRATEGY
- Core assumption: ETH/BTC ratio reverts to historical mean
- High Z-score (>threshold) = ETH expensive = SELL ETH
- Low Z-score (<-threshold) = ETH cheap = BUY ETH
- Success depends on this assumption holding true

### 4. Z-SCORE IS THE SIGNAL
- Z-score = (current_ratio - mean) / standard_deviation
- Measures how extreme the current ratio is
- |Z| > 2 is statistically significant (~5% of time)
- |Z| > 3 is very rare (~0.3% of time)
- Must be high enough that expected profit > transaction costs

### 5. THE GOAL: ACCUMULATE MORE BTC
- Success = BTC growth, NOT USD value
- We're not just rebalancing to maintain 50/50
- We're exploiting ratio oscillations to accumulate more total tokens
- All displays should show BTC metrics prominently

## 🔧 Technical Requirements

### 1. DETERMINISM IS CRITICAL
- Same inputs MUST produce same outputs
- No randomness, no external dependencies
- Pure functions only for core algorithms
- This enables reliable backtesting and optimization

### 2. DATA TYPES MATTER
- PostgreSQL returns DECIMAL as strings
- ALWAYS use `parseFloat()` or `Number()` on numeric data
- Type mismatches cause NaN errors and break calculations

### 3. REAL DATA ONLY
- Backtesting requires real historical market data
- Simulated data hides real-world behaviors
- Need 4+ years to test different market regimes

### 4. PARAMETER OPTIMIZATION
The gradient descent sandbox finds optimal parameters:
- `rebalancePercent`: Trading frequency threshold
- `zScoreThreshold`: Signal strength requirement
- `lookbackDays`: History window for calculations
- Balance between opportunity and transaction costs

## 📊 Common Pitfalls

1. **Confusing gross returns with net returns**
   - Always account for fees in calculations
   - 729 trades cannot generate +448,236% returns!

2. **Over-optimizing for past data**
   - Parameters that worked in 2021 may fail in 2024
   - Need to test across different market conditions

3. **Ignoring compounding fee impact**
   - Fees compound negatively
   - Many small trades = death by a thousand cuts

4. **Misunderstanding the rebalance threshold**
   - It's about deviation, not target allocation
   - Critical for controlling trading frequency

## 🎯 Remember

**The entire system is about finding the optimal balance between:**
- Trading often enough to capture opportunities
- Trading rarely enough to avoid fee destruction
- Using strong enough signals to ensure profitability
- Being patient enough to wait for real extremes

**This is what the Gradient Descent Sandbox optimizes for!**
