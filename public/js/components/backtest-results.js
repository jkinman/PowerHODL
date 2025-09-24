/**
 * Backtest Results Module
 * 
 * Handles formatting and display of backtest results and detailed analysis
 */

class BacktestResults {
    constructor() {
        this.lastResult = null;
    }

    /**
     * Update latest run detailed parameters and results
     */
    updateLatestRunDetails(result, parameters = null) {
        this.lastResult = result;
        
        const latestRunContent = document.getElementById('latestRunContent');
        if (!latestRunContent || !result) return;

        const params = parameters || this.extractParametersFromResult(result);
        const detailsHtml = this.generateResultsHTML(result, params);
        
        latestRunContent.innerHTML = detailsHtml;
    }

    /**
     * Extract parameters from result object or get current form values
     */
    extractParametersFromResult(result) {
        if (result.parameters) {
            // Add backtest period from data info if available
            const params = { ...result.parameters };
            if (result.dataInfo?.totalDays) {
                params.backtestPeriod = `${result.dataInfo.totalDays} days`;
            } else if (result.portfolioEvolution?.fullDataRange?.totalDays) {
                params.backtestPeriod = `${result.portfolioEvolution.fullDataRange.totalDays} days`;
            }
            return params;
        }

        // Fallback to current form values
        return window.strategyPresets?.getCurrentParameters() || this.getFormParameters();
    }

    /**
     * Get parameters from form inputs (fallback)
     */
    getFormParameters() {
        const getValue = (id) => {
            const element = document.getElementById(id);
            return element ? parseFloat(element.value) || element.value : 'N/A';
        };

        return {
            zScoreThreshold: getValue('zScoreThreshold'),
            rebalancePercent: getValue('rebalancePercent'),
            lookbackWindow: getValue('lookbackWindow'),
            transactionCost: getValue('transactionCost'),
            backtestPeriod: getValue('backtestPeriod'),
            startingBTC: getValue('startingBTC'),
            startingETH: getValue('startingETH')
        };
    }

    /**
     * Generate comprehensive results HTML
     */
    generateResultsHTML(result, params) {
        return `
            <div style="display: grid; gap: 15px;">
                ${this.generateParametersSection(params)}
                ${this.generatePerformanceSection(result)}
                ${this.generatePortfolioSection(result)}
                ${this.generateStrategySection(result, params)}
                ${this.generateNotesSection(result)}
            </div>
        `;
    }

    /**
     * Generate parameters section
     */
    generateParametersSection(params) {
        return `
            <div>
                <div style="color: #00d4aa; font-weight: bold; margin-bottom: 8px;">📊 Parameters Used</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                    <div style="color: #b3b3b3;">Z-Score Threshold:</div>
                    <div style="color: #ffffff;">${this.formatValue(params.zScoreThreshold)}</div>
                    
                    <div style="color: #b3b3b3;">Rebalance %:</div>
                    <div style="color: #ffffff;">${this.formatValue(params.rebalancePercent || params.rebalanceThreshold * 100)}%</div>
                    
                    <div style="color: #b3b3b3;">Lookback Window:</div>
                    <div style="color: #ffffff;">${this.formatValue(params.lookbackWindow)} days</div>
                    
                    <div style="color: #b3b3b3;">Transaction Cost:</div>
                    <div style="color: #ffffff;">${this.formatValue(params.transactionCost)}%</div>
                    
                    <div style="color: #b3b3b3;">Backtest Period:</div>
                    <div style="color: #ffffff;">${params.backtestPeriod || 'N/A'}</div>
                </div>
            </div>
        `;
    }

