#!/usr/bin/env node
/**
 * MEGA-OPTIMAL ETH/BTC RATIO TRADING STRATEGY
 * Production-ready implementation of the optimized strategy
 */

import ETHBTCDataCollector from './dataCollector.js';
import ETHBTCAnalyzer from './analyzer.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MegaOptimalStrategy {
    constructor() {
        // MEGA-OPTIMAL PARAMETERS (from 250-iteration optimization)
        this.parameters = {
            rebalanceThreshold: 0.49792708,    // 49.79%
            transactionCost: 0.016646603,      // 1.66%
            zScoreThreshold: 1.257672,         // ±1.257
            lookbackWindow: 15,                // 15 days
            volatilityFilter: 0.5000           // 0.5 volatility filter
        };
        
        this.portfolio = {
            ethAmount: 0,
            btcAmount: 0,
            totalValue: 0
        };
        
        this.tradeHistory = [];
        this.isInitialized = false;
    }

    /**
     * Initialize the strategy with starting portfolio
     */
    initialize(ethAmount, btcAmount) {
        this.portfolio.ethAmount = ethAmount;
        this.portfolio.btcAmount = btcAmount;
        this.isInitialized = true;
        
        console.log('🚀 MEGA-OPTIMAL STRATEGY INITIALIZED');
        console.log(`   ETH: ${ethAmount.toFixed(4)} ETH`);
        console.log(`   BTC: ${btcAmount.toFixed(6)} BTC`);
        console.log(`   Parameters: Z-Score ±${this.parameters.zScoreThreshold.toFixed(3)}, ${(this.parameters.rebalanceThreshold * 100).toFixed(2)}% rebalance`);
        
        return this;
    }

    /**
     * Calculate Z-Score for current market conditions
     */
    calculateZScore(currentRatio, historicalRatios) {
        if (historicalRatios.length < this.parameters.lookbackWindow) {
            return 0; // Not enough historical data
        }
        
        const lookbackData = historicalRatios.slice(-this.parameters.lookbackWindow);
        const mean = lookbackData.reduce((sum, ratio) => sum + ratio, 0) / lookbackData.length;
        const variance = lookbackData.reduce((sum, ratio) => sum + Math.pow(ratio - mean, 2), 0) / lookbackData.length;
        const stdDev = Math.sqrt(variance);
        
        return stdDev > 0 ? (currentRatio - mean) / stdDev : 0;
    }

    /**
     * Get current trading signal
     */
    getSignal(currentRatio, historicalRatios) {
        const zScore = this.calculateZScore(currentRatio, historicalRatios);
        
        const signal = {
            zScore,
            action: 'HOLD',
            strength: Math.abs(zScore),
            shouldTrade: false,
            confidence: Math.min(Math.abs(zScore) / this.parameters.zScoreThreshold, 1.0)
        };
        
        if (zScore > this.parameters.zScoreThreshold) {
            signal.action = 'SELL_ETH_BUY_BTC';
            signal.shouldTrade = true;
            signal.reasoning = 'ETH expensive relative to BTC';
        } else if (zScore < -this.parameters.zScoreThreshold) {
            signal.action = 'BUY_ETH_SELL_BTC';
            signal.shouldTrade = true;
            signal.reasoning = 'ETH cheap relative to BTC';
        }
        
        return signal;
    }

    /**
     * Calculate current portfolio value in BTC terms
     */
    getPortfolioValueBTC(currentRatio) {
        const ethValueBTC = this.portfolio.ethAmount * currentRatio;
        return this.portfolio.btcAmount + ethValueBTC;
    }

    /**
     * Execute a trade based on signal
     */
    executeTrade(signal, currentRatio) {
        if (!this.isInitialized) {
            throw new Error('Strategy not initialized. Call initialize() first.');
        }
        
        if (!signal.shouldTrade) {
            return {
                executed: false,
                reason: 'No trading signal'
            };
        }
        
        const currentTotalBTC = this.getPortfolioValueBTC(currentRatio);
        const tradeValueBTC = currentTotalBTC * this.parameters.rebalanceThreshold;
        const feesBTC = tradeValueBTC * this.parameters.transactionCost;
        const netTradeValueBTC = tradeValueBTC - feesBTC;
        
        const trade = {
            timestamp: new Date().toISOString(),
            action: signal.action,
            zScore: signal.zScore,
            ethBtcRatio: currentRatio,
            portfolioValueBefore: currentTotalBTC,
            tradeValueBTC,
            feesBTC,
            executed: false
        };
        
        try {
            if (signal.action === 'SELL_ETH_BUY_BTC') {
                // Sell ETH, buy BTC
                const ethToSell = netTradeValueBTC / currentRatio;
                
                if (this.portfolio.ethAmount >= ethToSell) {
                    this.portfolio.ethAmount -= ethToSell;
                    this.portfolio.btcAmount += netTradeValueBTC;
                    trade.executed = true;
                    trade.ethSold = ethToSell;
                    trade.btcBought = netTradeValueBTC;
                } else {
                    trade.error = 'Insufficient ETH balance';
                }
                
            } else if (signal.action === 'BUY_ETH_SELL_BTC') {
                // Buy ETH, sell BTC
                const ethToBuy = netTradeValueBTC / currentRatio;
                
                if (this.portfolio.btcAmount >= netTradeValueBTC) {
                    this.portfolio.btcAmount -= netTradeValueBTC;
                    this.portfolio.ethAmount += ethToBuy;
                    trade.executed = true;
                    trade.btcSold = netTradeValueBTC;
                    trade.ethBought = ethToBuy;
                } else {
                    trade.error = 'Insufficient BTC balance';
                }
            }
            
            if (trade.executed) {
                // Pay fees (reduce BTC balance)
                this.portfolio.btcAmount -= feesBTC;
                
                trade.portfolioValueAfter = this.getPortfolioValueBTC(currentRatio);
                trade.ethAmountAfter = this.portfolio.ethAmount;
                trade.btcAmountAfter = this.portfolio.btcAmount;
                
                this.tradeHistory.push(trade);
                
                console.log(`🔄 TRADE EXECUTED: ${signal.action}`);
                console.log(`   Z-Score: ${signal.zScore.toFixed(4)}`);
                console.log(`   Trade Value: ${tradeValueBTC.toFixed(6)} BTC`);
                console.log(`   Fees: ${feesBTC.toFixed(6)} BTC`);
                console.log(`   New Portfolio: ${this.portfolio.ethAmount.toFixed(4)} ETH + ${this.portfolio.btcAmount.toFixed(6)} BTC`);
            }
            
        } catch (error) {
            trade.error = error.message;
            console.error('❌ Trade execution failed:', error.message);
        }
        
        return trade;
    }

    /**
     * Get current portfolio status
     */
    getPortfolioStatus(currentRatio) {
        const ethValueBTC = this.portfolio.ethAmount * currentRatio;
        const totalValueBTC = this.portfolio.btcAmount + ethValueBTC;
        
        return {
            ethAmount: this.portfolio.ethAmount,
            btcAmount: this.portfolio.btcAmount,
            ethValueBTC,
            totalValueBTC,
            ethPercent: ethValueBTC / totalValueBTC,
            btcPercent: this.portfolio.btcAmount / totalValueBTC,
            totalTrades: this.tradeHistory.length
        };
    }

    /**
     * Get strategy performance metrics
     */
    getPerformanceMetrics(startingValueBTC) {
        if (this.tradeHistory.length === 0) {
            return {
                totalTrades: 0,
                totalFees: 0,
                performance: 'No trades executed'
            };
        }
        
        const currentValueBTC = this.tradeHistory[this.tradeHistory.length - 1].portfolioValueAfter;
        const totalFees = this.tradeHistory.reduce((sum, trade) => sum + trade.feesBTC, 0);
        const totalReturn = ((currentValueBTC - startingValueBTC) / startingValueBTC) * 100;
        
        const profitableTrades = this.tradeHistory.filter(trade => 
            trade.portfolioValueAfter > trade.portfolioValueBefore
        ).length;
        
        return {
            totalTrades: this.tradeHistory.length,
            profitableTrades,
            winRate: (profitableTrades / this.tradeHistory.length) * 100,
            totalReturn,
            totalFees,
            feePercentage: (totalFees / currentValueBTC) * 100,
            avgTradeSize: this.tradeHistory.reduce((sum, trade) => sum + trade.tradeValueBTC, 0) / this.tradeHistory.length
        };
    }

    /**
     * Save strategy state and performance
     */
    async saveState(filename = null) {
        const timestamp = new Date().toISOString().split('T')[0];
        const defaultFilename = `strategy_state_${timestamp}.json`;
        const filepath = path.join(__dirname, '..', 'data', filename || defaultFilename);
        
        const state = {
            timestamp: new Date().toISOString(),
            parameters: this.parameters,
            portfolio: this.portfolio,
            tradeHistory: this.tradeHistory,
            isInitialized: this.isInitialized
        };
        
        await fs.writeJson(filepath, state, { spaces: 2 });
        console.log(`💾 Strategy state saved to: ${filename || defaultFilename}`);
        
        return filepath;
    }

    /**
     * Load strategy state from file
     */
    async loadState(filename) {
        const filepath = path.join(__dirname, '..', 'data', filename);
        
        try {
            const state = await fs.readJson(filepath);
            
            this.parameters = state.parameters;
            this.portfolio = state.portfolio;
            this.tradeHistory = state.tradeHistory || [];
            this.isInitialized = state.isInitialized || false;
            
            console.log(`📥 Strategy state loaded from: ${filename}`);
            console.log(`   Portfolio: ${this.portfolio.ethAmount.toFixed(4)} ETH + ${this.portfolio.btcAmount.toFixed(6)} BTC`);
            console.log(`   Trade History: ${this.tradeHistory.length} trades`);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to load strategy state:', error.message);
            return false;
        }
    }
}

export default MegaOptimalStrategy;
