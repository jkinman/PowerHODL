/**
 * Trading Store
 * 
 * Manages trading strategy parameters, signals, and execution state
 */

import { writable, derived } from 'svelte/store';

// === Trading Strategy Parameters ===

/**
 * Core trading parameters (mega-optimal strategy)
 */
export const tradingParams = writable({
	// Strategy parameters
	zScoreThreshold: 1.257672,
	rebalanceThreshold: 0.49792708, // 49.79%
	lookbackWindow: 15,
	transactionCost: 0.0166, // 1.66%
	
	// Portfolio parameters
	startingBTC: 0.5,
	startingETH: 0.5,
	
	// Backtest parameters
	backtestPeriod: 'ALL', // 365, 730, 1095, 'ALL'
	
	// Execution settings
	useRealData: true,
	autoExecute: false,
	
	// Metadata
	lastModified: null,
	preset: 'megaOptimal'
});

/**
 * Current trading signal
 */
export const currentSignal = writable({
	action: 'HOLD',
	shouldTrade: false,
	confidence: 0.5,
	zScore: 0,
	ethBtcRatio: 0,
	reasoning: 'No signal generated yet',
	timestamp: null,
	dataAge: null
});

/**
 * Signal history for analysis
 */
export const signalHistory = writable([]);

/**
 * Trading execution state
 */
export const tradingState = writable({
	isExecuting: false,
	lastTrade: null,
	totalTrades: 0,
	successfulTrades: 0,
	failedTrades: 0,
	error: null
});

// === Strategy Presets ===

/**
 * Available strategy presets
 */
export const strategyPresets = writable({
	conservative: {
		zScoreThreshold: 2.0,
		rebalanceThreshold: 0.45,
		lookbackWindow: 30,
		transactionCost: 0.02,
		name: 'Conservative',
		description: 'Lower risk, fewer trades'
	},
	megaOptimal: {
		zScoreThreshold: 1.257672,
		rebalanceThreshold: 0.49792708,
		lookbackWindow: 15,
		transactionCost: 0.0166,
		name: 'Mega-Optimal',
		description: 'Optimized over 1000s of iterations'
	},
	aggressive: {
		zScoreThreshold: 0.8,
		rebalanceThreshold: 0.55,
		lookbackWindow: 7,
		transactionCost: 0.01,
		name: 'Aggressive',
		description: 'Higher risk, more frequent trades'
	}
});

// === Derived Stores ===

/**
 * Trading strategy status and validation
 */
export const tradingStatus = derived(
	[tradingParams, currentSignal, tradingState],
	([$params, $signal, $state]) => {
		// Validate parameters
		const isValidParams = (
			$params.zScoreThreshold > 0 &&
			$params.rebalanceThreshold > 0.1 &&
			$params.rebalanceThreshold < 0.9 &&
			$params.lookbackWindow >= 5 &&
			$params.transactionCost >= 0
		);
		
		// Calculate win rate
		const winRate = $state.totalTrades > 0 
			? ($state.successfulTrades / $state.totalTrades) * 100 
			: 0;
		
		// Determine overall status
		const status = !isValidParams ? 'invalid' 
			: $state.isExecuting ? 'executing'
			: $signal.shouldTrade ? 'ready'
			: 'monitoring';
		
		return {
			status,
			isValidParams,
			winRate,
			signalAge: $signal.timestamp ? Date.now() - new Date($signal.timestamp).getTime() : null,
			isSignalFresh: $signal.timestamp ? (Date.now() - new Date($signal.timestamp).getTime()) < 300000 : false, // 5 min
			lastActivity: $state.lastTrade?.timestamp || $signal.timestamp
		};
	}
);

/**
 * Performance metrics
 */
