/**
 * Strategy Presets Module
 * 
 * Manages predefined parameter sets for different trading strategies
 */

class StrategyPresets {
    constructor() {
        this.presets = this.initializePresets();
    }

    /**
     * Initialize all available presets
     */
    initializePresets() {
        return {
            conservative: {
                name: "Conservative",
                zScoreThreshold: 2.0,
                rebalancePercent: 30,
                lookbackWindow: 30,
                transactionCost: 1.0,
                description: "Low-risk approach with higher thresholds",
                notes: "Fewer trades, lower volatility, steady accumulation"
            },
            megaOptimal: {
                name: "Mega-Optimal",
                zScoreThreshold: 1.257672,
                rebalancePercent: 49.79,
                lookbackWindow: 15,
                transactionCost: 1.66,
                description: "Optimized parameters from 1000s of iterations",
                notes: "Battle-tested optimal parameters for maximum BTC accumulation"
            },
            aggressive: {
                name: "Aggressive", 
                zScoreThreshold: 0.8,
                rebalancePercent: 70,
                lookbackWindow: 10,
                transactionCost: 2.5,
                description: "High-frequency trading with lower thresholds",
                notes: "More trades, higher volatility, potential for faster gains"
            }
        };
    }

    /**
     * Get all available preset names
     */
    getPresetNames() {
        return Object.keys(this.presets);
    }

    /**
     * Get preset by name
     */
    getPreset(presetName) {
        return this.presets[presetName] || null;
    }

    /**
     * Load preset into form inputs
     */
    loadPreset(presetName) {
        console.log(`📋 Loading preset: ${presetName}`);
        
        const preset = this.getPreset(presetName);
        if (!preset) {
            console.warn(`Unknown preset: ${presetName}`);
            return false;
        }

        // Update form inputs
        const elements = {
            zScoreThreshold: document.getElementById('zScoreThreshold'),
            rebalancePercent: document.getElementById('rebalancePercent'),
            lookbackWindow: document.getElementById('lookbackWindow'),
            transactionCost: document.getElementById('transactionCost')
        };

        // Apply preset values to form
        Object.keys(preset).forEach(key => {
            if (elements[key]) {
                elements[key].value = preset[key];
            }
        });

        // Show confirmation feedback
        this.showPresetLoadedFeedback(preset);
        
        return true;
    }

    /**
     * Show visual feedback when preset is loaded
     */
    showPresetLoadedFeedback(preset) {
        const status = document.getElementById('backtestStatus');
        if (status) {
            status.textContent = `Loaded ${preset.name} preset - ${preset.description}`;
            status.style.color = '#00d4aa';
            
            // Reset status after 3 seconds
            setTimeout(() => {
                status.textContent = 'Ready to run backtest';
                status.style.color = '#b3b3b3';
            }, 3000);
        }
    }

    /**
     * Get current form parameters
     */
    getCurrentParameters() {
        const elements = {
            zScoreThreshold: document.getElementById('zScoreThreshold'),
            rebalancePercent: document.getElementById('rebalancePercent'),
            lookbackWindow: document.getElementById('lookbackWindow'),
            transactionCost: document.getElementById('transactionCost'),
            backtestPeriod: document.getElementById('backtestPeriod'),
            startingBTC: document.getElementById('startingBTC'),
            startingETH: document.getElementById('startingETH')
        };

        const params = {};
        Object.keys(elements).forEach(key => {
            if (elements[key]) {
                const value = elements[key].value;
                params[key] = key.includes('Period') ? value : parseFloat(value);
            }
        });

        return params;
    }

    /**
     * Detect which preset matches current parameters (if any)
     */
    detectCurrentPreset() {
        const current = this.getCurrentParameters();
        
        for (const [presetName, preset] of Object.entries(this.presets)) {
            const matches = ['zScoreThreshold', 'rebalancePercent', 'lookbackWindow', 'transactionCost']
                .every(key => Math.abs(current[key] - preset[key]) < 0.01);
            
            if (matches) {
                return presetName;
            }
        }
        
        return null; // Custom parameters
    }

    /**
     * Generate preset comparison data for analysis
     */
    getPresetComparison() {
        return Object.entries(this.presets).map(([key, preset]) => ({
            id: key,
            name: preset.name,
            riskLevel: this.calculateRiskLevel(preset),
            expectedTrades: this.estimateTradeFrequency(preset),
            ...preset
        }));
    }

    /**
     * Calculate relative risk level for a preset
     */
    calculateRiskLevel(preset) {
        // Lower Z-score = more trades = higher risk
        // Higher rebalance = bigger trades = higher risk
        const zScoreRisk = (3 - preset.zScoreThreshold) / 2.5; // Normalize 0.5-3.0 to 0-1
        const rebalanceRisk = preset.rebalancePercent / 100; // 0-1
        
        return (zScoreRisk + rebalanceRisk) / 2;
    }

    /**
     * Estimate trade frequency for a preset
     */
    estimateTradeFrequency(preset) {
        // Lower threshold = more signals = more trades
        // Shorter lookback = more sensitive = more trades
        const thresholdFactor = 3 / preset.zScoreThreshold; // Higher threshold = fewer trades
        const lookbackFactor = 30 / preset.lookbackWindow; // Shorter window = more trades
        
        return Math.round(thresholdFactor * lookbackFactor * 10); // Estimated trades per month
    }

    /**
     * Validate preset parameters
     */
    validatePreset(preset) {
        const required = ['zScoreThreshold', 'rebalancePercent', 'lookbackWindow', 'transactionCost'];
        const missing = required.filter(key => preset[key] === undefined);
        
        if (missing.length > 0) {
            throw new Error(`Missing required preset parameters: ${missing.join(', ')}`);
        }

        // Range validation
        const validations = [
            { key: 'zScoreThreshold', min: 0.1, max: 5.0 },
            { key: 'rebalancePercent', min: 1, max: 99 },
            { key: 'lookbackWindow', min: 3, max: 100 },
            { key: 'transactionCost', min: 0, max: 10 }
        ];

        for (const validation of validations) {
            const value = preset[validation.key];
            if (value < validation.min || value > validation.max) {
                throw new Error(`${validation.key} must be between ${validation.min} and ${validation.max}`);
            }
        }

        return true;
    }
}

// Export for global use
window.StrategyPresets = StrategyPresets;

// Global function for backward compatibility
window.loadPreset = function(presetName) {
    if (window.strategyPresets) {
        return window.strategyPresets.loadPreset(presetName);
    }
    console.warn('StrategyPresets not initialized');
    return false;
};
