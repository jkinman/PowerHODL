<script>
	import { createEventDispatcher } from 'svelte';
	
	export let parameters = {
		rebalancePercent: 10.0,
		zScoreThreshold: 1.5,
		transactionCost: 1.66,
		lookbackWindow: 15,
		volatilityFilter: 0.5,
		tradeFrequencyMinutes: 720
	};
	
	export let dataSource = 'real';
	export let backtestPeriod = 30; // Can be number or 'ALL'
	
	const dispatch = createEventDispatcher();
	
	const presets = [
		{
			name: 'Conservative',
			description: 'Low risk, steady growth',
			params: {
				rebalancePercent: 5.0,
				zScoreThreshold: 2.0,
				transactionCost: 1.66,
				lookbackWindow: 20,
				volatilityFilter: 0.7,
				tradeFrequencyMinutes: 1440
			}
		},
		{
			name: 'Balanced',
			description: 'Optimal risk/reward',
			params: {
				rebalancePercent: 10.0,
				zScoreThreshold: 1.5,
				transactionCost: 1.66,
				lookbackWindow: 15,
				volatilityFilter: 0.5,
				tradeFrequencyMinutes: 720
			}
		},
		{
			name: 'Aggressive',
			description: 'High risk, high reward',
			params: {
				rebalancePercent: 20.0,
				zScoreThreshold: 1.0,
				transactionCost: 1.66,
				lookbackWindow: 10,
				volatilityFilter: 0.3,
				tradeFrequencyMinutes: 360
			}
		}
	];
	
	const periodOptions = [
		{ value: 30, label: '30 Days' },
		{ value: 90, label: '3 Months' },
		{ value: 180, label: '6 Months' },
		{ value: 365, label: '1 Year' },
		{ value: 730, label: '2 Years' },
		{ value: 'ALL', label: 'All Available' }
	];
	
	let selectedPreset = null;
	
	function selectPreset(preset) {
		selectedPreset = preset.name;
		parameters = { ...preset.params };
		dispatch('update', { parameters });
	}
	
	function handleParameterChange() {
		selectedPreset = null;
		dispatch('update', { parameters });
	}
	
	function handleDataSourceChange() {
		dispatch('update', { dataSource });
	}
	
	function handlePeriodChange() {
		dispatch('update', { backtestPeriod });
	}
</script>

