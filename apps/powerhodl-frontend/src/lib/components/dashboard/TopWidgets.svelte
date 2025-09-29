<script>
	import { portfolioMetrics, marketData, currentSignal } from '$lib/stores';
	
	// Format helpers
	function formatBTC(value) {
		return value.toFixed(6);
	}
	
	function formatPercent(value) {
		const sign = value >= 0 ? '+' : '';
		return `${sign}${value.toFixed(2)}%`;
	}
	
	function formatRatio(value) {
		return value.toFixed(6);
	}
	
	// Reactive values from stores
	$: totalBTC = $portfolioMetrics.totalValueBTC || 0;
	$: btcGrowth = $portfolioMetrics.btcGrowth || 0;
	$: ethBtcRatio = $marketData.ethBtcRatio || 0;
</script>

<div class="top-widgets">
	<!-- Portfolio Widget -->
	<div class="widget portfolio-widget">
		<div class="widget-header">
			<span class="widget-icon">₿</span>
			<span class="widget-title">Portfolio</span>
		</div>
		<div class="widget-content">
			<div class="metric-row">
				<div class="metric">
					<div class="metric-label">Total BTC</div>
					<div class="metric-value btc">{formatBTC(totalBTC)}</div>
				</div>
				<div class="metric" class:positive={btcGrowth > 0} class:negative={btcGrowth < 0}>
					<div class="metric-label">Growth</div>
					<div class="metric-value">{formatPercent(btcGrowth)}</div>
				</div>
			</div>
			<div class="allocation-compact">
				<div class="allocation-bar">
					<div 
						class="allocation-btc" 
						style="width: {$portfolioMetrics.btcPercentage || 50}%"
					></div>
					<div 
						class="allocation-eth" 
						style="width: {$portfolioMetrics.ethPercentage || 50}%"
					></div>
				</div>
				<div class="allocation-labels">
					<span class="allocation-label btc">
						BTC {($portfolioMetrics.btcPercentage || 50).toFixed(1)}%
					</span>
					<span class="allocation-label eth">
						ETH {($portfolioMetrics.ethPercentage || 50).toFixed(1)}%
					</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Market Widget -->
	<div class="widget market-widget">
		<div class="widget-header">
			<span class="widget-icon">📈</span>
			<span class="widget-title">Market</span>
		</div>
		<div class="widget-content">
			<div class="metric-row">
				<div class="metric">
					<div class="metric-label">ETH/BTC Ratio</div>
					<div class="metric-value">{formatRatio(ethBtcRatio)}</div>
				</div>
				<div class="metric">
					<div class="metric-label">Z-Score</div>
					<div class="metric-value" class:positive={$marketData.zScore > 0} class:negative={$marketData.zScore < 0}>
						{($marketData.zScore || 0).toFixed(3)}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Trading Signal Widget -->
	<div class="widget signal-widget">
		<div class="widget-header">
			<span class="widget-icon">🎯</span>
			<span class="widget-title">Signal</span>
		</div>
		<div class="widget-content">
			<div class="signal-status">
				<div class="signal-indicator" class:active={$currentSignal.action !== 'HOLD'}>
					<span class="signal-dot"></span>
					<span class="signal-text">{$currentSignal.action || 'HOLD'}</span>
				</div>
				<div class="confidence-bar">
					<div 
						class="confidence-fill" 
						style="width: {($currentSignal.confidence || 0) * 100}%"
					></div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.top-widgets {
		display: flex;
		gap: 20px;
		margin-bottom: 24px;
		flex-wrap: wrap;
	}

	.widget {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 16px;
		flex: 1;
		min-width: 200px;
		backdrop-filter: blur(10px);
	}

	.widget-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
		padding-bottom: 8px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.widget-icon {
		font-size: 18px;
	}

	.widget-title {
		font-size: 14px;
		font-weight: 600;
		color: #fff;
	}

	.widget-content {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.metric-row {
		display: flex;
		gap: 16px;
		justify-content: space-between;
	}

	.metric {
		flex: 1;
		text-align: center;
	}

	.metric-label {
		font-size: 11px;
		color: #888;
		margin-bottom: 4px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.metric-value {
		font-size: 14px;
		font-weight: 600;
		color: #fff;
		font-family: 'Courier New', monospace;
	}

	.metric-value.btc {
		color: #f7931a;
	}

	.metric-value.positive {
		color: #10b981;
	}

	.metric-value.negative {
		color: #ef4444;
	}

	/* Allocation Bar */
	.allocation-compact {
		margin-top: 8px;
	}

	.allocation-bar {
		height: 6px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
		overflow: hidden;
		display: flex;
		margin-bottom: 8px;
	}

	.allocation-btc {
		background: #f7931a;
		transition: width 0.3s ease;
	}

	.allocation-eth {
		background: #627eea;
		transition: width 0.3s ease;
	}

	.allocation-labels {
		display: flex;
		justify-content: space-between;
		font-size: 10px;
		font-weight: 500;
	}

	.allocation-label.btc {
		color: #f7931a;
	}

	.allocation-label.eth {
		color: #627eea;
	}

	/* Signal Widget */
	.signal-status {
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: center;
	}

	.signal-indicator {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.signal-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #666;
		transition: background 0.3s ease;
	}

	.signal-indicator.active .signal-dot {
		background: #10b981;
		box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
	}

	.signal-text {
		font-size: 12px;
		font-weight: 600;
		color: #ccc;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.signal-indicator.active .signal-text {
		color: #10b981;
	}

	.confidence-bar {
		width: 100%;
		height: 4px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
		overflow: hidden;
	}

	.confidence-fill {
		height: 100%;
		background: linear-gradient(90deg, #10b981, #f59e0b, #ef4444);
		transition: width 0.3s ease;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.top-widgets {
			flex-direction: column;
			gap: 16px;
		}

		.widget {
			min-width: 0;
		}

		.metric-row {
			gap: 12px;
		}
	}

	@media (max-width: 480px) {
		.widget {
			padding: 12px;
		}

		.widget-header {
			margin-bottom: 8px;
		}

		.metric-value {
			font-size: 12px;
		}
	}
</style>
