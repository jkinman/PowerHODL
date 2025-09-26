<!--
	Recent Trades Component
	
	Displays recent trading activity with trade details and performance indicators
-->
<script>
	import { recentTrades, isLoading } from '$lib/stores';
	
	// Format timestamp for display
	function formatTradeTime(timestamp) {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		
		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		
		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `${diffHours}h ago`;
		
		const diffDays = Math.floor(diffHours / 24);
		return `${diffDays}d ago`;
	}
	
	// Format trade amounts
	function formatAmount(amount, symbol) {
		if (symbol === 'BTC') {
			return `${amount.toFixed(6)} BTC`;
		} else if (symbol === 'ETH') {
			return `${amount.toFixed(3)} ETH`;
		}
		return `${amount.toFixed(2)} ${symbol}`;
	}
	
	// Get trade type icon
	function getTradeIcon(action, type) {
		if (action === 'BUY_ETH') return '🟢';
		if (action === 'SELL_ETH') return '🔴';
		if (type === 'REBALANCE') return '⚖️';
		return '🔄';
	}
	
	// Get trade type description
	function getTradeDescription(action, type) {
		if (action === 'BUY_ETH') return 'Bought ETH';
		if (action === 'SELL_ETH') return 'Sold ETH';
		if (type === 'REBALANCE') return 'Rebalanced';
		return 'Trade';
	}
	
	// Get status color class
	function getStatusClass(status) {
		switch (status) {
			case 'completed': return 'status-success';
			case 'pending': return 'status-pending';
			case 'failed': return 'status-error';
			default: return 'status-neutral';
		}
	}
</script>

