#!/usr/bin/env node
/**
 * UNIFIED TRADING ENGINE
 * 
 * Single source of truth for all trading decisions.
 * Used by BOTH live trading and backtesting to ensure consistency.
 */

import * as ss from 'simple-statistics';

export class TradingEngine {
    constructor(parameters = null) {
        // Use provided parameters or default mega-optimal parameters
        this.parameters = parameters || {
            rebalanceThreshold: 0.49792708,    // 49.79%
            transactionCost: 0.016646603,      // 1.66%
            zScoreThreshold: 1.257672,         // ±1.257
            lookbackWindow: 15,                // 15 days
            volatilityFilter: 0.5000           // 0.5 volatility filter
        };
        
        this.targetEthPercent = 0.5; // 50/50 ETH/BTC allocation target
    }

    /**
     * CORE TRADING DECISION FUNCTION
     * 
     * This is the SINGLE FUNCTION that determines all trading actions.
     * Both live and backtest MUST use this exact function.
     * 
     * @param {number} currentRatio - Current ETH/BTC ratio
     * @param {Array} historicalRatios - Historical ETH/BTC ratios for Z-score calculation
     * @param {Object} currentPortfolio - Current portfolio state {ethAmount, btcAmount}
     * @returns {Object} Trading decision
     */
    makeTradeDecision(currentRatio, historicalRatios, currentPortfolio) {
        // Step 1: Calculate Z-score using the exact same method
        const zScore = this.calculateZScore(currentRatio, historicalRatios);
        
        // Step 2: Calculate current portfolio state
        const portfolioState = this.calculatePortfolioState(currentRatio, currentPortfolio);
        
        // Step 3: Determine if rebalancing is needed
        const shouldRebalance = this.shouldRebalance(portfolioState.deviation);
        
        // Step 4: Generate trade signal
        const signal = this.generateSignal(zScore);
        
        // Step 5: Calculate trade amounts if needed
        const tradeAction = shouldRebalance ? 
            this.calculateTradeAmounts(currentRatio, currentPortfolio, portfolioState) : 
            null;
        
        return {
            // Signal information
            zScore,
            signal: signal.action,
            signalStrength: signal.strength,
            signalConfidence: signal.confidence,
            signalReasoning: signal.reasoning,
            
            // Portfolio state
            currentEthPercent: portfolioState.currentEthPercent,
            targetEthPercent: this.targetEthPercent,
            deviation: portfolioState.deviation,
            totalBtcValue: portfolioState.totalBtcValue,
            
            // Trading decision
            shouldTrade: shouldRebalance && signal.shouldTrade,
            shouldRebalance,
            tradeAction,
            
            // Metadata
            timestamp: new Date(),
            parameters: { ...this.parameters }
        };
    }

    /**
     * Calculate Z-score for mean reversion analysis
     * IDENTICAL calculation used by both live and backtest
     */
    calculateZScore(currentRatio, historicalRatios) {
        if (!historicalRatios || historicalRatios.length < this.parameters.lookbackWindow) {
            return 0;
        }
        
        // Use the lookback window for Z-score calculation
        const recentRatios = historicalRatios.slice(-this.parameters.lookbackWindow);
        const mean = ss.mean(recentRatios);
        const std = ss.standardDeviation(recentRatios);
        
        if (std === 0) return 0;
        
        return (currentRatio - mean) / std;
    }

    /**
     * Calculate current portfolio state
     */
    calculatePortfolioState(currentRatio, portfolio) {
        const { ethAmount, btcAmount } = portfolio;
        
        // Calculate total value in BTC terms
        const totalBtcValue = btcAmount + (ethAmount / currentRatio);
        
        // Calculate current ETH percentage
        const currentEthPercent = (ethAmount / currentRatio) / totalBtcValue;
        
        // Calculate deviation from target
        const deviation = Math.abs(currentEthPercent - this.targetEthPercent);
        
        return {
            totalBtcValue,
            currentEthPercent,
            deviation
        };
    }

    /**
     * Determine if portfolio should be rebalanced
     */
    shouldRebalance(deviation) {
        return deviation > this.parameters.rebalanceThreshold;
    }

    /**
     * Generate trading signal based on Z-score
     */
    generateSignal(zScore) {
        const signal = {
            action: 'HOLD',
            strength: Math.abs(zScore),
            shouldTrade: false,
            confidence: Math.min(Math.abs(zScore) / this.parameters.zScoreThreshold, 1.0),
            reasoning: 'Ratio within normal range'
        };
        
        if (zScore > this.parameters.zScoreThreshold) {
            signal.action = 'SELL_ETH_BUY_BTC';
            signal.shouldTrade = true;
            signal.reasoning = `ETH expensive relative to BTC (Z-score: ${zScore.toFixed(3)})`;
        } else if (zScore < -this.parameters.zScoreThreshold) {
            signal.action = 'BUY_ETH_SELL_BTC';
            signal.shouldTrade = true;
            signal.reasoning = `ETH cheap relative to BTC (Z-score: ${zScore.toFixed(3)})`;
        }
        
        return signal;
    }

