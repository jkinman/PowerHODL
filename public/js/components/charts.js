/**
 * Charts Component Module
 * 
 * Manages all Chart.js instances and chart-related functionality
 */

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
        
        // Prepare data for charts (last 30 points to prevent overcrowding)
        const chartData = historicalData.slice(-30);
        const labels = chartData.map(d => {
            const date = new Date(d.date || d.timestamp);
            
            // If all data is from the same day, show time instead of date
            const isIntraday = chartData.every(item => {
                const itemDate = new Date(item.date || item.timestamp);
                return itemDate.toDateString() === date.toDateString();
            });
            
            if (isIntraday) {
                // Show time for intraday data
                return date.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                });
            } else {
                // Show date for multi-day data
                return date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                });
            }
        });
        
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
}

// Export for global use
window.ChartManager = ChartManager;