<div class="recent-trades">
	<!-- Header -->
	<div class="trades-header">
		<h3 class="trades-title">
			<span class="title-icon">📊</span>
			Recent Trades
		</h3>
		<div class="trades-count">
			{$recentTrades.length} trades
		</div>
	</div>

	<!-- Loading State -->
	{#if $isLoading}
		<div class="loading-state">
			<div class="loading-spinner"></div>
			<div class="loading-text">Loading trades...</div>
		</div>
	{:else if $recentTrades.length === 0}
		<!-- Empty State -->
		<div class="empty-state">
			<div class="empty-icon">📈</div>
			<div class="empty-title">No Recent Trades</div>
			<div class="empty-message">
				Trading activity will appear here once signals are executed
			</div>
		</div>
	{:else}
		<!-- Trades List -->
		<div class="trades-list">
			{#each $recentTrades as trade (trade.id)}
				<div class="trade-item" class:failed={trade.status === 'failed'}>
					<div class="trade-main">
						<div class="trade-icon">
							{getTradeIcon(trade.action, trade.type)}
						</div>
						
						<div class="trade-details">
							<div class="trade-action">
								{getTradeDescription(trade.action, trade.type)}
							</div>
							<div class="trade-reason">
								{trade.reason || 'No reason provided'}
							</div>
						</div>
						
						<div class="trade-amounts">
							{#if trade.eth_amount}
								<div class="amount eth">
									{formatAmount(trade.eth_amount, 'ETH')}
								</div>
							{/if}
							{#if trade.btc_amount}
								<div class="amount btc">
									{formatAmount(trade.btc_amount, 'BTC')}
								</div>
							{/if}
						</div>
						
						<div class="trade-meta">
							<div class="trade-time">
								{formatTradeTime(trade.created_at || trade.timestamp)}
							</div>
							<div class="trade-status {getStatusClass(trade.status)}">
								{trade.status || 'unknown'}
							</div>
						</div>
					</div>
					
					<!-- Trade Details (Expandable) -->
					{#if trade.profit !== undefined || trade.fees}
						<div class="trade-stats">
							{#if trade.profit !== undefined}
								<div class="stat-item" class:positive={trade.profit > 0} class:negative={trade.profit < 0}>
									<span class="stat-label">P&L:</span>
									<span class="stat-value">
										{trade.profit > 0 ? '+' : ''}{trade.profit.toFixed(4)} BTC
									</span>
								</div>
							{/if}
							{#if trade.fees}
								<div class="stat-item">
									<span class="stat-label">Fees:</span>
									<span class="stat-value">{trade.fees.toFixed(4)} BTC</span>
								</div>
							{/if}
							{#if trade.executionTime}
								<div class="stat-item">
									<span class="stat-label">Execution:</span>
									<span class="stat-value">{trade.executionTime}ms</span>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
		
		<!-- View More Button -->
		{#if $recentTrades.length >= 10}
			<div class="trades-footer">
				<button class="view-more-btn">
					View All Trades
					<span class="btn-icon">→</span>
				</button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.recent-trades {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 24px;
		backdrop-filter: blur(10px);
	}

	/* Header */
	.trades-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
		padding-bottom: 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.trades-title {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 0;
		font-size: 18px;
		font-weight: 600;
		color: #fff;
	}

	.title-icon {
		font-size: 20px;
	}

	.trades-count {
		font-size: 12px;
		color: #888;
		font-weight: 500;
		padding: 4px 8px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
	}

	/* Loading State */
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 40px 20px;
		text-align: center;
	}

	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 2px solid rgba(247, 147, 26, 0.2);
		border-top: 2px solid #f7931a;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 16px;
	}

	.loading-text {
		font-size: 14px;
		color: #888;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: 40px 20px;
		color: #888;
	}

	.empty-icon {
		font-size: 48px;
		margin-bottom: 16px;
		opacity: 0.5;
	}

	.empty-title {
		font-size: 16px;
		font-weight: 600;
		color: #ccc;
		margin-bottom: 8px;
	}

	.empty-message {
		font-size: 14px;
		line-height: 1.5;
		color: #888;
	}

	/* Trades List */
	.trades-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.trade-item {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		padding: 16px;
		transition: all 0.2s ease;
	}

	.trade-item:hover {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.trade-item.failed {
		border-color: rgba(239, 68, 68, 0.3);
		background: rgba(239, 68, 68, 0.05);
	}

	.trade-main {
		display: grid;
		grid-template-columns: auto 1fr auto auto;
		gap: 16px;
		align-items: center;
	}

	.trade-icon {
		font-size: 18px;
		width: 24px;
		text-align: center;
	}

	.trade-details {
		min-width: 0; /* Allow text truncation */
	}

	.trade-action {
		font-size: 14px;
		font-weight: 600;
		color: #fff;
		margin-bottom: 2px;
	}

	.trade-reason {
		font-size: 12px;
		color: #888;
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.trade-amounts {
		text-align: right;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.amount {
		font-size: 12px;
		font-family: 'Courier New', monospace;
		font-weight: 500;
	}

	.amount.btc {
		color: #f7931a;
	}

	.amount.eth {
		color: #627eea;
	}

	.trade-meta {
		text-align: right;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.trade-time {
		font-size: 11px;
		color: #666;
		font-weight: 500;
	}

	.trade-status {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.status-success {
		background: rgba(16, 185, 129, 0.2);
		color: #10b981;
	}

	.status-pending {
		background: rgba(245, 158, 11, 0.2);
		color: #f59e0b;
	}

	.status-error {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.status-neutral {
		background: rgba(255, 255, 255, 0.1);
		color: #888;
	}

	/* Trade Stats */
	.trade-stats {
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
	}

	.stat-item {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
	}

	.stat-label {
		color: #888;
		font-weight: 500;
	}

	.stat-value {
		color: #ccc;
		font-weight: 600;
		font-family: 'Courier New', monospace;
	}

	.stat-item.positive .stat-value {
		color: #10b981;
	}

	.stat-item.negative .stat-value {
		color: #ef4444;
	}

	/* Footer */
	.trades-footer {
		margin-top: 20px;
		padding-top: 16px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		text-align: center;
	}

	.view-more-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #ccc;
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.view-more-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		border-color: rgba(255, 255, 255, 0.2);
	}

	.btn-icon {
		font-size: 10px;
		transition: transform 0.2s ease;
	}

	.view-more-btn:hover .btn-icon {
		transform: translateX(2px);
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.recent-trades {
			padding: 20px;
		}

		.trade-main {
			grid-template-columns: auto 1fr;
			gap: 12px;
		}

		.trade-amounts,
		.trade-meta {
			grid-column: 2;
			text-align: left;
			margin-top: 8px;
		}

		.trade-amounts {
			flex-direction: row;
			gap: 12px;
		}

		.trade-meta {
			flex-direction: row;
			gap: 12px;
		}

		.trade-stats {
			gap: 12px;
		}
	}

	@media (max-width: 480px) {
		.recent-trades {
			padding: 16px;
		}

		.trades-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 8px;
		}

		.trade-item {
			padding: 12px;
		}

		.trade-main {
			gap: 8px;
		}
	}
</style>
