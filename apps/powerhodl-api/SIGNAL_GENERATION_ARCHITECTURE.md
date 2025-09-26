# Signal Generation Architecture

## Overview
PowerHODL uses a **single, unified signal generation strategy** across all components to ensure consistency.

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