    /**
     * Generate performance metrics section
     */
    generatePerformanceSection(result) {
        return `
            <div>
                <div style="color: #00d4aa; font-weight: bold; margin-bottom: 8px;">📈 Performance Results</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                    <div style="color: #b3b3b3;">BTC Growth:</div>
                    <div style="color: ${result.btcGrowth > 0 ? '#00d4aa' : '#ff6b6b'}; font-weight: bold;">
                        ${result.btcGrowth > 0 ? '+' : ''}${this.formatValue(result.btcGrowth, 2)}%
                    </div>
                    
                    <div style="color: #b3b3b3;">Total Trades:</div>
                    <div style="color: #ffffff;">${result.totalTrades || 0}</div>
                    
                    <div style="color: #b3b3b3;">Win Rate:</div>
                    <div style="color: #fbbf24;">${this.formatValue(result.winRate, 1)}%</div>
                    
                    <div style="color: #b3b3b3;">Max Drawdown:</div>
                    <div style="color: #ff6b6b;">${this.formatValue(result.maxDrawdown, 2)}%</div>
                    
                    <div style="color: #b3b3b3;">Sharpe Ratio:</div>
                    <div style="color: #8b5cf6;">${this.formatValue(result.sharpeRatio, 2)}</div>
                    
                    <div style="color: #b3b3b3;">Volatility:</div>
                    <div style="color: #ffffff;">${this.formatValue(result.volatility, 2)}%</div>
                </div>
            </div>
        `;
    }

    /**
     * Generate portfolio composition section
     */
    generatePortfolioSection(result) {
        // Extract portfolio data from correct API response structure
        const cryptoData = result.cryptoAccumulation || {};
        const initialBTC = parseFloat(cryptoData.startingBTC || 0);
        const finalBTC = parseFloat(cryptoData.strategyBTC || 0);
        const buyHoldBTC = parseFloat(cryptoData.buyHoldBTC || 0);
        
        // ETH data not provided by current API - calculate estimates if needed
        const estimatedInitialETH = result.startingETH || 0.5; // From form inputs
        const estimatedFinalETH = result.finalETH || 'N/A'; // Not calculated by API yet

        return `
            <div>
                <div style="color: #00d4aa; font-weight: bold; margin-bottom: 8px;">💰 Portfolio Composition</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                    <div style="color: #b3b3b3;">Initial BTC:</div>
                    <div style="color: #ffffff;">${this.formatValue(initialBTC, 6)} BTC</div>
                    
                    <div style="color: #b3b3b3;">Strategy BTC:</div>
                    <div style="color: #00d4aa; font-weight: bold;">${this.formatValue(finalBTC, 6)} BTC</div>
                    
                    <div style="color: #b3b3b3;">Buy & Hold BTC:</div>
                    <div style="color: #fbbf24;">${this.formatValue(buyHoldBTC, 6)} BTC</div>
                    
                    <div style="color: #b3b3b3;">BTC Gained:</div>
                    <div style="color: ${(finalBTC - initialBTC) > 0 ? '#00d4aa' : '#ff6b6b'}; font-weight: bold;">
                        ${(finalBTC - initialBTC) > 0 ? '+' : ''}${this.formatValue(finalBTC - initialBTC, 6)} BTC
                    </div>
                    
                    <div style="color: #b3b3b3;">vs Buy & Hold:</div>
                    <div style="color: ${(finalBTC - buyHoldBTC) > 0 ? '#00d4aa' : '#ff6b6b'}; font-weight: bold;">
                        ${(finalBTC - buyHoldBTC) > 0 ? '+' : ''}${this.formatValue(finalBTC - buyHoldBTC, 6)} BTC
                    </div>
                    
                    <div style="color: #b3b3b3;">Crypto Gained:</div>
                    <div style="color: #8b5cf6;">${cryptoData.cryptoGained || 'N/A'}</div>
                </div>
            </div>
        `;
    }

    /**
     * Generate strategy analysis section
     */
    generateStrategySection(result, params) {
        // Detect current strategy if using presets
        const currentPreset = window.strategyPresets?.detectCurrentPreset();
        const presetInfo = currentPreset ? window.strategyPresets.getPreset(currentPreset) : null;

        return `
            <div>
                <div style="color: #00d4aa; font-weight: bold; margin-bottom: 8px;">🎯 Strategy Analysis</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                    <div style="color: #b3b3b3;">Strategy Type:</div>
                    <div style="color: #ffffff;">${presetInfo?.name || 'Custom'}</div>
                    
                    <div style="color: #b3b3b3;">Risk Level:</div>
                    <div style="color: ${this.getRiskColor(params)}">${this.calculateRiskLevel(params)}</div>
                    
                    <div style="color: #b3b3b3;">Trade Frequency:</div>
                    <div style="color: #ffffff;">${this.estimateTradeFrequency(params)}/month</div>
                    
                    <div style="color: #b3b3b3;">Data Quality:</div>
                    <div style="color: #00d4aa;">${result.dataSource || 'Real Historical'}</div>
                </div>
            </div>
        `;
    }

