<!--
	Market Chart Component
	
	ETH/BTC ratio and Z-Score analysis charts for market data visualization
-->
<script>
	import { onMount } from 'svelte';
	import { historicalData, marketData, marketHealth } from '$lib/stores';
	import BaseChart from './BaseChart.svelte';
	
	export let chartType = 'ratio'; // 'ratio', 'zscore', 'both'
	export let timeframe = '30d';
	export let height = 300;
	export let showVolume = false;
	
	let chartData = null;
	let chartConfig = {};
	let isLoading = true;
	let error = null;
	
	// Chart configurations for different types
	const chartConfigs = {
		ratio: {
			type: 'line',
			options: {
				plugins: {
					legend: {
						display: true
					},
					tooltip: {
						callbacks: {
							title: function(context) {
								return context[0].label;
							},
							label: function(context) {
								return `ETH/BTC Ratio: ${context.parsed.y.toFixed(6)}`;
							}
						}
					}
				},
				scales: {
					y: {
						ticks: {
							callback: function(value) {
								return value.toFixed(4);
							}
						}
					}
				}
			}
		},
		zscore: {
			type: 'line',
			options: {
				plugins: {
					legend: {
						display: true
					},
					tooltip: {
						callbacks: {
							title: function(context) {
								return context[0].label;
							},
							label: function(context) {
								const value = context.parsed.y;
								const interpretation = value > 2 ? 'Extremely High' 
									: value > 1 ? 'High' 
									: value > -1 ? 'Normal' 
									: value > -2 ? 'Low' 
									: 'Extremely Low';
								return `Z-Score: ${value.toFixed(3)} (${interpretation})`;
							}
						}
					}
				},
				scales: {
					y: {
						ticks: {
							callback: function(value) {
								return value.toFixed(2);
							}
						}
					}
				}
			}
		},
		both: {
			type: 'line',
			options: {
				plugins: {
					legend: {
						display: true
					},
					tooltip: {
						callbacks: {
							title: function(context) {
								return context[0].label;
							},
							label: function(context) {
								if (context.datasetIndex === 0) {
									return `ETH/BTC Ratio: ${context.parsed.y.toFixed(6)}`;
								} else {
									return `Z-Score: ${context.parsed.y.toFixed(3)}`;
								}
							}
						}
					}
				},
				scales: {
					y: {
						type: 'linear',
						display: true,
						position: 'left',
						ticks: {
							callback: function(value) {
								return value.toFixed(4);
							}
						}
					},
					y1: {
						type: 'linear',
						display: true,
						position: 'right',
						grid: {
							drawOnChartArea: false,
						},
						ticks: {
							callback: function(value) {
								return value.toFixed(2);
							}
						}
					}
				}
			}
		}
	};
	
	// Process historical data for charts
	function processHistoricalData(data) {
		if (!data || data.length === 0) return null;
		
		// Filter by timeframe
		const now = new Date();
		const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
		const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
		
		const filteredData = data.filter(item => {
			const itemDate = new Date(item.timestamp || item.date);
			return itemDate >= cutoff;
		});
		
		if (filteredData.length === 0) return null;
		
		// Extract labels and data
		const labels = [];
		const ratioData = [];
		const zscoreData = [];
		
		filteredData.forEach(item => {
			const date = new Date(item.timestamp || item.date);
			const label = formatChartLabel(date, filteredData.length);
			
			labels.push(label);
			ratioData.push(item.ethBtcRatio || item.ratio || 0);
			zscoreData.push(item.zScore || item.zscore || 0);
		});
		
		// Build datasets based on chart type
		const datasets = [];
		
		if (chartType === 'ratio' || chartType === 'both') {
			datasets.push({
				label: 'ETH/BTC Ratio',
				data: ratioData,
				borderColor: '#627eea',
				backgroundColor: 'rgba(98, 126, 234, 0.1)',
				fill: chartType === 'ratio',
				tension: 0.4,
				borderWidth: 2,
				pointRadius: 0,
				pointHoverRadius: 4,
				yAxisID: 'y'
			});
		}
		
		if (chartType === 'zscore' || chartType === 'both') {
			datasets.push({
				label: 'Z-Score',
				data: zscoreData,
				borderColor: '#f7931a',
				backgroundColor: 'rgba(247, 147, 26, 0.1)',
				fill: chartType === 'zscore',
				tension: 0.3,
				borderWidth: 2,
				pointRadius: 0,
				pointHoverRadius: 4,
				yAxisID: chartType === 'both' ? 'y1' : 'y'
			});
		}
		
		// Add threshold lines for Z-Score
		if (chartType === 'zscore' || chartType === 'both') {
			// Upper threshold (+2)
			datasets.push({
				label: 'Overbought (+2)',
				data: Array(labels.length).fill(2),
				borderColor: 'rgba(239, 68, 68, 0.5)',
				backgroundColor: 'transparent',
				borderWidth: 1,
				borderDash: [5, 5],
				pointRadius: 0,
				pointHoverRadius: 0,
				yAxisID: chartType === 'both' ? 'y1' : 'y'
			});
			
			// Lower threshold (-2)
			datasets.push({
				label: 'Oversold (-2)',
				data: Array(labels.length).fill(-2),
				borderColor: 'rgba(16, 185, 129, 0.5)',
				backgroundColor: 'transparent',
				borderWidth: 1,
				borderDash: [5, 5],
				pointRadius: 0,
				pointHoverRadius: 0,
				yAxisID: chartType === 'both' ? 'y1' : 'y'
			});
		}
		
		return {
			labels,
			datasets
		};
	}
	
	// Format chart labels based on data density
	function formatChartLabel(date, dataLength) {
		if (dataLength > 60) {
			// Lots of data - show date only
			return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
		} else if (dataLength > 7) {
			// Medium data - show date
			return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
		} else {
			// Few data points - show date and time
			return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
				' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		}
	}
	
	// Update chart data when dependencies change
	function updateChartData() {
		try {
			isLoading = true;
			error = null;
			
			// Only use real data from the store
			if ($historicalData.length > 0) {
				chartData = processHistoricalData($historicalData);
				chartConfig = chartConfigs[chartType];
			} else {
				// No data available - show empty state
				chartData = {
					labels: [],
					datasets: []
				};
			}
			
			isLoading = false;
			
		} catch (err) {
			console.error('Failed to process chart data:', err);
			error = err.message;
			isLoading = false;
		}
	}
	
	// Handle chart events
	function handleChartReady(event) {
		console.log('Market chart ready:', chartType);
	}
	
	function handleChartClick(event) {
		const { index, label, value } = event.detail;
		console.log('Chart clicked:', { index, label, value });
		// Could open detailed view or highlight specific data point
	}
	
	// Initialize on mount
	onMount(() => {
		updateChartData();
	});
	
	// React to store changes
	$: if ($historicalData) {
		updateChartData();
	}
	
	// React to prop changes
	$: if (chartType || timeframe) {
		updateChartData();
	}
</script>

<div class="market-chart">
	<div class="chart-header">
		<div class="chart-info">
			<h4 class="chart-title">
				{#if chartType === 'ratio'}
					ETH/BTC Ratio
				{:else if chartType === 'zscore'}
					Z-Score Analysis
				{:else}
					Market Analysis
				{/if}
			</h4>
			<div class="chart-subtitle">
				{timeframe} • {$marketHealth.isHealthy ? 'Live Data' : 'Stale Data'}
			</div>
		</div>
		
		<div class="chart-controls">
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
			</div>
		</div>
	</div>
	
	<BaseChart 
		{height}
		config={chartConfig}
		data={chartData}
		loading={isLoading}
		{error}
		emptyMessage="No market data available for the selected timeframe"
		loadingMessage="Loading market data..."
		on:chartReady={handleChartReady}
		on:chartClick={handleChartClick}
	/>
	
	{#if $historicalData.length === 0}
		<div class="demo-notice">
			<span class="demo-icon">🧪</span>
			<span class="demo-text">Showing simulated market data</span>
		</div>
	{/if}
</div>

<style>
	.market-chart {
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
		margin-bottom: 20px;
		gap: 16px;
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

	/* Controls */
	.chart-controls {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-shrink: 0;
	}

	.timeframe-selector {
		display: flex;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 6px;
		padding: 2px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.timeframe-btn {
		background: none;
		border: none;
		color: #888;
		padding: 6px 12px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.timeframe-btn:hover {
		color: #ccc;
		background: rgba(255, 255, 255, 0.05);
	}

	.timeframe-btn.active {
		color: #f7931a;
		background: rgba(247, 147, 26, 0.15);
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
		.market-chart {
			padding: 16px;
		}

		.chart-header {
			flex-direction: column;
			gap: 12px;
		}

		.chart-controls {
			align-self: flex-start;
		}

		.timeframe-btn {
			padding: 5px 10px;
			font-size: 10px;
		}
	}

	@media (max-width: 480px) {
		.market-chart {
			padding: 12px;
		}

		.chart-header {
			gap: 8px;
		}

		.timeframe-selector {
			padding: 1px;
		}

		.timeframe-btn {
			padding: 4px 8px;
		}
	}
</style>