export const tradingPerformance = derived(
	[tradingState, signalHistory],
	([$state, $history]) => {
		if ($history.length === 0) {
			return {
				totalSignals: 0,
				tradeSignals: 0,
				accuracy: 0,
				avgConfidence: 0,
				signalFrequency: 0
			};
		}
		
		const tradeSignals = $history.filter(s => s.shouldTrade).length;
		const avgConfidence = $history.reduce((sum, s) => sum + s.confidence, 0) / $history.length;
		
		// Calculate signal frequency (signals per day)
		const timeSpan = $history.length > 1 
			? new Date($history[$history.length - 1].timestamp).getTime() - new Date($history[0].timestamp).getTime()
			: 0;
		const signalFrequency = timeSpan > 0 
			? ($history.length / (timeSpan / (1000 * 60 * 60 * 24)))
			: 0;
		
		return {
			totalSignals: $history.length,
			tradeSignals,
			accuracy: $state.totalTrades > 0 ? ($state.successfulTrades / $state.totalTrades) * 100 : 0,
			avgConfidence: avgConfidence * 100,
			signalFrequency
		};
	}
);

// === Store Actions ===

/**
 * Update trading parameters
 */
export function updateTradingParams(newParams) {
	tradingParams.update(current => ({
		...current,
		...newParams,
		lastModified: new Date().toISOString()
	}));
}

/**
 * Load strategy preset
 */
export function loadPreset(presetName) {
	strategyPresets.subscribe(presets => {
		const preset = presets[presetName];
		if (preset) {
			updateTradingParams({
				...preset,
				preset: presetName
			});
		}
	})();
}

/**
 * Update current trading signal
 */
export function updateSignal(signal) {
	currentSignal.set({
		...signal,
		timestamp: new Date().toISOString()
	});
	
	// Add to history
	signalHistory.update(history => {
		const newHistory = [...history, {
			...signal,
			timestamp: new Date().toISOString()
		}];
		
		// Keep only last 1000 signals
		return newHistory.slice(-1000);
	});
}

/**
 * Execute a trade
 */
export function executeTrade(tradeDetails) {
	tradingState.update(current => ({
		...current,
		isExecuting: true,
		error: null
	}));
	
	// Simulate trade execution (replace with actual implementation)
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			const success = Math.random() > 0.1; // 90% success rate simulation
			
			tradingState.update(current => ({
				...current,
				isExecuting: false,
				lastTrade: {
					...tradeDetails,
					success,
					timestamp: new Date().toISOString()
				},
				totalTrades: current.totalTrades + 1,
				successfulTrades: success ? current.successfulTrades + 1 : current.successfulTrades,
				failedTrades: success ? current.failedTrades : current.failedTrades + 1,
				error: success ? null : 'Trade execution failed'
			}));
			
			if (success) {
				resolve(tradeDetails);
			} else {
				reject(new Error('Trade execution failed'));
			}
		}, 2000); // 2 second simulation
	});
}

/**
 * Set trading error
 */
export function setTradingError(error) {
	tradingState.update(current => ({
		...current,
		error: error?.message || error,
		isExecuting: false
	}));
}

/**
 * Reset trading state
 */
export function resetTradingState() {
	tradingState.set({
		isExecuting: false,
		lastTrade: null,
		totalTrades: 0,
		successfulTrades: 0,
		failedTrades: 0,
		error: null
	});
	
	signalHistory.set([]);
}

/**
 * Clear signal history
 */
export function clearSignalHistory() {
	signalHistory.set([]);
}

// === Parameter Validation ===

/**
 * Validate trading parameters
 */
export function validateTradingParams(params) {
	const errors = [];
	
	if (params.zScoreThreshold <= 0 || params.zScoreThreshold > 3) {
		errors.push('Z-Score threshold must be between 0 and 3');
	}
	
	if (params.rebalanceThreshold <= 0.1 || params.rebalanceThreshold >= 0.9) {
		errors.push('Rebalance threshold must be between 10% and 90%');
	}
	
	if (params.lookbackWindow < 5 || params.lookbackWindow > 60) {
		errors.push('Lookback window must be between 5 and 60 days');
	}
	
	if (params.transactionCost < 0 || params.transactionCost > 0.05) {
		errors.push('Transaction cost must be between 0% and 5%');
	}
	
	return {
		isValid: errors.length === 0,
		errors
	};
}
