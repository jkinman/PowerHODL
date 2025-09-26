/**
 * Gradient Descent Sandbox Store
 * 
 * Manages parameter optimization, backtesting state, results, and performance analysis
 */

import { writable, derived } from 'svelte/store';

// === Backtest State ===

/**
 * Current backtest execution state
 */
export const backtestState = writable({
	isRunning: false,
	status: 'idle', // 'idle', 'running', 'completed', 'error'
	progress: 0,
	currentStep: '',
	error: null,
	startTime: null,
	endTime: null
});

/**
 * Latest backtest results
 */
export const backtestResults = writable([]);

/**
 * Backtest history (previous runs)
 */
export const backtestHistory = writable([]);

// === Optimization State ===

/**
 * Optimization execution state
 */
export const optimizationState = writable({
	isRunning: false,
	totalIterations: 0,
	currentIteration: 0,
	bestResult: null,
	progress: 0,
	timeRemaining: null,
	error: null
});

/**
 * Optimization results (all iterations)
 */
export const optimizationResults = writable([]);

/**
 * 3D gradient descent visualization data
 */
export const visualizationData = writable({
	surfaceData: null,
	gradientDescentTrail: [],
	parameters: {
		lookbackWindow: 15,
		transactionCost: 1.66
	},
	resolution: 'medium'
});

// === Derived Analytics ===

/**
 * Backtest performance summary
 */
export const backtestSummary = derived(
	backtestResults,
	($results) => {
		if (!$results) {
			return {
				hasResults: false,
				btcGrowth: 0,
				btcGrowthFormatted: '--',
				totalTrades: 0,
				winRate: 0,
				maxDrawdown: 0,
				period: 'N/A',
				roi: 0
			};
		}
		
		const btcGrowth = $results.cryptoAccumulation?.cryptoOutperformance || 0;
		const totalTrades = $results.portfolioEvolution?.trades?.length || 0;
		const period = $results.dataInfo?.totalDays || 0;
		
		// Calculate win rate from trades
		const trades = $results.portfolioEvolution?.trades || [];
		const profitableTrades = trades.filter(trade => trade.profit > 0).length;
		const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
		
		// Calculate max drawdown from portfolio evolution
		const btcValues = $results.portfolioEvolution?.btcValues || [];
		let maxDrawdown = 0;
		let peak = 0;
		
		btcValues.forEach(value => {
			if (value > peak) peak = value;
			const drawdown = peak > 0 ? ((peak - value) / peak) * 100 : 0;
			if (drawdown > maxDrawdown) maxDrawdown = drawdown;
		});
		
		return {
			hasResults: true,
			btcGrowth,
			btcGrowthFormatted: btcGrowth.toFixed(2) + '%',
			totalTrades,
			winRate: winRate.toFixed(1),
			maxDrawdown: maxDrawdown.toFixed(2),
			period: `${period} days`,
			roi: btcGrowth // ROI in BTC terms
		};
	}
);

/**
 * Gradient descent progress and statistics
 */
export const optimizationSummary = derived(
	[optimizationState, optimizationResults],
	([$state, $results]) => {
		if (!$state.isRunning && $results.length === 0) {
			return {
				isActive: false,
				bestBtcGrowth: 0,
				averageBtcGrowth: 0,
				totalIterations: 0,
				completionRate: 0,
				estimatedTimeRemaining: null
			};
		}
		
		const bestBtcGrowth = $state.bestResult?.btcGrowthPercent || 0;
		const averageBtcGrowth = $results.length > 0 
			? $results.reduce((sum, r) => sum + (r.btcGrowthPercent || 0), 0) / $results.length
			: 0;
		
		const completionRate = $state.totalIterations > 0 
			? ($state.currentIteration / $state.totalIterations) * 100
			: 0;
		
		return {
			isActive: $state.isRunning || $results.length > 0,
			bestBtcGrowth,
			averageBtcGrowth,
			totalIterations: $state.totalIterations,
			currentIteration: $state.currentIteration,
			completionRate,
			estimatedTimeRemaining: $state.timeRemaining
		};
	}
);

// === Store Actions ===

/**
 * Start a single backtest
 */
