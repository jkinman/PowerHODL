/**
 * Simulation and Mock Data Utilities
 * 
 * Provides fallback simulation when real API is unavailable
 * and generates mock data for testing and demonstrations
 */

/**
 * Generate mock historical data for charts
 * Uses deterministic pseudo-random numbers for consistent results
 */
function generateMockHistoricalData(days = 30) {
    const data = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Generate deterministic ratio using multiple components
        const dayIndex = i;
        const trendComponent = 0.0365 + (dayIndex / days) * 0.001; // Slight upward trend
        const cyclicComponent = Math.sin(dayIndex * 0.3) * 0.0005; // Daily cycle
        const noiseComponent = Math.sin(dayIndex * 0.7 + 42) * 0.0002; // Market noise
        const ethBtcRatio = trendComponent + cyclicComponent + noiseComponent;
        
        data.push({
            date: date.toISOString().split('T')[0],
            timestamp: date.toISOString(),
            ethBtcRatio: ethBtcRatio,
            zScore: 0, // Will be calculated below
            ethPrice: 2500 + Math.sin(dayIndex * 0.2) * 200,
            btcPrice: 65000 + Math.sin(dayIndex * 0.15) * 5000
        });
    }
    
    // Calculate Z-scores using rolling 15-day window
    for (let i = 0; i < data.length; i++) {
        if (i >= 14) { // Need at least 15 days for calculation
            const window = data.slice(i - 14, i + 1);
            const ratios = window.map(d => d.ethBtcRatio);
            const mean = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
            const variance = ratios.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratios.length;
            const stdDev = Math.sqrt(variance);
            
            if (stdDev > 0) {
                data[i].zScore = (data[i].ethBtcRatio - mean) / stdDev;
            }
        }
    }
    
    return data;
}

/**
 * Simulate backtest performance based on parameters
 * Uses deterministic calculation for consistent results
 */
function simulateBacktestPerformance(params) {
    let score = 0;
    
    // Z-Score threshold: sweet spot around 1.2-1.3 (based on mega-optimal strategy)
    const zScoreOptimal = 1.258;
    const zScoreDistance = Math.abs(params.zScoreThreshold - zScoreOptimal);
    score += Math.max(0, 10 - zScoreDistance * 8); // Penalty increases rapidly away from optimal
    
    // Rebalance percent: sweet spot around 45-55%
    const rebalanceOptimal = 50;
    const rebalanceDistance = Math.abs(params.rebalancePercent - rebalanceOptimal);
    score += Math.max(0, 8 - rebalanceDistance * 0.15);
    
    // Lookback window: sweet spot around 10-20 days
    const lookbackOptimal = 15;
    const lookbackDistance = Math.abs(params.lookbackWindow - lookbackOptimal);
    score += Math.max(0, 6 - lookbackDistance * 0.2);
    
    // Transaction cost: lower is generally better, but too low is unrealistic
    let txCostScore = 4;
    if (params.transactionCost < 0.5) txCostScore -= 2; // Too low = unrealistic
    if (params.transactionCost > 3) txCostScore -= (params.transactionCost - 3) * 1.5; // High costs hurt
    score += Math.max(0, txCostScore);
    
    // Add deterministic "market variability" based on parameter combination
    const marketSeed = params.zScoreThreshold * 100 + params.rebalancePercent + params.lookbackWindow * 2;
    const marketFactor = Math.sin(marketSeed) * 2; // -2 to +2 range
    score += marketFactor;
    
    // Ensure reasonable bounds (-50% to +50% BTC growth) - simulation only
    return Math.max(-50, Math.min(50, score));
}

/**
 * Generate mock backtest results for testing
 */
function generateMockBacktestResults(params) {
    const btcGrowth = simulateBacktestPerformance(params);
    const totalTrades = Math.floor(Math.abs(params.zScoreThreshold - 1) * 10) + 5;
    const winRate = Math.max(45, Math.min(85, 65 + (btcGrowth * 0.3)));
    
    return {
        btcGrowth: btcGrowth,
        totalTrades: totalTrades,
        winRate: winRate,
        maxDrawdown: Math.abs(btcGrowth * 0.2) + 5,
        portfolioEvolution: generateMockPortfolioEvolution(params, btcGrowth)
    };
}

/**
 * Generate mock portfolio evolution for chart display
 */
function generateMockPortfolioEvolution(params, finalGrowth) {
    const days = params.backtestPeriod === "ALL" ? 365 : Math.min(params.backtestPeriod, 365);
    const data = {
        dates: [],
        btcValues: [],
        trades: []
    };
    
    const startValue = 0.5; // Starting BTC amount
    const endValue = startValue * (1 + finalGrowth / 100);
    
    for (let i = 0; i <= days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));
        
        // Smooth growth curve with some volatility
        const progress = i / days;
        const smoothGrowth = startValue + (endValue - startValue) * progress;
        const volatility = Math.sin(i * 0.1) * 0.02 * smoothGrowth; // 2% volatility
        
        data.dates.push(date.toISOString().split('T')[0]);
        data.btcValues.push(smoothGrowth + volatility);
        
        // Add some mock trades
        if (i > 0 && i % 30 === 0) {
            data.trades.push({
                date: date.toISOString().split('T')[0],
                action: Math.random() > 0.5 ? 'BUY_ETH' : 'SELL_ETH',
                amount: 0.1 + Math.random() * 0.3
            });
        }
    }
    
    return data;
}

/**
 * Generate extended mock portfolio for demonstration
 */
function generateExtendedMockPortfolio() {
    const data = {
        dates: [],
        btcValues: [],
        trades: []
    };
    
    const startValue = 0.5;
    const endValue = 0.7; // 40% growth over full period
    const days = 365;
    
    for (let i = 0; i <= days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));
        
        // Complex growth pattern with bull/bear cycles
        const progress = i / days;
        const trend = startValue + (endValue - startValue) * progress;
        const bullMarket = Math.sin(progress * Math.PI * 2) * 0.1 * trend; // Bull/bear cycles
        const dailyNoise = Math.sin(i * 0.2 + 13) * 0.02 * trend; // Daily volatility
        
        data.dates.push(date.toISOString().split('T')[0]);
        data.btcValues.push(Math.max(0.1, trend + bullMarket + dailyNoise));
        
        // Add realistic trade frequency
        if (i > 0 && Math.sin(i * 0.1) > 0.8) {
            data.trades.push({
                date: date.toISOString().split('T')[0],
                action: Math.random() > 0.5 ? 'BUY_ETH' : 'SELL_ETH',
                amount: 0.05 + Math.random() * 0.2
            });
        }
    }
    
    return data;
}

// Export functions for use in other modules
window.SimulationUtils = {
    generateMockHistoricalData,
    simulateBacktestPerformance,
    generateMockBacktestResults,
    generateMockPortfolioEvolution,
    generateExtendedMockPortfolio
};
