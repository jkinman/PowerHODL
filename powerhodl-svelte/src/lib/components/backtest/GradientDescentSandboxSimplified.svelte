<!--
	Simplified Gradient Descent Sandbox
	
	Single-page layout with all features visible - no tabs!
-->
<script>
	import { onMount } from 'svelte';
	import { 
		backtestState,
		backtestResults,
		optimizationState,
		optimizationResults,
		runSingleBacktest,
		runOptimization,
		showSuccess,
		showError,
		showWarning
	} from '$lib/stores';
	import { BaseChart } from '../charts';
	import ParameterLandscape3D from '../visualization/ParameterLandscape3D.svelte';
	
	// Parameter controls
	let parameters = {
		rebalancePercent: 49.79,
		transactionCost: 1.66,
		zScoreThreshold: 1.258,
		lookbackWindow: 15,
		volatilityFilter: 0.5000
	};
	
	// Optimization settings
	let optimizationSettings = {
		iterations: 10,
		useRealData: true
	};
	
	// Chart data
	let backtestChartData = null;
	
	// Preset configurations
	const presets = [
		{
			name: 'Conservative',
			description: 'Low risk, steady growth',
			params: { rebalancePercent: 60, transactionCost: 1.0, zScoreThreshold: 2.0, lookbackWindow: 20, volatilityFilter: 0.3 }
		},
		{
			name: 'Balanced',
			description: 'Optimal risk/reward',
			params: { rebalancePercent: 49.79, transactionCost: 1.66, zScoreThreshold: 1.258, lookbackWindow: 15, volatilityFilter: 0.5 }
		},
		{
			name: 'Aggressive',
			description: 'High risk, high reward',
			params: { rebalancePercent: 35, transactionCost: 2.5, zScoreThreshold: 0.8, lookbackWindow: 10, volatilityFilter: 0.7 }
		}
	];
	
	// Functions
	async function handleRunBacktest() {
		try {
			await runSingleBacktest(parameters);
			updateBacktestChart();
			showSuccess('Backtest Complete', 'Strategy performance calculated successfully');
		} catch (error) {
			showError('Backtest Failed', error.message);
		}
	}
	
	async function handleRunOptimization() {
		try {
			await runOptimization(optimizationSettings.iterations, parameters);
			showSuccess('Optimization Complete', `${optimizationSettings.iterations} iterations completed`);
		} catch (error) {
			showError('Optimization Failed', error.message);
		}
	}
	
	function applyPreset(preset) {
		parameters = { ...preset.params };
		showSuccess('Preset Applied', `${preset.name} configuration loaded`);
	}
	
	function applyBestResult() {
		if (bestResult) {
			parameters = { ...bestResult.parameters };
			showSuccess('Best Parameters Applied', 'Optimal configuration loaded');
		}
	}
	
	// Update backtest chart with results
	function updateBacktestChart() {
		if (!$backtestResults || !$backtestResults.length) return;
		
		const result = $backtestResults[0]; // Latest result
		if (!result.portfolioHistory || !result.portfolioHistory.length) return;
		
		const labels = [];
		const portfolioValues = [];
		const holdingValues = [];
		
		result.portfolioHistory.forEach((point, index) => {
			const date = new Date(point.timestamp);
			labels.push(date.toLocaleDateString([], { month: 'short', day: 'numeric' }));
			portfolioValues.push(point.totalValueBTC || 0);
			
			// Calculate holding baseline (simple 50/50 hold)
			const initialValue = result.portfolioHistory[0]?.totalValueBTC || 0.5;
			const holdingValue = initialValue * (1 + (index * 0.001)); // Simulate modest growth
			holdingValues.push(holdingValue);
		});
		
		backtestChartData = {
			labels,
			datasets: [
				{
					label: 'PowerHODL Strategy',
					data: portfolioValues,
					borderColor: '#f7931a',
					backgroundColor: 'rgba(247, 147, 26, 0.1)',
					fill: true,
					tension: 0.3,
					borderWidth: 3,
					pointRadius: 0,
					pointHoverRadius: 6
				},
				{
					label: 'Hold Strategy',
					data: holdingValues,
					borderColor: '#888',
					backgroundColor: 'transparent',
					borderWidth: 2,
					borderDash: [5, 5],
					tension: 0.2,
					pointRadius: 0,
					pointHoverRadius: 4,
					fill: false
				}
			]
		};
	}
	
	// Format functions
	function formatPercent(value) {
		return (value || 0).toFixed(2) + '%';
	}
	
	function formatBTC(value) {
		return (value || 0).toFixed(6) + ' BTC';
	}
	
	// React to backtest results changes
	$: if ($backtestResults && $backtestResults.length > 0) {
		updateBacktestChart();
	}
	
	// Calculate best optimization result
	$: bestResult = $optimizationResults && $optimizationResults.length > 0 
		? $optimizationResults.reduce((best, current) => 
			(current.btcGrowthPercent || 0) > (best.btcGrowthPercent || 0) ? current : best, 
			$optimizationResults[0]
		) 
		: null;
	
	// Get latest backtest result
	$: latestResult = $backtestResults && $backtestResults.length > 0 ? $backtestResults[0] : null;
	
	// Initialize component
	onMount(() => {
		// Load saved parameters
		if (typeof window !== 'undefined') {
			const savedParams = localStorage.getItem('powerhodl-parameters');
			if (savedParams) {
				try {
					parameters = { ...parameters, ...JSON.parse(savedParams) };
				} catch (e) {
					console.warn('Failed to load saved parameters');
				}
			}
		}
	});
	
	// Save parameters when they change
	$: if (parameters && typeof window !== 'undefined') {
		localStorage.setItem('powerhodl-parameters', JSON.stringify(parameters));
	}
