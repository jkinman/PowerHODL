import { ZScoreCalculator } from '../../../packages/shared/src/ZScoreCalculator.js';

/**
 * SimpleBacktestEngine - The core backtesting engine for PowerHODL
 * 
 * POSITION-AWARE TRADING ALGORITHM:
 * The core innovation is that we consider BOTH market conditions (Z-score) AND current holdings.
 * This prevents the critical flaw of buying when we're already overweight or selling when underweight.
 * 
 * Key concepts:
 * - Position Imbalance: How far we are from 50/50 allocation
 * - Position-Signal Alignment: Whether our holdings agree with the market signal
 * - Adjusted Z-Score: Modified signal strength based on position
 * - Dynamic Aggressiveness: Trade size varies with opportunity and position
 * 
 * The algorithm AMPLIFIES signals when position opposes the market (good setup)
 * and REDUCES signals when position aligns with market (already captured the move).
 * 
 * CRITICAL CONCEPTS:
 * 1. FEES DESTROY RETURNS - Every trade costs money (transaction fees + slippage)
 *    - Frequent trading will quickly erode all profits
 *    - With 1.66% fees, 100 trades = 166% in fees alone!
 * 
 * 2. REBALANCE PERCENT - PERCENTAGE OF PORTFOLIO TO TRADE (NOT a deviation threshold!)
 *    - This is the AMOUNT to trade when Z-score triggers
 *    - E.g., 49.79% means trade ~50% of portfolio value
 *    - Trading 50% of portfolio naturally moves you close to 50/50 allocation
 *    - This is why the optimal value was so high (~50%)
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
        
        let lastSignal = 'HOLD'; // Track the last signal to only trade on signal changes
        
        // Track trading opportunities
        let tradingOpportunities = 0;
        let blockedByNoSignalChange = 0;
        let signalChanges = 0;
        
        // Process all data points but only trade at specified frequency
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
            
            // BALANCED MEAN REVERSION WITH STRATEGIC POSITIONING
            const zScoreThreshold = params.zScoreThreshold;
            const currentEthAllocation = ethValueBTC / totalValueBTC;
            
            // Define our strategic zones
            const NEUTRAL_ZONE = params.neutralZone || 0.5;  // Default 50/50 is neutral
            const MIN_ALLOCATION = params.minAllocation || 0.25; // Default never go below 25%
            const MAX_ALLOCATION = params.maxAllocation || 0.75; // Default never go above 75%
            
            /**
             * SIMPLE TRADING LOGIC (PROVEN TO WORK)
             * 
             * Based on the original MegaOptimalStrategy that achieved great returns:
             * 1. Wait for Z-score to exceed threshold (market is extreme)
             * 2. Trade a FIXED PERCENTAGE of portfolio value (rebalancePercent)
             * 3. This naturally moves portfolio towards 50/50
             * 
             * CRITICAL: rebalancePercent is NOT a deviation threshold!
             * It's the PERCENTAGE OF PORTFOLIO VALUE TO TRADE
             * E.g., 49.79% means trade ~50% of portfolio value, which effectively rebalances to 50/50
             */
            
            // Simple Z-score based trading - no complex adjustments
            if (Math.abs(zScore) > zScoreThreshold) {
                tradingOpportunities++;
                
                if (zScore > zScoreThreshold) {
                    // ETH is EXPENSIVE relative to BTC - SELL ETH
                    tradeAction = 'SELL_ETH_BUY_BTC';
                } else {
                    // ETH is CHEAP relative to BTC - BUY ETH
                    tradeAction = 'BUY_ETH_SELL_BTC';
                }
                
                // CRITICAL: Only trade on signal changes, not on every confirmation
                if (tradeAction !== lastSignal) {
                    shouldTrade = true;
                    signalChanges++;
                    console.log(`📶 [SIGNAL CHANGE] ${lastSignal} → ${tradeAction} | Z-Score: ${zScore.toFixed(3)}`);
                } else {
                    // Same signal as before - don't trade again
                    blockedByNoSignalChange++;
                    if (i < params.lookbackDays + 10) {
                        console.log(`🔄 [SAME SIGNAL] ${tradeAction} (no change from ${lastSignal}) | Z-Score: ${zScore.toFixed(3)}`);
                    }
                }
            } else {
                // No signal - market is neutral
                tradeAction = 'HOLD';
            }
            
            // Debug logging for trade opportunities
            if (shouldTrade || i < params.lookbackDays + 5) {
                console.log(`[DEBUG] Day ${i}: Z-Score=${zScore.toFixed(3)}, Threshold=${zScoreThreshold}, ShouldTrade=${shouldTrade}, Signal=${tradeAction}, LastSignal=${lastSignal}, EthAlloc=${(currentEthAllocation * 100).toFixed(1)}%`);
            }
            
            // EXECUTE TRADE ON SIGNAL CHANGE ONLY
            if (shouldTrade) {
                console.log(`🔄 [TRADE] Day ${i}: ${tradeAction} | Z-Score: ${zScore.toFixed(3)}`);
                
                // CRITICAL: Trade a PERCENTAGE of the ASSET WE'RE SELLING, not total portfolio
                const safeRebalancePercent = Math.min(params.rebalancePercent, 25); // Cap at 25% for safety
                
                let ethToTrade = 0;
                let btcToTrade = 0;
                let tradeValueBTC = 0;
                
                // Execute trade based on signal - trade percentage of the asset we're selling
                if (tradeAction === 'SELL_ETH_BUY_BTC') {
                    // Sell a percentage of our ETH holdings
                    ethToTrade = -(portfolio.ethAmount * safeRebalancePercent / 100);
                    tradeValueBTC = Math.abs(ethToTrade) * currentRatio; // Convert ETH to BTC value
                    
                    // Check if we have enough ETH
                    if (portfolio.ethAmount >= Math.abs(ethToTrade)) {
                        const feesBTC = tradeValueBTC * (params.transactionCost / 100);
                        const netBTCReceived = tradeValueBTC - feesBTC;
                        
                        portfolio.ethAmount += ethToTrade; // Subtract ETH (ethToTrade is negative)
                        portfolio.btcAmount += netBTCReceived; // Add BTC minus fees
                        btcToTrade = netBTCReceived;
                        
                        totalFeesBTC += feesBTC;
                        console.log(`   Sold ${Math.abs(ethToTrade).toFixed(4)} ETH (${safeRebalancePercent}% of ETH holdings)`);
                        console.log(`   Received: ${netBTCReceived.toFixed(6)} BTC, Fees: ${feesBTC.toFixed(6)} BTC`);
                        
                        // Record trade
                        trades.push({
                            timestamp: currentData.timestamp,
                            action: tradeAction,
                            ethAmount: ethToTrade,
                            btcAmount: btcToTrade,
                            fees: feesBTC,
                            zScore: zScore,
                            ratio: currentRatio,
                            tradeValueBTC: tradeValueBTC,
                            portfolioValueBefore: totalValueBTC,
                            portfolioValueAfter: portfolio.btcAmount + (portfolio.ethAmount * currentRatio)
                        });
                        
                        // Update signal tracking
                        lastSignal = tradeAction;
                    } else {
                        console.log(`   ⚠️ Insufficient ETH balance for trade`);
                        shouldTrade = false;
                    }
                    
                } else if (tradeAction === 'BUY_ETH_SELL_BTC') {
                    // Sell a percentage of our BTC holdings
                    btcToTrade = -(portfolio.btcAmount * safeRebalancePercent / 100);
                    tradeValueBTC = Math.abs(btcToTrade); // BTC value being sold
                    
                    // Check if we have enough BTC
                    if (portfolio.btcAmount >= Math.abs(btcToTrade)) {
                        const feesBTC = tradeValueBTC * (params.transactionCost / 100);
                        const netBTCToSell = tradeValueBTC + feesBTC; // Include fees in BTC spent
                        const ethReceived = (tradeValueBTC - feesBTC) / currentRatio; // ETH received after fees
                        
                        portfolio.btcAmount -= netBTCToSell; // Subtract BTC including fees
                        portfolio.ethAmount += ethReceived; // Add ETH
                        ethToTrade = ethReceived;
                        
                        totalFeesBTC += feesBTC;
                        console.log(`   Sold ${Math.abs(btcToTrade).toFixed(6)} BTC (${safeRebalancePercent}% of BTC holdings)`);
                        console.log(`   Received: ${ethReceived.toFixed(4)} ETH, Fees: ${feesBTC.toFixed(6)} BTC`);
                        
                        // Record trade
                        trades.push({
                            timestamp: currentData.timestamp,
                            action: tradeAction,
                            ethAmount: ethToTrade,
                            btcAmount: btcToTrade,
                            fees: feesBTC,
                            zScore: zScore,
                            ratio: currentRatio,
                            tradeValueBTC: tradeValueBTC,
                            portfolioValueBefore: totalValueBTC,
                            portfolioValueAfter: portfolio.btcAmount + (portfolio.ethAmount * currentRatio)
                        });
                        
                        // Update signal tracking
                        lastSignal = tradeAction;
                    } else {
                        console.log(`   ⚠️ Insufficient BTC balance for trade`);
                        shouldTrade = false;
                    }
                }
                
                // Note: Trade recording is now handled inside the individual trade blocks above
                // since fees are calculated differently for each trade type
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
                ratio: currentRatio
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
        
        // Calculate win rate and other trade metrics
        const winningTrades = trades.filter(t => t.portfolioValueAfter > t.portfolioValueBefore);
        const losingTrades = trades.filter(t => t.portfolioValueAfter <= t.portfolioValueBefore);
        const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
        
        // Calculate average win/loss
        const avgWin = winningTrades.length > 0 ? 
            winningTrades.reduce((sum, t) => sum + (t.portfolioValueAfter - t.portfolioValueBefore), 0) / winningTrades.length : 0;
        const avgLoss = losingTrades.length > 0 ? 
            losingTrades.reduce((sum, t) => sum + (t.portfolioValueAfter - t.portfolioValueBefore), 0) / losingTrades.length : 0;
        const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;
        
        // Calculate consecutive losses
        let maxConsecutiveLosses = 0;
        let currentConsecutiveLosses = 0;
        trades.forEach(t => {
            if (t.portfolioValueAfter <= t.portfolioValueBefore) {
                currentConsecutiveLosses++;
                maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentConsecutiveLosses);
            } else {
                currentConsecutiveLosses = 0;
            }
        });
        
        // Find max Z-score and deviation for debugging
        const maxZScore = Math.max(...portfolioHistory.map(p => Math.abs(p.zScore || 0)));
        const maxDeviation = Math.max(...portfolioHistory.map(p => Math.abs(p.ethPercentage - 50)));
        
        console.log(`✅ [SIMPLE BACKTEST] Complete: ${totalReturnPercent.toFixed(2)}% BTC return, ${tokenAccumulation.toFixed(2)}% token accumulation, ${trades.length} trades`);
        console.log(`📊 [METRICS] Win Rate: ${winRate.toFixed(1)}%, Profit Factor: ${profitFactor.toFixed(2)}, Max Consecutive Losses: ${maxConsecutiveLosses}`);
        console.log(`🔧 [DEBUG] Max Z-Score: ${maxZScore.toFixed(3)} (threshold: ${params.zScoreThreshold})`);
        console.log(`🔧 [DEBUG] Max Allocation Shift: ${params.maxAllocationShift || 0.3}`);
        console.log(`📈 [TRADING ANALYSIS]:`);
        console.log(`   Total trading opportunities: ${tradingOpportunities}`);
        console.log(`   Signal changes detected: ${signalChanges}`);
        console.log(`   Trades executed: ${trades.length}`);
        console.log(`   Trades blocked by no signal change: ${blockedByNoSignalChange}`);
        console.log(`   Trade execution rate: ${signalChanges > 0 ? ((trades.length / signalChanges) * 100).toFixed(1) : 0}%`);
        
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
                winRate: winRate,
                winningTrades: winningTrades.length,
                losingTrades: losingTrades.length,
                avgWinBTC: avgWin,
                avgLossBTC: avgLoss,
                profitFactor: profitFactor,
                maxConsecutiveLosses: maxConsecutiveLosses,
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