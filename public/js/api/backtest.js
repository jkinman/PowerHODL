/**
 * Backtest API Module
 * 
 * Handles all backtest-related API calls and data processing
 */

/**
 * Get API URL based on environment
 */
function getApiUrl() {
    return window.location.hostname === 'localhost' ? 'http://localhost:8081' : '';
}

/**
 * Run a single backtest with specified parameters
 */
async function runSingleBacktest(params) {
    console.log('🧪 Running backtest with parameters:', params);
    
    // Convert frontend parameters to API format
    const apiParams = {
        rebalanceThreshold: params.rebalancePercent / 100, // Convert 50% to 0.5
        transactionCost: params.transactionCost / 100,     // Convert 1.66% to 0.0166
        zScoreThreshold: params.zScoreThreshold,
        backtestPeriod: params.backtestPeriod || "ALL"    // Send period to limit data range
    };
    
    console.log('🔄 Converting parameters:', {
        frontend: params,
        api: apiParams
    });
    
    console.log('📡 Sending request to real backtest API:', apiParams);
    
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/api/backtest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiParams)
    });

    console.log('📊 Response status:', response.status);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`API Error (${response.status}): ${errorText.substring(0, 100)}...`);
    }

    const result = await response.json();
    console.log('📡 Full API Response:', result);
    
    // Check if this is an error response
    if (result.error) {
        console.error('❌ API Response indicates failure:', result);
        throw new Error(result.error || result.message || 'API returned error');
    }
    
    // Check if this looks like a successful backtest response
    if (result.performance && result.timestamp && result.cryptoAccumulation) {
        // Use cryptoOutperformance for BTC accumulation (our actual goal)
        const rawBtcGrowth = result.cryptoAccumulation.cryptoOutperformance;
        console.log(`🔍 Raw cryptoOutperformance:`, rawBtcGrowth, typeof rawBtcGrowth);
        
        // Handle percentage string conversion
        let cleanValue = rawBtcGrowth;
        if (typeof rawBtcGrowth === 'string' && rawBtcGrowth.includes('%')) {
            cleanValue = rawBtcGrowth.replace('%', '');
        }
        let btcGrowthPercent = parseFloat(cleanValue || 0);
        
        // Handle NaN from API calculation errors
        if (isNaN(btcGrowthPercent)) {
            console.warn(`⚠️ API returned NaN for cryptoOutperformance - using fallback`);
            // Use strategy return as fallback when crypto calc fails
            const strategyReturn = result.performance.strategyReturn;
            const strategyClean = strategyReturn.replace('%', '');
            btcGrowthPercent = parseFloat(strategyClean) || 0;
            console.log(`📊 Using strategyReturn as fallback: ${btcGrowthPercent}%`);
        } else {
            console.log(`📊 Parsed BTC accumulation: ${btcGrowthPercent}% (from: ${rawBtcGrowth})`);
        }
        
        // Parse other metrics
        const totalTrades = result.performance.totalTrades || 0;
        const winRate = parseFloat(result.opportunities?.winRate?.replace('%', '') || '0');
        const maxDrawdown = parseFloat(result.performance.maxDrawdown?.replace('%', '') || '0');
        
        // Update chart if portfolio evolution is available
        if (result.portfolioEvolution && result.portfolioEvolution.dates.length > 0) {
            console.log('📊 Portfolio Evolution Data:', {
                chartPoints: result.portfolioEvolution.dates.length,
                totalTrades: result.portfolioEvolution.trades?.length,
                dateRange: `${result.portfolioEvolution.dates[0]} to ${result.portfolioEvolution.dates[result.portfolioEvolution.dates.length - 1]}`,
                fullDataInfo: result.portfolioEvolution.fullDataRange,
                sampleDates: result.portfolioEvolution.dates.slice(0, 5),
                sampleValues: result.portfolioEvolution.btcValues.slice(0, 5)
            });
            
            // Update the BTC accumulation chart with full backtest data
            if (window.ChartManager && window.ChartManager.updateBTCAccumulationChart) {
                window.ChartManager.updateBTCAccumulationChart(result.portfolioEvolution);
            }
        }
        
        return {
            btcGrowth: btcGrowthPercent,
            totalTrades: totalTrades,
            winRate: winRate,
            maxDrawdown: maxDrawdown,
            portfolioEvolution: result.portfolioEvolution,
            rawResult: result
        };
    } else {
        console.error(`❌ Invalid API response structure:`, {
            hasError: 'error' in result,
            hasPerformance: 'performance' in result,
            hasTimestamp: 'timestamp' in result,
            keys: Object.keys(result)
        });
        throw new Error(`Invalid API response format - missing required fields`);
    }
}

