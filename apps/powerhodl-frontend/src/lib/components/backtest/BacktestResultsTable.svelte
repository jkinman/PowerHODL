<script>
	import { createEventDispatcher } from 'svelte';
	import { selectedBacktestResult } from '$lib/stores';
	
	export let results = [];
	export let showActions = true;
	
	const dispatch = createEventDispatcher();
	
	let expandedResultIndex = null;
	
	function formatPercent(value) {
		if (value === null || value === undefined) return '0.00%';
		const sign = value >= 0 ? '+' : '';
		return `${sign}${value.toFixed(2)}%`;
	}
	
	function handleRowClick(result, index) {
		selectedBacktestResult.set(result);
		expandedResultIndex = expandedResultIndex === index ? null : index;
		dispatch('select', result);
	}
	
	function applyParameters(result) {
		dispatch('apply', result);
	}
	
	function saveParameters(result) {
		dispatch('save', result);
	}
</script>

<div class="results-table-container">
	<table class="results-table">
		<thead>
			<tr>
				<th>Timestamp</th>
				<th>BTC Growth</th>
				<th>Trades</th>
				<th>Sharpe Ratio</th>
				<th>Max Drawdown</th>
				<th>Parameters</th>
				{#if showActions}
					<th>Actions</th>
				{/if}
			</tr>
		</thead>
		<tbody>
			{#each results as result, index}
				<tr 
					class="result-row clickable" 
					class:latest={index === 0}
					class:selected={$selectedBacktestResult === result}
					on:click={() => handleRowClick(result, index)}
				>
					<td class="timestamp-cell">
						{new Date(result.timestamp).toLocaleString([], { 
							month: 'short', 
							day: 'numeric', 
							hour: '2-digit', 
							minute: '2-digit' 
						})}
					</td>
					<td class="growth-cell">
						<span class="growth-value {result.btcGrowthPercent >= 0 ? 'positive' : 'negative'}">
							{formatPercent(result.btcGrowthPercent)}
						</span>
					</td>
					<td class="trades-cell">
						{result.totalTrades || 0}
					</td>
					<td class="sharpe-cell">
						{(result.sharpeRatio || 0).toFixed(3)}
					</td>
					<td class="drawdown-cell">
						<span class="drawdown-value negative">
							-{formatPercent(result.maxDrawdown)}
						</span>
					</td>
					<td class="params-cell">
						<div class="params-summary">
							<span class="param-item-mini">R:{(result.parameters?.rebalancePercent || 0).toFixed(1)}%</span>
							<span class="param-item-mini">Z:{(result.parameters?.zScoreThreshold || 0).toFixed(2)}</span>
							<span class="param-item-mini">C:{(result.parameters?.transactionCost || 0).toFixed(2)}%</span>
						</div>
					</td>
					{#if showActions}
						<td class="actions-cell">
							<button 
								class="mini-btn apply"
								on:click|stopPropagation={() => applyParameters(result)}
								title="Apply these parameters"
							>
								Apply
							</button>
							<button 
								class="mini-btn view"
								on:click|stopPropagation={() => {
									expandedResultIndex = expandedResultIndex === index ? null : index;
								}}
								title="View trade signals"
							>
								{expandedResultIndex === index ? 'Hide' : 'View'}
							</button>
							
							{#if result.btcGrowthPercent > 0}
								<button 
									class="mini-btn save"
									on:click|stopPropagation={() => saveParameters(result)}
									title="Save these parameters"
								>
									💾 Save
								</button>
							{/if}
						</td>
					{/if}
				</tr>
				{#if expandedResultIndex === index && result.trades}
					<tr>
						<td colspan="{showActions ? 7 : 6}" class="accordion-cell">
							<div class="trades-detail">
								<h5>Trade Details ({result.trades.length} trades)</h5>
								<div class="trades-table-wrapper">
									<table class="trades-table">
										<thead>
											<tr>
												<th>Date</th>
												<th>Action</th>
												<th>Z-Score</th>
												<th>Ratio</th>
												<th>Trade Value</th>
												<th>Fees</th>
											</tr>
										</thead>
										<tbody>
											{#each result.trades as trade}
												<tr>
													<td>{new Date(trade.timestamp).toLocaleDateString()}</td>
													<td class="action-cell {trade.action.includes('BUY') ? 'buy' : 'sell'}">
														{trade.action}
													</td>
													<td>{trade.zScore.toFixed(3)}</td>
													<td>{trade.ratio.toFixed(5)}</td>
													<td>{(trade.tradeValueBTC || 0).toFixed(6)} BTC</td>
													<td>{trade.fees.toFixed(6)} BTC</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						</td>
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>
</div>

<style>
	.results-table-container {
		overflow-x: auto;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.2);
	}
	
	.results-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
	}
	
	.results-table th {
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
	
	.results-table td {
		padding: 8px 12px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		color: #ccc;
	}
	
	.result-row {
		transition: background 0.2s ease;
	}
	
	.result-row:hover {
		background: rgba(255, 255, 255, 0.02);
	}
	
	.result-row.latest {
		background: rgba(247, 147, 26, 0.05);
		border-left: 3px solid #f7931a;
	}
	
	.result-row.clickable {
		cursor: pointer;
	}
	
	.result-row.selected {
		background: rgba(247, 147, 26, 0.15) !important;
		border-left: 3px solid #f7931a;
	}
	
	.growth-value.positive {
		color: #4ade80;
		font-weight: 600;
	}
	
	.growth-value.negative {
		color: #ef4444;
		font-weight: 600;
	}
	
	.drawdown-value.negative {
		color: #ef4444;
	}
	
	.params-summary {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	
	.param-item-mini {
		background: rgba(255, 255, 255, 0.05);
		padding: 2px 6px;
		border-radius: 3px;
		font-size: 11px;
		color: #999;
		white-space: nowrap;
	}
	
	.actions-cell {
		display: flex;
		gap: 4px;
		justify-content: flex-end;
	}
	
	.mini-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		color: #ccc;
		font-size: 11px;
		padding: 4px 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}
	
	.mini-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}
	
	.mini-btn.apply {
		background: rgba(247, 147, 26, 0.2);
		border-color: rgba(247, 147, 26, 0.5);
		color: #f7931a;
	}
	
	.mini-btn.apply:hover {
		background: rgba(247, 147, 26, 0.3);
	}
	
	.mini-btn.view {
		background: rgba(59, 130, 246, 0.2);
		border-color: rgba(59, 130, 246, 0.5);
		color: #3b82f6;
	}
	
	.mini-btn.view:hover {
		background: rgba(59, 130, 246, 0.3);
	}
	
	.mini-btn.save {
		background: rgba(76, 175, 80, 0.2);
		border-color: rgba(76, 175, 80, 0.5);
		color: #4ade80;
	}
	
	.mini-btn.save:hover {
		background: rgba(76, 175, 80, 0.3);
	}
	
	.accordion-cell {
		padding: 0;
		background: rgba(0, 0, 0, 0.3);
	}
	
	.trades-detail {
		padding: 16px;
	}
	
	.trades-detail h5 {
		margin: 0 0 12px 0;
		color: #fff;
		font-size: 14px;
	}
	
	.trades-table-wrapper {
		overflow-x: auto;
	}
	
	.trades-table {
		width: 100%;
		font-size: 12px;
	}
	
	.trades-table th {
		background: rgba(0, 0, 0, 0.2);
		padding: 8px;
		text-align: left;
		font-weight: 600;
		color: #999;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}
	
	.trades-table td {
		padding: 8px;
		color: #ccc;
		border-bottom: 1px solid rgba(255, 255, 255, 0.02);
	}
	
	.action-cell.buy {
		color: #4ade80;
		font-weight: 600;
	}
	
	.action-cell.sell {
		color: #ef4444;
		font-weight: 600;
	}
</style>
