import { ZScoreCalculator } from '../../../packages/shared/src/ZScoreCalculator.js';

/**
 * SimpleBacktestEngine - The core backtesting engine for PowerHODL
 * 
 * CRITICAL CONCEPTS:
 * 1. FEES DESTROY RETURNS - Every trade costs money (transaction fees + slippage)
 *    - Frequent trading will quickly erode all profits
 *    - With 1.66% fees, 100 trades = 166% in fees alone!
 * 
 * 2. REBALANCING THRESHOLD - Controls how often we trade
 *    - This is NOT a target allocation percentage
 *    - It's the DEVIATION from 50/50 that triggers a trade
 *    - Lower threshold = more trades = more fees = worse returns
 *    - Higher threshold = fewer trades = might miss opportunities
 * 
 * 3. Z-SCORE THRESHOLD - Identifies when ETH/BTC ratio is extreme
 *    - High |Z-score| = ratio far from historical mean = trading opportunity
 *    - Must be high enough that expected profit > transaction costs
 * 
 * 4. THE GOAL - Accumulate more total tokens (BTC + ETH)
 *    - NOT just rebalancing to 50/50
 *    - Buy the undervalued asset when ratio is extreme
 *    - Success measured in total token growth, not USD value
 * 
 * 5. OPTIMIZATION - Finding the sweet spot
 *    - Too aggressive = fees eat profits
 *    - Too conservative = miss opportunities
 *    - Gradient descent finds optimal parameters
 */
export class SimpleBacktestEngine {
    static normalizeMarketData(data, fieldMappings = {}) {
        // Log first item to debug
        if (data.length > 0) {
            console.log('🔍 [NORMALIZE] First raw data item:', JSON.stringify(data[0], null, 2));
        }
        
        // Handle different data source formats
        return data.map((item, index) => {
            // Normalize timestamp - handle various formats
            // Note: database has both 'collected_at' and 'created_at'
            let timestamp = item.timestamp || item.collected_at || item.created_at || item.date || item.time;
            
            // Ensure timestamp is a valid date string or Date object
            if (timestamp) {
                try {
                    // If it's already a Date object or valid date string, use it
                    const dateObj = new Date(timestamp);
                    if (isNaN(dateObj.getTime())) {
                        console.warn('Invalid timestamp found:', timestamp);
                        timestamp = new Date().toISOString();
                    } else {
                        timestamp = dateObj.toISOString();
                    }
                } catch (e) {
                    console.warn(`Error parsing timestamp at index ${index}:`, timestamp, e);
                    timestamp = new Date().toISOString();
                }
            } else {
                timestamp = new Date().toISOString();
            }
            
            const normalized = {
                timestamp: timestamp,
                ethBtcRatio: parseFloat(item.eth_btc_ratio || item.ethBtcRatio || item.ratio || item.close || 0),
                volume: parseFloat(item.volume || item.eth_volume_24h || 0),
                ethPrice: parseFloat(item.eth_price_usd || item.ethPrice || 0),
                btcPrice: parseFloat(item.btc_price_usd || item.btcPrice || 0)
            };
            
            // Apply any custom field mappings
            Object.entries(fieldMappings).forEach(([to, from]) => {
                if (item[from] !== undefined) {
                    normalized[to] = item[from];
                }
            });
            
            return normalized;
        });
    }
    