<div class="config-card">
	<div class="config-header">
		<h4>Configuration</h4>
		<div class="preset-tabs">
			{#each presets as preset}
				<button 
					class="preset-tab"
					class:active={selectedPreset === preset.name}
					on:click={() => selectPreset(preset)}
					title={preset.description}
				>
					{preset.name}
				</button>
			{/each}
		</div>
	</div>
	
	<div class="config-content">
		<!-- Trading Parameters -->
		<div class="params-section">
			<h5>Trading Parameters</h5>
			<div class="param-grid">
				<div class="param-row">
					<label class="param-label">Rebalance Threshold</label>
					<div class="param-input-wrapper">
						<input
							type="number"
							bind:value={parameters.rebalancePercent}
							on:input={handleParameterChange}
							min="0.1"
							max="50"
							step="0.1"
							class="param-input"
						/>
						<span class="param-unit">%</span>
					</div>
				</div>
				
				<div class="param-row">
					<label class="param-label">Z-Score Threshold</label>
					<div class="param-input-wrapper">
						<input
							type="number"
							bind:value={parameters.zScoreThreshold}
							on:input={handleParameterChange}
							min="0.1"
							max="3"
							step="0.001"
							class="param-input"
						/>
						<span class="param-unit"></span>
					</div>
				</div>
				
				<div class="param-row">
					<label class="param-label">Transaction Cost</label>
					<div class="param-input-wrapper">
						<input
							type="number"
							bind:value={parameters.transactionCost}
							on:input={handleParameterChange}
							min="0"
							max="5"
							step="0.01"
							class="param-input"
						/>
						<span class="param-unit">%</span>
					</div>
				</div>
				
				<div class="param-row">
					<label class="param-label">Lookback Window</label>
					<div class="param-input-wrapper">
						<input
							type="number"
							bind:value={parameters.lookbackWindow}
							on:input={handleParameterChange}
							min="5"
							max="50"
							step="1"
							class="param-input"
						/>
						<span class="param-unit">days</span>
					</div>
				</div>
				
				<div class="param-row">
					<label class="param-label">Volatility Filter</label>
					<div class="param-input-wrapper">
						<input
							type="number"
							bind:value={parameters.volatilityFilter}
							on:input={handleParameterChange}
							min="0"
							max="2"
							step="0.1"
							class="param-input"
						/>
						<span class="param-unit"></span>
					</div>
				</div>
				
				<div class="param-row">
					<label class="param-label">Trade Frequency</label>
					<div class="param-input-wrapper">
						<input
							type="number"
							bind:value={parameters.tradeFrequencyMinutes}
							on:input={handleParameterChange}
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
		
		<!-- Data Selection -->
		<div class="data-section">
			<h5>Data Selection</h5>
			<div class="data-controls">
				<select 
					bind:value={dataSource} 
					on:change={handleDataSourceChange}
					class="data-select"
				>
					<option value="real">🔴 Real Market Data</option>
					<option value="cached">📦 Cached Historical</option>
					<option value="test">🧪 Simulated Test</option>
				</select>
				
				<div class="period-buttons">
					{#each periodOptions as option}
						<button 
							class="period-btn"
							class:active={backtestPeriod === option.value}
							on:click={() => {
								backtestPeriod = option.value;
								handlePeriodChange();
							}}
						>
							{option.label}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.config-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		overflow: hidden;
		margin-bottom: 16px;
	}
	
	.config-header {
		background: rgba(0, 0, 0, 0.2);
		padding: 16px 20px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}
	
	.config-header h4 {
		margin: 0;
		color: #fff;
		font-size: 18px;
	}
	
	.preset-tabs {
		display: flex;
		gap: 8px;
	}
	
	.preset-tab {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		padding: 6px 16px;
		color: #888;
		font-size: 13px;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.preset-tab:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}
	
	.preset-tab.active {
		background: rgba(247, 147, 26, 0.2);
		border-color: rgba(247, 147, 26, 0.5);
		color: #f7931a;
	}
	
	.config-content {
		padding: 20px;
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 20px;
	}
	
	.params-section {
		width: 100%;
		max-width: 420px;
	}
	
	.params-section h5,
	.data-section h5 {
		margin: 0 0 16px 0;
		color: #ccc;
		font-size: 14px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	
	.param-grid {
		display: grid;
		gap: 12px;
	}
	
	.param-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	
	.param-label {
		flex: 0 0 140px;
		font-size: 13px;
		color: #999;
		text-align: right;
	}
	
	.param-input-wrapper {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
		max-width: 120px;
	}
	
	.param-input {
		width: 100%;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		padding: 6px 10px;
		color: #fff;
		font-size: 13px;
		transition: all 0.2s ease;
	}
	
	.param-input:focus {
		outline: none;
		border-color: rgba(247, 147, 26, 0.5);
		background: rgba(0, 0, 0, 0.5);
	}
	
	.param-unit {
		flex: 0 0 30px;
		font-size: 12px;
		color: #666;
		text-align: left;
	}
	
	.data-section {
		min-width: 200px;
	}
	
	.data-controls {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	
	.data-select {
		width: 100%;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		padding: 8px 12px;
		color: #fff;
		font-size: 13px;
		cursor: pointer;
	}
	
	.data-select:focus {
		outline: none;
		border-color: rgba(247, 147, 26, 0.5);
	}
	
	.period-buttons {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
	}
	
	.period-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		padding: 6px 8px;
		color: #888;
		font-size: 11px;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}
	
	.period-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}
	
	.period-btn.active {
		background: rgba(247, 147, 26, 0.2);
		border-color: rgba(247, 147, 26, 0.5);
		color: #f7931a;
	}
	
	@media (max-width: 768px) {
		.config-content {
			grid-template-columns: 1fr;
		}
		
		.params-section {
			max-width: none;
		}
		
		.data-section {
			border-top: 1px solid rgba(255, 255, 255, 0.05);
			padding-top: 20px;
		}
	}
</style>
