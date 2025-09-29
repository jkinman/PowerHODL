/**
 * PowerHODL Stores Index
 * 
 * Central export for all Svelte stores in the PowerHODL application
 */

// === Portfolio Management ===
export {
	// Core portfolio state
	portfolio,
	portfolioHistory,
	recentTrades,
	marketPrices,
	
	// Derived portfolio analytics
	portfolioMetrics,
	portfolioGrowth,
	
	// Portfolio actions
	updatePortfolio,
	updateMarketPrices,
	addPortfolioSnapshot,
	addTrade,
	setPortfolioLoading,
	setPortfolioError,
	resetPortfolio
} from './portfolio.js';

// === Trading Strategy ===
export {
	// Trading parameters and signals
	tradingParams,
	currentSignal,
	signalHistory,
	tradingState,
	strategyPresets,
	
	// Derived trading analytics
	tradingStatus,
	tradingPerformance,
	
	// Trading actions
	updateTradingParams,
	loadPreset,
	updateSignal,
	executeTrade,
	setTradingError,
	resetTradingState,
	clearSignalHistory,
	validateTradingParams
} from './trading.js';

// === Market Data ===
export {
	// Market data state
	marketData,
	historicalData,
	marketConnection,
	
	// Derived market analytics
	marketHealth,
	marketSignals,
	priceChanges,
	
	// Market data actions
	updateMarketData,
	addHistoricalData,
	setHistoricalData,
	updateConnectionStatus,
	incrementReconnectAttempts,
	calculateTechnicalIndicators,
	fetchMarketData,
	fetchHistoricalData,
	startRealTimeUpdates
} from './market.js';

// === Gradient Descent Sandbox ===
export {
	// Backtest state
	backtestState,
	backtestResults,
	backtestHistory,
	selectedBacktestResult,
	
	// Gradient descent optimization state
	optimizationState,
	optimizationResults,
	visualizationData,
	
	// Derived analytics
	backtestSummary,
	optimizationSummary,
	
	// Gradient descent actions
	runSingleBacktest,
	runOptimization,
	generate3DSurface,
	add3DOptimizationTrail,
	clearBacktestData
} from './backtest.js';

// === User Interface ===
export {
	// UI state
	currentPage,
	modals,
	notifications,
	loadingStates,
	userPreferences,
	errors,
	
	// Derived UI state
	modalState,
	notificationSummary,
	isLoading,
	errorSummary,
	
	// UI actions
	navigateTo,
	openModal,
	closeModal,
	closeAllModals,
	toggleModal,
	addNotification,
	removeNotification,
	markNotificationRead,
	clearNotifications,
	setLoading,
	setError,
	clearError,
	updatePreferences,
	loadPreferences,
	resetUIState,
	
	// Notification helpers
	showSuccess,
	showError,
	showWarning,
	showInfo,
	
	// Utility functions
	handleKeyboardShortcut
} from './ui.js';

// === Store Combinations for Common Use Cases ===

// Helper functions will be implemented in individual components
// where stores can be imported directly for better type safety
