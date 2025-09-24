#!/usr/bin/env node
/**
 * ETH/BTC MEGA-OPTIMAL TRADING SYSTEM
 * Production-ready implementation with optimized strategy
 */

import ETHBTCDataCollector from './dataCollector.js';
import ETHBTCAnalyzer from './analyzer.js';
import MegaOptimalStrategy from './strategy.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log('🚀 ETH/BTC MEGA-OPTIMAL TRADING SYSTEM');
    console.log('=' + '='.repeat(40));
    console.log('🎯 Using 250-iteration optimized strategy');
    console.log('💎 Goal: Accumulate more crypto through ratio trading\n');
    
    try {
        // Initialize components
        const collector = new ETHBTCDataCollector();
        const strategy = new MegaOptimalStrategy();
        
        // Load or collect data
        console.log('📊 Loading ETH/BTC historical data...');
        let data;
        try {
            data = await collector.loadData('eth_btc_data_2025-09-24.json');
            console.log(`   ✅ Loaded ${data.length} days of historical data`);
        } catch (error) {
            console.log('   📥 Collecting fresh data...');
            data = await collector.collectData();
        }
        
        // Analyze current market conditions
        console.log('\n🔍 Analyzing current market conditions...');
        const analyzer = new ETHBTCAnalyzer(data);
        const latestData = data[data.length - 1];
        const currentRatio = latestData.eth_price / latestData.btc_price;
        
        // Get historical ratios for Z-Score calculation
        const historicalRatios = data.map(d => d.eth_price / d.btc_price);
        
        // Get current trading signal
        const signal = strategy.getSignal(currentRatio, historicalRatios);
        
        console.log('\n📈 CURRENT MARKET ANALYSIS:');
        console.log(`   Current ETH/BTC Ratio: ${currentRatio.toFixed(6)}`);
        console.log(`   Z-Score: ${signal.zScore.toFixed(4)}`);
        console.log(`   Signal Strength: ${(signal.confidence * 100).toFixed(1)}%`);
        console.log(`   Action: ${signal.action}`);
        
        if (signal.shouldTrade) {
            console.log(`   🚨 STRONG SIGNAL: ${signal.reasoning}`);
            console.log(`   💡 Recommended Action: ${signal.action.replace('_', ' ')}`);
        } else {
            console.log(`   😴 HOLD: Signal below threshold (±${strategy.parameters.zScoreThreshold.toFixed(3)})`);
        }
        
        // Show strategy parameters
        console.log('\n🎯 MEGA-OPTIMAL STRATEGY PARAMETERS:');
        console.log(`   Z-Score Threshold: ±${strategy.parameters.zScoreThreshold.toFixed(3)}`);
        console.log(`   Rebalance Amount: ${(strategy.parameters.rebalanceThreshold * 100).toFixed(2)}%`);
        console.log(`   Transaction Cost: ${(strategy.parameters.transactionCost * 100).toFixed(2)}%`);
        console.log(`   Lookback Window: ${strategy.parameters.lookbackWindow} days`);
        
        // Run quick backtest demonstration
        console.log('\n📊 STRATEGY PERFORMANCE PREVIEW:');
        const backtest = analyzer.backtestStrategy(
            strategy.parameters.rebalanceThreshold,
            strategy.parameters.transactionCost
        );
        
        console.log(`   Backtest Return: ${backtest.strategyReturnPercent.toFixed(2)}%`);
        console.log(`   Benchmark Return: ${backtest.buyHoldReturnPercent.toFixed(2)}%`);
        console.log(`   Excess Return: ${(backtest.strategyReturnPercent - backtest.buyHoldReturnPercent).toFixed(2)}%`);
        console.log(`   Sharpe Ratio: ${backtest.sharpeRatio.toFixed(3)}`);
        console.log(`   Max Drawdown: ${Math.abs(backtest.maxDrawdownPercent).toFixed(2)}%`);
        console.log(`   Number of Trades: ${backtest.numTrades}`);
        
        // Generate comprehensive report
        const report = {
            timestamp: new Date().toISOString(),
            currentMarket: {
                ethBtcRatio: currentRatio,
                zScore: signal.zScore,
                signal: signal.action,
                confidence: signal.confidence,
                shouldTrade: signal.shouldTrade
            },
            strategyParameters: strategy.parameters,
            backtestResults: backtest,
            dataPoints: data.length,
            recommendation: signal.shouldTrade ? 
                `Execute ${signal.action.replace('_', ' ')} with ${(strategy.parameters.rebalanceThreshold * 100).toFixed(2)}% of portfolio` :
                'HOLD - Wait for stronger signal'
        };
        
        // Save report
        const timestamp = new Date().toISOString().split('T')[0];
        const reportPath = path.join(__dirname, '..', 'data', `trading_report_${timestamp}.json`);
        await fs.writeJson(reportPath, report, { spaces: 2 });
        
        console.log('\n💾 REPORTS GENERATED:');
        console.log(`   📄 Trading report: trading_report_${timestamp}.json`);
        
        // Show next steps
        console.log('\n🚀 NEXT STEPS:');
        console.log('   1. Run "yarn backtest" for detailed crypto-only backtesting');
        console.log('   2. Use the strategy.js class for live trading implementation');
        console.log('   3. Monitor signals daily for trading opportunities');
        
        if (signal.shouldTrade) {
            console.log('\n⚡ IMMEDIATE ACTION REQUIRED:');
            console.log(`   🎯 Signal: ${signal.action.replace('_', ' ')}`);
            console.log(`   💰 Position Size: ${(strategy.parameters.rebalanceThreshold * 100).toFixed(2)}% of portfolio`);
            console.log(`   📊 Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
        }
        
        console.log('\n🎊 Mega-optimal strategy analysis complete!');
        
    } catch (error) {
        console.error('❌ Application failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}