export async function runSingleBacktest(parameters) {
	backtestState.set({
		isRunning: true,
		status: 'running',
		progress: 0,
		currentStep: 'Initializing backtest...',
		error: null,
		startTime: new Date().toISOString(),
		endTime: null
	});
	
	try {
		// Update progress
		backtestState.update(state => ({
			...state,
			progress: 25,
			currentStep: 'Fetching historical data...'
		}));
		
		// Call API
		const response = await fetch(`${__API_URL__}/api/backtest`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				parameters: {
					zScoreThreshold: parameters.zScoreThreshold,
					rebalanceThreshold: parameters.rebalancePercent || parameters.rebalanceThreshold,
					transactionCost: parameters.transactionCost,
					lookbackWindow: parameters.lookbackWindow,
					volatilityFilter: parameters.volatilityFilter
				},
				useRealData: parameters.useRealData !== false, // Use parameter or default to true
				backtestPeriod: parameters.backtestPeriod || 'ALL'
			})
		});
		
		if (!response.ok) {
			const errorText = await response.text();
			console.error('Backtest API Error:', response.status, errorText);
			throw new Error(`Backtest API error: ${response.status} - ${errorText}`);
		}
		
		// Update progress
		backtestState.update(state => ({
			...state,
			progress: 75,
			currentStep: 'Processing results...'
		}));
		
		const apiResponse = await response.json();
		
		if (!apiResponse.success) {
			throw new Error(apiResponse.message || 'Backtest failed');
		}
		
		const results = apiResponse.data;
		
		// Transform API response to match UI expectations
		const transformedResult = {
			// Flatten the nested structure
			btcGrowthPercent: results.result?.performance?.btcGrowthPercent || results.btcGrowthPercent || 0,
			totalTrades: results.result?.performance?.totalTrades || results.totalTrades || 0,
			sharpeRatio: results.result?.performance?.sharpeRatio || results.sharpeRatio || 0,
			maxDrawdown: Math.abs(results.result?.performance?.maxDrawdown || results.maxDrawdown || 0),
			winRate: results.result?.performance?.winRate || results.winRate || 0,
			
			// Portfolio data
			portfolioHistory: results.result?.portfolioHistory || results.portfolioHistory || [],
			finalPortfolio: results.result?.finalPortfolio || {
				totalValueBTC: results.result?.portfolioHistory?.slice(-1)[0]?.totalValueBTC || 0
			},
			
			// Metadata
			parameters: results.parameters || parameters,
			timestamp: new Date().toISOString(),
			type: results.type || 'single'
		};
		
		// Store results as array (UI expects array)
		backtestResults.update(currentResults => [transformedResult, ...(currentResults || []).slice(0, 9)]); // Keep last 10
		
		// Add to history
		backtestHistory.update(history => [{
			...transformedResult,
			id: `backtest_${Date.now()}`
		}, ...history.slice(0, 49)]); // Keep last 50
		
		// Complete
		backtestState.update(state => ({
			...state,
			isRunning: false,
			status: 'completed',
			progress: 100,
			currentStep: 'Backtest completed',
			error: null,
		endTime: new Date().toISOString()
	}));
	
	return transformedResult;
		
	} catch (error) {
		console.error('Backtest failed:', error);
		
		backtestState.update(state => ({
			...state,
			isRunning: false,
			status: 'error',
			progress: 0,
			currentStep: 'Backtest failed',
			error: error.message,
			endTime: new Date().toISOString()
		}));
		
		throw error;
	}
}

/**
 * Run gradient descent optimization with multiple iterations
 */
export async function runOptimization(iterations = 10, baseParameters) {
	optimizationState.set({
		isRunning: true,
		totalIterations: iterations,
		currentIteration: 0,
		bestResult: null,
		progress: 0,
		timeRemaining: null,
		error: null
	});
	
	optimizationResults.set([]);
	
	const results = [];
	const startTime = Date.now();
	
	try {
		for (let i = 0; i < iterations; i++) {
			// Generate parameter variations
			const params = generateParameterVariation(baseParameters, i);
			
			// Update progress
			const progress = (i / iterations) * 100;
			const elapsed = Date.now() - startTime;
			const timeRemaining = i > 0 ? (elapsed / i) * (iterations - i) : null;
			
			optimizationState.update(state => ({
				...state,
				currentIteration: i + 1,
				progress,
				timeRemaining
			}));
			
			// Run backtest
			const result = await runSingleBacktest(params);
			
			const iterationResult = {
				iteration: i + 1,
				parameters: params,
				btcGrowthPercent: result.cryptoAccumulation?.cryptoOutperformance || 0,
				totalTrades: result.portfolioEvolution?.trades?.length || 0,
				timestamp: new Date().toISOString(),
				...result
			};
			
			results.push(iterationResult);
			
			// Update best result
			optimizationState.update(state => {
				const isBetter = !state.bestResult || 
					iterationResult.btcGrowthPercent > state.bestResult.btcGrowthPercent;
				
				return {
					...state,
					bestResult: isBetter ? iterationResult : state.bestResult
				};
			});
			
			// Update results
			optimizationResults.set([...results]);
		}
		
		// Complete optimization
		optimizationState.update(state => ({
			...state,
			isRunning: false,
			progress: 100,
			timeRemaining: 0
		}));
		
		return results;
		
	} catch (error) {
		console.error('Optimization failed:', error);
		
		optimizationState.update(state => ({
			...state,
			isRunning: false,
			error: error.message
		}));
		
		throw error;
	}
}

