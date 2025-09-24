/**
 * Dashboard Component Module
 * 
 * Manages dashboard UI updates and user interactions
 */

class DashboardManager {
    constructor() {
        this.isOptimizing = false;
        this.optimizationResults = [];
        this.chartManager = null;
        
        this.initializeDashboard();
    }

    /**
     * Initialize dashboard components
     */
    initializeDashboard() {
        this.setupEventListeners();
        this.loadInitialData();
    }

    /**
     * Setup event listeners for UI interactions
     */
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.querySelector('.refresh-btn[onclick="refreshData()"]');
        if (refreshBtn) {
            refreshBtn.onclick = () => this.refreshData();
        }

        // Signal refresh button
        const signalRefreshBtn = document.querySelector('.refresh-btn[onclick="refreshSignal()"]');
        if (signalRefreshBtn) {
            signalRefreshBtn.onclick = () => this.refreshSignal();
        }

        // Historical charts refresh button
        const historicalRefreshBtn = document.querySelector('.refresh-btn[onclick="refreshHistoricalCharts()"]');
        if (historicalRefreshBtn) {
            historicalRefreshBtn.onclick = () => this.refreshHistoricalCharts();
        }

        // Timeframe buttons
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const timeframe = e.target.dataset.timeframe;
                this.setTimeframe(timeframe);
            });
        });

        // Backtest sandbox button
        const backtestBtn = document.getElementById('openBacktestSandbox');
        if (backtestBtn) {
            backtestBtn.onclick = () => this.openBacktestSandbox();
        }

        // Modal close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }

    /**
     * Load initial dashboard data
     */
    async loadInitialData() {
        console.log('🚀 Loading initial dashboard data...');
        await this.loadDashboardData();
        await this.refreshHistoricalCharts();
    }

    /**
     * Load main dashboard data
     */
    async loadDashboardData() {
        try {
            // Load signal data
            await this.loadSignalData();
            
            // Load portfolio data
            await this.loadPortfolioData();
            
            console.log('✅ Dashboard data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    /**
     * Load signal data from API
     */
    async loadSignalData() {
        try {
            const apiUrl = window.BacktestAPI ? window.BacktestAPI.getApiUrl() : '';
            const response = await fetch(`${apiUrl}/api/signal`);
            
            if (!response.ok) {
                throw new Error(`Signal API error: ${response.status}`);
            }
            
            const data = await response.json();
            this.updateSignalDisplay(data);
        } catch (error) {
            console.error('Signal fetch error:', error);
            this.updateSignalDisplay(null, 'Unable to fetch signal');
        }
    }

    /**
     * Load portfolio data from API
     */
    async loadPortfolioData() {
        try {
            const apiUrl = window.BacktestAPI ? window.BacktestAPI.getApiUrl() : '';
            const response = await fetch(`${apiUrl}/api/portfolio`);
            
            if (!response.ok) {
                throw new Error(`Portfolio API error: ${response.status}`);
            }
            
            const data = await response.json();
            this.updatePortfolioDisplay(data);
        } catch (error) {
            console.error('Portfolio fetch error:', error);
            this.updatePortfolioDisplay(null, 'Unable to fetch portfolio');
        }
    }

    /**
     * Update signal display
     */
    updateSignalDisplay(data, errorMessage = null) {
        const elements = {
            action: document.getElementById('signal-action'),
            confidence: document.getElementById('signal-confidence'),
            zScore: document.getElementById('z-score'),
            ethBtcRatio: document.getElementById('eth-btc-ratio'),
            dataAge: document.getElementById('data-age')
        };

        if (errorMessage || !data) {
            Object.values(elements).forEach(el => {
                if (el) el.textContent = '--';
            });
            if (elements.action) {
                elements.action.className = 'signal-action signal-hold';
                elements.action.textContent = errorMessage || 'No Signal';
            }
            return;
        }

        // Update signal action
        if (elements.action) {
            elements.action.textContent = data.action || 'HOLD';
            elements.action.className = `signal-action signal-${(data.action || 'HOLD').toLowerCase()}`;
        }

        // Update signal metrics
        if (elements.confidence) {
            elements.confidence.textContent = data.confidence ? `${(data.confidence * 100).toFixed(1)}%` : '--';
        }
        
        if (elements.zScore) {
            elements.zScore.textContent = data.zScore ? data.zScore.toFixed(3) : '--';
        }
        
        if (elements.ethBtcRatio) {
            elements.ethBtcRatio.textContent = data.ethBtcRatio ? data.ethBtcRatio.toFixed(6) : '--';
        }

        if (elements.dataAge && data.dataAge) {
            const ageMinutes = Math.floor(data.dataAge / (1000 * 60));
            elements.dataAge.textContent = `${ageMinutes}m ago`;
        }

        // Update chart if available
        if (this.chartManager && data.ethBtcRatio) {
            this.chartManager.updateChartData(data.ethBtcRatio);
        }
    }

    /**
     * Update portfolio display
     */
    updatePortfolioDisplay(data, errorMessage = null) {
        const elements = {
            totalBalance: document.getElementById('total-balance'),
            ethBalance: document.getElementById('eth-balance'),
            btcBalance: document.getElementById('btc-balance'),
            balanceChange: document.getElementById('balance-change')
        };

        if (errorMessage || !data) {
            Object.values(elements).forEach(el => {
                if (el) el.textContent = '--';
            });
            return;
        }

        // Update balances - focus on BTC accumulation
        if (elements.totalBalance) {
            const totalBTC = data.totalValueBTC ? parseFloat(data.totalValueBTC) : 0;
            elements.totalBalance.textContent = `${totalBTC.toFixed(6)} BTC`;
        }

        if (elements.ethBalance) {
            const ethAmount = data.ethAmount ? parseFloat(data.ethAmount) : 0;
            elements.ethBalance.textContent = `${ethAmount.toFixed(4)} ETH`;
        }

        if (elements.btcBalance) {
            const btcAmount = data.btcAmount ? parseFloat(data.btcAmount) : 0;
            elements.btcBalance.textContent = `${btcAmount.toFixed(6)} BTC`;
        }

        // Update balance change (if available)
        if (elements.balanceChange && data.percentChange) {
            const change = parseFloat(data.percentChange);
            elements.balanceChange.textContent = `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
            elements.balanceChange.className = `balance-change ${change > 0 ? 'positive' : 'negative'}`;
        }
    }

    /**
     * Refresh all data
     */
    async refreshData() {
        console.log('🔄 Refreshing dashboard data...');
        document.getElementById('last-update').textContent = 'Updating...';
        
        await this.loadDashboardData();
        
        document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
    }

    /**
     * Refresh signal data only
     */
    async refreshSignal() {
        console.log('🔄 Refreshing signal data...');
        await this.loadSignalData();
    }

    /**
     * Refresh historical charts
     */
    async refreshHistoricalCharts() {
        try {
            console.log('🔄 Refreshing historical charts...');
            
            const apiUrl = window.BacktestAPI ? window.BacktestAPI.getApiUrl() : '';
            const response = await fetch(`${apiUrl}/api/historical?days=30`);
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    console.log('📊 Using real historical data from database/API');
                    if (this.chartManager) {
                        this.chartManager.updateHistoricalCharts(result.data);
                    }
                } else {
                    throw new Error('Invalid API response');
                }
            } else {
                throw new Error(`API error: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Failed to load historical data:', error);
            console.log('🎭 Using mock data - charts will be consistent on refresh');
            
            // Fallback to mock data
            if (window.SimulationUtils) {
                const mockData = window.SimulationUtils.generateMockHistoricalData(30);
                if (this.chartManager) {
                    this.chartManager.updateHistoricalCharts(mockData);
                }
            }
        }
    }

    /**
     * Set timeframe for charts
     */
    setTimeframe(timeframe) {
        console.log(`📊 Setting timeframe to: ${timeframe}`);
        
        if (this.chartManager) {
            this.chartManager.setActiveTimeframe(timeframe);
        }
        
        // Could implement different data loading based on timeframe
        // For now, just update the active button state
    }

    /**
     * Open backtest sandbox modal
     */
    openBacktestSandbox() {
        const modal = document.getElementById('backtestSandbox');
        if (modal) {
            modal.style.display = 'flex';
            
            // Clear previous results
            this.clearBacktestResults();
        }
    }

    /**
     * Clear backtest results
     */
    clearBacktestResults() {
        const elements = {
            btcGrowth: document.getElementById('btcGrowth'),
            winRate: document.getElementById('winRate'),
            totalTrades: document.getElementById('totalTrades'),
            maxDrawdown: document.getElementById('maxDrawdown'),
            backtestStatus: document.getElementById('backtestStatus')
        };

        Object.values(elements).forEach(el => {
            if (el) el.textContent = '--';
        });

        if (elements.backtestStatus) {
            elements.backtestStatus.textContent = 'Ready to run backtest';
        }

        this.clearOptimizationResults();
    }

    /**
     * Clear optimization results
     */
    clearOptimizationResults() {
        this.optimizationResults = [];
        const resultsList = document.getElementById('optimizationResultsList');
        if (resultsList) {
            resultsList.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">No optimization runs yet</div>';
        }
    }

    /**
     * Show error message to user
     */
    showError(message) {
        console.error('Dashboard Error:', message);
        // Could implement toast notifications or error display here
    }

    /**
     * Set chart manager reference
     */
    setChartManager(chartManager) {
        this.chartManager = chartManager;
    }

    /**
     * Get backtest parameters from form
     */
    getBacktestParameters() {
        return {
            zScoreThreshold: parseFloat(document.getElementById('zScoreThreshold')?.value || '1.26'),
            rebalancePercent: parseFloat(document.getElementById('rebalancePercent')?.value || '50'),
            lookbackWindow: parseInt(document.getElementById('lookbackWindow')?.value || '15'),
            transactionCost: parseFloat(document.getElementById('transactionCost')?.value || '1.66'),
            backtestPeriod: parseInt(document.getElementById('backtestPeriod')?.value || '365'),
            startingBTC: parseFloat(document.getElementById('startingBTC')?.value || '0.5'),
            startingETH: parseFloat(document.getElementById('startingETH')?.value || '0.5')
        };
    }

    /**
     * Update optimization results display
     */
    updateOptimizationResultsDisplay(results) {
        const resultsList = document.getElementById('optimizationResultsList');
        if (!resultsList || !results || results.length === 0) {
            if (resultsList) {
                resultsList.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">No optimization runs yet</div>';
            }
            return;
        }
        
        // Sort by BTC growth (best first)
        const sortedResults = [...results].sort((a, b) => b.btcGrowth - a.btcGrowth);
        
        const resultsHtml = sortedResults.map(result => `
            <div onclick="inspectIteration(${result.iteration - 1}, ${JSON.stringify(result.parameters).replace(/"/g, '&quot;')})" 
                 style="
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    padding: 8px 12px; 
                    margin-bottom: 6px; 
                    background: ${result.isBest ? 'rgba(0, 212, 170, 0.1)' : '#2d2d30'}; 
                    border: 1px solid ${result.isBest ? '#00d4aa' : '#444'}; 
                    border-radius: 4px; 
                    cursor: pointer;
                    font-size: 13px;
                    transition: background 0.2s;
                 "
                 onmouseover="this.style.background='${result.isBest ? 'rgba(0, 212, 170, 0.2)' : '#3a3a3a'}'"
                 onmouseout="this.style.background='${result.isBest ? 'rgba(0, 212, 170, 0.1)' : '#2d2d30'}'">
                
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #b3b3b3; min-width: 60px;">
                        #${result.iteration}
                        ${result.isBest ? '<span style="color: #00d4aa; margin-left: 4px;">🏆</span>' : ''}
                    </span>
                    <span style="color: ${result.btcGrowth > 0 ? '#00d4aa' : '#ff6b6b'}; font-weight: bold; min-width: 80px;">
                        ${result.btcGrowth > 0 ? '+' : ''}${result.btcGrowth.toFixed(2)}%
                    </span>
                    <span style="color: #666; font-size: 11px;">
                        Z:${result.parameters.zScoreThreshold.toFixed(2)}, 
                        R:${result.parameters.rebalancePercent.toFixed(0)}%, 
                        L:${result.parameters.lookbackWindow}d
                    </span>
                </div>
                
                <span style="color: #888; font-size: 11px; min-width: 60px; text-align: right;">
                    ${result.timestamp}
                </span>
            </div>
        `).join('');
        
        resultsList.innerHTML = resultsHtml;
    }

    /**
     * Display backtest results
     */
    displayBacktestResults(result) {
        const elements = {
            btcGrowth: document.getElementById('btcGrowth'),
            winRate: document.getElementById('winRate'),
            totalTrades: document.getElementById('totalTrades'),
            maxDrawdown: document.getElementById('maxDrawdown'),
            backtestStatus: document.getElementById('backtestStatus')
        };

        if (elements.btcGrowth) elements.btcGrowth.textContent = `+${result.btcGrowth.toFixed(2)}%`;
        if (elements.winRate) elements.winRate.textContent = `${result.winRate.toFixed(1)}%`;
        if (elements.totalTrades) elements.totalTrades.textContent = result.totalTrades.toString();
        if (elements.maxDrawdown) elements.maxDrawdown.textContent = `${result.maxDrawdown.toFixed(2)}%`;
        if (elements.backtestStatus) elements.backtestStatus.textContent = 'Backtest completed successfully';

        // Update charts if portfolio evolution is available
        if (result.portfolioEvolution && this.chartManager) {
            this.chartManager.updateBTCAccumulationChart(result.portfolioEvolution);
            this.chartManager.updateBacktestChart(result.portfolioEvolution);
        }

        // Update detailed results section
        this.updateLatestRunDetails(result);
    }

    /**
     * Update latest run detailed parameters and results (delegated to BacktestResults module)
     */
    updateLatestRunDetails(result) {
        if (window.backtestResults) {
            const params = result.parameters || this.getBacktestParameters();
            window.backtestResults.updateLatestRunDetails(result, params);
        }
    }

    /**
     * Load parameter presets (delegated to StrategyPresets module)
     */
    loadPreset(presetName) {
        if (window.strategyPresets) {
            return window.strategyPresets.loadPreset(presetName);
        }
        console.warn('StrategyPresets module not available');
        return false;
    }
}

// Export for global use
window.DashboardManager = DashboardManager;