    /**
     * Calculate exact trade amounts needed for rebalancing
     */
    calculateTradeAmounts(currentRatio, currentPortfolio, portfolioState) {
        const { ethAmount, btcAmount } = currentPortfolio;
        const { totalBtcValue } = portfolioState;
        
        // Calculate target amounts
        const targetEthBtcValue = totalBtcValue * this.targetEthPercent;
        const targetBtcAmount = totalBtcValue * (1 - this.targetEthPercent);
        const targetEthAmount = targetEthBtcValue * currentRatio;
        
        // Calculate trade amounts
        const ethToTrade = targetEthAmount - ethAmount;
        const btcToTrade = targetBtcAmount - btcAmount;
        
        // Apply transaction costs
        const costBasis = Math.abs(ethToTrade) * currentRatio; // Cost basis in BTC
        const transactionCost = costBasis * this.parameters.transactionCost;
        
        return {
            ethToTrade,
            btcToTrade,
            transactionCost,
            targetEthAmount,
            targetBtcAmount,
            action: ethToTrade > 0 ? 'BUY_ETH' : 'SELL_ETH'
        };
    }

    /**
     * Execute a single trade step for backtesting
     * This applies the trade decision to update the portfolio
     */
    executeTradeStep(currentRatio, currentPortfolio, historicalRatios) {
        // Make trading decision using the core function
        const decision = this.makeTradeDecision(currentRatio, historicalRatios, currentPortfolio);
        
        let newPortfolio = { ...currentPortfolio };
        let trade = null;
        
        if (decision.shouldTrade && decision.tradeAction) {
            const { ethToTrade, transactionCost } = decision.tradeAction;
            
            // Apply the trade
            if (ethToTrade > 0) {
                // Buying ETH with BTC
                newPortfolio.ethAmount += ethToTrade;
                newPortfolio.btcAmount -= (ethToTrade / currentRatio) + transactionCost;
            } else {
                // Selling ETH for BTC
                newPortfolio.ethAmount += ethToTrade; // ethToTrade is negative
                newPortfolio.btcAmount -= (ethToTrade / currentRatio) - transactionCost;
            }
            
            trade = {
                timestamp: new Date(),
                action: decision.tradeAction.action,
                ethAmount: ethToTrade,
                btcAmount: -ethToTrade / currentRatio,
                cost: transactionCost,
                reason: decision.signalReasoning
            };
        }
        
        return {
            portfolio: newPortfolio,
            decision,
            trade,
            portfolioValue: decision.totalBtcValue
        };
    }

    /**
     * Run complete backtest using the same decision logic as live trading
     */
    runBacktest(historicalData, initialPortfolio = null) {
        // Initialize portfolio
        let portfolio = initialPortfolio || {
            ethAmount: 5000,  // $5000 worth of ETH at start
            btcAmount: 5000   // $5000 worth of BTC at start (in BTC terms)
        };
        
        const results = [];
        const trades = [];
        
        historicalData.forEach((dataPoint, index) => {
            const currentRatio = dataPoint.close;
            
            // Get historical ratios up to this point for Z-score
            const historicalRatios = historicalData
                .slice(0, index + 1)
                .map(d => d.close);
            
            // Execute trading step
            const step = this.executeTradeStep(currentRatio, portfolio, historicalRatios);
            
            // Update portfolio
            portfolio = step.portfolio;
            
            // Record results
            results.push({
                timestamp: dataPoint.timestamp || dataPoint.date,
                ratio: currentRatio,
                ethAmount: portfolio.ethAmount,
                btcAmount: portfolio.btcAmount,
                totalBtcValue: step.portfolioValue,
                zScore: step.decision.zScore,
                signal: step.decision.signal,
                shouldTrade: step.decision.shouldTrade,
                rebalanced: step.trade !== null
            });
            
            // Record trades
            if (step.trade) {
                trades.push(step.trade);
            }
        });
        
        // Calculate performance metrics
        const initialValue = results[0].totalBtcValue;
        const finalValue = results[results.length - 1].totalBtcValue;
        const totalReturn = ((finalValue - initialValue) / initialValue) * 100;
        
        return {
            portfolio: results,
            trades,
            initialValue,
            finalValue,
            totalReturn,
            numTrades: trades.length,
            parameters: { ...this.parameters }
        };
    }
}

export default TradingEngine;
