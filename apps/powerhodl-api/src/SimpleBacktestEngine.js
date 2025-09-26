/**
 * SIMPLE BACKTEST ENGINE
 * 
 * One class, one method, clear logic.
 * No layers, no confusion, no abstraction complexity.
 */

export class SimpleBacktestEngine {
    /**
     * Run a complete backtest with clear, simple logic
     * @param {Array} marketData - Array of { timestamp, ethBtcRatio } objects
     * @param {Object} params - { zScoreThreshold, rebalancePercent, transactionCost, lookbackDays }
     * @returns {Object} Complete backtest results
     */
    static runBacktest(marketData, params) {
        console.log(`🧪 [SIMPLE BACKTEST] Starting with ${marketData.length} data points`);
        console.log(`🔧 [DEBUG] Parameters received:`, JSON.stringify(params, null, 2));
        console.log(`🔧 [DEBUG] Data range: ${marketData[0].ethBtcRatio.toFixed(6)} to ${marketData[marketData.length-1].ethBtcRatio.toFixed(6)}`);
        
        // Validate inputs
        if (!marketData || marketData.length < params.lookbackDays + 5) {
            throw new Error(`Need at least ${params.lookbackDays + 5} data points, got ${marketData.length}`);
        }
        
        // Initialize portfolio (50/50 BTC/ETH in BTC terms)
        const initialRatio = marketData[0].ethBtcRatio;
        let portfolio = {
            btcAmount: 0.5,                    // 0.5 BTC
            ethAmount: 0.5 / initialRatio      // 0.5 BTC worth of ETH
        };
        
        const portfolioHistory = [];
        const trades = [];
        let totalFeesBTC = 0;
        
        // Process each day
        for (let i = params.lookbackDays; i < marketData.length; i++) {
            const currentData = marketData[i];
            const currentRatio = currentData.ethBtcRatio;
            
            // Calculate current portfolio value in BTC
            const ethValueBTC = portfolio.ethAmount * currentRatio;
            const totalValueBTC = portfolio.btcAmount + ethValueBTC;
            const ethPercentage = (ethValueBTC / totalValueBTC) * 100;
            
            // Calculate Z-Score using lookback window
            const recentRatios = marketData
                .slice(i - params.lookbackDays, i)
                .map(d => d.ethBtcRatio);
            
            const mean = recentRatios.reduce((sum, r) => sum + r, 0) / recentRatios.length;
            const variance = recentRatios.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / recentRatios.length;
            const stdDev = Math.sqrt(variance);
            const zScore = stdDev > 0 ? (currentRatio - mean) / stdDev : 0;
            
            // Trading decision
            let shouldTrade = false;
            let tradeAction = 'HOLD';
            
            // Check if portfolio is too far from 50/50
            const deviationFromTarget = Math.abs(ethPercentage - 50);
            
            // Debug first few iterations to see why no trades
            if (i < params.lookbackDays + 3) {
                console.log(`🔧 [DEBUG] Day ${i}: zScore=${zScore.toFixed(3)}, threshold=${params.zScoreThreshold}, deviation=${deviationFromTarget.toFixed(2)}%, rebalancePercent=${params.rebalancePercent}`);
            }
            
            // FIXED LOGIC: Trade if Z-Score is extreme OR portfolio is unbalanced beyond threshold
            // rebalancePercent should be interpreted as percentage points from 50/50 (not 49.79% = almost 100%!)
            const zScoreTriggered = Math.abs(zScore) > params.zScoreThreshold;
            const rebalanceThresholdPercent = params.rebalancePercent > 10 ? params.rebalancePercent / 100 : params.rebalancePercent; // Handle both 5% and 0.05 formats
            const deviationTriggered = deviationFromTarget > rebalanceThresholdPercent;
            
            if (zScoreTriggered || deviationTriggered) {
                shouldTrade = true;
                console.log(`🔄 [TRADE] Day ${i}: zScore=${zScore.toFixed(3)} > ${params.zScoreThreshold}, deviation=${deviationFromTarget.toFixed(2)}% > ${rebalanceThresholdPercent}%`);
                
                if (zScore > params.zScoreThreshold) {
                    // ETH is expensive - sell ETH for BTC
                    tradeAction = 'SELL_ETH';
                } else {
                    // ETH is cheap - buy ETH with BTC
                    tradeAction = 'BUY_ETH';
                }
                
                // Execute rebalancing trade
                const targetEthValueBTC = totalValueBTC * 0.5; // 50% target
                const targetEthAmount = targetEthValueBTC / currentRatio;
                const ethToTrade = targetEthAmount - portfolio.ethAmount;
                const btcToTrade = ethToTrade * currentRatio;
                
                // Apply transaction costs
                const feesBTC = Math.abs(btcToTrade) * (params.transactionCost / 100);
                
                // Execute trade
                portfolio.ethAmount += ethToTrade;
                portfolio.btcAmount -= btcToTrade + feesBTC;
                totalFeesBTC += feesBTC;
                
                // Record trade
                trades.push({
                    timestamp: currentData.timestamp,
                    action: tradeAction,
                    ethAmount: ethToTrade,
                    btcAmount: btcToTrade,
                    fees: feesBTC,
                    zScore: zScore,
                    ratio: currentRatio,
                    portfolioValueBefore: totalValueBTC,
                    portfolioValueAfter: portfolio.btcAmount + (portfolio.ethAmount * currentRatio)
                });
            }
            
            // Record portfolio state
            portfolioHistory.push({
                timestamp: currentData.timestamp,
                date: typeof currentData.timestamp === 'string' ? currentData.timestamp.split('T')[0] : new Date(currentData.timestamp).toISOString().split('T')[0],
                btcAmount: portfolio.btcAmount,
                ethAmount: portfolio.ethAmount,
                ethValueBTC: portfolio.ethAmount * currentRatio,
                totalValueBTC: portfolio.btcAmount + (portfolio.ethAmount * currentRatio),
                ethPercentage: ethPercentage,
                zScore: zScore,
                ratio: currentRatio,
                action: tradeAction,
                traded: shouldTrade
            });
        }
        
        // Calculate final performance
        const initialValue = portfolioHistory[0].totalValueBTC;
        const finalValue = portfolioHistory[portfolioHistory.length - 1].totalValueBTC;
        const totalReturn = ((finalValue - initialValue) / initialValue) * 100;
        
        // Calculate buy & hold performance
        const finalRatio = marketData[marketData.length - 1].ethBtcRatio;
        const buyHoldFinalValue = 0.5 + (0.5 / initialRatio * finalRatio);
        const buyHoldReturn = ((buyHoldFinalValue - 1.0) / 1.0) * 100;
        
        // Calculate other metrics
        const dailyReturns = [];
        for (let i = 1; i < portfolioHistory.length; i++) {
            const daily = (portfolioHistory[i].totalValueBTC - portfolioHistory[i-1].totalValueBTC) / portfolioHistory[i-1].totalValueBTC;
            dailyReturns.push(daily);
        }
        
        const avgDailyReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
        const dailyStdDev = Math.sqrt(dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / dailyReturns.length);
        const sharpeRatio = dailyStdDev > 0 ? (avgDailyReturn / dailyStdDev) * Math.sqrt(365) : 0;
        
        // Calculate max drawdown
        let maxDrawdown = 0;
        let peak = initialValue;
        portfolioHistory.forEach(day => {
            if (day.totalValueBTC > peak) peak = day.totalValueBTC;
            const drawdown = (peak - day.totalValueBTC) / peak;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        });
        
        const results = {
            // Performance metrics
            totalReturn: totalReturn,
            buyHoldReturn: buyHoldReturn,
            excessReturn: totalReturn - buyHoldReturn,
            sharpeRatio: sharpeRatio,
            maxDrawdown: maxDrawdown * 100,
            
            // Trading metrics
            totalTrades: trades.length,
            totalFees: totalFeesBTC,
            winningTrades: trades.filter(t => t.portfolioValueAfter > t.portfolioValueBefore).length,
            
            // Portfolio evolution
            initialValue: initialValue,
            finalValue: finalValue,
            portfolioHistory: portfolioHistory,
            trades: trades,
            
            // Input parameters
            parameters: params,
            
            // Metadata
            dataPoints: marketData.length,
            period: portfolioHistory.length,
            startDate: marketData[0].timestamp,
            endDate: marketData[marketData.length - 1].timestamp
        };
        
        // Debug summary
        const maxZScore = Math.max(...portfolioHistory.map(h => Math.abs(h.zScore)));
        const maxDeviation = Math.max(...portfolioHistory.map(h => Math.abs(h.ethPercentage - 50)));
        
        console.log(`✅ [SIMPLE BACKTEST] Complete: ${totalReturn.toFixed(2)}% return, ${trades.length} trades`);
        console.log(`🔧 [DEBUG] Max Z-Score: ${maxZScore.toFixed(3)} (threshold: ${params.zScoreThreshold})`);
        console.log(`🔧 [DEBUG] Max Deviation: ${maxDeviation.toFixed(2)}% (threshold: ${params.rebalancePercent}%)`);
        
        if (trades.length === 0) {
            if (maxZScore < params.zScoreThreshold) {
                console.log(`❌ [DEBUG] No trades: Z-Score never exceeded threshold (max: ${maxZScore.toFixed(3)} < ${params.zScoreThreshold})`);
            }
            if (maxDeviation < params.rebalancePercent) {
                console.log(`❌ [DEBUG] No trades: Portfolio never deviated enough (max: ${maxDeviation.toFixed(2)}% < ${params.rebalancePercent}%)`);
            }
        }
        
        return results;
    }
    
    /**
     * Normalize market data to consistent format
     * @param {Array} rawData - Raw data from any source
     * @returns {Array} Normalized data
     */
    static normalizeMarketData(rawData) {
        return rawData.map(item => ({
            timestamp: item.timestamp || item.collected_at || item.date,
            ethBtcRatio: item.ethBtcRatio || item.close || (item.eth_price_usd / item.btc_price_usd),
            ethPriceUSD: item.ethPriceUSD || item.eth_price_usd || 0,
            btcPriceUSD: item.btcPriceUSD || item.btc_price_usd || 0
        })).filter(item => item.ethBtcRatio > 0);
    }
}