    static runBacktest(marketData, params) {
        console.log(`🧪 [SIMPLE BACKTEST] Starting with ${marketData.length} data points`);
        
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
            const currentRatio = Number(currentData.ethBtcRatio);  // Ensure it's a number
            
            // Calculate current portfolio value in BTC
            const ethValueBTC = portfolio.ethAmount * currentRatio;
            const totalValueBTC = portfolio.btcAmount + ethValueBTC;
            const ethPercentage = (ethValueBTC / totalValueBTC) * 100;
            
            // Calculate Z-Score using centralized calculator
        const historicalRatios = marketData
            .slice(0, i + 1)  // Include all data up to current point
            .map(d => {
                const ratio = d.ethBtcRatio;
                if (typeof ratio !== 'number') {
                    console.log(`⚠️ [DEBUG] Non-numeric ratio found: ${ratio} (type: ${typeof ratio})`);
                }
                return Number(ratio);  // Force conversion to number
            });
        
        // Debug: Check if we have valid data
        if (i === params.lookbackDays || i === params.lookbackDays + 1 || i === 100) {
            console.log(`📊 [DEBUG] Day ${i}: currentRatio=${currentRatio}, historicalRatios sample:`, historicalRatios.slice(-5));
            console.log(`📊 [DEBUG] historicalRatios length:`, historicalRatios.length);
            const mean = ZScoreCalculator.mean(historicalRatios.slice(-params.lookbackDays));
            const stdDev = ZScoreCalculator.standardDeviation(historicalRatios.slice(-params.lookbackDays));
            console.log(`📊 [DEBUG] mean=${mean}, stdDev=${stdDev}, lookbackDays=${params.lookbackDays}`);
        }
        
        const zScore = ZScoreCalculator.calculate(currentRatio, historicalRatios, params.lookbackDays);
            
            // Trading decision
            let shouldTrade = false;
            let tradeAction = 'HOLD';
            let targetAllocation = 0.5; // Default 50/50
            
            // BALANCED MEAN REVERSION WITH STRATEGIC POSITIONING
            const zScoreThreshold = params.zScoreThreshold;
            const currentEthAllocation = ethValueBTC / totalValueBTC;
            
            // Define our strategic zones
            const NEUTRAL_ZONE = 0.5;  // 50/50 is neutral
            const MIN_ALLOCATION = 0.25; // Never go below 25% in either asset
            const MAX_ALLOCATION = 0.75; // Never go above 75% in either asset
            
            // Calculate how far we can push allocation based on Z-score
            const zScoreIntensity = Math.min(Math.abs(zScore) / 3, 1); // Scale 0-1
            
            if (Math.abs(zScore) > zScoreThreshold) {
                // We have a trading signal
                
                if (zScore > zScoreThreshold) {
                    // ETH is EXPENSIVE - we want to reduce ETH exposure
                    // But we need to balance between capturing gains and maintaining tradeable position
                    
                    // Base target: move towards lower ETH allocation
                    let baseTarget = NEUTRAL_ZONE - (0.25 * zScoreIntensity);
                    
                    // Adjustment: if we're already low on ETH, be less aggressive
                    if (currentEthAllocation < 0.4) {
                        baseTarget = Math.max(currentEthAllocation - 0.1, MIN_ALLOCATION);
                    }
                    
                    targetAllocation = Math.max(MIN_ALLOCATION, baseTarget);
                    
                    // Only trade if we'd be reducing ETH
                    if (currentEthAllocation > targetAllocation + 0.05) {
                        shouldTrade = true;
                        tradeAction = 'SELL_ETH';
                    }
                    
                } else if (zScore < -zScoreThreshold) {
                    // ETH is CHEAP - we want to increase ETH exposure
                    // But we need BTC available for future opportunities
                    
                    // Base target: move towards higher ETH allocation
                    let baseTarget = NEUTRAL_ZONE + (0.25 * zScoreIntensity);
                    
                    // Adjustment: if we're already high on ETH, be less aggressive
                    if (currentEthAllocation > 0.6) {
                        baseTarget = Math.min(currentEthAllocation + 0.1, MAX_ALLOCATION);
                    }
                    
                    targetAllocation = Math.min(MAX_ALLOCATION, baseTarget);
                    
                    // Only trade if we'd be increasing ETH
                    if (currentEthAllocation < targetAllocation - 0.05) {
                        shouldTrade = true;
                        tradeAction = 'BUY_ETH';
                    }
                }
            } else if (Math.abs(zScore) < 0.5) {
                // Z-score is near zero - market is "normal"
                // This is when we should rebalance towards neutral to prepare for opportunities
                
                const deviationFromNeutral = Math.abs(currentEthAllocation - NEUTRAL_ZONE);
                
                if (deviationFromNeutral > 0.15) {
                    // We're significantly off-balance during calm markets
                    shouldTrade = true;
                    targetAllocation = NEUTRAL_ZONE;
                    tradeAction = currentEthAllocation > NEUTRAL_ZONE ? 'REBALANCE_SELL_ETH' : 'REBALANCE_BUY_ETH';
                }
            }
            
            // Final checks before executing trade
            if (shouldTrade) {
                const allocationChange = Math.abs(currentEthAllocation - targetAllocation);
                const tradeValueBTC = allocationChange * totalValueBTC;
                const transactionCostBTC = tradeValueBTC * (params.transactionCost / 100);
                
                // For high Z-scores, accept lower profit margins
                const minProfitMultiple = Math.abs(zScore) > 2 ? 1.5 : 2.0;
                
                // Skip if trade is too small or transaction costs too high
                if (allocationChange < 0.05 || tradeValueBTC < transactionCostBTC * minProfitMultiple) {
                    shouldTrade = false;
                }
            }
            
            
            if (shouldTrade) {
                console.log(`🔄 [TRADE] Day ${i}: ${tradeAction} | zScore=${zScore.toFixed(3)}, target allocation: ${(targetAllocation * 100).toFixed(1)}% ETH`);
                
                // Execute trade to reach target allocation
                const targetEthValueBTC = totalValueBTC * targetAllocation;
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
                    targetAllocation: targetAllocation,
                    portfolioValueBefore: totalValueBTC,
                    portfolioValueAfter: portfolio.btcAmount + (portfolio.ethAmount * currentRatio)
                });
            }
            
            // Record portfolio state
            portfolioHistory.push({
                timestamp: currentData.timestamp,
                date: currentData.timestamp ? currentData.timestamp.split('T')[0] : 'unknown',
                btcAmount: portfolio.btcAmount,
                ethAmount: portfolio.ethAmount,
                ethValueBTC: portfolio.ethAmount * currentRatio,
                totalValueBTC: portfolio.btcAmount + (portfolio.ethAmount * currentRatio),
                ethPercentage: ethPercentage,
                zScore: zScore,
                ratio: currentRatio,
                targetAllocation: targetAllocation * 100
            });
        }
        
        // Calculate final results
        const initialValueBTC = 1.0; // Started with 1 BTC total
        const finalValueBTC = portfolio.btcAmount + (portfolio.ethAmount * marketData[marketData.length - 1].ethBtcRatio);
        const totalReturnPercent = ((finalValueBTC - initialValueBTC) / initialValueBTC) * 100;
        
        // Calculate token accumulation metrics
        const initialTotalTokens = 0.5 + (0.5 / initialRatio); // Initial BTC + ETH amounts
        const finalTotalTokens = portfolio.btcAmount + portfolio.ethAmount;
        const tokenAccumulation = ((finalTotalTokens - initialTotalTokens) / initialTotalTokens) * 100;
        
        // Calculate metrics
        const returns = portfolioHistory.map((p, i) => 
            i === 0 ? 0 : ((p.totalValueBTC - portfolioHistory[0].totalValueBTC) / portfolioHistory[0].totalValueBTC) * 100
        );
        
        const maxDrawdown = this.calculateMaxDrawdown(returns);
        const sharpeRatio = this.calculateSharpeRatio(returns);
        
        // Find max Z-score and deviation for debugging
        const maxZScore = Math.max(...portfolioHistory.map(p => Math.abs(p.zScore || 0)));
        const maxDeviation = Math.max(...portfolioHistory.map(p => Math.abs(p.ethPercentage - 50)));
        
        console.log(`✅ [SIMPLE BACKTEST] Complete: ${totalReturnPercent.toFixed(2)}% BTC return, ${tokenAccumulation.toFixed(2)}% token accumulation, ${trades.length} trades`);
        console.log(`🔧 [DEBUG] Max Z-Score: ${maxZScore.toFixed(3)} (threshold: ${params.zScoreThreshold})`);
        console.log(`🔧 [DEBUG] Max Allocation Shift: ${params.maxAllocationShift || 0.3}`);
        
        return {
            portfolio: portfolio,
            portfolioHistory: portfolioHistory,
            trades: trades,
            metrics: {
                totalReturnPercent: totalReturnPercent,
                tokenAccumulationPercent: tokenAccumulation,
                maxDrawdown: maxDrawdown,
                sharpeRatio: sharpeRatio,
                totalTrades: trades.length,
                totalFeesBTC: totalFeesBTC,
                finalBTC: portfolio.btcAmount,
                finalETH: portfolio.ethAmount,
                initialBTC: 0.5,
                initialETH: 0.5 / initialRatio
            }
        };
    }
    
    static calculateMaxDrawdown(returns) {
        let maxDrawdown = 0;
        let peak = -Infinity;
        
        for (const ret of returns) {
            if (ret > peak) peak = ret;
            const drawdown = (peak - ret) / (100 + peak) * 100;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }
        
        return maxDrawdown;
    }
    
    static calculateSharpeRatio(returns, riskFreeRate = 0) {
        if (returns.length < 2) return 0;
        
        const dailyReturns = returns.slice(1).map((ret, i) => ret - returns[i]);
        const avgReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
        const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
        const stdDev = Math.sqrt(variance);
        
        return stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev * Math.sqrt(252) : 0;
    }
}