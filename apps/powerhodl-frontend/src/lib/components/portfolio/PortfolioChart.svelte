<!--
	Portfolio Chart Component
	
	BTC accumulation chart showing portfolio growth over time
-->
<script>
	import { onMount } from 'svelte';
	import { portfolioHistory, portfolioGrowth } from '$lib/stores';
	import BaseChart from '../charts/BaseChart.svelte';
	
	let chartData = null;
	let isLoading = false;
	
	// Chart configuration
	const chartConfig = {
		type: 'line',
		options: {
			plugins: {
				tooltip: {
					callbacks: {
						title: function(context) {
							return context[0].label;
						},
						label: function(context) {
							const value = context.parsed.y;
							if (context.datasetIndex === 0) {
								return `Total: ${value.toFixed(6)} BTC`;
							} else if (context.datasetIndex === 1) {
								return `BTC: ${value.toFixed(6)} BTC`;
							} else {
								return `ETH: ${value.toFixed(6)} BTC`;
							}
						},
						footer: function(context) {
							if (context.length > 0) {
								const dataIndex = context[0].dataIndex;
								const historyData = $portfolioHistory.length > 0 ? $portfolioHistory : generateDemoData();
								const data = historyData[dataIndex];
								if (data && data.trades) {
									return `Trades: ${data.trades}`;
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
				}
			}
		}
	};
	
	// Process portfolio history into chart data
	function processChartData(history) {
		if (!history || history.length === 0) return null;
		
		// Prepare data
		const labels = [];
		const totalBTCData = [];
		const btcHoldingsData = [];
		const ethValueData = [];
		
		history.forEach(point => {
			// Format timestamp for display
			const date = new Date(point.timestamp);
			const isToday = date.toDateString() === new Date().toDateString();
			const label = isToday 
				? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
				: date.toLocaleDateString([], { month: 'short', day: 'numeric' });
			
			labels.push(label);
			totalBTCData.push(point.totalValueBTC || 0);
			btcHoldingsData.push(point.btcAmount || 0);
			ethValueData.push(point.ethValueBTC || 0);
		});
		
		return {
			labels,
			datasets: [
				{
					label: 'Total BTC Value',
					data: totalBTCData,
					borderColor: '#f7931a',
					backgroundColor: 'rgba(247, 147, 26, 0.1)',
					fill: true,
					tension: 0.4,
					borderWidth: 3,
					pointRadius: 0,
					pointHoverRadius: 6,
					pointBackgroundColor: '#f7931a',
					pointBorderColor: '#fff',
					pointBorderWidth: 2
				},
				{
					label: 'BTC Holdings',
					data: btcHoldingsData,
					borderColor: '#ff9500',
					backgroundColor: 'transparent',
					borderWidth: 2,
					borderDash: [5, 5],
					tension: 0.2,
					pointRadius: 0,
					pointHoverRadius: 4
				},
				{
					label: 'ETH Value (BTC)',
					data: ethValueData,
					borderColor: '#627eea',
					backgroundColor: 'rgba(98, 126, 234, 0.05)',
					borderWidth: 2,
					tension: 0.3,
					pointRadius: 0,
					pointHoverRadius: 4
				}
			]
		};
	}
	
	// Update chart data when portfolio history changes
	function updateChartData() {
		isLoading = true;
		
		// Only use real data from the store
		if ($portfolioHistory.length > 0) {
			chartData = processChartData($portfolioHistory);
		} else {
			// No data available - show empty state
			chartData = {
				labels: [],
				datasets: []
			};
		}
		
		isLoading = false;
	}
	
	onMount(() => {
		updateChartData();
	});
	
	// React to portfolio history changes
	$: if ($portfolioHistory) {
		updateChartData();
	}
	
	// Format growth percentage for display
	$: growthDisplay = $portfolioGrowth.btcGrowthPercent || 0;
	$: growthClass = growthDisplay > 1 ? 'positive' : growthDisplay < -1 ? 'negative' : 'neutral';
</script>

<div class="portfolio-chart">
	<!-- Header -->
	<div class="chart-header">
		<div class="chart-title">
			<h3>BTC Accumulation Over Time</h3>
			<div class="chart-subtitle">
				Portfolio growth focused on Bitcoin accumulation
			</div>
		</div>
		
		<div class="chart-stats">
			<div class="stat-item {growthClass}">
				<div class="stat-label">Growth</div>
				<div class="stat-value">
					{growthDisplay > 0 ? '+' : ''}{growthDisplay.toFixed(2)}%
				</div>
			</div>
			<div class="stat-item">
				<div class="stat-label">Period</div>
				<div class="stat-value">
					{$portfolioGrowth.timeframe || '30d'}
				</div>
			</div>
		</div>
	</div>
	
	<!-- Chart Container -->
	<BaseChart 
		height={300}
		config={chartConfig}
		data={chartData}
		loading={isLoading}
		emptyMessage="No portfolio data available"
		loadingMessage="Loading portfolio data..."
	/>
	
	<!-- Empty State Notice -->
	{#if $portfolioHistory.length === 0}
		<div class="empty-notice">
			<span class="empty-icon">📊</span>
			<span class="empty-text">No portfolio history available yet</span>
		</div>
	{/if}
	
	<!-- Chart Legend -->
	<div class="chart-legend">
		<div class="legend-item">
			<div class="legend-dot total"></div>
			<span>Total Portfolio (BTC)</span>
		</div>
		<div class="legend-item">
			<div class="legend-dot btc"></div>
			<span>BTC Holdings</span>
		</div>
		<div class="legend-item">
			<div class="legend-dot eth"></div>
			<span>ETH Value (BTC)</span>
		</div>
	</div>
</div>

<style>
	.portfolio-chart {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 24px;
		backdrop-filter: blur(10px);
	}

	/* Header */
	.chart-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 24px;
		gap: 20px;
	}

	.chart-title h3 {
		margin: 0 0 4px 0;
		font-size: 18px;
		font-weight: 600;
		color: #fff;
	}

	.chart-subtitle {
		font-size: 13px;
		color: #888;
		font-weight: 500;
	}

	.chart-stats {
		display: flex;
		gap: 16px;
		flex-shrink: 0;
	}

	.stat-item {
		text-align: right;
		min-width: 60px;
	}

	.stat-label {
		font-size: 11px;
		color: #888;
		font-weight: 500;
		margin-bottom: 2px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.stat-value {
		font-size: 16px;
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

	/* Empty Notice */
	.empty-notice {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin: 12px 0;
		padding: 8px 12px;
		background: rgba(247, 147, 26, 0.1);
		border: 1px solid rgba(247, 147, 26, 0.2);
		border-radius: 6px;
		font-size: 11px;
		color: #f7931a;
		font-weight: 500;
	}

	.empty-icon {
		font-size: 12px;
	}

	/* Chart Legend */
	.chart-legend {
		display: flex;
		justify-content: center;
		gap: 24px;
		flex-wrap: wrap;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: #888;
		font-weight: 500;
	}

	.legend-dot {
		width: 12px;
		height: 3px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.legend-dot.total {
		background: #f7931a;
	}

	.legend-dot.btc {
		background: #ff9500;
		border: 1px dashed #ff9500;
		background: transparent;
	}

	.legend-dot.eth {
		background: #627eea;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.portfolio-chart {
			padding: 20px;
		}

		.chart-header {
			flex-direction: column;
			gap: 16px;
		}

		.chart-stats {
			align-self: flex-start;
		}


		.chart-legend {
			gap: 16px;
		}
	}

	@media (max-width: 480px) {
		.portfolio-chart {
			padding: 16px;
		}

		.chart-header {
			gap: 12px;
		}

		.chart-stats {
			gap: 12px;
		}


		.chart-legend {
			flex-direction: column;
			gap: 8px;
			align-items: center;
		}

	}
</style>
