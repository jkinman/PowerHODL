/**
 * Store Utilities
 * 
 * Helper functions for working with PowerHODL stores
 */

import { get } from 'svelte/store';
import { 
	portfolio, 
	marketData, 
	tradingParams, 
	showError, 
	setLoading,
	addNotification 
} from './index.js';

// === Store Synchronization ===

/**
 * Sync portfolio data with current market prices
 */
export function syncPortfolioWithMarket() {
	const currentMarket = get(marketData);
	const currentPortfolio = get(portfolio);
	
	if (currentMarket.ethBtcRatio && currentPortfolio.ethAmount) {
		const ethValueBTC = currentPortfolio.ethAmount * currentMarket.ethBtcRatio;
		const totalValueBTC = currentPortfolio.btcAmount + ethValueBTC;
		
		portfolio.update(p => ({
			...p,
			ethValueBTC,
			totalValueBTC
		}));
	}
}

/**
 * Initialize all stores with default data
 */
export async function initializeStores() {
	try {
		setLoading('dashboard', true);
		
		// Load user preferences
		await loadUserPreferences();
		
		// Initialize market data
		await initializeMarketData();
		
		// Initialize portfolio
		await initializePortfolio();
		
		// Initialize trading parameters
		await initializeTradingParams();
		
		setLoading('dashboard', false);
		
		addNotification({
			type: 'success',
			title: 'PowerHODL Initialized',
			message: 'All systems ready for BTC accumulation',
			duration: 3000
		});
		
	} catch (error) {
		setLoading('dashboard', false);
		showError('Initialization Failed', error.message);
		throw error;
	}
}

/**
 * Load user preferences from localStorage
 */
async function loadUserPreferences() {
	if (typeof localStorage !== 'undefined') {
		try {
			const saved = localStorage.getItem('powerhodl_preferences');
			if (saved) {
				const preferences = JSON.parse(saved);
				// Import and call the actual function
				const { updatePreferences } = await import('./ui.js');
				updatePreferences(preferences);
			}
		} catch (error) {
			console.warn('Failed to load preferences:', error);
		}
	}
}

/**
 * Initialize market data
 */
async function initializeMarketData() {
	try {
		// Import market functions
		const { fetchMarketData, fetchHistoricalData } = await import('./market.js');
		
		// Fetch current market data
		await fetchMarketData();
		
		// Fetch historical data
		await fetchHistoricalData(30); // Last 30 days
		
	} catch (error) {
		console.warn('Failed to initialize market data:', error);
		// Set default market data
		const { updateMarketData } = await import('./market.js');
		updateMarketData({
			ethPriceUSD: 2600,
			btcPriceUSD: 67000,
			ethBtcRatio: 0.037106,
			source: 'default'
		});
	}
}

/**
 * Initialize portfolio
 */
async function initializePortfolio() {
	try {
		// Try to fetch portfolio from API
		const response = await fetch(`${__API_URL__}/api/portfolio`);
		if (response.ok) {
			const data = await response.json();
			
			// API returns nested structure: { portfolio: { current: {...} } }
			const currentPortfolio = data.portfolio?.current || {};
			
			const { updatePortfolio } = await import('./portfolio.js');
			updatePortfolio({
				btcAmount: currentPortfolio.btcAmount || 0.1,
				ethAmount: currentPortfolio.ethAmount || 2.0,
				ethValueBTC: currentPortfolio.ethValueBTC || 0.0,
				totalValueBTC: currentPortfolio.totalValueBTC || 0.1
			});
			
			console.log('✅ Portfolio initialized from API:', currentPortfolio);
		}
	} catch (error) {
		console.warn('Failed to initialize portfolio from API:', error);
		// Use default portfolio values (already set in store)
	}
}

/**
 * Initialize trading parameters
 */
async function initializeTradingParams() {
	try {
		// Load saved parameters from localStorage
		const saved = localStorage.getItem('powerhodl_trading_params');
		if (saved) {
			const params = JSON.parse(saved);
			const { updateTradingParams } = await import('./trading.js');
			updateTradingParams(params);
		}
	} catch (error) {
		console.warn('Failed to load trading parameters:', error);
		// Use default mega-optimal parameters (already set in store)
	}
}

// === Data Validation ===

/**
 * Validate store data consistency
 */
export function validateStoreConsistency() {
	const issues = [];
	
	const currentPortfolio = get(portfolio);
	const currentMarket = get(marketData);
	const currentParams = get(tradingParams);
	
	// Validate portfolio
	if (currentPortfolio.btcAmount < 0 || currentPortfolio.ethAmount < 0) {
		issues.push('Portfolio amounts cannot be negative');
	}
	
	// Validate market data
	if (!currentMarket.lastUpdate) {
		issues.push('Market data has never been updated');
	} else {
		const dataAge = Date.now() - new Date(currentMarket.lastUpdate).getTime();
		if (dataAge > 600000) { // 10 minutes
			issues.push('Market data is stale (>10 minutes old)');
		}
	}
	
	// Validate trading parameters
	if (currentParams.zScoreThreshold <= 0 || currentParams.zScoreThreshold > 5) {
		issues.push('Z-Score threshold out of valid range');
	}
	
	if (currentParams.rebalanceThreshold <= 0.1 || currentParams.rebalanceThreshold >= 0.9) {
		issues.push('Rebalance threshold out of valid range');
	}
	
	return {
		isValid: issues.length === 0,
		issues
	};
}

// === Data Persistence ===

/**
 * Save trading parameters to localStorage
 */
export function saveTradingParams() {
	const params = get(tradingParams);
	try {
		localStorage.setItem('powerhodl_trading_params', JSON.stringify(params));
	} catch (error) {
		console.warn('Failed to save trading parameters:', error);
	}
}

/**
 * Auto-save important data periodically
 */
export function startAutoSave(intervalMs = 60000) { // 1 minute
	const interval = setInterval(() => {
		try {
			saveTradingParams();
			
			// Validate store consistency
			const validation = validateStoreConsistency();
			if (!validation.isValid) {
				console.warn('Store consistency issues:', validation.issues);
			}
			
		} catch (error) {
			console.warn('Auto-save failed:', error);
		}
	}, intervalMs);
	
	// Return cleanup function
	return () => clearInterval(interval);
}

// === Performance Monitoring ===

/**
 * Monitor store performance and memory usage
 */
export function monitorStorePerformance() {
	const startTime = Date.now();
	
	// Monitor store subscription performance
	const subscriptions = [];
	
	// Subscribe to key stores to measure update frequency
	// Will be implemented when needed in components
	
	// Return performance data and cleanup
	return {
		getStats: () => ({
			uptime: Date.now() - startTime,
			subscriptions: 0
		}),
		cleanup: () => {
			// Will be implemented when subscriptions are added
		}
	};
}

// === Debugging Helpers ===

/**
 * Get current state of all stores (for debugging)
 */
export function getStoreSnapshot() {
	return {
		portfolio: get(portfolio),
		marketData: get(marketData),
		tradingParams: get(tradingParams),
		timestamp: new Date().toISOString()
	};
}

/**
 * Log store state changes (for debugging)
 */
export function enableStoreLogging() {
	const stores = { portfolio, marketData, tradingParams };
	const unsubscribers = [];
	
	Object.entries(stores).forEach(([name, store]) => {
		const unsub = store.subscribe(value => {
			console.log(`🏪 [STORE:${name.toUpperCase()}]`, value);
		});
		unsubscribers.push(unsub);
	});
	
	// Return cleanup function
	return () => {
		unsubscribers.forEach(unsub => unsub());
	};
}
