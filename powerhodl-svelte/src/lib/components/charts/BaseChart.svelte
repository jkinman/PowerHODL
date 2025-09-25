<!--
	Base Chart Component
	
	Reusable Chart.js wrapper with PowerHODL styling and responsive design
-->
<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	
	export let config = {};
	export let data = null; // Chart.js data object
	export let height = 300;
	export let responsive = true;
	export let maintainAspectRatio = false;
	export let loading = false;
	export let error = null;
	export let emptyMessage = 'No data available';
	export let loadingMessage = 'Loading chart...';
	
	const dispatch = createEventDispatcher();
	
	let chartContainer;
	let chart = null;
	let isChartReady = false;
	
	// Default PowerHODL chart configuration
	const defaultConfig = {
		responsive: true,
		maintainAspectRatio: false,
		interaction: {
			intersect: false,
			mode: 'index'
		},
		plugins: {
			legend: {
				display: true,
				position: 'top',
				align: 'end',
				labels: {
					color: '#ccc',
					font: {
						size: 12,
						weight: '500'
					},
					padding: 16,
					usePointStyle: true,
					pointStyle: 'line'
				}
			},
			tooltip: {
				backgroundColor: 'rgba(0, 0, 0, 0.9)',
				borderColor: 'rgba(247, 147, 26, 0.3)',
				borderWidth: 1,
				titleColor: '#fff',
				bodyColor: '#ccc',
				footerColor: '#888',
				cornerRadius: 8,
				displayColors: true,
				titleFont: {
					size: 13,
					weight: '600'
				},
				bodyFont: {
					size: 12
				},
				padding: 12
			}
		},
		scales: {
			x: {
				grid: {
					color: 'rgba(255, 255, 255, 0.05)',
					drawBorder: false
				},
				ticks: {
					color: '#888',
					font: {
						size: 11,
						weight: '500'
					},
					maxTicksLimit: 8
				}
			},
			y: {
				grid: {
					color: 'rgba(255, 255, 255, 0.05)',
					drawBorder: false
				},
				ticks: {
					color: '#888',
					font: {
						size: 11,
						weight: '500'
					}
				},
				position: 'left'
			}
		}
	};
	
	// Merge configurations
	function mergeConfig(base, override) {
		const merged = JSON.parse(JSON.stringify(base));
		
		if (override.plugins) {
			merged.plugins = { ...merged.plugins, ...override.plugins };
		}
		if (override.scales) {
			merged.scales = { ...merged.scales, ...override.scales };
		}
		if (override.options) {
			Object.assign(merged, override.options);
		}
		
		return merged;
	}
	
	// Initialize chart
	async function initChart() {
		if (!chartContainer || chart) return;
		
		try {
			// Wait for Chart.js to be available
			if (typeof window === 'undefined' || !window['Chart']) {
				setTimeout(initChart, 100);
				return;
			}
			
			const ChartClass = window['Chart'];
			const finalConfig = {
				type: config.type || 'line',
				data: data || { labels: [], datasets: [] },
				options: mergeConfig(defaultConfig, config)
			};
			
			chart = new ChartClass(chartContainer, finalConfig);
			isChartReady = true;
			
			// Add chart event listeners
			chart.canvas.addEventListener('click', handleChartClick);
			
			dispatch('chartReady', { chart });
			
		} catch (err) {
			console.error('Failed to initialize chart:', err);
			error = err.message;
			dispatch('chartError', { error: err });
		}
	}
	
	// Update chart data
	function updateChart() {
		if (!chart || !isChartReady) return;
		
		try {
			if (data) {
				chart.data = data;
				chart.update('none');
				dispatch('chartUpdated', { chart });
			}
		} catch (err) {
			console.error('Failed to update chart:', err);
			error = err.message;
		}
	}
	
	// Handle chart click events
	function handleChartClick(event) {
		if (!chart) return;
		
		const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
		if (points.length) {
			const firstPoint = points[0];
			const datasetIndex = firstPoint.datasetIndex;
			const index = firstPoint.index;
			const value = chart.data.datasets[datasetIndex].data[index];
			
			dispatch('chartClick', {
				datasetIndex,
				index,
				value,
				label: chart.data.labels[index]
			});
		}
	}
	
	// Resize chart
	function resizeChart() {
		if (chart && isChartReady) {
			chart.resize();
		}
	}
	
	// Destroy chart
	function destroyChart() {
		if (chart) {
			chart.canvas?.removeEventListener('click', handleChartClick);
			chart.destroy();
			chart = null;
			isChartReady = false;
		}
	}
	
	// Lifecycle
	onMount(() => {
		initChart();
		
		// Add resize listener
		window.addEventListener('resize', resizeChart);
		
		return () => {
			window.removeEventListener('resize', resizeChart);
		};
	});
	
	onDestroy(() => {
		destroyChart();
	});
	
	// React to data changes
	$: if (chart && data) {
		updateChart();
	}
	
	// React to config changes
	$: if (chart && config) {
		// Recreate chart if config changes significantly
		destroyChart();
		initChart();
	}
