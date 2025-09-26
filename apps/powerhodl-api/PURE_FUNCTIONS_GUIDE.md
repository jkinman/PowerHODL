# Pure Functions Guide

## Overview
All core algorithmic functions in PowerHODL are implemented as **pure functions** - they are deterministic and have no side effects.

## What Makes a Function Pure?

1. **Deterministic**: Same input always produces same output
2. **No Side Effects**: Doesn't modify external state
3. **No Hidden Dependencies**: All data comes from parameters

## Core Pure Functions

### SimpleStrategy Class

#### `calculateZScore(currentRatio, historicalRatios, lookbackDays)`
```javascript
// Pure function - only uses input parameters
const zScore = strategy.calculateZScore(0.0357, ratioArray, 15);
// Always returns same result for same inputs
```

#### `generateSignalPure(currentRatio, historicalRatios, parameters)`
```javascript
// Pure function - no timestamps or external data
const signal = strategy.generateSignalPure(0.0357, ratioArray, params);
// Returns: { action, shouldTrade, confidence, zScore, reasoning, ... }
```

#### `calculateAllocation(ethAmount, btcAmount, ethBtcRatio, rebalanceThreshold)`
```javascript
// Pure function - simple math on inputs
const allocation = strategy.calculateAllocation(10, 0.5, 0.036);
// Returns: { ethPercentage, btcPercentage, deviation, ... }
```

#### `calculateTradeAmounts(currentEthAmount, currentBtcAmount, ethBtcRatio, targetEthPercentage)`
```javascript
// Pure function - calculates trade sizes
const trades = strategy.calculateTradeAmounts(10, 0.5, 0.036, 60);
// Returns: { ethToTrade, btcToTrade, ... }
```

### Wrapper Functions (Not Pure)

#### `generateSignal(currentRatio, historicalRatios)`
```javascript
// Wrapper that adds timestamp - NOT pure
const signal = strategy.generateSignal(0.0357, ratioArray);
// Calls generateSignalPure() then adds timestamp
```

## Benefits

1. **Testability**: Easy to test with predictable results
2. **Debugging**: No hidden state to track
3. **Reproducibility**: Backtests always produce same results
4. **Parallelization**: Can run multiple calculations safely
5. **Reasoning**: Easy to understand what a function does

## Usage Pattern

```javascript
// All data passed in explicitly
const marketData = await fetchMarketData();
const currentRatio = marketData[0].ethBtcRatio;
const historicalRatios = marketData.map(d => d.ethBtcRatio);

// Pure calculation
const signal = strategy.generateSignalPure(
    currentRatio,
    historicalRatios,
    customParameters // Optional
);

// Add any time-dependent data externally
const completeSignal = {
    ...signal,
    timestamp: new Date().toISOString(),
    marketId: marketData[0].id
};
```

## Rules for Maintaining Purity

1. **Never use** `Date.now()`, `Math.random()`, or other non-deterministic functions
2. **Never modify** input parameters
3. **Never access** global variables or external state
4. **Always return** new objects/arrays, don't mutate inputs
5. **Pass all data** as parameters, don't fetch inside functions

## Testing Pure Functions

```javascript
// Test determinism
const result1 = pureFunction(input);
const result2 = pureFunction(input);
assert(result1 === result2); // Always true for pure functions

// Test no side effects
const originalInput = { value: 10 };
const result = pureFunction(originalInput);
assert(originalInput.value === 10); // Input unchanged
```

## Architecture Benefits

- **Cron Job**: Uses pure functions, adds timestamps externally
- **API Endpoint**: Uses pure functions, adds request context externally  
- **Backtesting**: Uses pure functions, ensures reproducible results
- **Unit Tests**: Easy to test with mock data

This design ensures the core trading logic is reliable, testable, and consistent across all uses.
