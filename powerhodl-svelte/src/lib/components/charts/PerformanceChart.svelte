<!--
	Performance Chart Component
	
	BTC accumulation performance chart with benchmarks and analysis
-->
<script>
	import { onMount } from 'svelte';
	import { portfolioHistory, portfolioGrowth, backtestResults } from '$lib/stores';
	import BaseChart from './BaseChart.svelte';
	
	export let compareWith = 'holding'; // 'holding', 'benchmark', 'none'
	export let timeframe = 'ALL';
	export let height = 350;
	export let showDrawdown = false;
	
	let chartData = null;
	let chartConfig = {};
	let isLoading = true;
	let error = null;
	
	// Chart configuration
	const performanceConfig = {
		type: 'line',
		options: {
			plugins: {
				legend: {
					display: true,
					position: 'top'
				},
				tooltip: {
					callbacks: {
						title: function(context) {
							return context[0].label;
						},
						label: function(context) {
							const value = context.parsed.y;
							if (context.datasetIndex === 0) {
								return `PowerHODL: ${value.toFixed(6)} BTC`;
							} else if (context.datasetIndex === 1) {
								return `Hold Strategy: ${value.toFixed(6)} BTC`;
							} else if (context.datasetIndex === 2) {
								return `Drawdown: ${value.toFixed(2)}%`;
							}
							return `${context.dataset.label}: ${value.toFixed(4)}`;
						},
						footer: function(context) {
							if (context.length > 1) {
								const powerhodl = context[0].parsed.y;
								const holding = context[1]?.parsed.y;
								if (powerhodl && holding) {
									const outperformance = ((powerhodl - holding) / holding * 100);
									return `Outperformance: ${outperformance > 0 ? '+' : ''}${outperformance.toFixed(2)}%`;
								}
							}
							return '';
						}
					}
				}
			},
			scales: {
				y: {
					ticks: {
						callback: function(value) {
							return value.toFixed(4) + ' BTC';
						}
					}
				},
				y1: {
					type: 'linear',
					display: showDrawdown,
					position: 'right',
					grid: {
						drawOnChartArea: false,
					},
					ticks: {
						callback: function(value) {
							return value.toFixed(1) + '%';
						}
					}
				}
			}
		}
	};
	
	// Process performance data
	function processPerformanceData(history) {
		if (!history || history.length === 0) return null;
		
		// Filter by timeframe
		const filteredHistory = filterByTimeframe(history, timeframe);
		if (filteredHistory.length === 0) return null;
		
		const labels = [];
		const portfolioValues = [];
		const holdingValues = [];
		const drawdownValues = [];
		
		// Calculate holding strategy baseline
		const initialBTC = filteredHistory[0].btcAmount || 0.5;
		const initialETH = filteredHistory[0].ethAmount || 0.5;
		
		let peak = 0;
		
		filteredHistory.forEach(point => {
			const date = new Date(point.timestamp);
			labels.push(formatPerformanceLabel(date, filteredHistory.length));
			
			// PowerHODL portfolio value
			const portfolioValue = point.totalValueBTC || 0;
			portfolioValues.push(portfolioValue);
			
			// Holding strategy (no trades, just ETH/BTC price changes)
			const ethBtcRatio = point.ethBtcRatio || 0.037;
			const holdingValue = initialBTC + (initialETH * ethBtcRatio);
			holdingValues.push(holdingValue);
			
			// Calculate drawdown
			if (portfolioValue > peak) peak = portfolioValue;
			const drawdown = peak > 0 ? ((peak - portfolioValue) / peak) * 100 : 0;
			drawdownValues.push(-Math.abs(drawdown)); // Negative for visual effect
		});
		
		const datasets = [
			{
				label: 'PowerHODL Strategy',
				data: portfolioValues,
				borderColor: '#f7931a',
				backgroundColor: 'rgba(247, 147, 26, 0.1)',
				fill: false,
				tension: 0.3,
				borderWidth: 3,
				pointRadius: 0,
				pointHoverRadius: 6,
				yAxisID: 'y'
			}
		];
		
		// Add comparison line
		if (compareWith === 'holding') {
			datasets.push({
				label: 'Hold Strategy',
				data: holdingValues,
				borderColor: '#888',
				backgroundColor: 'transparent',
				fill: false,
				borderWidth: 2,
				borderDash: [5, 5],
				tension: 0.2,
				pointRadius: 0,
				pointHoverRadius: 4,
				yAxisID: 'y'
			});
		}
		
		// Add drawdown if enabled
		if (showDrawdown) {
			datasets.push({
				label: 'Drawdown',
				data: drawdownValues,
				borderColor: '#ef4444',
				backgroundColor: 'rgba(239, 68, 68, 0.1)',
				fill: true,
				tension: 0.2,
				borderWidth: 1,
				pointRadius: 0,
				pointHoverRadius: 3,
				yAxisID: 'y1'
			});
		}
		
		return {
			labels,
			datasets
		};
	}
	
	// Filter data by timeframe
	function filterByTimeframe(data, timeframe) {
		if (timeframe === 'ALL') return data;
		
		const now = new Date();
		const days = timeframe === '7d' ? 7 
			: timeframe === '30d' ? 30 
			: timeframe === '90d' ? 90 
			: timeframe === '1Y' ? 365 
			: 365;
		
		const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
		
		return data.filter(item => {
			const itemDate = new Date(item.timestamp);
			return itemDate >= cutoff;
		});
	}
	
	// Format labels for performance chart
	function formatPerformanceLabel(date, dataLength) {
		if (dataLength > 90) {
			// Long period - show months
			return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
		} else if (dataLength > 30) {
			// Medium period - show month/day
			return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
		} else if (dataLength > 7) {
			// Week+ - show day
			return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
		} else {
			// Few days - show day/time
			return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
				' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		}
	}
	
	// Generate demo performance data
	function generateDemoPerformanceData() {
		const now = new Date();
		const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 60;
		const data = [];
		
		let portfolioValue = 0.5;
		let peak = portfolioValue;
		
		for (let i = days - 1; i >= 0; i--) {
			const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
			const progress = (days - i) / days;
			
			// Simulate portfolio growth with volatility
			const baseGrowth = progress * 0.08; // 8% over period
			const volatility = Math.sin(i * 0.5) * 0.015;
			const marketCycle = Math.sin(i * 0.1) * 0.02;
			
			portfolioValue = 0.5 + baseGrowth + volatility + marketCycle;
			portfolioValue = Math.max(0.4, portfolioValue); // Don't go below 0.4
			
			// Track peak for drawdown
			if (portfolioValue > peak) peak = portfolioValue;
			
			// Simulate ETH/BTC ratio changes
			const ethBtcRatio = 0.037 + Math.sin(i * 0.2) * 0.003;
			
			data.push({
				timestamp: date.toISOString(),
				totalValueBTC: portfolioValue,
				btcAmount: 0.5 + progress * 0.03, // Slight BTC accumulation
				ethAmount: 0.5 - progress * 0.1, // Some ETH traded
				ethBtcRatio: ethBtcRatio
			});
		}
		
		return data;
	}
	
	// Update chart when data changes
	function updateChart() {
		try {
			isLoading = true;
			error = null;
			
			// Use real data if available, otherwise demo data
			const history = $portfolioHistory.length > 0 ? $portfolioHistory : generateDemoPerformanceData();
			
			chartData = processPerformanceData(history);
			chartConfig = performanceConfig;
			
			isLoading = false;
			
		} catch (err) {
			console.error('Failed to process performance data:', err);
			error = err.message;
			isLoading = false;
		}
	}
	
	// Handle chart events
	function handleChartReady(event) {
		console.log('Performance chart ready');
	}
	
	function handleChartClick(event) {
		const { index, label, value } = event.detail;
		console.log('Performance chart clicked:', { index, label, value });
	}
	
	// Initialize
	onMount(() => {
		updateChart();
	});
	
	// React to store changes
	$: if ($portfolioHistory) {
		updateChart();
	}
	
	// React to prop changes
	$: if (timeframe || compareWith || showDrawdown) {
		updateChart();
	}
	
	// Performance metrics
	$: totalGrowth = $portfolioGrowth.btcGrowthPercent || 0;
	$: growthClass = totalGrowth > 1 ? 'positive' : totalGrowth < -1 ? 'negative' : 'neutral';
</script>

<div class="performance-chart">
	<div class="chart-header">
		<div class="chart-info">
			<h4 class="chart-title">Performance Analysis</h4>
			<div class="chart-subtitle">
				BTC accumulation vs {compareWith === 'holding' ? 'holding strategy' : 'benchmark'}
			</div>
		</div>
		
		<div class="performance-stats">
			<div class="stat-item {growthClass}">
				<div class="stat-label">Total Growth</div>
				<div class="stat-value">
					{totalGrowth > 0 ? '+' : ''}{totalGrowth.toFixed(2)}%
				</div>
			</div>
			<div class="stat-item">
				<div class="stat-label">Period</div>
				<div class="stat-value">
					{$portfolioGrowth.timeframe || timeframe}
				</div>
			</div>
		</div>
	</div>
	
	<div class="chart-controls">
		<div class="control-group">
			<span class="control-label">Timeframe:</span>
			<div class="timeframe-selector">
				<button 
					class="timeframe-btn" 
					class:active={timeframe === '7d'}
					on:click={() => timeframe = '7d'}
				>
					7D
				</button>
				<button 
					class="timeframe-btn" 
					class:active={timeframe === '30d'}
					on:click={() => timeframe = '30d'}
				>
					30D
				</button>
				<button 
					class="timeframe-btn" 
					class:active={timeframe === '90d'}
					on:click={() => timeframe = '90d'}
				>
					90D
				</button>
				<button 
					class="timeframe-btn" 
					class:active={timeframe === 'ALL'}
					on:click={() => timeframe = 'ALL'}
				>
					ALL
				</button>
			</div>
		</div>
		
		<div class="control-group">
			<span class="control-label">Compare:</span>
			<div class="compare-selector">
				<button 
					class="compare-btn" 
					class:active={compareWith === 'holding'}
					on:click={() => compareWith = 'holding'}
				>
					Holding
				</button>
				<button 
					class="compare-btn" 
					class:active={compareWith === 'none'}
					on:click={() => compareWith = 'none'}
				>
					None
				</button>
			</div>
		</div>
		
		<div class="control-group">
			<label class="toggle-control">
				<input 
					type="checkbox" 
					bind:checked={showDrawdown}
				>
				<span class="toggle-text">Show Drawdown</span>
			</label>
		</div>
	</div>
	
	<BaseChart 
		{height}
		config={chartConfig}
		data={chartData}
		loading={isLoading}
		{error}
		emptyMessage="No performance data available"
		loadingMessage="Loading performance data..."
		on:chartReady={handleChartReady}
		on:chartClick={handleChartClick}
	/>
	
	{#if $portfolioHistory.length === 0}
		<div class="demo-notice">
			<span class="demo-icon">🧪</span>
			<span class="demo-text">Showing simulated performance data</span>
		</div>
	{/if}
</div>

<style>
	.performance-chart {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 20px;
		backdrop-filter: blur(10px);
	}

	/* Header */
	.chart-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 16px;
		gap: 20px;
	}

	.chart-title {
		margin: 0 0 4px 0;
		font-size: 16px;
		font-weight: 600;
		color: #fff;
	}

	.chart-subtitle {
		font-size: 12px;
		color: #888;
		font-weight: 500;
	}

	.performance-stats {
		display: flex;
		gap: 16px;
		flex-shrink: 0;
	}

	.stat-item {
		text-align: right;
		min-width: 60px;
	}

	.stat-label {
		font-size: 10px;
		color: #888;
		font-weight: 500;
		margin-bottom: 2px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.stat-value {
		font-size: 14px;
		font-weight: 700;
		color: #fff;
	}

	.stat-item.positive .stat-value {
		color: #10b981;
	}

	.stat-item.negative .stat-value {
		color: #ef4444;
	}

	.stat-item.neutral .stat-value {
		color: #f59e0b;
	}

	/* Controls */
	.chart-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		margin-bottom: 20px;
		padding: 12px;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.control-group {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.control-label {
		font-size: 11px;
		color: #888;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.timeframe-selector,
	.compare-selector {
		display: flex;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
		padding: 1px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.timeframe-btn,
	.compare-btn {
		background: none;
		border: none;
		color: #888;
		padding: 4px 8px;
		border-radius: 3px;
		font-size: 10px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.timeframe-btn:hover,
	.compare-btn:hover {
		color: #ccc;
		background: rgba(255, 255, 255, 0.05);
	}

	.timeframe-btn.active,
	.compare-btn.active {
		color: #f7931a;
		background: rgba(247, 147, 26, 0.15);
	}

	.toggle-control {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
		font-size: 11px;
		color: #888;
		font-weight: 500;
	}

	.toggle-control input[type="checkbox"] {
		width: 12px;
		height: 12px;
		accent-color: #f7931a;
	}

	/* Demo Notice */
	.demo-notice {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin-top: 12px;
		padding: 8px 12px;
		background: rgba(247, 147, 26, 0.1);
		border: 1px solid rgba(247, 147, 26, 0.2);
		border-radius: 6px;
		font-size: 11px;
		color: #f7931a;
		font-weight: 500;
	}

	.demo-icon {
		font-size: 12px;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.performance-chart {
			padding: 16px;
		}

		.chart-header {
			flex-direction: column;
			gap: 12px;
		}

		.performance-stats {
			align-self: flex-start;
		}

		.chart-controls {
			flex-direction: column;
			gap: 12px;
		}

		.control-group {
			justify-content: space-between;
		}
	}

	@media (max-width: 480px) {
		.performance-chart {
			padding: 12px;
		}

		.chart-controls {
			padding: 8px;
			gap: 8px;
		}

		.timeframe-btn,
		.compare-btn {
			padding: 3px 6px;
			font-size: 9px;
		}
	}
</style>
