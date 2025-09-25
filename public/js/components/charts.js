/**
 * Charts Component Module
 * 
 * Manages all Chart.js instances and chart-related functionality
 */

// Date/Time utilities for consistent date handling
let DateTimeUtils = null;

// Load DateTimeUtils when available (fallback for when module system isn't ready)
try {
    if (typeof window !== 'undefined' && window.DateTimeUtils) {
        DateTimeUtils = window.DateTimeUtils;
    }
} catch (err) {
    console.warn('⚠️ DateTimeUtils not available, using fallback methods');
}

class ChartManager {
    constructor() {
        this.balanceChart = null;
        this.backtestChart = null;
        this.ratioChart = null;
        this.zScoreChart = null;
        this.maxDataPoints = 10; // Limit to prevent infinite growth
        
        this.initializeCharts();
    }

    /**
     * Initialize all charts
     */
    initializeCharts() {
        this.initializeBalanceChart();
        this.initializeBacktestChart();
        this.initializeHistoricalCharts();
    }

    /**
     * Initialize the main BTC balance chart
     */
    initializeBalanceChart() {
        const ctx = document.getElementById('balanceChart');
        if (!ctx) return;

        this.balanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'BTC Balance',
                    data: [],
                    borderColor: '#00d4aa',
                    backgroundColor: 'rgba(0, 212, 170, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 0 }, // Prevent auto-sizing issues
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: { color: '#2d2d30' },
                        ticks: { color: '#b3b3b3' }
                    },
                    x: {
                        grid: { color: '#2d2d30' },
                        ticks: { color: '#b3b3b3' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#b3b3b3' } }
                }
            }
        });
    }

    /**
     * Initialize the backtest performance chart
     */
    initializeBacktestChart() {
        const ctx = document.getElementById('backtestChart');
        if (!ctx) return;

        this.backtestChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'BTC Balance',
                    data: [],
                    borderColor: '#00d4aa',
                    backgroundColor: 'rgba(0, 212, 170, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1,
                    pointRadius: 3,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 0 },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: { color: '#2d2d30' },
                        ticks: { color: '#b3b3b3' },
                        title: {
                            display: true,
                            text: 'BTC Balance',
                            color: '#b3b3b3'
                        }
                    },
                    x: {
                        grid: { color: '#2d2d30' },
                        ticks: { color: '#b3b3b3' },
                        title: {
                            display: true,
                            text: 'Time',
                            color: '#b3b3b3'
                        }
                    }
                },
                plugins: {
                    legend: { 
                        labels: { color: '#b3b3b3' },
                        display: false // Hide legend for cleaner look
                    },
                    tooltip: {
                        backgroundColor: '#1a1a1b',
                        titleColor: '#ffffff',
                        bodyColor: '#b3b3b3',
                        borderColor: '#2d2d30',
                        borderWidth: 1
                    }
                }
            }
        });
    }

    /**
     * Initialize historical ratio and Z-score charts
     */
    initializeHistoricalCharts() {
        // ETH/BTC Ratio Chart
        const ratioCtx = document.getElementById('ratioChart');
        if (ratioCtx) {
            this.ratioChart = new Chart(ratioCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'ETH/BTC Ratio',
                        data: [],
                        borderColor: '#00d4aa',
                        backgroundColor: 'rgba(0, 212, 170, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 0 },
                    scales: {
                        y: {
                            beginAtZero: false,
                            grid: { color: '#2d2d30' },
                            ticks: { color: '#b3b3b3' }
                        },
                        x: {
                            grid: { color: '#2d2d30' },
                            ticks: { color: '#b3b3b3' }
                        }
                    },
                    plugins: {
                        legend: { labels: { color: '#b3b3b3' } }
                    }
                }
            });
        }

        // Z-Score Chart
        const zScoreCtx = document.getElementById('zScoreChart');
        if (zScoreCtx) {
            this.zScoreChart = new Chart(zScoreCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Z-Score',
                        data: [],
                        borderColor: '#fbbf24',
                        backgroundColor: 'rgba(251, 191, 36, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 0 },
                    scales: {
                        y: {
                            beginAtZero: false,
                            grid: { color: '#2d2d30' },
                            ticks: { color: '#b3b3b3' }
                        },
                        x: {
                            grid: { color: '#2d2d30' },
                            ticks: { color: '#b3b3b3' }
                        }
                    },
                    plugins: {
                        legend: { labels: { color: '#b3b3b3' } }
                    }
                }
            });
        }
    }

    /**
     * Update chart data with new values
     */
    updateChartData(value, label = new Date().toLocaleTimeString()) {
        if (!this.balanceChart) return;

        const data = this.balanceChart.data;
        
        // Limit data points to prevent infinite growth
        if (data.labels.length >= this.maxDataPoints) {
            data.labels.shift();
            data.datasets[0].data.shift();
        }
        
        data.labels.push(label);
        data.datasets[0].data.push(value);
        
        this.balanceChart.update();
    }

    /**
     * Update historical charts with fetched data
     */
    updateHistoricalCharts(historicalData) {
        if (!historicalData || historicalData.length === 0) return;
        
        // Use DateTimeUtils if available, otherwise fallback to old logic
        let labels, chartData, spanInfo;
        
        if (DateTimeUtils) {
            // Modern approach using utility library
            const validation = DateTimeUtils.validateDataset(historicalData);
            if (!validation.valid) {
                console.error('❌ Invalid historical data:', validation.errors);
                return;
            }
            
            const spanDays = DateTimeUtils.calculateDatasetSpan(historicalData);
            chartData = DateTimeUtils.sampleDataForChart(historicalData, 30);
            labels = DateTimeUtils.formatChartLabels(chartData);
            spanInfo = `Chart data spans ${spanDays + 1} days`;
            
            console.log(`📅 ${spanInfo} (using DateTimeUtils)`);
            
        } else {
            // Fallback to original logic
            const firstDate = new Date(historicalData[0].date || historicalData[0].timestamp);
            const lastDate = new Date(historicalData[historicalData.length - 1].date || historicalData[historicalData.length - 1].timestamp);
            const daySpan = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));
            const isMultiDay = daySpan > 0;
            
            console.log(`📅 Chart data spans ${daySpan + 1} days (${firstDate.toDateString()} to ${lastDate.toDateString()}) - fallback mode`);
            
            chartData = historicalData.slice(-30);
            
            labels = chartData.map(d => {
                const date = new Date(d.date || d.timestamp);
                
                if (isMultiDay) {
                    if (chartData.length > 90) {
                        return date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            year: '2-digit' 
                        });
                    } else {
                        return date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                        });
                    }
                } else {
                    return date.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false 
                    });
                }
            });
        }
        
        // Update ratio chart
        if (this.ratioChart) {
            this.ratioChart.data.labels = labels;
            this.ratioChart.data.datasets[0].data = chartData.map(d => d.ethBtcRatio);
            this.ratioChart.update();
        }

        // Update Z-score chart
        if (this.zScoreChart) {
            this.zScoreChart.data.labels = labels;
            this.zScoreChart.data.datasets[0].data = chartData.map(d => d.zScore);
            this.zScoreChart.update();
        }
    }

    /**
     * Update backtest chart with portfolio evolution
     */
    updateBacktestChart(portfolioEvolution) {
        if (!this.backtestChart || !portfolioEvolution) return;

        console.log('📊 Updating backtest chart with portfolio evolution');
        
        // Clear and replace chart data
        const chartData = this.backtestChart.data;
        chartData.labels.length = 0;
        chartData.datasets[0].data.length = 0;
        
        // Process portfolio evolution data (sample for readability)
        if (portfolioEvolution.dates && portfolioEvolution.btcValues) {
            const totalPoints = portfolioEvolution.dates.length;
            const targetPoints = Math.min(50, totalPoints);
            const step = Math.max(1, Math.floor(totalPoints / targetPoints));
            
            for (let i = 0; i < totalPoints; i += step) {
                const date = new Date(portfolioEvolution.dates[i]);
                const btcValue = portfolioEvolution.btcValues[i];
                
                // Format date for display
                let label;
                if (totalPoints > 365) {
                    label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                } else if (totalPoints > 90) {
                    label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                } else {
                    label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }
                
                chartData.labels.push(label);
                chartData.datasets[0].data.push(btcValue);
            }
            
            // Force chart scale recalculation
            this.backtestChart.options.scales.x.min = undefined;
            this.backtestChart.options.scales.x.max = undefined;
            this.backtestChart.options.scales.y.min = undefined;
            this.backtestChart.options.scales.y.max = undefined;
            
            this.backtestChart.update('resize');
            
            console.log(`📊 Backtest chart updated with ${chartData.labels.length} data points`);
        }
    }

    /**
     * Update BTC accumulation chart with backtest portfolio evolution
     */
    updateBTCAccumulationChart(portfolioEvolution) {
        if (!this.balanceChart || !portfolioEvolution) return;

        console.log('📊 Updating BTC accumulation chart with backtest data');
        
        // Clear and replace chart data with backtest results
        const chartData = this.balanceChart.data;
        chartData.labels.length = 0;
        chartData.datasets[0].data.length = 0;
        
        // Process portfolio evolution data
        if (portfolioEvolution.dates && portfolioEvolution.btcValues) {
            // Sample data to prevent overcrowding (take every Nth point)
            const totalPoints = portfolioEvolution.dates.length;
            const targetPoints = Math.min(50, totalPoints); // Max 50 points for readability
            const step = Math.max(1, Math.floor(totalPoints / targetPoints));
            
            for (let i = 0; i < totalPoints; i += step) {
                const date = new Date(portfolioEvolution.dates[i]);
                const btcValue = portfolioEvolution.btcValues[i];
                
                // Format date for display
                let label;
                if (totalPoints > 365) {
                    // Multi-year data: show year
                    label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                } else if (totalPoints > 90) {
                    // Multi-month data: show month and day
                    label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                } else {
                    // Short period: show full date
                    label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }
                
                chartData.labels.push(label);
                chartData.datasets[0].data.push(btcValue);
            }
            
            // Update chart title to reflect backtest period
            if (portfolioEvolution.dates.length > 0) {
                const startDate = new Date(portfolioEvolution.dates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const endDate = new Date(portfolioEvolution.dates[portfolioEvolution.dates.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const totalDays = portfolioEvolution.fullDataRange?.totalDays || portfolioEvolution.dates.length;
                const totalTrades = portfolioEvolution.fullDataRange?.totalTrades || portfolioEvolution.trades?.length || 0;
                
                // Update chart title dynamically
                const chartTitle = document.querySelector('.chart-container .chart-title');
                if (chartTitle) {
                    chartTitle.textContent = `BTC Accumulation Over Time (${totalDays} days, ${totalTrades} trades)`;
                }
            }
            
            // Force chart scale recalculation for full timeline
            this.balanceChart.options.scales.x.min = undefined;
            this.balanceChart.options.scales.x.max = undefined;
            this.balanceChart.options.scales.y.min = undefined;
            this.balanceChart.options.scales.y.max = undefined;
            
            this.balanceChart.update('resize');
            
            console.log(`📊 Chart updated with ${chartData.labels.length} data points from ${portfolioEvolution.dates.length} total portfolio entries`);
        }
    }

    /**
     * Set active timeframe button
     */
    setActiveTimeframe(timeframe) {
        // Remove active class from all timeframe buttons
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to selected button
        const activeBtn = document.querySelector(`[data-timeframe="${timeframe}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    /**
     * Destroy all charts (cleanup)
     */
    destroy() {
        if (this.balanceChart) {
            this.balanceChart.destroy();
            this.balanceChart = null;
        }
        if (this.backtestChart) {
            this.backtestChart.destroy();
            this.backtestChart = null;
        }
        if (this.ratioChart) {
            this.ratioChart.destroy();
            this.ratioChart = null;
        }
        if (this.zScoreChart) {
            this.zScoreChart.destroy();
            this.zScoreChart = null;
        }
    }

    /**
     * Show error state for historical charts
     * @param {string} errorMessage - Error message to display
     */
    showHistoricalChartsError(errorMessage) {
        console.log('📊 Showing error state for historical charts:', errorMessage);
        
        // Show error message in chart containers
        const ratioContainer = document.getElementById('ratio-chart')?.parentElement;
        const zscoreContainer = document.getElementById('zscore-chart')?.parentElement;
        
        if (ratioContainer) {
            ratioContainer.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #ff6b6b;">
                    <p><strong>Historical Data Unavailable</strong></p>
                    <p style="font-size: 0.9em; opacity: 0.8;">${errorMessage}</p>
                </div>
            `;
        }
        
        if (zscoreContainer) {
            zscoreContainer.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #ff6b6b;">
                    <p><strong>Historical Data Unavailable</strong></p>
                    <p style="font-size: 0.9em; opacity: 0.8;">${errorMessage}</p>
                </div>
            `;
        }
    }
}

// Export for global use
window.ChartManager = ChartManager;