    /**
     * Generate notes section
     */
    generateNotesSection(result) {
        const notes = result.notes || result.reasoning || this.generateAutoNotes(result);
        
        if (!notes) return '';

        return `
            <div>
                <div style="color: #00d4aa; font-weight: bold; margin-bottom: 8px;">📝 Analysis Notes</div>
                <div style="color: #b3b3b3; font-size: 12px; font-style: italic; line-height: 1.4;">
                    ${notes}
                </div>
            </div>
        `;
    }

    /**
     * Generate automatic analysis notes
     */
    generateAutoNotes(result) {
        const notes = [];
        
        // Check for data inconsistencies
        if (result.btcGrowth > 50 && result.totalTrades === 0) {
            notes.push("⚠️ Data inconsistency: High growth with no trades detected. This may indicate a calculation error in the backtest engine.");
        } else if (result.btcGrowth > 10) {
            notes.push("Strong BTC accumulation performance detected.");
        } else if (result.btcGrowth < 0) {
            notes.push("Strategy underperformed vs holding. Consider parameter adjustment.");
        }

        if (result.totalTrades > 50) {
            notes.push("High-frequency trading detected. Monitor transaction costs.");
        } else if (result.totalTrades < 5 && result.totalTrades > 0) {
            notes.push("Low trade frequency. Consider more aggressive thresholds.");
        } else if (result.totalTrades === 0) {
            notes.push("No trades executed. Z-score threshold may be too high for current market conditions.");
        }

        if (result.winRate > 70) {
            notes.push("Excellent win rate suggests good market timing.");
        }

        // Add data quality notes
        if (result.dataSource === 'Real Historical') {
            notes.push("Analysis based on real market data.");
        } else {
            notes.push("⚠️ Analysis based on simulated data - results may not reflect real trading performance.");
        }

        return notes.join(' ');
    }

    /**
     * Utility: Format numeric values safely
     */
    formatValue(value, decimals = 2) {
        if (value === null || value === undefined || isNaN(value)) {
            return 'N/A';
        }
        return parseFloat(value).toFixed(decimals);
    }

    /**
     * Calculate risk level from parameters
     */
    calculateRiskLevel(params) {
        const zScoreRisk = (3 - params.zScoreThreshold) / 2.5;
        const rebalanceRisk = (params.rebalancePercent || 0) / 100;
        const combinedRisk = (zScoreRisk + rebalanceRisk) / 2;

        if (combinedRisk < 0.3) return 'Low';
        if (combinedRisk < 0.7) return 'Medium';
        return 'High';
    }

    /**
     * Get color for risk level
     */
    getRiskColor(params) {
        const riskLevel = this.calculateRiskLevel(params);
        switch (riskLevel) {
            case 'Low': return '#00d4aa';
            case 'Medium': return '#fbbf24';
            case 'High': return '#ff6b6b';
            default: return '#ffffff';
        }
    }

    /**
     * Estimate trade frequency
     */
    estimateTradeFrequency(params) {
        const thresholdFactor = 3 / (params.zScoreThreshold || 1);
        const lookbackFactor = 30 / (params.lookbackWindow || 15);
        return Math.round(thresholdFactor * lookbackFactor * 10);
    }

    /**
     * Get the last result for reference
     */
    getLastResult() {
        return this.lastResult;
    }

    /**
     * Clear results
     */
    clearResults() {
        this.lastResult = null;
        const latestRunContent = document.getElementById('latestRunContent');
        if (latestRunContent) {
            latestRunContent.innerHTML = `
                <div style="color: #666; text-align: center; padding: 20px;">
                    Run a backtest to see detailed parameters and results
                </div>
            `;
        }
    }
}

// Export for global use
window.BacktestResults = BacktestResults;

