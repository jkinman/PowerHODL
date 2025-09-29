<script>
	import { BaseChart } from '../charts';
	import { formatChartLabel } from '$lib/utils/chartUtils';
	
	export let result = null;
	export let height = 300;
	
	$: chartData = result && result.portfolioHistory ? {
		labels: result.portfolioHistory.map((p, i) => 
			formatChartLabel(new Date(p.timestamp), result.portfolioHistory.map(ph => new Date(ph.timestamp)), i, 'backtest')
		),
		datasets: [
			{
				label: 'Strategy',
				data: result.portfolioHistory.map(p => p.totalValueBTC),
				borderColor: '#f7931a',
				backgroundColor: 'rgba(247, 147, 26, 0.1)',
				borderWidth: 2,
				tension: 0.1,
				pointRadius: 0,
				pointHoverRadius: 4
			},
			{
				label: 'Buy & Hold',
				data: result.portfolioHistory.map(p => p.holdValueBTC || p.totalValueBTC),
				borderColor: '#666',
				backgroundColor: 'transparent',
				borderWidth: 2,
				borderDash: [5, 5],
				tension: 0,
				pointRadius: 0,
				pointHoverRadius: 4
			}
		]
	} : null;
	
	const chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		interaction: {
			mode: 'index',
			intersect: false
		},
		scales: {
			x: {
				grid: {
					color: 'rgba(255, 255, 255, 0.05)'
				},
				ticks: {
					color: '#888',
					maxTicksLimit: 8
				}
			},
			y: {
				grid: {
					color: 'rgba(255, 255, 255, 0.05)'
				},
				ticks: {
					color: '#888',
					callback: function(value) {
						return value.toFixed(6) + ' BTC';
					}
				}
			}
		},
		plugins: {
			legend: {
				labels: { color: '#ccc' }
			},
			tooltip: {
				backgroundColor: 'rgba(0,0,0,0.8)',
				titleColor: '#fff',
				bodyColor: '#ccc'
			}
		}
	};
</script>

{#if chartData}
	<div class="chart-container" style="height: {height}px">
		<BaseChart 
			data={chartData} 
			height={height}
			config={{
				type: 'line',
				options: chartOptions
			}}
		/>
	</div>
{:else}
	<div class="chart-placeholder" style="height: {height}px">
		<p>No data available</p>
	</div>
{/if}

<style>
	.chart-container {
		position: relative;
		width: 100%;
	}
	
	.chart-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: #666;
	}
</style>