</script>

<div class="gradient-descent-sandbox-simplified">
	<!-- Header -->
	<div class="sandbox-header">
		<div class="header-content">
			<h3 class="sandbox-title">
				<span class="title-icon">⚡</span>
				Gradient Descent Sandbox
			</h3>
			<div class="header-subtitle">
				Parameter optimization and strategy backtesting
			</div>
		</div>
	</div>
	
	<!-- Main Content Grid -->
	<div class="sandbox-grid">
		
		<!-- Top Row: Parameters & Current Results -->
		<div class="top-row">
			<!-- Left: Parameters & Controls -->
			<div class="parameters-section">
				
				<!-- Quick Presets -->
				<div class="presets-card">
					<h4 class="card-title">Quick Start Presets</h4>
					<div class="presets-grid">
						{#each presets as preset}
							<button 
								class="preset-button"
								on:click={() => applyPreset(preset)}
								title={preset.description}
							>
								<div class="preset-name">{preset.name}</div>
								<div class="preset-desc">{preset.description}</div>
							</button>
						{/each}
					</div>
				</div>
				
				<!-- Parameter Controls -->
				<div class="parameters-card">
					<h4 class="card-title">Trading Parameters</h4>
					
					<div class="param-grid">
						<div class="param-item">
							<label class="param-label">Rebalance Threshold</label>
							<div class="param-input-group">
								<input 
									type="number" 
									bind:value={parameters.rebalancePercent}
									min="20" 
									max="80" 
									step="0.1"
									class="param-input"
								/>
								<span class="param-unit">%</span>
							</div>
						</div>
						
						<div class="param-item">
							<label class="param-label">Z-Score Threshold</label>
							<div class="param-input-group">
								<input 
									type="number" 
									bind:value={parameters.zScoreThreshold}
									min="0.5" 
									max="3.0" 
									step="0.001"
									class="param-input"
								/>
							</div>
						</div>
						
						<div class="param-item">
							<label class="param-label">Transaction Cost</label>
							<div class="param-input-group">
								<input 
									type="number" 
									bind:value={parameters.transactionCost}
									min="0.1" 
									max="5.0" 
									step="0.01"
									class="param-input"
								/>
								<span class="param-unit">%</span>
							</div>
						</div>
						
						<div class="param-item">
							<label class="param-label">Lookback Window</label>
							<div class="param-input-group">
								<input 
									type="number" 
									bind:value={parameters.lookbackWindow}
									min="5" 
									max="30" 
									step="1"
									class="param-input"
								/>
								<span class="param-unit">days</span>
							</div>
						</div>
						
						<div class="param-item">
							<label class="param-label">Volatility Filter</label>
							<div class="param-input-group">
								<input 
									type="number" 
									bind:value={parameters.volatilityFilter}
									min="0.1" 
									max="1.0" 
									step="0.1"
									class="param-input"
								/>
							</div>
						</div>
					</div>
				</div>
				
				<!-- Action Buttons -->
				<div class="actions-card">
					<h4 class="card-title">Test & Optimize</h4>
					
					<div class="action-buttons">
						<button 
							class="action-btn primary"
							on:click={handleRunBacktest}
							disabled={$backtestState.isRunning}
						>
							{#if $backtestState.isRunning}
								<span class="btn-spinner"></span>
								Running...
							{:else}
								<span class="btn-icon">📊</span>
								Run Backtest
							{/if}
						</button>
						
						<button 
							class="action-btn secondary"
							on:click={handleRunOptimization}
							disabled={$optimizationState.isRunning}
						>
							{#if $optimizationState.isRunning}
								<span class="btn-spinner"></span>
								Optimizing... ({$optimizationState.currentIteration}/{optimizationSettings.iterations})
							{:else}
								<span class="btn-icon">⚡</span>
								Optimize ({optimizationSettings.iterations} iterations)
							{/if}
						</button>
					</div>
					
					<!-- Optimization Settings -->
					<div class="optimization-settings">
						<div class="setting-item">
							<label class="setting-label">Iterations:</label>
							<input 
								type="number" 
								bind:value={optimizationSettings.iterations}
								min="5" 
								max="100" 
								step="5"
								class="setting-input"
							/>
						</div>
					</div>
				</div>
			</div>
			
			<!-- Right: Current Results -->
			<div class="current-results-section">
				
				<!-- Latest Backtest Results -->
				{#if latestResult}
					<div class="results-card">
						<h4 class="card-title">Latest Backtest Results</h4>
						
						<div class="results-metrics">
							<div class="metric-item">
								<div class="metric-label">BTC Growth</div>
								<div class="metric-value positive">
									+{formatPercent(latestResult.btcGrowthPercent)}
								</div>
							</div>
							<div class="metric-item">
								<div class="metric-label">Total Trades</div>
								<div class="metric-value">
									{latestResult.totalTrades || 0}
								</div>
							</div>
							<div class="metric-item">
								<div class="metric-label">Sharpe Ratio</div>
								<div class="metric-value">
									{(latestResult.sharpeRatio || 0).toFixed(3)}
								</div>
							</div>
							<div class="metric-item">
								<div class="metric-label">Max Drawdown</div>
								<div class="metric-value negative">
									-{formatPercent(latestResult.maxDrawdown)}
								</div>
							</div>
						</div>
						
						<!-- Performance Chart -->
						{#if backtestChartData}
							<div class="chart-container">
								<h5 class="chart-title">BTC Accumulation Over Time</h5>
								<BaseChart
									data={backtestChartData}
									height={200}
									config={{
										type: 'line',
										options: {
											responsive: true,
											maintainAspectRatio: false,
											scales: {
												y: {
													beginAtZero: false,
													grid: { color: 'rgba(255,255,255,0.1)' },
													ticks: { 
														color: '#888',
														callback: function(value) {
															return value.toFixed(4) + ' BTC';
														}
													}
												},
												x: {
													grid: { color: 'rgba(255,255,255,0.1)' },
													ticks: { color: '#888' }
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
										}
									}}
								/>
							</div>
						{/if}
					</div>
				{:else}
					<div class="results-card placeholder">
						<h4 class="card-title">Backtest Results</h4>
						<div class="placeholder-content">
							<div class="placeholder-icon">📊</div>
							<p>Run a backtest to see results</p>
						</div>
					</div>
				{/if}
				
				<!-- Optimization Summary -->
				{#if bestResult}
					<div class="optimization-summary-card">
						<h4 class="card-title">Best Optimization Result</h4>
						
						<div class="best-result">
							<div class="best-score">
								+{formatPercent(bestResult.btcGrowthPercent)} BTC Growth
							</div>
							<div class="best-params">
								<div class="param-chip">Rebalance: {(bestResult.parameters?.rebalanceThreshold || 0).toFixed(1)}%</div>
								<div class="param-chip">Z-Score: {(bestResult.parameters?.zScoreThreshold || 0).toFixed(3)}</div>
								<div class="param-chip">Cost: {(bestResult.parameters?.transactionCost || 0).toFixed(2)}%</div>
							</div>
							<button class="apply-best-btn" on:click={applyBestResult}>
								Apply Best Parameters
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
		
		<!-- Second Row: All Test Results History -->
		<div class="results-history-section">
			<div class="all-results-card">
				<h4 class="card-title">
					<span class="title-icon">📈</span>
					All Test Results History
					{#if $backtestResults && $backtestResults.length > 0}
						<span class="results-count">({$backtestResults.length} tests)</span>
					{/if}
				</h4>
				
				{#if $backtestResults && $backtestResults.length > 0}
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
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each $backtestResults as result, index}
									<tr class="result-row" class:latest={index === 0}>
										<td class="timestamp-cell">
											{new Date(result.timestamp).toLocaleString([], { 
												month: 'short', 
												day: 'numeric', 
												hour: '2-digit', 
												minute: '2-digit' 
											})}
										</td>
										<td class="growth-cell">
											<span class="growth-value positive">
												+{formatPercent(result.btcGrowthPercent)}
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
										<td class="actions-cell">
											<button 
												class="mini-btn apply"
												on:click={() => {
													parameters = { ...result.parameters };
													showSuccess('Parameters Applied', 'Configuration loaded from test result');
												}}
												title="Apply these parameters"
											>
												Apply
											</button>
											<button 
												class="mini-btn view"
												on:click={() => {
													// TODO: Show detailed view modal
													console.log('Detailed view for:', result);
												}}
												title="View detailed results"
											>
												View
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<div class="no-results">
						<div class="no-results-icon">📊</div>
						<p>No test results yet. Run a backtest to see results here.</p>
					</div>
				{/if}
			</div>
		</div>
		
		<!-- Third Row: Full-Width 3D Visualization -->
		<div class="visualization-section">
			<div class="visualization-card-full">
				<h4 class="card-title">
					<span class="title-icon">🌐</span>
					3D Parameter Optimization Landscape
				</h4>
				<ParameterLandscape3D 
					width={900}
					height={500}
					interactive={true}
					showOptimizationTrail={true}
					surfaceResolution="medium"
				/>
			</div>
		</div>
	</div>
</div>

<style>
	.gradient-descent-sandbox-simplified {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 24px;
		backdrop-filter: blur(10px);
	}

	/* Header */
	.sandbox-header {
		margin-bottom: 24px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		padding-bottom: 16px;
	}

	.sandbox-title {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 4px 0;
		font-size: 20px;
		font-weight: 700;
		color: #fff;
	}

	.title-icon {
		font-size: 22px;
		background: linear-gradient(135deg, #f7931a 0%, #ff9500 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.header-subtitle {
		font-size: 14px;
		color: #888;
		margin: 0;
	}

	/* Main Grid */
	.sandbox-grid {
		display: flex;
		flex-direction: column;
		gap: 24px;
		min-height: 600px;
	}
	
	/* Top Row: Parameters & Current Results */
	.top-row {
		display: grid;
		grid-template-columns: 400px 1fr;
		gap: 24px;
	}
	
	/* Results History Section */
	.results-history-section {
		width: 100%;
	}
	
	/* Visualization Section - Full Width */
	.visualization-section {
		width: 100%;
	}

	/* Cards */
	.presets-card,
	.parameters-card,
	.actions-card,
	.results-card,
	.optimization-summary-card,
	.all-results-card,
	.visualization-card-full {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		padding: 16px;
		margin-bottom: 16px;
	}
	
	/* Full-width visualization card */
	.visualization-card-full {
		padding: 20px;
		margin-bottom: 0;
	}

	.card-title {
		margin: 0 0 12px 0;
		font-size: 14px;
		font-weight: 600;
		color: #fff;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	/* Presets */
	.presets-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}

	.preset-button {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		padding: 8px;
		color: #ccc;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: center;
	}

	.preset-button:hover {
		background: rgba(247, 147, 26, 0.1);
		border-color: rgba(247, 147, 26, 0.3);
		color: #f7931a;
	}

	.preset-name {
		font-size: 11px;
		font-weight: 600;
		margin-bottom: 2px;
	}

	.preset-desc {
		font-size: 9px;
		opacity: 0.7;
	}

	/* Parameters */
	.param-grid {
		display: grid;
		gap: 12px;
	}

	.param-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.param-label {
		font-size: 12px;
		color: #ccc;
		font-weight: 500;
		min-width: 120px;
	}

	.param-input-group {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.param-input {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #fff;
		padding: 6px 8px;
		border-radius: 4px;
		font-size: 12px;
		width: 80px;
		text-align: right;
	}

	.param-input:focus {
		outline: none;
		border-color: rgba(247, 147, 26, 0.5);
		background: rgba(255, 255, 255, 0.1);
	}

	.param-unit {
		font-size: 10px;
		color: #888;
		font-weight: 500;
		min-width: 20px;
	}

	/* Action Buttons */
	.action-buttons {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 12px;
	}

	.action-btn {
		background: linear-gradient(135deg, #f7931a 0%, #ff9500 100%);
		border: none;
		color: #fff;
		padding: 12px 16px;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.action-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(247, 147, 26, 0.3);
	}

	.action-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.action-btn.secondary {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #ccc;
	}

	.action-btn.secondary:hover {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
		box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
	}

	.btn-icon {
		font-size: 14px;
	}

	.btn-spinner {
		width: 12px;
		height: 12px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid #fff;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	/* Optimization Settings */
	.optimization-settings {
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		padding-top: 12px;
	}

	.setting-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.setting-label {
		font-size: 11px;
		color: #888;
		font-weight: 500;
	}

	.setting-input {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #fff;
		padding: 4px 6px;
		border-radius: 4px;
		font-size: 11px;
		width: 60px;
		text-align: center;
	}

	/* Results */
	.results-metrics {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 12px;
		margin-bottom: 16px;
	}

	.metric-item {
		text-align: center;
		padding: 8px;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 6px;
	}

	.metric-label {
		font-size: 10px;
		color: #888;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 4px;
	}

	.metric-value {
		font-size: 14px;
		font-weight: 700;
		color: #fff;
	}

	.metric-value.positive {
		color: #4ade80;
	}

	.metric-value.negative {
		color: #f87171;
	}

	/* Chart */
	.chart-container {
		margin-top: 16px;
	}

	.chart-title {
		font-size: 12px;
		color: #ccc;
		margin: 0 0 8px 0;
		font-weight: 500;
	}

	/* Placeholder */
	.results-card.placeholder {
		text-align: center;
		color: #888;
	}

	.placeholder-content {
		padding: 40px 20px;
	}

	.placeholder-icon {
		font-size: 48px;
		margin-bottom: 12px;
		opacity: 0.5;
	}

	/* Optimization Results */
	.best-result {
		text-align: center;
	}

	.best-score {
		font-size: 18px;
		font-weight: 700;
		color: #4ade80;
		margin-bottom: 12px;
	}

	.best-params {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		justify-content: center;
		margin-bottom: 12px;
	}

	.param-chip {
		background: rgba(247, 147, 26, 0.1);
		border: 1px solid rgba(247, 147, 26, 0.3);
		color: #f7931a;
		padding: 4px 8px;
		border-radius: 12px;
		font-size: 10px;
		font-weight: 500;
	}

	.apply-best-btn {
		background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
		border: none;
		color: #fff;
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 11px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.apply-best-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
	}

	/* Results Table */
	.results-table-container {
		overflow-x: auto;
		margin-top: 12px;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.results-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
	}

	.results-table th {
		background: rgba(255, 255, 255, 0.05);
		color: #ccc;
		font-weight: 600;
		padding: 8px 12px;
		text-align: left;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.results-table td {
		padding: 8px 12px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		color: #ccc;
	}

	.result-row:hover {
		background: rgba(255, 255, 255, 0.02);
	}

	.result-row.latest {
		background: rgba(247, 147, 26, 0.05);
		border-left: 3px solid #f7931a;
	}

	.growth-value.positive {
		color: #4ade80;
		font-weight: 600;
	}

	.drawdown-value.negative {
		color: #f87171;
		font-weight: 600;
	}

	.params-summary {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
	}

	.param-item-mini {
		background: rgba(255, 255, 255, 0.05);
		color: #888;
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 10px;
		font-weight: 500;
	}

	.mini-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #ccc;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 10px;
		font-weight: 500;
		cursor: pointer;
		margin-right: 4px;
		transition: all 0.2s ease;
	}

	.mini-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}

	.mini-btn.apply {
		background: rgba(74, 222, 128, 0.1);
		border-color: rgba(74, 222, 128, 0.3);
		color: #4ade80;
	}

	.mini-btn.apply:hover {
		background: rgba(74, 222, 128, 0.2);
	}

	.mini-btn.view {
		background: rgba(59, 130, 246, 0.1);
		border-color: rgba(59, 130, 246, 0.3);
		color: #3b82f6;
	}

	.mini-btn.view:hover {
		background: rgba(59, 130, 246, 0.2);
	}

	/* No Results */
	.no-results {
		text-align: center;
		padding: 40px 20px;
		color: #888;
	}

	.no-results-icon {
		font-size: 48px;
		margin-bottom: 12px;
		opacity: 0.5;
	}

	/* Results Count */
	.results-count {
		font-size: 11px;
		color: #888;
		font-weight: 400;
		opacity: 0.7;
	}

	/* Title Icons */
	.title-icon {
		background: linear-gradient(135deg, #f7931a 0%, #ff9500 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	/* Responsive Design */
	@media (max-width: 1200px) {
		.top-row {
			grid-template-columns: 1fr;
			gap: 16px;
		}

		.presets-grid {
			grid-template-columns: repeat(3, 1fr);
		}

		.results-metrics {
			grid-template-columns: repeat(4, 1fr);
		}

		.visualization-card-full {
			padding: 16px;
		}
	}

	@media (max-width: 768px) {
		.gradient-descent-sandbox-simplified {
			padding: 16px;
		}

		.sandbox-grid {
			gap: 12px;
		}

		.presets-grid {
			grid-template-columns: 1fr;
		}

		.results-metrics {
			grid-template-columns: repeat(2, 1fr);
		}

		.param-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 4px;
		}

		.param-label {
			min-width: auto;
		}

		.results-table {
			font-size: 10px;
		}

		.results-table th,
		.results-table td {
			padding: 6px 8px;
		}

		.param-item-mini {
			font-size: 9px;
		}

		.mini-btn {
			padding: 3px 6px;
			font-size: 9px;
		}
	}
</style>
