#!/usr/bin/env node
/**
 * CRYPTO-ONLY BACKTEST - No Dollar Conversions
 * Measures everything in actual ETH and BTC amounts
 * Goal: End up with more total crypto value than you started with
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runCryptoOnlyBacktest() {
    console.log('₿ CRYPTO-ONLY BACKTEST - NO DOLLAR CONVERSIONS');
    console.log('=' + '='.repeat(50));
    console.log('🎯 Goal: Accumulate more total crypto value through ETH/BTC trading');
    console.log('📊 All measurements in actual ETH and BTC amounts');
    
    try {
        // Load the actual data
        const dataPath = path.join(__dirname, '..', 'data', 'eth_btc_data_2025-09-24.json');
        const rawData = await fs.readJson(dataPath);
        
        console.log(`\n✅ Loaded ${rawData.length} days of ETH/BTC ratio data`);
        
        // MEGA-OPTIMAL STRATEGY PARAMETERS
        const STRATEGY = {
            rebalanceThreshold: 0.49792708,    // 49.79%
            transactionCost: 0.016646603,      // 1.66%
            zScoreThreshold: 1.257672,         // ±1.257
            lookbackWindow: 15                 // 15 days
        };
        
        console.log('\n🎯 MEGA-OPTIMAL STRATEGY PARAMETERS:');
        console.log(`   Z-Score Threshold: ±${STRATEGY.zScoreThreshold.toFixed(3)}`);
        console.log(`   Rebalance Amount: ${(STRATEGY.rebalanceThreshold * 100).toFixed(2)}%`);
        console.log(`   Transaction Cost: ${(STRATEGY.transactionCost * 100).toFixed(2)}%`);
        console.log(`   Lookback Window: ${STRATEGY.lookbackWindow} days`);
        
        // Convert data to ETH/BTC ratios only
        const data = rawData.map((item, index) => ({
            date: item.date || `Day ${index + 1}`,
            ethBtcRatio: parseFloat(item.close) || (item.eth_price && item.btc_price ? item.eth_price / item.btc_price : 0.04)
        })).filter(item => item.ethBtcRatio > 0);
        
        if (data.length < STRATEGY.lookbackWindow + 10) {
            throw new Error('Not enough valid data points');
        }
        
        console.log(`📊 Processing ${data.length} days of ETH/BTC ratio data`);
        
        // Starting position: equivalent to $1000 split 50/50
        // Let's say we start with 0.2 ETH and 0.0077 BTC (roughly $1000 worth)
        let portfolio = {
            ethAmount: 0.2000,        // 0.2 ETH
            btcAmount: 0.0077,        // 0.0077 BTC
            totalBtcValue: 0.0154     // Total value in BTC terms
        };
        
        // Calculate initial BTC value using starting ratio
        const startRatio = data[STRATEGY.lookbackWindow].ethBtcRatio;
        portfolio.totalBtcValue = portfolio.btcAmount + (portfolio.ethAmount * startRatio);
        
        let trades = [];
        let totalFeesBTC = 0;
        let maxValueBTC = portfolio.totalBtcValue;
        let minValueBTC = portfolio.totalBtcValue;
        let dailySnapshots = [];
        
        console.log('\n₿ STARTING CRYPTO PORTFOLIO:');
        console.log(`   ETH Amount: ${portfolio.ethAmount.toFixed(4)} ETH`);
        console.log(`   BTC Amount: ${portfolio.btcAmount.toFixed(6)} BTC`);
        console.log(`   Total Value: ${portfolio.totalBtcValue.toFixed(6)} BTC`);
        console.log(`   ETH Value: ${(portfolio.ethAmount * startRatio).toFixed(6)} BTC`);
        console.log(`   Starting Ratio: ${startRatio.toFixed(6)} ETH/BTC`);
        
        console.log('\n🔄 EXECUTING CRYPTO-ONLY BACKTEST...');
        console.log('Date       | ETH/BTC   | Z-Score | Action       | ETH Amount | BTC Amount | Total BTC');
        console.log('-'.repeat(85));
        
        // Process each day starting after lookback period
        for (let i = STRATEGY.lookbackWindow; i < Math.min(data.length, STRATEGY.lookbackWindow + 300); i++) {
            const currentDay = data[i];
            const currentRatio = currentDay.ethBtcRatio;
            
            // Calculate Z-Score using lookback window
            const lookbackRatios = data.slice(i - STRATEGY.lookbackWindow, i).map(d => d.ethBtcRatio);
            const mean = lookbackRatios.reduce((sum, r) => sum + r, 0) / lookbackRatios.length;
            const variance = lookbackRatios.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / lookbackRatios.length;
            const stdDev = Math.sqrt(variance);
            const zScore = stdDev > 0 ? (currentRatio - mean) / stdDev : 0;
            
            // Calculate current portfolio value in BTC terms
            const ethValueInBTC = portfolio.ethAmount * currentRatio;
            const currentTotalBTC = portfolio.btcAmount + ethValueInBTC;
            
            // Check for trading signal
            let action = 'HOLD';
            let tradeExecuted = false;
            
            if (Math.abs(zScore) > STRATEGY.zScoreThreshold) {
                // Calculate trade amount in BTC terms
                const tradeValueBTC = currentTotalBTC * STRATEGY.rebalanceThreshold;
                const feesBTC = tradeValueBTC * STRATEGY.transactionCost;
                const netTradeValueBTC = tradeValueBTC - feesBTC;
                
                if (zScore > STRATEGY.zScoreThreshold) {
                    // ETH expensive relative to BTC - SELL ETH, BUY BTC
                    action = 'SELL ETH→BTC';
                    
                    // Convert trade value from BTC to ETH amount to sell
                    const ethToSell = netTradeValueBTC / currentRatio;
                    
                    if (portfolio.ethAmount >= ethToSell) {
                        portfolio.ethAmount -= ethToSell;
                        portfolio.btcAmount += netTradeValueBTC;
                        tradeExecuted = true;
                    }
                    
                } else if (zScore < -STRATEGY.zScoreThreshold) {
                    // ETH cheap relative to BTC - BUY ETH, SELL BTC
                    action = 'BUY ETH←BTC';
                    
                    // Use BTC to buy ETH
                    const ethToBuy = netTradeValueBTC / currentRatio;
                    
                    if (portfolio.btcAmount >= netTradeValueBTC) {
                        portfolio.btcAmount -= netTradeValueBTC;
                        portfolio.ethAmount += ethToBuy;
                        tradeExecuted = true;
                    }
                }
                
                if (tradeExecuted) {
                    // Pay fees in BTC
                    portfolio.btcAmount -= feesBTC;
                    totalFeesBTC += feesBTC;
                    
                    trades.push({
                        date: currentDay.date,
                        action,
                        zScore,
                        ethBtcRatio: currentRatio,
                        tradeValueBTC,
                        feesBTC,
                        ethAmountAfter: portfolio.ethAmount,
                        btcAmountAfter: portfolio.btcAmount
                    });
                }
            }
            
            // Recalculate total portfolio value in BTC terms
            const finalEthValueBTC = portfolio.ethAmount * currentRatio;
            const finalTotalBTC = portfolio.btcAmount + finalEthValueBTC;
            
            // Track min/max
            maxValueBTC = Math.max(maxValueBTC, finalTotalBTC);
            minValueBTC = Math.min(minValueBTC, finalTotalBTC);
            
            // Store daily snapshot
            dailySnapshots.push({
                date: currentDay.date,
                ethAmount: portfolio.ethAmount,
                btcAmount: portfolio.btcAmount,
                ethBtcRatio: currentRatio,
                ethValueBTC: finalEthValueBTC,
                totalBTC: finalTotalBTC,
                zScore,
                action
            });
            
            // Display progress (every 14 days or when trading)
            if (i % 14 === 0 || tradeExecuted) {
                console.log(
                    `${currentDay.date.padEnd(10)} | ${currentRatio.toFixed(6)} | ${zScore.toFixed(3).padStart(7)} | ${action.padEnd(12)} | ${portfolio.ethAmount.toFixed(4).padStart(10)} | ${portfolio.btcAmount.toFixed(6).padStart(10)} | ${finalTotalBTC.toFixed(6)}`
                );
            }
        }
        
        // Calculate final performance metrics
        const finalSnapshot = dailySnapshots[dailySnapshots.length - 1];
        const finalTotalBTC = finalSnapshot.totalBTC;
        const startingTotalBTC = portfolio.totalBtcValue;
        const btcReturn = ((finalTotalBTC - startingTotalBTC) / startingTotalBTC) * 100;
        const maxDrawdownBTC = ((maxValueBTC - minValueBTC) / maxValueBTC) * 100;
        
        // Calculate buy & hold comparison (in crypto terms)
        const startRatioValue = data[STRATEGY.lookbackWindow].ethBtcRatio;
        const endRatioValue = finalSnapshot.ethBtcRatio;
        
        // Buy & hold 50/50: start with same amounts, see what happens
        const buyHoldEthValue = 0.2000 * endRatioValue;  // ETH value in BTC terms at end
        const buyHoldBtcValue = 0.0077;                  // BTC stays same
        const buyHoldTotalBTC = buyHoldBtcValue + buyHoldEthValue;
        const buyHoldReturn = ((buyHoldTotalBTC - startingTotalBTC) / startingTotalBTC) * 100;
        
        // Display comprehensive results
        console.log('\n' + '='.repeat(60));
        console.log('₿ CRYPTO-ONLY BACKTEST RESULTS (NO DOLLAR CONVERSIONS)');
        console.log('='.repeat(60));
        
        console.log('\n₿ CRYPTO ACCUMULATION PERFORMANCE:');
        console.log(`   Starting Total: ${startingTotalBTC.toFixed(6)} BTC equivalent`);
        console.log(`   Final Total: ${finalTotalBTC.toFixed(6)} BTC equivalent`);
        console.log(`   BTC Gained/Lost: ${(finalTotalBTC - startingTotalBTC).toFixed(6)} BTC`);
        console.log(`   Crypto Return: ${btcReturn >= 0 ? '+' : ''}${btcReturn.toFixed(2)}%`);
        console.log(`   Max Portfolio: ${maxValueBTC.toFixed(6)} BTC`);
        console.log(`   Max Drawdown: ${maxDrawdownBTC.toFixed(2)}%`);
        
        console.log('\n🔄 TRADING ACTIVITY:');
        console.log(`   Total Trades: ${trades.length}`);
        console.log(`   Total Fees: ${totalFeesBTC.toFixed(6)} BTC`);
        console.log(`   Days Analyzed: ${dailySnapshots.length}`);
        console.log(`   Trade Frequency: ${(trades.length / dailySnapshots.length * 365).toFixed(1)} trades/year`);
        
        console.log('\n💎 FINAL CRYPTO HOLDINGS:');
        console.log(`   ETH: ${portfolio.ethAmount.toFixed(4)} ETH`);
        console.log(`   BTC: ${portfolio.btcAmount.toFixed(6)} BTC`);
        console.log(`   ETH Value: ${(portfolio.ethAmount * finalSnapshot.ethBtcRatio).toFixed(6)} BTC`);
        console.log(`   ETH Allocation: ${(finalSnapshot.ethValueBTC / finalTotalBTC * 100).toFixed(1)}%`);
        console.log(`   BTC Allocation: ${(portfolio.btcAmount / finalTotalBTC * 100).toFixed(1)}%`);
        
        console.log('\n⚖️ STRATEGY vs CRYPTO BUY & HOLD:');
        console.log(`   Strategy Total: ${finalTotalBTC.toFixed(6)} BTC`);
        console.log(`   Buy & Hold Total: ${buyHoldTotalBTC.toFixed(6)} BTC`);
        console.log(`   Strategy Return: ${btcReturn.toFixed(2)}%`);
        console.log(`   Buy & Hold Return: ${buyHoldReturn.toFixed(2)}%`);
        console.log(`   Excess Crypto: ${(finalTotalBTC - buyHoldTotalBTC).toFixed(6)} BTC`);
        console.log(`   Excess Return: ${(btcReturn - buyHoldReturn).toFixed(2)}%`);
        
        if (finalTotalBTC > buyHoldTotalBTC) {
            console.log(`   🏆 Strategy ACCUMULATED MORE CRYPTO by ${(finalTotalBTC - buyHoldTotalBTC).toFixed(6)} BTC!`);
        } else {
            console.log(`   📉 Strategy accumulated less crypto by ${(buyHoldTotalBTC - finalTotalBTC).toFixed(6)} BTC`);
        }
        
        // Show best trades
        if (trades.length > 0) {
            console.log('\n📋 CRYPTO TRADE HISTORY:');
            console.log('Date       | Action       | Z-Score | ETH/BTC   | Trade BTC | Fees BTC  | ETH After | BTC After');
            console.log('-'.repeat(95));
            trades.slice(0, 10).forEach(trade => {
                console.log(
                    `${trade.date.padEnd(10)} | ${trade.action.padEnd(12)} | ${trade.zScore.toFixed(3).padStart(7)} | ${trade.ethBtcRatio.toFixed(6)} | ${trade.tradeValueBTC.toFixed(5).padStart(9)} | ${trade.feesBTC.toFixed(6).padStart(9)} | ${trade.ethAmountAfter.toFixed(4).padStart(9)} | ${trade.btcAmountAfter.toFixed(6).padStart(9)}`
                );
            });
            
            if (trades.length > 10) {
                console.log(`   ... and ${trades.length - 10} more trades`);
            }
        }
        
        // Calculate performance metrics
        let profitableTrades = 0;
        for (let i = 1; i < dailySnapshots.length; i++) {
            if (dailySnapshots[i].totalBTC > dailySnapshots[i-1].totalBTC) {
                profitableTrades++;
            }
        }
        const winRate = dailySnapshots.length > 1 ? (profitableTrades / (dailySnapshots.length - 1)) * 100 : 0;
        
        console.log('\n📈 CRYPTO PERFORMANCE METRICS:');
        console.log(`   Daily Win Rate: ${winRate.toFixed(1)}%`);
        console.log(`   Best Day: +${Math.max(...dailySnapshots.map((s, i) => i > 0 ? s.totalBTC - dailySnapshots[i-1].totalBTC : 0)).toFixed(6)} BTC`);
        console.log(`   Worst Day: ${Math.min(...dailySnapshots.map((s, i) => i > 0 ? s.totalBTC - dailySnapshots[i-1].totalBTC : 0)).toFixed(6)} BTC`);
        console.log(`   Fee Impact: ${(totalFeesBTC / finalTotalBTC * 100).toFixed(2)}% of final portfolio`);
        
        // Annualize crypto returns
        const daysTraded = dailySnapshots.length;
        const annualizedCryptoReturn = Math.pow(finalTotalBTC / startingTotalBTC, 365 / daysTraded) - 1;
        
        console.log('\n🔮 ANNUALIZED CRYPTO PROJECTIONS:');
        console.log(`   Days analyzed: ${daysTraded}`);
        console.log(`   Annualized crypto return: ${(annualizedCryptoReturn * 100).toFixed(2)}%`);
        console.log(`   ${startingTotalBTC.toFixed(6)} BTC → ${(startingTotalBTC * (1 + annualizedCryptoReturn)).toFixed(6)} BTC annually`);
        console.log(`   Annual crypto gain: ${(startingTotalBTC * annualizedCryptoReturn).toFixed(6)} BTC`);
        
        console.log('\n🎯 CRYPTO ACCUMULATION SUMMARY:');
        if (btcReturn > 0) {
            console.log(`   ✅ SUCCESS: Accumulated ${(finalTotalBTC - startingTotalBTC).toFixed(6)} more BTC (${btcReturn.toFixed(2)}%)`);
            console.log(`   🚀 Strategy grew your crypto stack by ${btcReturn.toFixed(2)}%`);
        } else {
            console.log(`   ❌ LOSS: Lost ${Math.abs(finalTotalBTC - startingTotalBTC).toFixed(6)} BTC (${btcReturn.toFixed(2)}%)`);
        }
        
        if (finalTotalBTC > buyHoldTotalBTC) {
            console.log(`   💎 OUTPERFORMED: ${(finalTotalBTC - buyHoldTotalBTC).toFixed(6)} BTC more than buy & hold`);
            console.log(`   📈 Beat hodling by ${(btcReturn - buyHoldReturn).toFixed(2)}%`);
        }
        
        if (trades.length === 0) {
            console.log(`   😴 NO TRADES: Market conditions never met strategy criteria`);
        } else {
            console.log(`   📊 Executed ${trades.length} crypto trades over ${daysTraded} days`);
            console.log(`   ⚡ Average trade size: ${(trades.reduce((sum, t) => sum + t.tradeValueBTC, 0) / trades.length).toFixed(5)} BTC`);
        }
        
        console.log('\n₿ BOTTOM LINE - CRYPTO ACCUMULATION:');
        console.log(`   Started with: ${startingTotalBTC.toFixed(6)} BTC worth of crypto`);
        console.log(`   Ended with: ${finalTotalBTC.toFixed(6)} BTC worth of crypto`);
        console.log(`   Net crypto gain: ${(finalTotalBTC - startingTotalBTC).toFixed(6)} BTC`);
        console.log(`   Success metric: ${finalTotalBTC > startingTotalBTC ? '✅ MORE CRYPTO' : '❌ LESS CRYPTO'}`);
        
        // Save results
        const results = {
            strategy: STRATEGY,
            cryptoPerformance: {
                startingBTC: startingTotalBTC,
                finalBTC: finalTotalBTC,
                btcGained: finalTotalBTC - startingTotalBTC,
                cryptoReturn: btcReturn,
                buyHoldReturn,
                excessReturn: btcReturn - buyHoldReturn,
                maxDrawdown: maxDrawdownBTC,
                tradesExecuted: trades.length,
                totalFeesBTC,
                daysAnalyzed: daysTraded,
                annualizedCryptoReturn: annualizedCryptoReturn * 100
            },
            finalHoldings: {
                ethAmount: portfolio.ethAmount,
                btcAmount: portfolio.btcAmount,
                totalBTC: finalTotalBTC
            },
            trades: trades.slice(0, 20), // First 20 trades
            dailySnapshots: dailySnapshots.slice(-30) // Last 30 days
        };
        
        const resultsPath = path.join(__dirname, '..', 'data', 'crypto_only_backtest_results.json');
        await fs.writeJson(resultsPath, results, { spaces: 2 });
        console.log(`\n💾 Crypto-only results saved to: crypto_only_backtest_results.json`);
        
        return results;
        
    } catch (error) {
        console.error('❌ Crypto-only backtest failed:', error.message);
        console.error(error.stack);
        return null;
    }
}

// Run the backtest
if (import.meta.url === `file://${process.argv[1]}`) {
    runCryptoOnlyBacktest().catch(console.error);
}

export default runCryptoOnlyBacktest;
