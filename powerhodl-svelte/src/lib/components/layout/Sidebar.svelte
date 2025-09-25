<!--
	PowerHODL Sidebar Component
	
	Quick stats panel with portfolio summary and key metrics
-->
<script>
	import { 
		portfolio, 
		portfolioMetrics, 
		portfolioGrowth,
		marketData,
		currentSignal,
		tradingStatus
	} from '$lib/stores';
	
	// Reactive values
	$: totalBTC = $portfolioMetrics.totalValueBTC || 0;
	$: btcGrowth = $portfolioGrowth.btcGrowthPercent || 0;
	$: ethBtcRatio = $marketData.ethBtcRatio || 0;
	$: currentAction = $currentSignal.action || 'HOLD';
	$: shouldTrade = $currentSignal.shouldTrade || false;
	
	// Format numbers for display
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
</script>

<aside class="powerhodl-sidebar">
	<div class="sidebar-content">
		<!-- Portfolio Summary -->
		<section class="sidebar-section">
			<h3 class="section-title">
				<span class="section-icon">₿</span>
				Portfolio
			</h3>
			
			<div class="portfolio-summary">
				<div class="metric primary">
					<div class="metric-label">Total BTC</div>
					<div class="metric-value btc">
						{formatBTC(totalBTC)}
					</div>
				</div>
				
				<div class="metric" class:positive={btcGrowth > 0} class:negative={btcGrowth < 0}>
					<div class="metric-label">BTC Growth</div>
					<div class="metric-value">
						{formatPercent(btcGrowth)}
					</div>
				</div>
				
				<div class="allocation">
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
		</section>

		<!-- Market Data -->
		<section class="sidebar-section">
			<h3 class="section-title">
				<span class="section-icon">📈</span>
				Market
			</h3>
			
			<div class="market-summary">
				<div class="metric">
					<div class="metric-label">ETH/BTC Ratio</div>
					<div class="metric-value">
						{formatRatio(ethBtcRatio)}
					</div>
				</div>
				
				<div class="metric">
					<div class="metric-label">Z-Score</div>
					<div class="metric-value" class:positive={$marketData.zScore > 0} class:negative={$marketData.zScore < 0}>
						{($marketData.zScore || 0).toFixed(3)}
					</div>
				</div>
			</div>
		</section>

		<!-- Trading Signal -->
		<section class="sidebar-section">
			<h3 class="section-title">
				<span class="section-icon">⚡</span>
				Signal
			</h3>
			
			<div class="signal-summary">
				<div class="signal-action" class:active={shouldTrade}>
					<div class="signal-indicator" class:buy={currentAction === 'BUY_ETH'} class:sell={currentAction === 'SELL_ETH'} class:hold={currentAction === 'HOLD'}></div>
					<div class="signal-text">
						<div class="signal-action-text">{currentAction.replace('_', ' ')}</div>
						<div class="signal-confidence">
							Confidence: {(($currentSignal.confidence || 0) * 100).toFixed(0)}%
						</div>
					</div>
				</div>
				
				{#if $currentSignal.reasoning}
					<div class="signal-reasoning">
						{$currentSignal.reasoning}
					</div>
				{/if}
			</div>
		</section>

		<!-- Trading Status -->
		<section class="sidebar-section">
			<h3 class="section-title">
				<span class="section-icon">🎯</span>
				Status
			</h3>
			
			<div class="status-summary">
				<div class="status-indicator" class:monitoring={$tradingStatus.status === 'monitoring'} class:ready={$tradingStatus.status === 'ready'} class:executing={$tradingStatus.status === 'executing'}>
					<div class="status-dot"></div>
					<span class="status-text">
						{$tradingStatus.status.charAt(0).toUpperCase() + $tradingStatus.status.slice(1)}
					</span>
				</div>
				
				{#if $tradingStatus.winRate !== undefined}
					<div class="metric small">
						<div class="metric-label">Win Rate</div>
						<div class="metric-value">
							{$tradingStatus.winRate.toFixed(1)}%
						</div>
					</div>
				{/if}
			</div>
		</section>

		<!-- Quick Actions -->
		<section class="sidebar-section">
			<h3 class="section-title">
				<span class="section-icon">🚀</span>
				Actions
			</h3>
			
			<div class="quick-actions">
				<button class="action-btn primary" disabled={!shouldTrade}>
					Execute Trade
				</button>
				<button class="action-btn secondary">
					Gradient Descent
				</button>
				<button class="action-btn secondary">
					Refresh Data
				</button>
			</div>
		</section>
	</div>
</aside>

<style>
	.powerhodl-sidebar {
		width: 300px;
		background: linear-gradient(180deg, #1a1a1a 0%, #151515 100%);
		border-right: 1px solid #333;
		height: 100vh;
		overflow-y: auto;
		position: sticky;
		top: 0;
		flex-shrink: 0;
	}

	.sidebar-content {
		padding: 24px 20px;
		display: flex;
		flex-direction: column;
		gap: 32px;
	}

	/* Section Styling */
	.sidebar-section {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 20px;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 16px 0;
		font-size: 14px;
		font-weight: 600;
		color: #fff;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.section-icon {
		font-size: 16px;
	}

	/* Portfolio Summary */
	.portfolio-summary {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.metric {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.metric.primary {
		padding: 12px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.metric.small {
		font-size: 12px;
	}

	.metric-label {
		font-size: 12px;
		color: #888;
		font-weight: 500;
	}

	.metric-value {
		font-weight: 600;
		color: #fff;
	}

	.metric-value.btc {
		font-size: 18px;
		color: #f7931a;
		font-family: 'Courier New', monospace;
	}

	.metric.positive .metric-value {
		color: #10b981;
	}

	.metric.negative .metric-value {
		color: #ef4444;
	}

	/* Allocation Bar */
	.allocation {
		margin-top: 8px;
	}

	.allocation-bar {
		height: 8px;
		background: #333;
		border-radius: 4px;
		overflow: hidden;
		display: flex;
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
		margin-top: 8px;
	}

	.allocation-label {
		font-size: 11px;
		font-weight: 500;
	}

	.allocation-label.btc {
		color: #f7931a;
	}

	.allocation-label.eth {
		color: #627eea;
	}

	/* Signal Summary */
	.signal-action {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		transition: all 0.2s ease;
	}

	.signal-action.active {
		background: rgba(247, 147, 26, 0.1);
		border-color: rgba(247, 147, 26, 0.3);
	}

	.signal-indicator {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #666;
		animation: pulse 2s infinite;
	}

	.signal-indicator.buy {
		background: #10b981;
		box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
	}

	.signal-indicator.sell {
		background: #ef4444;
		box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
	}

	.signal-indicator.hold {
		background: #f59e0b;
		box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
	}

	.signal-text {
		flex: 1;
	}

	.signal-action-text {
		font-size: 14px;
		font-weight: 600;
		color: #fff;
		margin-bottom: 2px;
	}

	.signal-confidence {
		font-size: 11px;
		color: #888;
	}

	.signal-reasoning {
		margin-top: 12px;
		font-size: 12px;
		color: #ccc;
		line-height: 1.4;
		font-style: italic;
	}

	/* Status Summary */
	.status-indicator {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.05);
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #666;
		animation: pulse 2s infinite;
	}

	.status-indicator.monitoring .status-dot {
		background: #10b981;
	}

	.status-indicator.ready .status-dot {
		background: #f59e0b;
	}

	.status-indicator.executing .status-dot {
		background: #ef4444;
	}

	.status-text {
		font-size: 12px;
		font-weight: 500;
		color: #fff;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	/* Quick Actions */
	.quick-actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.action-btn {
		padding: 10px 16px;
		border: none;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.action-btn.primary {
		background: #f7931a;
		color: #000;
	}

	.action-btn.primary:hover:not(:disabled) {
		background: #ff9500;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(247, 147, 26, 0.3);
	}

	.action-btn.primary:disabled {
		background: #555;
		color: #888;
		cursor: not-allowed;
	}

	.action-btn.secondary {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.action-btn.secondary:hover {
		background: rgba(255, 255, 255, 0.15);
		transform: translateY(-1px);
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	/* Responsive Design */
	@media (max-width: 1200px) {
		.powerhodl-sidebar {
			width: 260px;
		}

		.sidebar-content {
			padding: 20px 16px;
			gap: 24px;
		}

		.sidebar-section {
			padding: 16px;
		}
	}

	@media (max-width: 768px) {
		.powerhodl-sidebar {
			display: none; /* Hidden on mobile, will show in modal */
		}
	}
</style>
