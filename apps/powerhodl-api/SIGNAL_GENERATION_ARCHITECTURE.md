# Signal Generation Architecture

## Overview
PowerHODL uses a **single, unified signal generation strategy** across all components to ensure consistency.

## CRITICAL CONCEPTS - MUST READ

### 1. FEES DESTROY RETURNS
- **Every trade costs money** (transaction fees + slippage + spread)
- With 1.66% fees per trade, 60 trades = 100% of your capital gone!
- **Frequent trading is the enemy of profits**
- The entire optimization process is about finding the sweet spot between capturing opportunities and minimizing fees

### 2. PARAMETERS CONTROL EVERYTHING
- **rebalancePercent**: How much deviation from 50/50 before rebalancing
  - NOT a target percentage!
  - Lower = more trades = more fees = worse returns
  - Higher = fewer trades = might miss opportunities
- **zScoreThreshold**: How extreme the ratio must be to trade
  - Higher = fewer but higher confidence trades
  - Must be high enough that expected profit > transaction costs
- **lookbackDays**: How much history for Z-score calculation
  - Too short = noisy signals
  - Too long = slow to adapt

### 3. MEAN REVERSION IS THE STRATEGY
- When ETH/BTC ratio is extreme, it tends to revert to mean
- High Z-score = ETH expensive relative to history = SELL ETH
- Low Z-score = ETH cheap relative to history = BUY ETH
- Success depends on ratios actually reverting (not guaranteed!)

### 4. DETERMINISM IS CRITICAL
- Same inputs MUST produce same outputs
- No randomness, no external dependencies
- This enables reliable backtesting and optimization
- If results vary with same parameters, there's a bug

### 5. THE GOAL: ACCUMULATE MORE BTC [[memory:9297280]]
- Success is measured in BTC growth, not USD value
- We're not just rebalancing to 50/50
- We're trying to accumulate more total tokens by exploiting ratio oscillations

## Core Component: SimpleStrategy

Location: `/apps/powerhodl-api/src/SimpleStrategy.js`

### Key Methods:

1. **`calculateZScore(currentRatio, historicalRatios)`**
   - Calculates the Z-score for mean reversion analysis
   - Uses lookback period defined in parameters
   - Returns 0 if insufficient data

2. **`generateSignal(currentRatio, historicalRatios)`**
   - Generates BUY_ETH, SELL_ETH, or HOLD signals
   - Based on Z-score threshold crossings
   - Returns signal object with action, confidence, reasoning

3. **`calculateAllocation(ethAmount, btcAmount, ethBtcRatio)`**
   - Calculates current portfolio allocation percentages
   - Determines if rebalancing is needed

### Parameters (Mega-Optimal):
```javascript
{
    zScoreThreshold: 1.258,    // Z-score threshold for trading
    rebalancePercent: 49.79,    // Max deviation from 50/50 before rebalancing
    transactionCost: 1.66,      // Transaction cost percentage
    lookbackDays: 15            // Days for Z-score calculation
}
```

## Usage Across Components:

### 1. API Endpoint (`/api/signal`)
- Real-time signal generation for dashboard
- Uses `SimpleStrategy.generateSignal()`
- Returns current market signal with portfolio allocation

### 2. Cron Job (`/api/cron/signal-generator`)
- Scheduled signal generation (every 5 minutes)
- Uses `SimpleStrategy.generateSignal()`
- Stores signals in database
- Includes cooldown period to prevent rapid trades

### 3. Backtesting (`SimpleBacktestEngine`)
- Uses same Z-score calculation as `SimpleStrategy`
- Extends logic with dynamic allocation for token accumulation
- Allows testing different allocation strategies

## Signal Flow:

```
Market Data → Z-Score Calculation → Signal Generation → Action Decision
     ↓                                      ↓                    ↓
  Database                            SimpleStrategy        BUY/SELL/HOLD
```

## Key Principles:

1. **Single Source of Truth**: All signal generation uses SimpleStrategy
2. **Consistent Parameters**: Same mega-optimal parameters everywhere
3. **Clean Separation**: Signal generation is separate from execution
4. **Testability**: Same logic can be backtested and run live

## Removed Components:
- `SignalGenerationService` - Duplicate implementation (deleted)
- `MegaOptimalStrategy` - Old complex version (deleted)
- Complex abstractions and layers

## Benefits:
- No code duplication
- Easy to understand and modify
- Consistent behavior across all uses
- Simple to test and debug
