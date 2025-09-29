<script>
	import { BaseChart } from '../charts';
	import { selectedBacktestResult } from '$lib/stores';
	
	function formatPercent(value) {
		if (value === null || value === undefined) return '0.00%';
		const sign = value >= 0 ? '+' : '';
		return `${sign}${value.toFixed(2)}%`;
	}
	
	function closeDetails() {
		selectedBacktestResult.set(null);
	}
</script>

{#if $selectedBacktestResult}
	<div class="selected-result-card">
		<h4 class="card-title">
			<span class="title-icon">📊</span>
			Selected Backtest Details
			<button class="close-btn" on:click={closeDetails}>×</button>
		</h4>
		
		<div class="result-stats">
			<div class="stat-item">
				<span class="stat-label">BTC Growth:</span>
				<span class="stat-value {$selectedBacktestResult.btcGrowthPercent >= 0 ? 'positive' : 'negative'}">
					{formatPercent($selectedBacktestResult.btcGrowthPercent)}
				</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">Total Trades:</span>
				<span class="stat-value">{$selectedBacktestResult.totalTrades || 0}</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">Win Rate:</span>
				<span class="stat-value">{(($selectedBacktestResult.winRate || 0) * 100).toFixed(1)}%</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">Sharpe Ratio:</span>
				<span class="stat-value">{($selectedBacktestResult.sharpeRatio || 0).toFixed(3)}</span>
			</div>
		</div>
		
		<!-- Portfolio History Chart -->
		{#if $selectedBacktestResult.portfolioHistory}
			<div class="portfolio-chart">
				<h5>Portfolio Value Over Time</h5>
				<BaseChart 
					data={{
						labels: $selectedBacktestResult.portfolioHistory.map(p => 
							new Date(p.timestamp).toLocaleDateString()
						).filter((_, i) => i % Math.ceil($selectedBacktestResult.portfolioHistory.length / 50) === 0),
						datasets: [{
							label: 'Portfolio Value (BTC)',
							data: $selectedBacktestResult.portfolioHistory
								.filter((_, i) => i % Math.ceil($selectedBacktestResult.portfolioHistory.length / 50) === 0)
								.map(p => p.totalValueBTC),
							borderColor: '#f7931a',
							backgroundColor: 'rgba(247, 147, 26, 0.1)',
							tension: 0.1
						}]
					}}
					height={300}
					config={{
						type: 'line',
						options: {
							responsive: true,
							maintainAspectRatio: false,
							scales: {
								x: {
									grid: { color: 'rgba(255,255,255,0.05)' },
									ticks: { color: '#888' }
								},
								y: {
									grid: { color: 'rgba(255,255,255,0.05)' },
									ticks: { color: '#888' }
								}
							},
							plugins: {
								legend: { display: false }
							}
						}
					}}
				/>
			</div>
		{/if}
		
		<!-- Trades Table -->
		{#if $selectedBacktestResult.trades && $selectedBacktestResult.trades.length > 0}
			<div class="trades-section">
				<h5>Trade Details ({$selectedBacktestResult.trades.length} trades)</h5>
				<div class="trades-table-container">
					<table class="trades-table">
						<thead>
							<tr>
								<th>Date</th>
								<th>Action</th>
								<th>Z-Score</th>
								<th>ETH/BTC Ratio</th>
								<th>Trade Value</th>
								<th>Fees</th>
								<th>Portfolio After</th>
							</tr>
						</thead>
						<tbody>
							{#each $selectedBacktestResult.trades as trade}
								<tr>
									<td>{new Date(trade.timestamp).toLocaleDateString()}</td>
									<td class="action-cell {trade.action.includes('BUY') ? 'buy' : 'sell'}">
										{trade.action}
									</td>
									<td>{trade.zScore.toFixed(3)}</td>
									<td>{trade.ratio.toFixed(5)}</td>
									<td>{(trade.tradeValueBTC || 0).toFixed(6)} BTC</td>
									<td>{trade.fees.toFixed(6)} BTC</td>
									<td>{trade.portfolioValueAfter.toFixed(6)} BTC</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{:else}
			<div class="no-trades">
				<p>No trades executed in this backtest</p>
			</div>
		{/if}
	</div>
{/if}

<style>
	.selected-result-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 20px;
		position: relative;
		margin-top: 24px;
	}
	
	.card-title {
		margin: 0 0 20px 0;
		color: #fff;
		font-size: 18px;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	
	.title-icon {
		font-size: 20px;
	}
	
	.close-btn {
		position: absolute;
		top: 20px;
		right: 20px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		color: #fff;
		font-size: 20px;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.close-btn:hover {
		background: rgba(255, 255, 255, 0.2);
		transform: scale(1.1);
	}
	
	.result-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 16px;
		margin: 20px 0;
		padding: 16px;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 8px;
	}
	
	.stat-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.stat-label {
		color: #888;
		font-size: 14px;
	}
	
	.stat-value {
		font-size: 16px;
		font-weight: 600;
		color: #fff;
	}
	
	.stat-value.positive {
		color: #4ade80;
	}
	
	.stat-value.negative {
		color: #ef4444;
	}
	
	.portfolio-chart {
		margin: 24px 0;
		height: 300px;
	}
	
	.portfolio-chart h5,
	.trades-section h5 {
		margin: 0 0 16px 0;
		color: #fff;
		font-size: 16px;
		font-weight: 600;
	}
	
	.trades-section {
		margin-top: 24px;
	}
	
	.trades-table-container {
		overflow-x: auto;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.2);
	}
	
	.trades-table {
		width: 100%;
		border-collapse: collapse;
	}
	
	.trades-table th {
		background: rgba(0, 0, 0, 0.4);
		padding: 12px;
		text-align: left;
		font-size: 12px;
		font-weight: 600;
		color: #ccc;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}
	
	.trades-table td {
		padding: 12px;
		font-size: 13px;
		color: #ccc;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}
	
	.trades-table tr:hover {
		background: rgba(255, 255, 255, 0.02);
	}
	
	.action-cell.buy {
		color: #4ade80;
		font-weight: 600;
	}
	
	.action-cell.sell {
		color: #ef4444;
		font-weight: 600;
	}
	
	.no-trades {
		text-align: center;
		padding: 40px;
		color: #666;
		font-size: 14px;
	}
</style>
