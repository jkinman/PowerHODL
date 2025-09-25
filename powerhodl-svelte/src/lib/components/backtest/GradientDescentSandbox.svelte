<!--
	Gradient Descent Sandbox Component
	
	Interactive parameter optimization and backtesting interface
-->
<script>
	import { onMount } from 'svelte';
	import { 
		backtestState,
		backtestResults,
		optimizationState,
		optimizationResults,
		visualizationData,
		runSingleBacktest,
		runOptimization,
		generate3DSurface,
		showSuccess,
		showError,
		showWarning
	} from '$lib/stores';
	import { BaseChart } from '../charts';
	import ParameterLandscape3D from '../visualization/ParameterLandscape3D.svelte';
	
	// Local component state
	let activeTab = 'parameters';
	let isAdvancedMode = false;
	
	// Parameter controls
	let parameters = {
		rebalanceThreshold: 49.79,
		transactionCost: 1.66,
		zScoreThreshold: 1.258,
		lookbackWindow: 15,
		volatilityFilter: 0.5000
	};
	
	// Optimization settings
	let optimizationSettings = {
		iterations: 50,
		useRealData: true,
		maxIterations: 1000,
		convergenceThreshold: 0.001
	};
	
	// Visualization settings
	let visualSettings = {
		show3DSurface: false,
		surfaceResolution: 'medium',
		showOptimizationTrail: true,
		chartType: 'performance'
	};
	
	// Preset configurations
	const presets = [
		{
			name: 'Conservative',
			description: 'Low risk, steady accumulation',
			params: {
				rebalanceThreshold: 45.0,
				transactionCost: 2.0,
				zScoreThreshold: 1.5,
				lookbackWindow: 21,
				volatilityFilter: 0.3
			}
		},
		{
			name: 'Aggressive',
			description: 'High frequency, maximum BTC gain',
			params: {
				rebalanceThreshold: 55.0,
				transactionCost: 1.2,
				zScoreThreshold: 1.0,
				lookbackWindow: 7,
				volatilityFilter: 0.8
			}
		},
		{
			name: 'Mega-Optimal',
			description: 'AI-optimized parameters (1000+ iterations)',
			params: {
				rebalanceThreshold: 49.79,
				transactionCost: 1.66,
				zScoreThreshold: 1.257672,
				lookbackWindow: 15,
				volatilityFilter: 0.5000
			}
		},
		{
			name: 'Experimental',
			description: 'Research-grade configuration',
			params: {
				rebalanceThreshold: 52.3,
				transactionCost: 1.8,
				zScoreThreshold: 0.9,
				lookbackWindow: 10,
				volatilityFilter: 0.7
			}
		}
	];
	
	// Chart data for backtest results
	let backtestChartData = null;
	let backtestChartConfig = {
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
							} else {
								return `Holding: ${value.toFixed(6)} BTC`;
							}
						},
						afterLabel: function(context) {
							if (context.datasetIndex === 0) {
								const holding = context.chart.data.datasets[1]?.data[context.dataIndex];
								if (holding) {
									const outperformance = ((context.parsed.y - holding) / holding * 100);
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
				}
			}
		}
	};
	
	// Run single backtest
	async function handleRunBacktest() {
		try {
			await runSingleBacktest(parameters);
			updateBacktestChart();
			showSuccess('Backtest Complete', 'Strategy performance calculated successfully');
		} catch (error) {
			showError('Backtest Failed', error.message);
		}
	}
	
	// Run optimization
	async function handleRunOptimization() {
		try {
			await runOptimization(optimizationSettings.iterations, parameters);
			showSuccess('Optimization Complete', `${optimizationSettings.iterations} iterations completed`);
		} catch (error) {
			showError('Optimization Failed', error.message);
		}
	}
	
	// Generate 3D visualization
	async function handle3DVisualization() {
		try {
			visualSettings.show3DSurface = true;
			await generate3DSurface(parameters, visualSettings.surfaceResolution);
			showSuccess('3D Surface Generated', 'Parameter landscape visualization ready');
		} catch (error) {
			showError('Visualization Failed', error.message);
		}
	}
	
	// Apply preset configuration
	function applyPreset(preset) {
		parameters = { ...preset.params };
		showWarning('Preset Applied', `${preset.name} configuration loaded`);
	}
	
	// Reset to defaults
	function resetToDefaults() {
		parameters = {
			rebalanceThreshold: 50.0,
			transactionCost: 1.5,
			zScoreThreshold: 1.2,
			lookbackWindow: 14,
			volatilityFilter: 0.5
		};
		showWarning('Reset Complete', 'Parameters restored to defaults');
	}
	
	// Update backtest chart with results
	function updateBacktestChart() {
		if (!$backtestResults || !$backtestResults.length) return;
		
		const result = $backtestResults[$backtestResults.length - 1];
		if (!result.portfolioHistory) return;
		
		const labels = [];
		const portfolioValues = [];
		const holdingValues = [];
		
		result.portfolioHistory.forEach(point => {
			const date = new Date(point.timestamp);
			labels.push(date.toLocaleDateString([], { month: 'short', day: 'numeric' }));
			portfolioValues.push(point.totalValueBTC || 0);
			
			// Calculate holding baseline
			const holdingValue = point.holdingBaseline || point.totalValueBTC * 0.95;
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
					fill: false,
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
					pointHoverRadius: 4
				}
			]
		};
	}
	
	// Generate parameter validation warnings
	function validateParameters() {
		const warnings = [];
		
		if (parameters.rebalanceThreshold < 30 || parameters.rebalanceThreshold > 70) {
			warnings.push('Rebalance threshold outside recommended range (30-70%)');
		}
		
		if (parameters.transactionCost > 3.0) {
			warnings.push('High transaction costs may reduce profitability');
		}
		
		if (parameters.zScoreThreshold < 0.5) {
			warnings.push('Very low Z-Score threshold may cause excessive trading');
		}
		
		if (parameters.lookbackWindow < 5) {
			warnings.push('Short lookback window may increase noise');
		}
		
		return warnings;
	}
	
	// React to backtest results changes
	$: if ($backtestResults && $backtestResults.length > 0) {
		updateBacktestChart();
	}
	
	// Format numbers for display
	function formatPercent(value) {
		return value.toFixed(2) + '%';
	}
	
	function formatBTC(value) {
		return value.toFixed(6) + ' BTC';
	}
	
	// Initialize component
	onMount(() => {
		// Load any saved parameters from localStorage (browser only)
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
	
	// Calculate best optimization result
	$: bestResult = $optimizationResults && $optimizationResults.length > 0 
		? $optimizationResults.reduce((best, current) => 
			current.btcGrowthPercent > best.btcGrowthPercent ? current : best, 
			$optimizationResults[0]
		) 
		: null;
</script>

<div class="gradient-descent-sandbox">
	<!-- Header -->
	<div class="sandbox-header">
		<div class="header-content">
			<h3 class="sandbox-title">
				<span class="title-icon">🧠</span>
				Gradient Descent Sandbox
			</h3>
			<div class="sandbox-subtitle">
				Interactive parameter optimization and strategy testing
			</div>
		</div>
		
		<div class="header-controls">
			<div class="mode-toggle">
				<button 
					class="mode-btn" 
					class:active={!isAdvancedMode}
					on:click={() => isAdvancedMode = false}
				>
					Simple
				</button>
				<button 
					class="mode-btn" 
					class:active={isAdvancedMode}
					on:click={() => isAdvancedMode = true}
				>
					Advanced
				</button>
			</div>
		</div>
	</div>
	
	<!-- Tab Navigation -->
	<div class="tab-navigation">
		<button 
			class="tab-btn" 
			class:active={activeTab === 'parameters'}
			on:click={() => activeTab = 'parameters'}
		>
			<span class="tab-icon">⚙️</span>
			Parameters
		</button>
		<button 
			class="tab-btn" 
			class:active={activeTab === 'backtest'}
			on:click={() => activeTab = 'backtest'}
		>
			<span class="tab-icon">📊</span>
			Backtest
		</button>
		<button 
			class="tab-btn" 
			class:active={activeTab === 'optimization'}
			on:click={() => activeTab === 'optimization'}
		>
			<span class="tab-icon">🎯</span>
			Optimization
		</button>
		{#if isAdvancedMode}
			<button 
				class="tab-btn" 
				class:active={activeTab === 'visualization'}
				on:click={() => activeTab = 'visualization'}
			>
				<span class="tab-icon">🌐</span>
				3D Viz
			</button>
		{/if}
	</div>
	
	<!-- Tab Content -->
	<div class="tab-content">
		{#if activeTab === 'parameters'}
			<!-- Parameters Tab -->
			<div class="parameters-tab">
				<!-- Presets Section -->
				<div class="presets-section">
					<h4 class="section-title">Strategy Presets</h4>
					<div class="presets-grid">
						{#each presets as preset}
							<div class="preset-card" on:click={() => applyPreset(preset)}>
								<div class="preset-header">
									<div class="preset-name">{preset.name}</div>
									<div class="preset-icon">⚡</div>
								</div>
								<div class="preset-description">
									{preset.description}
								</div>
								<div class="preset-stats">
									<span class="stat">R: {preset.params.rebalanceThreshold}%</span>
									<span class="stat">Z: {preset.params.zScoreThreshold}</span>
									<span class="stat">C: {preset.params.transactionCost}%</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
				
				<!-- Parameter Controls -->
				<div class="parameters-section">
					<div class="section-header">
						<h4 class="section-title">Strategy Parameters</h4>
						<button class="reset-btn" on:click={resetToDefaults}>
							Reset to Defaults
						</button>
					</div>
					
					<div class="parameters-grid">
						<!-- Rebalance Threshold -->
						<div class="parameter-control">
							<label class="param-label" for="rebalance-threshold">
								Rebalance Threshold
								<span class="param-unit">%</span>
							</label>
							<div class="param-input-group">
								<input 
									id="rebalance-threshold"
									type="range" 
									min="30" 
									max="70" 
									step="0.1"
									bind:value={parameters.rebalanceThreshold}
									class="param-slider"
								/>
								<input 
									type="number" 
									min="30" 
									max="70" 
									step="0.1"
									bind:value={parameters.rebalanceThreshold}
									class="param-input"
								/>
							</div>
							<div class="param-description">
								Portfolio drift threshold before rebalancing (30-70%)
							</div>
						</div>
						
						<!-- Transaction Cost -->
						<div class="parameter-control">
							<label class="param-label" for="transaction-cost">
								Transaction Cost
								<span class="param-unit">%</span>
							</label>
							<div class="param-input-group">
								<input 
									id="transaction-cost"
									type="range" 
									min="0.5" 
									max="5.0" 
									step="0.01"
									bind:value={parameters.transactionCost}
									class="param-slider"
								/>
								<input 
									type="number" 
									min="0.5" 
									max="5.0" 
									step="0.01"
									bind:value={parameters.transactionCost}
									class="param-input"
								/>
							</div>
							<div class="param-description">
								Trading fees and slippage cost per transaction
							</div>
						</div>
						
						<!-- Z-Score Threshold -->
						<div class="parameter-control">
							<label class="param-label" for="zscore-threshold">
								Z-Score Threshold
							</label>
							<div class="param-input-group">
								<input 
									id="zscore-threshold"
									type="range" 
									min="0.5" 
									max="3.0" 
									step="0.001"
									bind:value={parameters.zScoreThreshold}
									class="param-slider"
								/>
								<input 
									type="number" 
									min="0.5" 
									max="3.0" 
									step="0.001"
									bind:value={parameters.zScoreThreshold}
									class="param-input"
								/>
							</div>
							<div class="param-description">
								Statistical threshold for trading signal generation
							</div>
						</div>
						
						<!-- Lookback Window -->
						<div class="parameter-control">
							<label class="param-label" for="lookback-window">
								Lookback Window
								<span class="param-unit">days</span>
							</label>
							<div class="param-input-group">
								<input 
									id="lookback-window"
									type="range" 
									min="5" 
									max="60" 
									step="1"
									bind:value={parameters.lookbackWindow}
									class="param-slider"
								/>
								<input 
									type="number" 
									min="5" 
									max="60" 
									step="1"
									bind:value={parameters.lookbackWindow}
									class="param-input"
								/>
							</div>
							<div class="param-description">
								Historical window for mean and standard deviation calculation
							</div>
						</div>
						
						{#if isAdvancedMode}
							<!-- Volatility Filter -->
							<div class="parameter-control">
								<label class="param-label" for="volatility-filter">
									Volatility Filter
								</label>
								<div class="param-input-group">
									<input 
										id="volatility-filter"
										type="range" 
										min="0.1" 
										max="1.0" 
										step="0.01"
										bind:value={parameters.volatilityFilter}
										class="param-slider"
									/>
									<input 
										type="number" 
										min="0.1" 
										max="1.0" 
										step="0.01"
										bind:value={parameters.volatilityFilter}
										class="param-input"
									/>
								</div>
								<div class="param-description">
									Market volatility filter for signal confirmation
								</div>
							</div>
						{/if}
					</div>
					
					<!-- Parameter Warnings -->
					{#if validateParameters().length > 0}
						<div class="parameter-warnings">
							<div class="warning-header">
								<span class="warning-icon">⚠️</span>
								Parameter Warnings
							</div>
							{#each validateParameters() as warning}
								<div class="warning-item">
									{warning}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{:else if activeTab === 'backtest'}
			<!-- Backtest Tab -->
			<div class="backtest-tab">
				<div class="backtest-controls">
					<div class="control-group">
						<h4 class="section-title">Single Backtest</h4>
						<div class="control-options">
							<label class="checkbox-control">
								<input 
									type="checkbox" 
									bind:checked={optimizationSettings.useRealData}
								/>
								<span class="checkbox-text">Use Real Historical Data</span>
							</label>
						</div>
					</div>
					
					<div class="action-buttons">
						<button 
							class="action-btn primary"
							disabled={$backtestState.isRunning}
							on:click={handleRunBacktest}
						>
							{#if $backtestState.isRunning}
								<span class="btn-spinner"></span>
								Running...
							{:else}
								<span class="btn-icon">🚀</span>
								Run Backtest
							{/if}
						</button>
					</div>
				</div>
				
				<!-- Backtest Results -->
				{#if $backtestResults && $backtestResults.length > 0}
					{@const latest = $backtestResults[$backtestResults.length - 1]}
					<div class="backtest-results">
						
						<div class="results-header">
							<h4 class="section-title">Latest Results</h4>
							<div class="results-timestamp">
								{new Date(latest.timestamp).toLocaleString()}
							</div>
						</div>
						
						<div class="results-grid">
							<div class="result-metric">
								<div class="metric-label">BTC Growth</div>
								<div class="metric-value positive">
									+{latest.btcGrowthPercent?.toFixed(2) || '0.00'}%
								</div>
							</div>
							<div class="result-metric">
								<div class="metric-label">Total Trades</div>
								<div class="metric-value">
									{latest.totalTrades || 0}
								</div>
							</div>
							<div class="result-metric">
								<div class="metric-label">Win Rate</div>
								<div class="metric-value">
									{latest.winRate?.toFixed(1) || '0.0'}%
								</div>
							</div>
							<div class="result-metric">
								<div class="metric-label">Sharpe Ratio</div>
								<div class="metric-value">
									{latest.sharpeRatio?.toFixed(3) || '0.000'}
								</div>
							</div>
							<div class="result-metric">
								<div class="metric-label">Max Drawdown</div>
								<div class="metric-value negative">
									-{latest.maxDrawdown?.toFixed(2) || '0.00'}%
								</div>
							</div>
							<div class="result-metric">
								<div class="metric-label">Final Portfolio</div>
								<div class="metric-value">
									{formatBTC(latest.finalPortfolio?.totalValueBTC || 0)}
								</div>
							</div>
						</div>
						
						<!-- Performance Chart -->
						{#if backtestChartData}
							<div class="results-chart">
								<h5 class="chart-title">BTC Accumulation Over Time</h5>
								<BaseChart 
									height={300}
									config={backtestChartConfig}
									data={backtestChartData}
									emptyMessage="No backtest data available"
									loadingMessage="Processing backtest results..."
								/>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{:else if activeTab === 'optimization'}
			<!-- Optimization Tab -->
			<div class="optimization-tab">
				<div class="optimization-controls">
					<div class="control-group">
						<h4 class="section-title">Parameter Optimization</h4>
						<div class="control-row">
							<div class="control-item">
								<label class="control-label">Iterations:</label>
								<input 
									type="number" 
									min="10" 
									max="1000" 
									step="10"
									bind:value={optimizationSettings.iterations}
									class="control-input"
								/>
							</div>
							<div class="control-item">
								<label class="control-label">Max Iterations:</label>
								<input 
									type="number" 
									min="100" 
									max="10000" 
									step="100"
									bind:value={optimizationSettings.maxIterations}
									class="control-input"
									disabled={!isAdvancedMode}
								/>
							</div>
						</div>
						
						{#if isAdvancedMode}
							<div class="control-row">
								<div class="control-item">
									<label class="control-label">Convergence Threshold:</label>
									<input 
										type="number" 
										min="0.0001" 
										max="0.01" 
										step="0.0001"
										bind:value={optimizationSettings.convergenceThreshold}
										class="control-input"
									/>
								</div>
								<div class="control-item">
									<label class="checkbox-control">
										<input 
											type="checkbox" 
											bind:checked={visualSettings.showOptimizationTrail}
										/>
										<span class="checkbox-text">Show Optimization Trail</span>
									</label>
								</div>
							</div>
						{/if}
					</div>
					
					<div class="action-buttons">
						<button 
							class="action-btn primary"
							disabled={$optimizationState.isRunning}
							on:click={handleRunOptimization}
						>
							{#if $optimizationState.isRunning}
								<span class="btn-spinner"></span>
								Optimizing... ({$optimizationState.currentIteration}/{optimizationSettings.iterations})
							{:else}
								<span class="btn-icon">🎯</span>
								Start Optimization
							{/if}
						</button>
						
						{#if isAdvancedMode}
							<button 
								class="action-btn secondary"
								disabled={$optimizationState.isRunning}
								on:click={handle3DVisualization}
							>
								<span class="btn-icon">🌐</span>
								Generate 3D Surface
							</button>
						{/if}
					</div>
				</div>
				
				<!-- Optimization Results -->
				{#if $optimizationResults && $optimizationResults.length > 0}
					<div class="optimization-results">
						<div class="results-header">
							<h4 class="section-title">Optimization Results</h4>
							<div class="results-summary">
								{$optimizationResults.length} iterations completed
							</div>
						</div>
						
						
						{#if bestResult}
							<div class="best-result">
								<div class="best-header">
									<h5>Best Configuration</h5>
									<div class="best-score">
										+{bestResult.btcGrowthPercent?.toFixed(2)}% BTC Growth
									</div>
								</div>
								<div class="best-parameters">
									<div class="param-item">
										<span class="param-name">Rebalance:</span>
										<span class="param-value">{bestResult.parameters?.rebalanceThreshold?.toFixed(1)}%</span>
									</div>
									<div class="param-item">
										<span class="param-name">Z-Score:</span>
										<span class="param-value">{bestResult.parameters?.zScoreThreshold?.toFixed(3)}</span>
									</div>
									<div class="param-item">
										<span class="param-name">Transaction Cost:</span>
										<span class="param-value">{bestResult.parameters?.transactionCost?.toFixed(2)}%</span>
									</div>
									<div class="param-item">
										<span class="param-name">Lookback:</span>
										<span class="param-value">{bestResult.parameters?.lookbackWindow} days</span>
									</div>
								</div>
								<div class="best-actions">
									<button 
										class="apply-btn"
										on:click={() => {
											parameters = { ...bestResult.parameters };
											showSuccess('Parameters Applied', 'Best configuration loaded');
										}}
									>
										Apply Best Parameters
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{:else if activeTab === 'visualization' && isAdvancedMode}
			<!-- 3D Visualization Tab -->
			<div class="visualization-tab">
				<ParameterLandscape3D 
					width={800}
					height={500}
					interactive={true}
					showOptimizationTrail={visualSettings.showOptimizationTrail}
					surfaceResolution={visualSettings.surfaceResolution}
				/>
			</div>
		{/if}
	</div>
</div>

<style>
	.gradient-descent-sandbox {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 24px;
		backdrop-filter: blur(10px);
	}

	/* Header */
	.sandbox-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 24px;
		padding-bottom: 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.sandbox-title {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 0 0 6px 0;
		font-size: 20px;
		font-weight: 700;
		color: #fff;
	}

	.title-icon {
		font-size: 24px;
		background: linear-gradient(135deg, #f7931a 0%, #ff9500 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.sandbox-subtitle {
		font-size: 14px;
		color: #888;
		font-weight: 500;
	}

	.mode-toggle {
		display: flex;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 6px;
		padding: 2px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.mode-btn {
		background: none;
		border: none;
		color: #888;
		padding: 6px 16px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.mode-btn:hover {
		color: #ccc;
		background: rgba(255, 255, 255, 0.05);
	}

	.mode-btn.active {
		color: #f7931a;
		background: rgba(247, 147, 26, 0.15);
	}

	/* Tab Navigation */
	.tab-navigation {
		display: flex;
		gap: 4px;
		margin-bottom: 24px;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 8px;
		padding: 4px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.tab-btn {
		background: none;
		border: none;
		color: #888;
		padding: 12px 20px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
		justify-content: center;
	}

	.tab-btn:hover {
		color: #ccc;
		background: rgba(255, 255, 255, 0.05);
	}

	.tab-btn.active {
		color: #f7931a;
		background: rgba(247, 147, 26, 0.15);
	}

	.tab-icon {
		font-size: 14px;
	}

	/* Tab Content */
	.tab-content {
		min-height: 400px;
	}

	/* Parameters Tab */
	.presets-section {
		margin-bottom: 32px;
	}

	.section-title {
		margin: 0 0 16px 0;
		font-size: 16px;
		font-weight: 600;
		color: #fff;
	}

	.presets-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 12px;
	}

	.preset-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		padding: 16px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.preset-card:hover {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(247, 147, 26, 0.3);
		transform: translateY(-2px);
	}

	.preset-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}

	.preset-name {
		font-size: 14px;
		font-weight: 600;
		color: #fff;
	}

	.preset-icon {
		font-size: 16px;
		opacity: 0.7;
	}

	.preset-description {
		font-size: 12px;
		color: #888;
		line-height: 1.4;
		margin-bottom: 12px;
	}

	.preset-stats {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.stat {
		font-size: 10px;
		background: rgba(247, 147, 26, 0.1);
		color: #f7931a;
		padding: 2px 6px;
		border-radius: 3px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	/* Parameters Section */
	.parameters-section {
		margin-bottom: 24px;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}

	.reset-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #ccc;
		padding: 6px 12px;
		border-radius: 6px;
		font-size: 11px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.reset-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		border-color: rgba(255, 255, 255, 0.2);
	}

	.parameters-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 24px;
	}

	.parameter-control {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		padding: 20px;
	}

	.param-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 14px;
		font-weight: 600;
		color: #fff;
		margin-bottom: 12px;
	}

	.param-unit {
		font-size: 12px;
		color: #888;
		font-weight: 500;
	}

	.param-input-group {
		display: flex;
		gap: 12px;
		align-items: center;
		margin-bottom: 8px;
	}

	.param-slider {
		flex: 1;
		height: 4px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
		outline: none;
		cursor: pointer;
	}

	.param-slider::-webkit-slider-thumb {
		appearance: none;
		width: 16px;
		height: 16px;
		background: #f7931a;
		border-radius: 50%;
		cursor: pointer;
		border: 2px solid #fff;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.param-input {
		width: 80px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #fff;
		padding: 6px 10px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
		text-align: center;
	}

	.param-input:focus {
		outline: none;
		border-color: rgba(247, 147, 26, 0.5);
		background: rgba(255, 255, 255, 0.1);
	}

	.param-description {
		font-size: 11px;
		color: #888;
		line-height: 1.4;
	}

	/* Parameter Warnings */
	.parameter-warnings {
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid rgba(245, 158, 11, 0.2);
		border-radius: 8px;
		padding: 16px;
		margin-top: 20px;
	}

	.warning-header {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		font-weight: 600;
		color: #f59e0b;
		margin-bottom: 8px;
	}

	.warning-icon {
		font-size: 14px;
	}

	.warning-item {
		font-size: 12px;
		color: #f59e0b;
		margin-bottom: 4px;
		padding-left: 16px;
		opacity: 0.9;
	}

	.warning-item:last-child {
		margin-bottom: 0;
	}

	/* Backtest Tab */
	.backtest-controls {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		padding: 20px;
		margin-bottom: 24px;
	}

	.control-group {
		margin-bottom: 16px;
	}

	.control-options {
		margin-top: 12px;
	}

	.checkbox-control {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: #ccc;
		cursor: pointer;
	}

	.checkbox-control input[type="checkbox"] {
		width: 14px;
		height: 14px;
		accent-color: #f7931a;
	}

	.action-buttons {
		display: flex;
		gap: 12px;
		align-items: center;
	}

	.action-btn {
		background: rgba(247, 147, 26, 0.1);
		border: 1px solid rgba(247, 147, 26, 0.3);
		color: #f7931a;
		padding: 12px 20px;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 8px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.action-btn:hover:not(:disabled) {
		background: rgba(247, 147, 26, 0.2);
		border-color: rgba(247, 147, 26, 0.5);
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.action-btn.primary {
		background: linear-gradient(135deg, #f7931a 0%, #ff9500 100%);
		border: none;
		color: #000;
	}

	.action-btn.primary:hover:not(:disabled) {
		background: linear-gradient(135deg, #ff9500 0%, #ffaa00 100%);
	}

	.action-btn.secondary {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #ccc;
	}

	.action-btn.secondary:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}

	.btn-spinner {
		width: 12px;
		height: 12px;
		border: 1px solid rgba(0, 0, 0, 0.2);
		border-top: 1px solid #000;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.btn-icon {
		font-size: 14px;
	}

	/* Results */
	.backtest-results,
	.optimization-results {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		padding: 20px;
	}

	.results-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
		padding-bottom: 12px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.results-timestamp,
	.results-summary {
		font-size: 12px;
		color: #888;
		font-weight: 500;
	}

	.results-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 16px;
		margin-bottom: 24px;
	}

	.result-metric {
		text-align: center;
		padding: 12px;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.metric-label {
		font-size: 11px;
		color: #888;
		font-weight: 500;
		margin-bottom: 6px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.metric-value {
		font-size: 16px;
		font-weight: 700;
		color: #fff;
	}

	.metric-value.positive {
		color: #10b981;
	}

	.metric-value.negative {
		color: #ef4444;
	}

	.results-chart {
		margin-top: 24px;
	}

	.chart-title {
		margin: 0 0 16px 0;
		font-size: 14px;
		font-weight: 600;
		color: #fff;
	}

	/* Optimization Tab */
	.optimization-controls {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		padding: 20px;
		margin-bottom: 24px;
	}

	.control-row {
		display: flex;
		gap: 20px;
		margin-top: 12px;
	}

	.control-item {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.control-label {
		font-size: 12px;
		color: #888;
		font-weight: 500;
	}

	.control-input {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #fff;
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		width: 120px;
	}

	.control-input:focus {
		outline: none;
		border-color: rgba(247, 147, 26, 0.5);
		background: rgba(255, 255, 255, 0.1);
	}

	.control-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Best Result */
	.best-result {
		background: rgba(247, 147, 26, 0.05);
		border: 1px solid rgba(247, 147, 26, 0.2);
		border-radius: 12px;
		padding: 20px;
		margin-top: 20px;
	}

	.best-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
	}

	.best-header h5 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: #fff;
	}

	.best-score {
		font-size: 18px;
		font-weight: 700;
		color: #f7931a;
	}

	.best-parameters {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 12px;
		margin-bottom: 16px;
	}

	.param-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 13px;
		padding: 8px 0;
	}

	.param-name {
		color: #888;
		font-weight: 500;
	}

	.param-value {
		color: #fff;
		font-weight: 600;
		font-family: 'Courier New', monospace;
	}

	.best-actions {
		text-align: center;
	}

	.apply-btn {
		background: linear-gradient(135deg, #f7931a 0%, #ff9500 100%);
		border: none;
		color: #000;
		padding: 10px 20px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.apply-btn:hover {
		background: linear-gradient(135deg, #ff9500 0%, #ffaa00 100%);
	}

	/* Visualization Tab */
	.visualization-tab {
		padding: 0;
	}

	/* Responsive Design */
	@media (max-width: 1200px) {
		.presets-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.parameters-grid {
			grid-template-columns: 1fr;
		}

		.results-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 768px) {
		.gradient-descent-sandbox {
			padding: 20px;
		}

		.sandbox-header {
			flex-direction: column;
			gap: 16px;
		}

		.tab-navigation {
			flex-direction: column;
		}

		.tab-btn {
			justify-content: flex-start;
		}

		.presets-grid {
			grid-template-columns: 1fr;
		}

		.control-row {
			flex-direction: column;
			gap: 12px;
		}

		.action-buttons {
			flex-direction: column;
		}

		.results-grid {
			grid-template-columns: 1fr;
		}

		.best-parameters {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 480px) {
		.gradient-descent-sandbox {
			padding: 16px;
		}

		.param-input-group {
			flex-direction: column;
			gap: 8px;
		}

		.param-input {
			width: 100%;
		}
	}
</style>
