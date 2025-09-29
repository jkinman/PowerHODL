<script>
	import { onMount } from 'svelte';
	import { showSuccess, showError, showWarning } from '$lib/stores';
	
	const __API_URL__ = import.meta.env.DEV 
		? 'http://localhost:9001' 
		: (import.meta.env.VITE_API_URL || 'https://powerhodl-8l6qjbg2a-joel-kinmans-projects.vercel.app');
		
	let parameters = [];
	let activeParameterId = null;
	let loading = true;
	let selectedParameter = null;
	
	onMount(() => {
		loadParameters();
	});
	
	async function loadParameters() {
		try {
			loading = true;
			
			// Get all parameters
			const response = await fetch(`${__API_URL__}/api/parameters`);
			if (!response.ok) throw new Error('Failed to load parameters');
			
			const data = await response.json();
			parameters = data.data || [];
			
			// Get active parameters
			const activeResponse = await fetch(`${__API_URL__}/api/parameters?action=active`);
			if (activeResponse.ok) {
				const activeData = await activeResponse.json();
				activeParameterId = activeData.data?.id;
			}
			
		} catch (error) {
			showError('Load Failed', error.message);
		} finally {
			loading = false;
		}
	}
	
	async function activateParameters(param) {
		try {
			const confirmed = confirm(`Activate "${param.name}"?\n\nThis will change the live trading parameters.`);
			if (!confirmed) return;
			
			const response = await fetch(`${__API_URL__}/api/parameters`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ parameterId: param.id })
			});
			
			if (response.ok) {
				showSuccess('Parameters Activated', `"${param.name}" is now active`);
				activeParameterId = param.id;
				await loadParameters();
			} else {
				const error = await response.json();
				showError('Activation Failed', error.error || 'Failed to activate parameters');
			}
		} catch (error) {
			showError('Activation Failed', error.message);
		}
	}
	
	function formatDate(dateString) {
		return new Date(dateString).toLocaleDateString();
	}
	
	function formatPercent(value) {
		const sign = value >= 0 ? '+' : '';
		return sign + (value || 0).toFixed(2) + '%';
	}
</script>

<div class="parameters-manager">
	<div class="header">
		<h2>📊 Algorithm Parameters</h2>
		<button class="btn-refresh" on:click={loadParameters} disabled={loading}>
			🔄 Refresh
		</button>
	</div>
	
	{#if loading}
		<div class="loading">Loading parameters...</div>
	{:else if parameters.length === 0}
		<div class="empty">
			<p>No saved parameters yet.</p>
			<p>Run backtests and save successful parameters to see them here.</p>
		</div>
	{:else}
		<div class="parameters-grid">
			{#each parameters as param}
				<div class="parameter-card" class:active={param.id === activeParameterId}>
					<div class="card-header">
						<h3>{param.name}</h3>
						{#if param.id === activeParameterId}
							<span class="badge active">ACTIVE</span>
						{/if}
						{#if param.is_default}
							<span class="badge default">DEFAULT</span>
						{/if}
					</div>
					
					<div class="card-content">
						{#if param.description}
							<p class="description">{param.description}</p>
						{/if}
						
						<div class="metrics">
							<div class="metric">
								<span class="label">BTC Growth:</span>
								<span class="value" class:positive={param.backtest_performance?.btcGrowthPercent > 0}>
									{formatPercent(param.backtest_performance?.btcGrowthPercent)}
								</span>
							</div>
							<div class="metric">
								<span class="label">Trades:</span>
								<span class="value">{param.backtest_performance?.totalTrades || 0}</span>
							</div>
							<div class="metric">
								<span class="label">Sharpe:</span>
								<span class="value">{(param.backtest_performance?.sharpeRatio || 0).toFixed(3)}</span>
							</div>
						</div>
						
						<div class="params-grid">
							<div class="param">
								<span class="param-label">Z-Score:</span>
								<span class="param-value">{param.z_score_threshold || 0}</span>
							</div>
							<div class="param">
								<span class="param-label">Rebalance:</span>
								<span class="param-value">{param.rebalance_percent || 0}%</span>
							</div>
							<div class="param">
								<span class="param-label">Trade Freq:</span>
								<span class="param-value">{param.trade_frequency_minutes || 720}min</span>
							</div>
							<div class="param">
								<span class="param-label">Lookback:</span>
								<span class="param-value">{param.lookback_window || 15}d</span>
							</div>
						</div>
						
						<div class="card-footer">
							<span class="created">Created {formatDate(param.created_at)}</span>
							{#if param.id !== activeParameterId}
								<button class="btn-activate" on:click={() => activateParameters(param)}>
									Activate
								</button>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.parameters-manager {
		padding: 1rem;
		max-width: 1200px;
		margin: 0 auto;
	}
	
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}
	
	.header h2 {
		margin: 0;
		color: #f0f0f0;
	}
	
	.btn-refresh {
		padding: 0.5rem 1rem;
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.3);
		color: #3b82f6;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.btn-refresh:hover:not(:disabled) {
		background: rgba(59, 130, 246, 0.2);
	}
	
	.btn-refresh:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.loading, .empty {
		text-align: center;
		padding: 3rem;
		color: #999;
	}
	
	.parameters-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1.5rem;
	}
	
	.parameter-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		overflow: hidden;
		transition: all 0.3s ease;
	}
	
	.parameter-card:hover {
		border-color: rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.03);
	}
	
	.parameter-card.active {
		border-color: rgba(74, 222, 128, 0.5);
		background: rgba(74, 222, 128, 0.05);
	}
	
	.card-header {
		padding: 1rem;
		background: rgba(0, 0, 0, 0.2);
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.card-header h3 {
		margin: 0;
		font-size: 1.1rem;
		color: #f0f0f0;
		flex: 1;
	}
	
	.badge {
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}
	
	.badge.active {
		background: rgba(74, 222, 128, 0.2);
		color: #4ade80;
		border: 1px solid rgba(74, 222, 128, 0.3);
	}
	
	.badge.default {
		background: rgba(59, 130, 246, 0.2);
		color: #3b82f6;
		border: 1px solid rgba(59, 130, 246, 0.3);
	}
	
	.card-content {
		padding: 1rem;
	}
	
	.description {
		margin: 0 0 1rem 0;
		color: #999;
		font-size: 0.9rem;
	}
	
	.metrics {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}
	
	.metric {
		flex: 1;
	}
	
	.metric .label {
		display: block;
		font-size: 0.8rem;
		color: #666;
		margin-bottom: 0.2rem;
	}
	
	.metric .value {
		font-size: 1.1rem;
		font-weight: 600;
		color: #f0f0f0;
	}
	
	.metric .value.positive {
		color: #4ade80;
	}
	
	.params-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	
	.param {
		display: flex;
		justify-content: space-between;
		padding: 0.3rem 0;
	}
	
	.param-label {
		font-size: 0.85rem;
		color: #999;
	}
	
	.param-value {
		font-weight: 500;
		color: #f0f0f0;
	}
	
	.card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}
	
	.created {
		font-size: 0.8rem;
		color: #666;
	}
	
	.btn-activate {
		padding: 0.4rem 1rem;
		background: rgba(74, 222, 128, 0.1);
		border: 1px solid rgba(74, 222, 128, 0.3);
		color: #4ade80;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.9rem;
	}
	
	.btn-activate:hover {
		background: rgba(74, 222, 128, 0.2);
	}
</style>