</script>

<div class="chart-wrapper" style="height: {height}px">
	{#if loading}
		<div class="chart-state loading">
			<div class="state-icon">
				<div class="loading-spinner"></div>
			</div>
			<div class="state-message">{loadingMessage}</div>
		</div>
	{:else if error}
		<div class="chart-state error">
			<div class="state-icon">❌</div>
			<div class="state-title">Chart Error</div>
			<div class="state-message">{error}</div>
			<button class="retry-btn" on:click={initChart}>
				Retry
			</button>
		</div>
	{:else if !data}
		<div class="chart-state empty">
			<div class="state-icon">📊</div>
			<div class="state-title">No Data</div>
			<div class="state-message">{emptyMessage}</div>
		</div>
	{:else}
		<div class="chart-container" class:responsive>
			<canvas bind:this={chartContainer}></canvas>
		</div>
	{/if}
</div>

<style>
	.chart-wrapper {
		position: relative;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 12px;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.chart-container {
		width: 100%;
		height: 100%;
		position: relative;
	}

	.chart-container.responsive canvas {
		width: 100% !important;
		height: 100% !important;
	}

	/* Chart States */
	.chart-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		padding: 40px 20px;
		text-align: center;
		color: #888;
	}

	.state-icon {
		font-size: 48px;
		margin-bottom: 16px;
		opacity: 0.7;
	}

	.state-title {
		font-size: 16px;
		font-weight: 600;
		color: #ccc;
		margin-bottom: 8px;
	}

	.state-message {
		font-size: 14px;
		line-height: 1.4;
		color: #888;
		max-width: 300px;
	}

	/* Loading State */
	.chart-state.loading .state-icon {
		font-size: 32px;
	}

	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 2px solid rgba(247, 147, 26, 0.2);
		border-top: 2px solid #f7931a;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	/* Error State */
	.chart-state.error {
		color: #ef4444;
	}

	.chart-state.error .state-title {
		color: #ef4444;
	}

	.retry-btn {
		background: rgba(247, 147, 26, 0.1);
		border: 1px solid rgba(247, 147, 26, 0.3);
		color: #f7931a;
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		margin-top: 16px;
		transition: all 0.2s ease;
	}

	.retry-btn:hover {
		background: rgba(247, 147, 26, 0.2);
		border-color: rgba(247, 147, 26, 0.5);
	}

	/* Empty State */
	.chart-state.empty .state-icon {
		opacity: 0.5;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.chart-state {
			padding: 30px 16px;
		}

		.state-icon {
			font-size: 36px;
		}

		.state-title {
			font-size: 14px;
		}

		.state-message {
			font-size: 13px;
		}
	}

	@media (max-width: 480px) {
		.chart-state {
			padding: 24px 12px;
		}

		.state-icon {
			font-size: 32px;
		}
	}
</style>