/**
 * Generate 3D gradient descent surface visualization data
 */
export async function generate3DSurface(fixedParams, resolution = 'medium') {
	const resolutions = { low: 10, medium: 15, high: 20 };
	const gridSize = resolutions[resolution];
	
	const zScoreRange = [0.5, 3.0];
	const rebalanceRange = [30, 70];
	
	const surfaceData = [];
	
	for (let i = 0; i < gridSize; i++) {
		for (let j = 0; j < gridSize; j++) {
			const zScore = zScoreRange[0] + (i / (gridSize - 1)) * (zScoreRange[1] - zScoreRange[0]);
			const rebalance = rebalanceRange[0] + (j / (gridSize - 1)) * (rebalanceRange[1] - rebalanceRange[0]);
			
			// Simulate performance (replace with actual backtesting)
			const performance = simulatePerformance(zScore, rebalance, fixedParams);
			
			surfaceData.push({
				zScore,
				rebalance,
				performance
			});
		}
	}
	
	visualizationData.update(current => ({
		...current,
		surfaceData,
		parameters: fixedParams,
		resolution
	}));
	
	return surfaceData;
}

/**
 * Add gradient descent trail to 3D visualization
 */
export function add3DOptimizationTrail(optimizationResults) {
	const trail = optimizationResults.map(result => ({
		zScore: result.parameters.zScoreThreshold,
		rebalance: result.parameters.rebalancePercent,
		performance: result.btcGrowthPercent,
		iteration: result.iteration
	}));
	
	visualizationData.update(current => ({
		...current,
		gradientDescentTrail: trail
	}));
}

/**
 * Clear all backtest data
 */
export function clearBacktestData() {
	backtestResults.set(null);
	backtestHistory.set([]);
	optimizationResults.set([]);
	backtestState.set({
		isRunning: false,
		status: 'idle',
		progress: 0,
		currentStep: '',
		error: null,
		startTime: null,
		endTime: null
	});
	optimizationState.set({
		isRunning: false,
		totalIterations: 0,
		currentIteration: 0,
		bestResult: null,
		progress: 0,
		timeRemaining: null,
		error: null
	});
}

// === Utility Functions ===

function generateParameterVariation(baseParams, iteration) {
	// Generate variations around base parameters
	const variation = iteration / 100; // Small variations
	
	// Handle both parameter naming conventions
	const baseRebalance = baseParams.rebalancePercent || baseParams.rebalanceThreshold;
	
	return {
		...baseParams,
		zScoreThreshold: Math.max(0.5, Math.min(3.0, 
			baseParams.zScoreThreshold + (Math.random() - 0.5) * variation
		)),
		rebalancePercent: Math.max(20, Math.min(80, 
			baseRebalance + (Math.random() - 0.5) * variation * 20
		)),
		transactionCost: Math.max(0.5, Math.min(3.0, 
			baseParams.transactionCost + (Math.random() - 0.5) * variation
		))
	};
}

function simulatePerformance(zScore, rebalance, fixedParams) {
	// Simple performance simulation based on parameters
	const basePerformance = 10; // 10% base
	const zScoreBonus = Math.max(0, 20 - Math.abs(zScore - 1.5) * 10);
	const rebalanceBonus = Math.max(0, 15 - Math.abs(rebalance - 50) * 0.3);
	const randomFactor = (Math.random() - 0.5) * 10;
	
	return Math.max(-20, Math.min(50, basePerformance + zScoreBonus + rebalanceBonus + randomFactor));
}