/**
 * Run optimization with multiple iterations
 */
async function runOptimizationWithIterations(iterations, baseParams, useRealData = true) {
    console.log(`🚀 Starting optimization with ${useRealData ? 'REAL HISTORICAL DATA' : 'MATHEMATICAL SIMULATION'}`);
    
    const results = [];
    let bestResult = null;
    
    for (let i = 0; i < iterations; i++) {
        console.log(`🧪 Iteration ${i + 1}/${iterations}: Testing parameters`);
        
        // Generate random parameters around base values
        const randomParams = generateRandomParameters(baseParams);
        console.log(`🧪 Iteration ${i + 1}/${iterations}: Testing parameters`, {
            zScore: randomParams.zScoreThreshold.toFixed(3),
            rebalance: `${randomParams.rebalancePercent.toFixed(1)}%`,
            lookback: `${randomParams.lookbackWindow} days`,
            txCost: `${randomParams.transactionCost.toFixed(2)}%`,
            dataSource: useRealData ? 'REAL HISTORICAL DATA' : 'SIMULATION'
        });
        
        let btcGrowth;
        
        if (useRealData) {
            // Try real backtest API first
            try {
                // Convert frontend parameters to API format
                const apiParams = {
                    rebalanceThreshold: randomParams.rebalancePercent / 100,
                    transactionCost: randomParams.transactionCost / 100,
                    zScoreThreshold: randomParams.zScoreThreshold,
                    backtestPeriod: baseParams.backtestPeriod || "ALL"
                };
                
                const apiUrl = getApiUrl();
                console.log(`🌐 API URL for iteration ${i + 1}:`, apiUrl ? apiUrl : 'Same domain (production)');
                console.log(`🔗 Full URL:`, `${apiUrl}/api/backtest`);
                console.log(`📊 API Parameters:`, apiParams);
                
                const response = await fetch(`${apiUrl}/api/backtest`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(apiParams)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log(`📡 API Response for iteration ${i + 1}:`, result);
                    
                    // Check for error in response
                    if (result.error) {
                        throw new Error(result.error || result.message);
                    }
                    
                    // Check for successful backtest response
                    if (result.performance && result.timestamp && result.cryptoAccumulation) {
                        // Use cryptoOutperformance instead of excessReturn for BTC accumulation
                        const rawBtcGrowth = result.cryptoAccumulation.cryptoOutperformance;
                        console.log(`🔍 Raw cryptoOutperformance value:`, rawBtcGrowth, typeof rawBtcGrowth);
                        console.log(`🔍 OPTIMIZATION API SUCCESS DEBUG:`, {
                            iteration: i + 1,
                            apiParams: apiParams,
                            responseTimestamp: result.timestamp,
                            dataInfo: result.dataInfo,
                            rawCryptoOutperformance: result.cryptoAccumulation.cryptoOutperformance,
                            parsedBtcGrowth: btcGrowth,
                            willUseFallback: false
                        });
                        
                        // Handle percentage string (remove % and convert)
                        let cleanValue = rawBtcGrowth;
                        if (typeof rawBtcGrowth === 'string' && rawBtcGrowth.includes('%')) {
                            cleanValue = rawBtcGrowth.replace('%', '');
                        }
                        
                        btcGrowth = parseFloat(cleanValue || 0);
                        
                        // Handle NaN from API calculation errors
                        if (isNaN(btcGrowth)) {
                            console.warn(`⚠️ API returned NaN for cryptoOutperformance - using fallback`);
                            // Use strategy return as fallback when crypto calc fails
                            const strategyReturn = result.performance.strategyReturn;
                            const strategyClean = strategyReturn.replace('%', '');
                            btcGrowth = parseFloat(strategyClean) || 0;
                            console.log(`📊 Using strategyReturn as fallback: ${btcGrowth}%`);
                        } else {
                            console.log(`📊 Parsed BTC accumulation: ${btcGrowth}% (from: ${rawBtcGrowth})`);
                        }
                        
                        console.log(`✅ Real data success for iteration ${i + 1}: ${btcGrowth.toFixed(2)}%`);
                        
                        // Sanity check - flag unrealistic results
                        if (Math.abs(btcGrowth) > 100) {
                            console.warn(`⚠️ HIGH RESULT: ${btcGrowth}% - verify this is realistic`);
                        }
                    } else {
                        console.error(`❌ Invalid API response for iteration ${i + 1}:`, {
                            hasError: 'error' in result,
                            hasPerformance: 'performance' in result,
                            hasTimestamp: 'timestamp' in result,
                            keys: Object.keys(result)
                        });
                        throw new Error(`Invalid API response format`);
                    }
                } else {
                    const errorText = await response.text();
                    console.error(`❌ HTTP error ${response.status} for iteration ${i + 1}:`, errorText);
                    throw new Error(`API error: ${response.status} - ${errorText.substring(0, 50)}`);
                }
            } catch (error) {
                console.error(`🚨 REAL API FAILED for iteration ${i + 1}:`, {
                    error: error.message,
                    stack: error.stack,
                    url: `${getApiUrl()}/api/backtest`,
                    params: apiParams,
                    timestamp: new Date().toISOString(),
                    hostname: window.location.hostname,
                    fullUrl: window.location.href
                });
                console.error(`📉 Falling back to SIMULATION - THIS IS WHY YOU'RE SEEING +617% RESULTS!`);
                console.error(`❌ The API should be working! Check the browser Network tab for HTTP errors.`);
                btcGrowth = window.SimulationUtils.simulateBacktestPerformance(randomParams);
                console.log(`🔍 OPTIMIZATION SIMULATION FALLBACK DEBUG:`, {
                    iteration: i + 1,
                    apiParams: apiParams,
                    simulationResult: btcGrowth,
                    errorCause: error.message,
                    willUseSimulation: true
                });
            }
        } else {
            // Use mathematical simulation
            btcGrowth = window.SimulationUtils.simulateBacktestPerformance(randomParams);
        }
        
        // Store this iteration's result
        const iterationResult = {
            iteration: i + 1,
            timestamp: new Date().toLocaleTimeString(),
            parameters: { ...randomParams },
            btcGrowth: btcGrowth,
            isBest: false
        };
        
        results.push(iterationResult);
        
        if (!bestResult || btcGrowth > bestResult.btcGrowthPercent) {
            // Mark previous best as no longer best
            results.forEach(result => result.isBest = false);
            // Mark this as the new best
            iterationResult.isBest = true;
            
            bestResult = { btcGrowthPercent: btcGrowth };
            console.log(`🎯 New best! Iteration ${i + 1}: +${btcGrowth.toFixed(2)}% BTC growth`);
        } else {
            const safeCurrentBtc = isNaN(btcGrowth) ? 0 : btcGrowth;
            const safeBestBtc = isNaN(bestResult.btcGrowthPercent) ? 0 : (bestResult.btcGrowthPercent || 0);
            console.log(`📊 Iteration ${i + 1}: +${safeCurrentBtc.toFixed(2)}% BTC growth (not better than +${safeBestBtc.toFixed(2)}%)`);
        }
    }
    
    return {
        results: results,
        bestResult: bestResult
    };
}

/**
 * Generate random parameters for optimization
 */
function generateRandomParameters(baseParams) {
    return {
        zScoreThreshold: Math.max(0.5, Math.min(3.0, baseParams.zScoreThreshold + (Math.random() - 0.5) * 1.0)),
        rebalancePercent: Math.max(10, Math.min(90, baseParams.rebalancePercent + (Math.random() - 0.5) * 40)),
        lookbackWindow: Math.max(5, Math.min(60, baseParams.lookbackWindow + Math.floor((Math.random() - 0.5) * 20))),
        transactionCost: Math.max(0, Math.min(5, baseParams.transactionCost + (Math.random() - 0.5) * 2)),
        backtestPeriod: baseParams.backtestPeriod,
        startingBTC: baseParams.startingBTC,
        startingETH: baseParams.startingETH
    };
}

// Export functions for global use
window.BacktestAPI = {
    runSingleBacktest,
    runOptimizationWithIterations,
    generateRandomParameters,
    getApiUrl
};
