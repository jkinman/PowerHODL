<!--
	Simplified Gradient Descent Sandbox
	
	Single-page layout with all features visible - no tabs!
-->
<script>
	import { onMount } from 'svelte';
	import { 
		backtestState,
		backtestResults,
		selectedBacktestResult,
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
	import ParameterConfiguration from './ParameterConfiguration.svelte';
	import BacktestResultsTable from './BacktestResultsTable.svelte';
	import BacktestResultChart from './BacktestResultChart.svelte';
	import BacktestResultDetails from './BacktestResultDetails.svelte';
	import { generateChartData, parseTimestamp } from '$lib/utils/chartUtils.js';
	
	// API URL constant for environment-specific endpoints
	const __API_URL__ = import.meta.env.DEV 
		? 'http://localhost:9001' 
		: (import.meta.env.VITE_API_URL || 'https://powerhodl-8l6qjbg2a-joel-kinmans-projects.vercel.app');
	
	// Parameter controls
	let parameters = {
		rebalancePercent: 49.79,
		transactionCost: 1.66,
		zScoreThreshold: 1.258,
		lookbackWindow: 15,
		volatilityFilter: 0.5000,
		tradeFrequencyMinutes: 120 // 2 hours default
	};
	
	// Optimization settings
	let optimizationSettings = {
		iterations: 10,
		useRealData: true
	};
	
	// Data selection settings - DEFAULT TO REAL DATA
	let dataSettings = {
		useRealData: true,
		backtestPeriod: 'ALL',
		dataSource: 'database' // 'database', 'cached', 'simulated'
	};
	
	// Handle parameter updates from components
	function handleParameterUpdate(event) {
		const { parameters: newParams, dataSource: newDataSource, backtestPeriod: newPeriod } = event.detail;
		if (newParams) parameters = newParams;
		if (newDataSource !== undefined) dataSettings.dataSource = newDataSource;
		if (newPeriod !== undefined) dataSettings.backtestPeriod = newPeriod;
	}
	
	// Available data periods
	const dataPeriods = [
		{ value: '30', label: '30 Days', description: 'Short-term analysis' },
		{ value: '90', label: '3 Months', description: 'Quarter analysis' },
		{ value: '180', label: '6 Months', description: 'Medium-term trends' },
		{ value: '365', label: '1 Year', description: 'Full market cycle' },
		{ value: '730', label: '2 Years', description: 'Long-term analysis' },
		{ value: 'ALL', label: 'All Available', description: 'Complete dataset' }
	];
	
	// Data source options - EMPHASIZE REAL DATA
	let dataSources = [
		{ value: 'database', label: '🔴 LIVE Real Market Data', description: 'Current exchange data from database', available: true },
		{ value: 'cached', label: '📦 Cached Historical Data', description: 'Stored historical exchange data', available: true },
		{ value: 'simulated', label: '🧪 Simulated Test Data', description: 'Generated scenarios for testing', available: true }
	];
	
	// Check data availability on mount
	onMount(async () => {
		try {
			// Check if database has data
			const response = await fetch(`${__API_URL__}/api/historical?days=1`);
			if (!response.ok) {
				dataSources[0].available = false;
				dataSources[0].description = 'Database unavailable';
				// If database is not available, default to cached data
				if (dataSettings.dataSource === 'database') {
					dataSettings.dataSource = 'cached';
				}
			}
		} catch (error) {
			console.warn('Could not check data availability:', error);
			dataSources[0].available = false;
			dataSources[0].description = 'Database connection failed';
			if (dataSettings.dataSource === 'database') {
				dataSettings.dataSource = 'cached';
			}
		}
	});
	
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
			// Combine parameters with data settings - ALWAYS USE REAL DATA
			const backtestParams = {
				...parameters,
				backtestPeriod: dataSettings.backtestPeriod,
				useRealData: dataSettings.dataSource === 'database' // Use database = real data
			};
			
			console.log('🚀 Running backtest with real data:', backtestParams.useRealData);
			
			await runSingleBacktest(backtestParams);
			
			// Update chart asynchronously without blocking
			updateBacktestChart();
			showSuccess('Backtest Complete', `Strategy tested on ${dataSettings.backtestPeriod === 'ALL' ? 'all available' : dataSettings.backtestPeriod + ' days of'} ${dataSettings.dataSource} data`);
		} catch (error) {
			showError('Backtest Failed', error.message);
		}
	}
	
	async function handleRunOptimization() {
		try {
			// Combine parameters with data settings for optimization - ALWAYS USE REAL DATA
			const optimizationParams = {
				...parameters,
				backtestPeriod: dataSettings.backtestPeriod,
				useRealData: dataSettings.dataSource === 'database' // Use database = real data
			};
			
			console.log('🔄 Running optimization with real data:', optimizationParams.useRealData);
			
			await runOptimization(optimizationSettings.iterations, optimizationParams);
			showSuccess('Optimization Complete', `${optimizationSettings.iterations} iterations completed on ${dataSettings.backtestPeriod === 'ALL' ? 'all available' : dataSettings.backtestPeriod + ' days of'} ${dataSettings.dataSource} data`);
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
	
	// Update backtest chart with results using unified chart utilities
	async function updateBacktestChart() {
		if (!$backtestResults || !$backtestResults.length) return;
		
		const result = $backtestResults[0]; // Latest result
		if (!result.portfolioHistory || !result.portfolioHistory.length) return;
		
		// Yield to UI thread before processing
		await new Promise(resolve => setTimeout(resolve, 10));
		
		// Use unified chart data generation
		const chartInfo = generateChartData(result.portfolioHistory, 'backtest');
		
		const portfolioValues = [];
		const holdingValues = [];
		const initialBTCValue = result.portfolioHistory[0]?.totalValueBTC || 0.5;
		
		// Process data in chunks to avoid blocking UI
		const chunkSize = 1000;
		for (let i = 0; i < result.portfolioHistory.length; i += chunkSize) {
			const chunk = result.portfolioHistory.slice(i, i + chunkSize);
			
			chunk.forEach((point) => {
				portfolioValues.push(point.totalValueBTC || 0);
				// Hold strategy = straight line (no trades, just hold initial BTC allocation)
				holdingValues.push(initialBTCValue); // Constant - no growth from trading
			});
			
			// Yield to UI thread after each chunk
			if (i + chunkSize < result.portfolioHistory.length) {
				await new Promise(resolve => setTimeout(resolve, 5));
			}
		}
		
		backtestChartData = {
			labels: chartInfo.labels,
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
					label: 'Hold Baseline (No Trading)',
					data: holdingValues,
					borderColor: '#888',
					backgroundColor: 'transparent',
					borderWidth: 2,
					borderDash: [5, 5],
					tension: 0,
					pointRadius: 0,
					pointHoverRadius: 4,
					fill: false
				}
			]
		};
	}
	
	// Format functions
	function formatPercent(value) {
		const num = value || 0;
		const sign = num >= 0 ? '+' : '';
		return sign + num.toFixed(2) + '%';
	}
	
	function formatBTC(value) {
		return (value || 0).toFixed(6) + ' BTC';
	}
	
	// React to backtest results changes
	$: if ($backtestResults && $backtestResults.length > 0) {
		// Run async without blocking
		updateBacktestChart();
	}
	
	// Function to apply parameters from a result
	function applyParameters(result) {
		if (result && result.parameters) {
			parameters = { ...result.parameters };
			showSuccess('Parameters Applied', 'The selected parameters have been applied to the form');
		}
	}
	
	// Function to save parameters to database
	async function saveParameters(result) {
		if (!result || !result.parameters) return;
		
		const name = prompt('Enter a name for these parameters:', 
			`Optimal ${new Date().toLocaleDateString()} - ${result.btcGrowthPercent.toFixed(2)}% BTC`);
		
		if (!name) return;
		
		const description = prompt('Enter a description (optional):', 
			`Z-Score: ${result.parameters.zScoreThreshold}, Rebalance: ${result.parameters.rebalancePercent}%, Trade Freq: ${result.parameters.tradeFrequencyMinutes || 720}min`);
		
		try {
			const response = await fetch(`${__API_URL__}/api/parameters`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					parameters: result.parameters,
					performance: {
						btcGrowthPercent: result.btcGrowthPercent,
						tokenAccumulationPercent: result.tokenAccumulationPercent,
						totalTrades: result.totalTrades,
						sharpeRatio: result.sharpeRatio,
						maxDrawdown: result.maxDrawdown,
						winRate: result.winRate
					},
					name,
					description: description || ''
				})
			});
			
			if (response.ok) {
				showSuccess('Parameters Saved', `Successfully saved "${name}" to database`);
			} else {
				const error = await response.json();
				showError('Save Failed', error.error || 'Failed to save parameters');
			}
		} catch (error) {
			showError('Save Failed', error.message);
		}
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
				<span class="title-icon">🧠</span>
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
				
				<!-- Combined Configuration Card -->
				<div class="config-card">
					<div class="config-header">
						<h4 class="card-title">Test Configuration</h4>
						<div class="preset-tabs">
							{#each presets as preset}
								<button 
									class="preset-tab"
									class:active={false}
									on:click={() => applyPreset(preset)}
									title={preset.description}
								>
									{preset.name}
								</button>
							{/each}
						</div>
					</div>
					
					<div class="config-content">
						<!-- Parameters Section -->
						<div class="params-section">
							<h5 class="section-subtitle">Trading Parameters</h5>
							<div class="param-grid">
								<div class="param-row">
									<label class="param-label">Rebalance</label>
									<div class="param-input-wrapper">
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
								
								<div class="param-row">
									<label class="param-label">Z-Score</label>
									<div class="param-input-wrapper">
										<input 
											type="number" 
											bind:value={parameters.zScoreThreshold}
											min="0.5" 
											max="3.0" 
											step="0.001"
											class="param-input"
										/>
										<span class="param-unit"></span>
									</div>
								</div>
								
								<div class="param-row">
									<label class="param-label">Cost</label>
									<div class="param-input-wrapper">
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
								
								<div class="param-row">
									<label class="param-label">Lookback</label>
									<div class="param-input-wrapper">
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
								
								<div class="param-row">
									<label class="param-label">Volatility</label>
									<div class="param-input-wrapper">
										<input 
											type="number" 
											bind:value={parameters.volatilityFilter}
											min="0.1" 
											max="1.0" 
											step="0.1"
											class="param-input"
										/>
										<span class="param-unit"></span>
									</div>
								</div>
								
								<div class="param-row">
									<label class="param-label">Frequency</label>
									<div class="param-input-wrapper">
										<input 
											type="number" 
											bind:value={parameters.tradeFrequencyMinutes}
											min="60"
											max="1440" 
											step="60"
											class="param-input"
										/>
										<span class="param-unit">min</span>
									</div>
								</div>
							</div>
						</div>
						
						<!-- Data Selection Section -->
						<div class="data-section">
							<h5 class="section-subtitle">Data Selection</h5>
							
							<div class="data-source-compact">
								<select bind:value={dataSettings.dataSource} class="data-source-select">
									{#each dataSources as source}
										<option value={source.value} disabled={!source.available}>
											{source.label} - {source.description}
										</option>
									{/each}
								</select>
							</div>
							
							<div class="period-buttons">
								{#each dataPeriods as period}
									<button 
										class="period-btn"
										class:active={dataSettings.backtestPeriod === period.value}
										on:click={() => dataSettings.backtestPeriod = period.value}
										title={period.description}
									>
										{period.label}
									</button>
								{/each}
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
								<div class="metric-value {latestResult.btcGrowthPercent >= 0 ? 'positive' : 'negative'}">
									{formatPercent(latestResult.btcGrowthPercent)}
								</div>
								{#if latestResult.tokenAccumulationPercent !== undefined}
									<div class="metric-sublabel">
										Token Accumulation: {formatPercent(latestResult.tokenAccumulationPercent)}
									</div>
								{/if}
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
								{formatPercent(bestResult.btcGrowthPercent)} BTC Growth
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
									<tr 
										class="result-row clickable" 
										class:latest={index === 0}
										class:selected={$selectedBacktestResult === result}
										on:click={() => {
											selectedBacktestResult.set(result);
										}}
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
										<td class="actions-cell">
											<button 
												class="mini-btn apply"
												on:click={() => applyParameters(result)}
												title="Apply these parameters"
											>
												Apply
											</button>
											<button 
												class="mini-btn view"
												on:click={() => {
													selectedBacktestResult.set(result); // Set the selected result
												}}
												title="View trade signals"
											>
												View
											</button>
											
											{#if result.btcGrowthPercent > 0}
												<button 
													class="mini-btn save"
													on:click={() => saveParameters(result)}
													title="Save these parameters"
												>
													💾 Save
												</button>
											{/if}
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
		
		<!-- Selected Result Details -->
		<BacktestResultDetails />
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
	
	/* Combined Configuration Card */
	.config-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		overflow: hidden;
		margin-bottom: 16px;
	}
	
	.config-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px;
		background: rgba(0, 0, 0, 0.2);
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}
	
	.preset-tabs {
		display: flex;
		gap: 4px;
	}
	
	.preset-tab {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		padding: 6px 12px;
		font-size: 12px;
		color: #999;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.preset-tab:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}
	
	.preset-tab.active {
		background: rgba(247, 147, 26, 0.2);
		border-color: rgba(247, 147, 26, 0.4);
		color: #f7931a;
	}
	
	.config-content {
		padding: 12px 16px 16px 16px;
	}
	
	.section-subtitle {
		font-size: 13px;
		font-weight: 600;
		color: #888;
		margin: 0 0 12px 0;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	
	/* Parameters Section */
	.params-section {
		margin-bottom: 20px;
		width: 100%;
	}
	
	.param-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 12px 16px;
		width: 100%;
	}
	
	.param-row {
		display: flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
	}
	
	.param-label {
		font-size: 11px;
		color: #999;
		font-weight: 500;
		flex: 0 0 auto;
		min-width: 60px;
		text-align: left;
	}
	
	.param-input-wrapper {
		display: flex;
		align-items: center;
		flex: 1;
		justify-content: flex-end;
		min-width: 0;
	}
	
	.param-input {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		padding: 4px 6px;
		color: #fff;
		font-size: 12px;
		width: 60px;
		text-align: right;
		flex-shrink: 0;
	}
	
	.param-input:focus {
		outline: none;
		border-color: rgba(247, 147, 26, 0.5);
		background: rgba(255, 255, 255, 0.08);
	}
	
	.param-unit {
		font-size: 10px;
		color: #666;
		margin-left: 4px;
		width: 20px;
		flex-shrink: 0;
		text-align: left;
	}
	
	/* Data Section */
	.data-section {
		border-top: 1px solid rgba(255, 255, 255, 0.05);
		padding-top: 16px;
	}
	
	.data-source-select {
		width: 100%;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		padding: 8px 12px;
		color: #fff;
		font-size: 13px;
		margin-bottom: 12px;
		cursor: pointer;
	}
	
	.data-source-select:focus {
		outline: none;
		border-color: rgba(247, 147, 26, 0.5);
	}
	
	.data-source-select option {
		background: #1a1a1a;
		color: #fff;
	}
	
	.period-buttons {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}
	
	.period-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		padding: 8px 12px;
		font-size: 12px;
		color: #999;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}
	
	.period-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
	}
	
	.period-btn.active {
		background: rgba(247, 147, 26, 0.2);
		border-color: rgba(247, 147, 26, 0.4);
		color: #f7931a;
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
		grid-template-columns: minmax(380px, 420px) 1fr;
		gap: 24px;
	}
	
	.parameters-section {
		min-width: 0;
		overflow: visible;
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

	/* Data Selection Styles */
	.data-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 16px;
		margin-bottom: 16px;
	}

	.data-controls {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.data-source-selector {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.radio-control {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 8px;
		border-radius: 6px;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.radio-control:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.radio-control input[type="radio"] {
		margin-top: 2px;
		accent-color: #f7931a;
	}

	.radio-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.source-label {
		font-size: 12px;
		font-weight: 600;
		color: #fff;
	}

	.source-desc {
		font-size: 10px;
		color: #888;
	}

	.period-selector {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.period-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #ccc;
		padding: 6px 12px;
		border-radius: 6px;
		font-size: 10px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.period-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		border-color: rgba(255, 255, 255, 0.2);
	}

	.period-btn.active {
		background: rgba(247, 147, 26, 0.2);
		border-color: #f7931a;
		color: #f7931a;
	}

	.period-label {
		display: block;
	}

	.data-summary {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 6px;
		padding: 8px 12px;
		border-left: 3px solid #f7931a;
	}

	.summary-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.summary-label {
		font-size: 10px;
		font-weight: 600;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.summary-value {
		font-size: 11px;
		color: #fff;
		font-weight: 500;
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
	
	.metric-sublabel {
		font-size: 9px;
		color: #666;
		margin-top: 4px;
		font-weight: 400;
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
	
	.mini-btn.save {
		background: rgba(92, 184, 92, 0.1);
		border-color: rgba(92, 184, 92, 0.3);
		color: #5cb85c;
		margin-left: 0.5rem;
	}

	.mini-btn.save:hover {
		background: rgba(92, 184, 92, 0.2);
	}
	
	/* Accordion Cell */
	.accordion-cell {
		padding: 0 !important;
		background: rgba(0, 0, 0, 0.2);
		border-top: 1px solid rgba(255, 255, 255, 0.05);
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
