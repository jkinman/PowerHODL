/**
 * Main Application Module
 * 
 * Initializes and coordinates all components of the PowerHODL dashboard
 */

class PowerHODLApp {
    constructor() {
        this.chartManager = null;
        this.dashboardManager = null;
        this.isInitialized = false;
        
        this.initialize();
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            console.log('🚀 Initializing PowerHODL Dashboard...');
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
            } else {
                await this.initializeComponents();
            }
            
            this.isInitialized = true;
            console.log('✅ PowerHODL Dashboard initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize PowerHODL Dashboard:', error);
        }
    }

    /**
     * Initialize all components
     */
    async initializeComponents() {
        // Initialize chart manager
        this.chartManager = new window.ChartManager();
        console.log('📊 Chart Manager initialized');

        // Initialize dashboard manager
        this.dashboardManager = new window.DashboardManager();
        this.dashboardManager.setChartManager(this.chartManager);
        console.log('🎛️ Dashboard Manager initialized');

        // Initialize 3D visualization
        window.threeDViz = new window.ThreeDVisualization();
        console.log('🎯 3D Visualization initialized');

        // Initialize strategy presets
        window.strategyPresets = new window.StrategyPresets();
        console.log('📋 Strategy Presets initialized');

        // Initialize backtest results formatter
        window.backtestResults = new window.BacktestResults();
        console.log('📊 Backtest Results initialized');

        // Setup global event handlers
        this.setupGlobalEventHandlers();
        
        // Setup backtest sandbox functionality
        this.setupBacktestSandbox();
    }

    /**
     * Setup global event handlers
     */
    setupGlobalEventHandlers() {
        // Make refresh functions globally available for onclick handlers
        window.refreshData = () => this.dashboardManager.refreshData();
        window.refreshSignal = () => this.dashboardManager.refreshSignal();
        window.refreshHistoricalCharts = () => this.dashboardManager.refreshHistoricalCharts();
        
        // Make backtest functions globally available
        // openBacktestSandbox removed - now integrated into main dashboard
        window.runSingleBacktest = () => this.runSingleBacktest();
        window.runOptimization = (iterations) => this.runOptimization(iterations);
        
        // Make chart demo function available
        window.showExtendedDemo = () => this.showExtendedDemo();
        
        // Note: loadPreset is now handled by StrategyPresets module directly
        
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
        });
        
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
        });
    }

    /**
     * Setup backtest sandbox functionality
     */
    setupBacktestSandbox() {
        // Single backtest button
        const singleBacktestBtn = document.getElementById('runSingleBacktest');
        if (singleBacktestBtn) {
            singleBacktestBtn.onclick = () => this.runSingleBacktest();
        }

        // Optimization buttons
        ['runOptimization10', 'runOptimization100'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                const iterations = id.includes('10') ? 10 : 100;
                btn.onclick = () => this.runOptimization(iterations);
            }
        });

        // Extended demo button
        const demoBtn = document.querySelector('button[onclick="const mockData = generateExtendedMockPortfolio(); updateBTCAccumulationChart(mockData);"]');
        if (demoBtn) {
            demoBtn.onclick = () => this.showExtendedDemo();
        }
    }

    /**
     * Run single backtest
     */
    async runSingleBacktest() {
        if (this.dashboardManager.isOptimizing) return;

        try {
            const params = this.dashboardManager.getBacktestParameters();
            const useRealData = document.getElementById('useRealData')?.checked ?? true;
            
            console.log('🧪 Running single backtest:', { params, useRealData });
            
            // Update UI
            this.dashboardManager.clearBacktestResults();
            document.getElementById('backtestStatus').textContent = 'Running backtest...';
            
            let result;
            if (useRealData) {
                // Use real API
                result = await window.BacktestAPI.runSingleBacktest(params);
            } else {
                // Use simulation
                result = window.SimulationUtils.generateMockBacktestResults(params);
            }
            
            // Display results
            this.dashboardManager.displayBacktestResults(result);
            
        } catch (error) {
            console.error('❌ Single backtest failed:', error);
            document.getElementById('backtestStatus').textContent = `Error: ${error.message}`;
        }
    }

    /**
     * Run optimization with multiple iterations
     */
    async runOptimization(iterations) {
        if (this.dashboardManager.isOptimizing) return;

        try {
            this.dashboardManager.isOptimizing = true;
            
            const baseParams = this.dashboardManager.getBacktestParameters();
            const useRealData = document.getElementById('useRealData')?.checked ?? true;
            
            console.log(`🚀 Starting ${iterations}-iteration optimization:`, { baseParams, useRealData });
            
            // Update UI
            this.showOptimizationProgress(true);
            this.dashboardManager.clearOptimizationResults();
            
            // Run optimization
            const optimizationResult = await window.BacktestAPI.runOptimizationWithIterations(
                iterations, 
                baseParams, 
                useRealData
            );
            
            // Update UI with results
            this.dashboardManager.updateOptimizationResultsDisplay(optimizationResult.results);
            
            // Share results with 3D visualization
            if (window.threeDViz) {
                window.threeDViz.setOptimizationResults(optimizationResult.results);
            }
            
            // Update best result display
            if (optimizationResult.bestResult) {
                document.getElementById('bestBtcGrowth').textContent = 
                    `+${optimizationResult.bestResult.btcGrowthPercent.toFixed(2)}%`;
            }
            
            console.log(`✅ Optimization completed: ${optimizationResult.results.length} iterations`);
            
        } catch (error) {
            console.error('❌ Optimization failed:', error);
        } finally {
            this.dashboardManager.isOptimizing = false;
            this.showOptimizationProgress(false);
        }
    }

    /**
     * Show/hide optimization progress
     */
    showOptimizationProgress(show) {
        const progressContainer = document.getElementById('optimizationProgress');
        if (progressContainer) {
            progressContainer.style.display = show ? 'block' : 'none';
        }
        
        if (!show) {
            // Reset progress
            const progressBar = document.getElementById('progressBar');
            const currentIteration = document.getElementById('currentIteration');
            
            if (progressBar) progressBar.style.width = '0%';
            if (currentIteration) currentIteration.textContent = '0';
        }
    }

    /**
     * Show extended demo chart - DISABLED (no mock data allowed)
     */
    showExtendedDemo() {
        console.log('⚠️ Extended demo disabled - no mock portfolio data will be shown');
        console.log('💡 Use real backtest data instead');
        
        // Display message to user instead of mock data
        alert('Demo disabled: PowerHODL only shows real trading data. Use the backtest sandbox with real historical data instead.');
    }

    /**
     * Handle global inspection of iteration results
     */
    inspectIteration(index, parameters) {
        console.log(`🔍 Inspecting iteration ${index + 1}:`, parameters);
        
        // Could implement detailed inspection modal here
        // For now, just log the details
    }

    /**
     * Get application status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasChartManager: !!this.chartManager,
            hasDashboardManager: !!this.dashboardManager,
            isOptimizing: this.dashboardManager?.isOptimizing || false
        };
    }
}

// Initialize the application when script loads
window.PowerHODLApp = PowerHODLApp;

// Auto-initialize
const app = new PowerHODLApp();

// Make app instance globally available
window.app = app;

// Make inspection function globally available
window.inspectIteration = (index, parameters) => app.inspectIteration(index, parameters);

console.log('🎯 PowerHODL Application script loaded');
