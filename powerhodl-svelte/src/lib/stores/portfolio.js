/**
 * Portfolio Store
 * 
 * Manages portfolio state including BTC/ETH balances, values, and real-time updates
 */

import { writable, derived } from 'svelte/store';

// === Core Portfolio State ===

/**
 * Main portfolio data store
 */
export const portfolio = writable({
	// Asset amounts
	btcAmount: 0.500000,
	ethAmount: 0.500000,
	
	// BTC-denominated values (PowerHODL's primary metric)
	ethValueBTC: 0.0,
	totalValueBTC: 0.500000,
	
	// Metadata
	lastUpdate: null,
	isLoading: false,
	error: null
});

/**
 * Portfolio history for charts
 */
export const portfolioHistory = writable([]);

/**
 * Recent trades
 */
export const recentTrades = writable([]);

// === Current Market Data (for calculations) ===

/**
 * Current market prices
 */
export const marketPrices = writable({
	ethPriceUSD: 2600,
	btcPriceUSD: 67000,
	ethBtcRatio: 0.037106,
	lastUpdate: null
});

// === Derived Stores (Automatically Calculated) ===

/**
 * Portfolio metrics calculated from current state
 */
export const portfolioMetrics = derived(
	[portfolio, marketPrices],
	([$portfolio, $prices]) => {
		// Calculate ETH value in BTC terms
		const ethValueBTC = $portfolio.ethAmount * $prices.ethBtcRatio;
		const totalValueBTC = $portfolio.btcAmount + ethValueBTC;
		
		// Calculate USD values (secondary metric)
		const totalValueUSD = totalValueBTC * $prices.btcPriceUSD;
		const ethValueUSD = $portfolio.ethAmount * $prices.ethPriceUSD;
		const btcValueUSD = $portfolio.btcAmount * $prices.btcPriceUSD;
		
		// Calculate percentages
		const ethPercentage = totalValueBTC > 0 ? (ethValueBTC / totalValueBTC) * 100 : 0;
		const btcPercentage = totalValueBTC > 0 ? ($portfolio.btcAmount / totalValueBTC) * 100 : 0;
		
		// Check if rebalancing is needed (target: 50/50)
		const rebalanceNeeded = Math.abs(ethPercentage - 50) > 5; // 5% tolerance
		
		return {
			// BTC-denominated (primary metrics)
			ethValueBTC,
			totalValueBTC,
			btcGrowth: 0, // Will be calculated from history
			
			// USD values (reference only)
			totalValueUSD,
			ethValueUSD,
			btcValueUSD,
			
			// Portfolio composition
			ethPercentage,
			btcPercentage,
			
			// Trading signals
			rebalanceNeeded,
			targetRebalance: rebalanceNeeded ? 50 - ethPercentage : 0,
			
			// Status
			isHealthy: !$portfolio.error && $portfolio.lastUpdate,
			dataAge: $portfolio.lastUpdate ? Date.now() - new Date($portfolio.lastUpdate).getTime() : null
		};
	}
);

/**
 * Portfolio growth over time (BTC accumulation focus)
 */
export const portfolioGrowth = derived(
	portfolioHistory,
	($history) => {
		if ($history.length < 2) {
			return {
				btcGrowthPercent: 0,
				btcGrowthAbsolute: 0,
				timeframe: 'N/A',
				trend: 'neutral'
			};
		}
		
		const initial = $history[0];
		const latest = $history[$history.length - 1];
		
		const btcGrowthAbsolute = latest.totalValueBTC - initial.totalValueBTC;
		const btcGrowthPercent = initial.totalValueBTC > 0 
			? (btcGrowthAbsolute / initial.totalValueBTC) * 100 
			: 0;
		
		const timeframe = calculateTimeframe(initial.timestamp, latest.timestamp);
		const trend = btcGrowthPercent > 1 ? 'positive' : btcGrowthPercent < -1 ? 'negative' : 'neutral';
		
		return {
			btcGrowthPercent,
			btcGrowthAbsolute,
			timeframe,
			trend
		};
	}
);

// === Store Actions ===

/**
 * Update portfolio with fresh data
 */
export function updatePortfolio(newData) {
	portfolio.update(current => ({
		...current,
		...newData,
		lastUpdate: new Date().toISOString(),
		error: null
	}));
}

/**
 * Update market prices
 */
export function updateMarketPrices(prices) {
	marketPrices.update(current => ({
		...current,
		...prices,
		ethBtcRatio: prices.ethPriceUSD / prices.btcPriceUSD,
		lastUpdate: new Date().toISOString()
	}));
}

/**
 * Add new portfolio data point to history
 */
export function addPortfolioSnapshot(snapshot) {
	portfolioHistory.update(history => {
		const newHistory = [...history, {
			...snapshot,
			timestamp: new Date().toISOString()
		}];
		
		// Keep only last 1000 data points to prevent memory issues
		return newHistory.slice(-1000);
	});
}

/**
 * Add a new trade to recent trades
 */
export function addTrade(trade) {
	recentTrades.update(trades => {
		const newTrades = [{
			...trade,
			id: trade.id || `trade_${Date.now()}`,
			timestamp: trade.timestamp || new Date().toISOString()
		}, ...trades];
		
		// Keep only last 50 trades
		return newTrades.slice(0, 50);
	});
}

/**
 * Set loading state
 */
export function setPortfolioLoading(loading) {
	portfolio.update(current => ({
		...current,
		isLoading: loading
	}));
}

/**
 * Set error state
 */
export function setPortfolioError(error) {
	portfolio.update(current => ({
		...current,
		error: error?.message || error,
		isLoading: false
	}));
}

/**
 * Reset portfolio to initial state
 */
export function resetPortfolio() {
	portfolio.set({
		btcAmount: 0.500000,
		ethAmount: 0.500000,
		ethValueBTC: 0.0,
		totalValueBTC: 0.500000,
		lastUpdate: null,
		isLoading: false,
		error: null
	});
	
	portfolioHistory.set([]);
	recentTrades.set([]);
}

// === Utility Functions ===

function calculateTimeframe(start, end) {
	const diffMs = new Date(end).getTime() - new Date(start).getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	
	if (diffDays < 1) return `${Math.floor(diffMs / (1000 * 60 * 60))}h`;
	if (diffDays < 30) return `${diffDays}d`;
	if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`;
	return `${Math.floor(diffDays / 365)}y`;
}
