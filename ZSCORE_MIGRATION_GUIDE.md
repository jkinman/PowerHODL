# Z-Score Calculation Migration Guide

## Problem
Multiple different Z-score implementations were found across the project, leading to inconsistent results:
- Backend: SimpleStrategy, TechnicalIndicators, SimpleBacktestEngine (inline)
- Frontend: SignalService (mock), market store (different window)

## Solution
A single centralized `ZScoreCalculator` class has been created in `packages/shared/src/ZScoreCalculator.js`.

## Migration Required

### Backend (✅ COMPLETED)
- [x] `SimpleStrategy.calculateZScore()` - Now delegates to `ZScoreCalculator`
- [x] `SimpleBacktestEngine` - Now uses `ZScoreCalculator`

### Frontend (⚠️ TODO)

#### 1. Update `apps/powerhodl-frontend/src/lib/stores/market.js`
Replace the inline Z-score calculation in `calculateTechnicalIndicators()`:
```javascript
// OLD - Remove this
const zScore = volatility > 0 ? (currentRatio - movingAverage) / volatility : 0;

// NEW - Use centralized calculator
import { ZScoreCalculator } from '@powerhodl/shared/ZScoreCalculator';
const historicalRatios = data.map(item => item.ethBtcRatio);
const zScore = ZScoreCalculator.calculate(currentRatio, historicalRatios, 15);
```

#### 2. Remove `apps/powerhodl-frontend/src/lib/services/SignalService.js`
The `calculateZScore()` method here is a mock with hardcoded values. This entire service appears to be for demo purposes and should be removed or updated to use real data.

#### 3. Update any other components
Search for any other Z-score calculations and replace with:
```javascript
import { ZScoreCalculator } from '@powerhodl/shared/ZScoreCalculator';
const zScore = ZScoreCalculator.calculate(currentValue, historicalValues, lookbackPeriod);
```

### API Endpoints (⚠️ VERIFY)

#### 1. Remove `TechnicalIndicators.zScore()`
The `apps/powerhodl-api/lib/utils/TechnicalIndicators.js` has its own implementation that uses the entire array instead of a lookback window. Either:
- Remove this method entirely
- Update it to delegate to `ZScoreCalculator`

## Testing

Create tests to verify all components return the same Z-score:
```javascript
const testData = [0.035, 0.036, 0.037, 0.036, 0.035, ...];
const currentValue = 0.034;

// All these should return the exact same value
const zscore1 = strategy.calculateZScore(currentValue, testData);
const zscore2 = ZScoreCalculator.calculate(currentValue, testData, 15);
const zscore3 = backtestEngine.calculateZScore(currentValue, testData); // if exposed

assert(zscore1 === zscore2 && zscore2 === zscore3);
```

## Benefits
1. **Consistency**: All parts of the app use the exact same calculation
2. **Maintainability**: Single place to update the algorithm
3. **Testing**: Easy to test one implementation
4. **Debugging**: No confusion about which calculation is being used

## Important Notes
- The lookback period should always be consistent (default: 15)
- The calculation uses population variance (dividing by N, not N-1)
- Returns 0 for edge cases (insufficient data, zero variance)
