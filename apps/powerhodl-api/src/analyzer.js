#!/usr/bin/env node
/**
 * ETH/BTC Data Analyzer
 * Analyzes ETH/BTC ratio data for trading opportunities
 * 
 * Now uses the unified TradingEngine for consistency
 */

import TradingEngine from './TradingEngine.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import * as ss from 'simple-statistics';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ETHBTCAnalyzer {
    constructor(data) {
        this.data = data || [];
        this.ratios = this.data.map(d => d.close);
    }

    /**
     * Analyze mean reversion characteristics
     */
    analyzeMeanReversion(window = 30) {
        if (this.ratios.length < window) {
            throw new Error(`Not enough data. Need at least ${window} data points.`);
        }

        const ratio = this.ratios;
        const mean = ss.mean(ratio);
        const std = ss.standardDeviation(ratio);
        
        // Calculate rolling statistics for Z-score
        const zScores = [];
        for (let i = window - 1; i < ratio.length; i++) {
            const slice = ratio.slice(i - window + 1, i + 1);
            const rollingMean = ss.mean(slice);
            const rollingStd = ss.standardDeviation(slice);
            zScores.push((ratio[i] - rollingMean) / rollingStd);
        }

        // Calculate autocorrelation for mean reversion speed
        const autocorr1 = this.calculateAutocorrelation(zScores, 1);
        const halfLife = autocorr1 !== 0 ? -Math.log(2) / Math.log(Math.abs(autocorr1)) : Infinity;

        // Extreme deviation analysis
        const extremeThreshold = 2.0;
        const extremeDeviations = zScores.filter(z => Math.abs(z) > extremeThreshold).length;
        const timeInExtremes = extremeDeviations / zScores.length;

        return {
            meanRatio: mean,
            stdRatio: std,
            currentZScore: zScores[zScores.length - 1] || 0,
            autocorr1Day: autocorr1,
            halfLifeDays: halfLife,
            extremeDeviationsCount: extremeDeviations,
            timeInExtremesPercent: timeInExtremes * 100,
            maxZScore: Math.max(...zScores),
            minZScore: Math.min(...zScores)
        };
    }

    /**
     * Find trading opportunities based on mean reversion
     */
    findTradingOpportunities(zThreshold = 1.5, minDuration = 2) {
        const opportunities = [];
        let currentPosition = 0;
        let entryDate = null;
        let entryPrice = null;
        let entryIndex = null;

        this.data.forEach((record, index) => {
            if (!record.z_score) return;

            const signal = record.z_score > zThreshold ? -1 : 
                          record.z_score < -zThreshold ? 1 : 0;

            // Check for signal persistence
            let persistentSignal = 0;
            if (index >= minDuration - 1) {
                const recentSignals = [];
                for (let i = 0; i < minDuration; i++) {
                    const pastRecord = this.data[index - i];
                    if (pastRecord && pastRecord.z_score) {
                        const pastSignal = pastRecord.z_score > zThreshold ? -1 : 
                                         pastRecord.z_score < -zThreshold ? 1 : 0;
                        recentSignals.push(pastSignal);
                    }
                }
                
                if (recentSignals.length === minDuration && 
                    recentSignals.every(s => s === signal && s !== 0)) {
                    persistentSignal = signal;
                }
            }

            // Entry logic
            if (persistentSignal !== 0 && currentPosition === 0) {
                currentPosition = persistentSignal;
                entryDate = record.timestamp;
                entryPrice = record.close;
                entryIndex = index;
            }
            // Exit logic
            else if (currentPosition !== 0 && (persistentSignal === 0 || persistentSignal !== currentPosition)) {
                const exitDate = record.timestamp;
                const exitPrice = record.close;
                const durationDays = Math.floor((exitDate - entryDate) / (1000 * 60 * 60 * 24));

                let pnlPercent;
                if (currentPosition === 1) { // Long ETH/BTC
                    pnlPercent = (exitPrice - entryPrice) / entryPrice * 100;
                } else { // Short ETH/BTC
                    pnlPercent = (entryPrice - exitPrice) / entryPrice * 100;
                }

                opportunities.push({
                    entryDate,
                    exitDate,
                    position: currentPosition === 1 ? 'Long ETH' : 'Short ETH',
                    entryPrice,
                    exitPrice,
                    durationDays,
                    pnlPercent,
                    entryZScore: this.data[entryIndex].z_score,
                    exitZScore: record.z_score
                });

                currentPosition = 0;
            }
        });

        return opportunities;
    }

    /**
     * Backtest rebalancing strategy
     */
    backtestStrategy(rebalanceThreshold = 0.05, transactionCost = 0.001) {
        const initialCapital = 10000; // $10k equivalent in BTC
        const targetEthPercent = 0.5;
        
        let ethAmount = initialCapital * targetEthPercent;
        let btcAmount = initialCapital * (1 - targetEthPercent);
        const portfolio = [];

        this.data.forEach((record, index) => {
            const ratio = record.close; // ETH/BTC ratio
            
            // Calculate current portfolio values in BTC terms
            const totalBtcValue = btcAmount + (ethAmount / ratio);
            const currentEthPercent = (ethAmount / ratio) / totalBtcValue;
            const deviation = Math.abs(currentEthPercent - targetEthPercent);

            let rebalanced = false;
            
            if (deviation > rebalanceThreshold) {
                // Rebalance portfolio
                const targetEthBtcValue = totalBtcValue * targetEthPercent;
                const ethToTrade = (targetEthBtcValue * ratio) - ethAmount;
                
                // Apply transaction costs
                if (ethToTrade !== 0) {
                    const cost = Math.abs(ethToTrade) * transactionCost;
                    if (ethToTrade > 0) { // Buying ETH
                        ethAmount += ethToTrade - cost;
                        btcAmount -= targetEthBtcValue + cost;
                    } else { // Selling ETH
                        ethAmount += ethToTrade + cost;
                        btcAmount -= targetEthBtcValue - cost;
                    }
                    rebalanced = true;
                }
            }

            portfolio.push({
                date: record.timestamp,
                ethAmount,
                btcAmount,
                ratio,
                totalBtcValue: btcAmount + (ethAmount / ratio),
                ethPercent: currentEthPercent,
                deviation,
                rebalanced
            });
        });

        // Calculate performance metrics
        const finalValue = portfolio[portfolio.length - 1].totalBtcValue;
        const totalReturn = (finalValue - initialCapital) / initialCapital * 100;
        
        // Buy and hold comparison
        const firstRatio = this.data[0].close;
        const lastRatio = this.data[this.data.length - 1].close;
        const bhFinalValue = (initialCapital * 0.5) + (initialCapital * 0.5 / firstRatio) * lastRatio;
        const bhReturn = (bhFinalValue - initialCapital) / initialCapital * 100;
        
        // Calculate other metrics
        const numTrades = portfolio.filter(p => p.rebalanced).length;
        const dailyReturns = [];
        
        for (let i = 1; i < portfolio.length; i++) {
            const dailyReturn = (portfolio[i].totalBtcValue - portfolio[i-1].totalBtcValue) / portfolio[i-1].totalBtcValue;
            dailyReturns.push(dailyReturn);
        }

        const sharpeRatio = this.calculateSharpeRatio(dailyReturns);
        const maxDrawdown = this.calculateMaxDrawdown(portfolio.map(p => p.totalBtcValue));

        return {
            strategyReturnPercent: totalReturn,
            buyHoldReturnPercent: bhReturn,
            excessReturnPercent: totalReturn - bhReturn,
            numTrades,
            sharpeRatio,
            maxDrawdownPercent: maxDrawdown * 100,
            finalValue,
            portfolio
        };
    }
    
    /**
     * NEW UNIFIED BACKTEST METHOD
     * Uses the same trading engine as live trading for consistency
     */
    backtestStrategyUnified(rebalanceThreshold = 0.05, transactionCost = 0.001, zScoreThreshold = 1.5, lookbackWindow = 15) {
        // Create trading engine with the specified parameters
        const tradingEngine = new TradingEngine({
            rebalanceThreshold,
            transactionCost,
            zScoreThreshold,
            lookbackWindow,
            volatilityFilter: 0.5
        });
        
        // Run backtest using the unified engine
        const result = tradingEngine.runBacktest(this.data);
        
        // Calculate additional metrics for compatibility
        const dailyReturns = [];
        for (let i = 1; i < result.portfolio.length; i++) {
            const dailyReturn = (result.portfolio[i].totalBtcValue - result.portfolio[i-1].totalBtcValue) / result.portfolio[i-1].totalBtcValue;
            dailyReturns.push(dailyReturn);
        }
        
        const sharpeRatio = this.calculateSharpeRatio(dailyReturns);
        const maxDrawdown = this.calculateMaxDrawdown(result.portfolio.map(p => p.totalBtcValue));
        
        // Buy and hold comparison
        const firstRatio = this.data[0].close;
        const lastRatio = this.data[this.data.length - 1].close;
        const initialCapital = result.initialValue;
        const bhFinalValue = (initialCapital * 0.5) + (initialCapital * 0.5 / firstRatio) * lastRatio;
        const bhReturn = (bhFinalValue - initialCapital) / initialCapital * 100;
        
        return {
            strategyReturnPercent: result.totalReturn,
            buyHoldReturnPercent: bhReturn,
            excessReturnPercent: result.totalReturn - bhReturn,
            numTrades: result.numTrades,
            sharpeRatio,
            maxDrawdownPercent: maxDrawdown * 100,
            finalValue: result.finalValue,
            portfolio: result.portfolio,
            trades: result.trades
        };
    }
    
    /**
     * Alternative backtest method for compatibility
     * Also uses the unified engine
     */
    backtest(params) {
        return this.backtestStrategyUnified(
            params.rebalanceThreshold,
            params.transactionCost,
            params.zScoreThreshold,
            params.lookbackWindow
        );
    }

    /**
     * Generate comprehensive analysis report
     */
    generateReport() {
        if (this.data.length === 0) {
            return "❌ No data available for analysis";
        }

        const ratioStats = {
            count: this.ratios.length,
            mean: ss.mean(this.ratios),
            std: ss.standardDeviation(this.ratios),
            min: Math.min(...this.ratios),
            max: Math.max(...this.ratios),
            current: this.ratios[this.ratios.length - 1]
        };

        const mrAnalysis = this.analyzeMeanReversion();
        const opportunities = this.findTradingOpportunities();
        const backtest = this.backtestStrategy();

        let report = `
📊 ETH/BTC RATIO ANALYSIS REPORT
${'='.repeat(50)}

📈 BASIC STATISTICS
• Data Period: ${this.data[0].timestamp.toISOString().split('T')[0]} to ${this.data[this.data.length - 1].timestamp.toISOString().split('T')[0]}
• Total Days: ${ratioStats.count}
• Current Ratio: ${ratioStats.current.toFixed(6)}
• Mean Ratio: ${ratioStats.mean.toFixed(6)}
• Std Dev: ${ratioStats.std.toFixed(6)}
• Min Ratio: ${ratioStats.min.toFixed(6)}
• Max Ratio: ${ratioStats.max.toFixed(6)}

🔄 MEAN REVERSION ANALYSIS
• Current Z-Score: ${mrAnalysis.currentZScore.toFixed(2)}
• Half-Life: ${mrAnalysis.halfLifeDays.toFixed(1)} days
• 1-Day Autocorr: ${mrAnalysis.autocorr1Day.toFixed(3)}
• Extreme Deviations: ${mrAnalysis.extremeDeviationsCount} events
• Time in Extremes: ${mrAnalysis.timeInExtremesPercent.toFixed(1)}%

💰 TRADING OPPORTUNITIES (Last Year)
• Total Opportunities: ${opportunities.length}`;

        if (opportunities.length > 0) {
            const avgDuration = ss.mean(opportunities.map(o => o.durationDays));
            const avgPnl = ss.mean(opportunities.map(o => o.pnlPercent));
            const winRate = opportunities.filter(o => o.pnlPercent > 0).length / opportunities.length * 100;

            report += `
• Average Duration: ${avgDuration.toFixed(1)} days
• Average PnL: ${avgPnl.toFixed(2)}%
• Win Rate: ${winRate.toFixed(1)}%
• Best Trade: ${Math.max(...opportunities.map(o => o.pnlPercent)).toFixed(2)}%
• Worst Trade: ${Math.min(...opportunities.map(o => o.pnlPercent)).toFixed(2)}%`;
        }

        report += `

🏆 BACKTEST RESULTS (5% Rebalance Threshold)
• Strategy Return: ${backtest.strategyReturnPercent.toFixed(2)}%
• Buy & Hold Return: ${backtest.buyHoldReturnPercent.toFixed(2)}%
• Excess Return: ${backtest.excessReturnPercent.toFixed(2)}%
• Number of Trades: ${backtest.numTrades}
• Sharpe Ratio: ${backtest.sharpeRatio.toFixed(2)}
• Max Drawdown: ${backtest.maxDrawdownPercent.toFixed(2)}%

📋 CURRENT SIGNAL`;

        if (this.data[this.data.length - 1].z_score !== undefined) {
            const currentZ = this.data[this.data.length - 1].z_score;
            let signal;
            
            if (currentZ > 1.5) {
                signal = "🔴 SELL ETH, BUY BTC (Ratio too high)";
            } else if (currentZ < -1.5) {
                signal = "🟢 BUY ETH, SELL BTC (Ratio too low)";
            } else {
                signal = "🟡 HOLD (Ratio near mean)";
            }
            
            report += `
• ${signal}
• Z-Score: ${currentZ.toFixed(2)}`;
        }

        return report;
    }

    /**
     * Save analysis results
     */
    async saveAnalysis(opportunities, backtest, filename = null) {
        if (!filename) {
            const timestamp = new Date().toISOString().split('T')[0];
            filename = `eth_btc_analysis_${timestamp}`;
        }

        const dataDir = path.join(__dirname, '..', 'data');
        await fs.ensureDir(dataDir);

        const analysisData = {
            timestamp: new Date().toISOString(),
            meanReversion: this.analyzeMeanReversion(),
            opportunities,
            backtest: {
                ...backtest,
                portfolio: backtest.portfolio.slice(-100) // Keep last 100 days only
            },
            summary: {
                totalOpportunities: opportunities.length,
                avgReturn: opportunities.length > 0 ? ss.mean(opportunities.map(o => o.pnlPercent)) : 0,
                winRate: opportunities.length > 0 ? opportunities.filter(o => o.pnlPercent > 0).length / opportunities.length : 0
            }
        };

        const jsonPath = path.join(dataDir, `${filename}.json`);
        await fs.writeJson(jsonPath, analysisData, { spaces: 2 });

        console.log(`💾 Analysis saved to: ${jsonPath}`);
        return jsonPath;
    }

    // Helper methods
    calculateAutocorrelation(series, lag) {
        if (series.length <= lag) return 0;
        
        const n = series.length - lag;
        const mean = ss.mean(series);
        
        let autocovariance = 0;
        let variance = 0;
        
        for (let i = 0; i < n; i++) {
            autocovariance += (series[i] - mean) * (series[i + lag] - mean);
            variance += Math.pow(series[i] - mean, 2);
        }
        
        return variance > 0 ? autocovariance / variance : 0;
    }

    calculateSharpeRatio(dailyReturns, riskFreeRate = 0.02) {
        if (dailyReturns.length === 0) return 0;
        
        const annualReturn = ss.mean(dailyReturns) * 365;
        const annualVolatility = ss.standardDeviation(dailyReturns) * Math.sqrt(365);
        
        return annualVolatility > 0 ? (annualReturn - riskFreeRate) / annualVolatility : 0;
    }

    calculateMaxDrawdown(values) {
        let maxDrawdown = 0;
        let peak = values[0];
        
        values.forEach(value => {
            if (value > peak) {
                peak = value;
            }
            
            const drawdown = (peak - value) / peak;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        });
        
        return maxDrawdown;
    }
}

// CLI usage
async function main() {
    console.log('🔍 ETH/BTC Data Analyzer');
    console.log('=' + '='.repeat(25));

    // This would load data from the collector
    console.log('To use this analyzer:');
    console.log('1. First run: node src/dataCollector.js');
    console.log('2. Then use the analyzer with your data');
    console.log('');
    console.log('Example:');
    console.log('import ETHBTCDataCollector from "./dataCollector.js";');
    console.log('import ETHBTCAnalyzer from "./analyzer.js";');
    console.log('');
    console.log('const collector = new ETHBTCDataCollector();');
    console.log('const data = await collector.getLatestData();');
    console.log('const analyzer = new ETHBTCAnalyzer(data);');
    console.log('console.log(analyzer.generateReport());');
}

// Run if called directly
if (process.argv[1] === __filename) {
    main().catch(console.error);
}

export default ETHBTCAnalyzer;
