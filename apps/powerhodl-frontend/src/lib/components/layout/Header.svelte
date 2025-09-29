<!--
	PowerHODL Header Component
	
	Top navigation bar with branding, status indicators, and quick actions
-->
<script>
	import { currentPage, notifications, notificationSummary, marketHealth, showInfo, showSuccess } from '$lib/stores';
	import { navigateTo, clearNotifications, updateMarketData } from '$lib/stores';
	
	// Reactive data
	$: hasNotifications = $notificationSummary.unread > 0;
	$: isMarketHealthy = $marketHealth.isHealthy;
	$: dataAge = $marketHealth.dataAgeFormatted;
	
	import { onMount, onDestroy } from 'svelte';
	
	let systemStatus = null;
	let statusInterval;
	
	// Refresh market data
	async function refreshMarketData() {
		showInfo('Refreshing', 'Fetching latest market data...');
		
		try {
			// Fetch both market data and system status
			const [marketResponse, statusResponse] = await Promise.all([
				fetch(`${import.meta.env.DEV ? 'http://localhost:9001' : (import.meta.env.VITE_API_URL || 'https://powerhodl-api.vercel.app')}/api/historical?timeframe=1m`),
				fetch(`${import.meta.env.DEV ? 'http://localhost:9001' : (import.meta.env.VITE_API_URL || 'https://powerhodl-api.vercel.app')}/api/system-status`)
			]);
			
			if (marketResponse.ok) {
				const data = await marketResponse.json();
				if (data.data && data.data.length > 0) {
					const latestData = data.data[data.data.length - 1];
					updateMarketData({
						ethPriceUSD: latestData.eth_price_usd || latestData.ethPriceUSD,
						btcPriceUSD: latestData.btc_price_usd || latestData.btcPriceUSD,
						ethBtcRatio: latestData.eth_btc_ratio || latestData.ethBtcRatio,
						zScore: latestData.z_score || latestData.zScore || 0,
						source: 'database',
						lastUpdate: latestData.collected_at || new Date().toISOString()
					});
				}
			}
			
			if (statusResponse.ok) {
				const statusData = await statusResponse.json();
				systemStatus = statusData.data;
			}
			
			showSuccess('Data Updated', 'Market data and system status refreshed');
		} catch (error) {
			console.error('Failed to refresh data:', error);
			showInfo('Refresh Failed', 'Could not fetch latest data');
		}
	}
	
	// Check system status periodically
	onMount(() => {
		refreshMarketData(); // Initial load
		
		// Check status every 2 minutes
		statusInterval = setInterval(refreshMarketData, 120000);
	});
	
	onDestroy(() => {
		if (statusInterval) {
			clearInterval(statusInterval);
		}
	});
</script>

<header class="powerhodl-header">
	<div class="header-container">
		<!-- Logo and Branding -->
		<div class="header-brand">
			<div class="logo">
				<div class="logo-icon">₿</div>
				<div class="logo-text">
					<h1>PowerHODL</h1>
					<span class="tagline">BTC Bear Market Buster</span>
				</div>
			</div>
		</div>

		<!-- Status Indicators -->
		<div class="header-status">
			<!-- Market Status -->
			<div class="status-item" class:healthy={isMarketHealthy} class:warning={!isMarketHealthy}>
				<div class="status-indicator"></div>
				<div class="status-text">
					<span class="status-label">Market Data</span>
					<span class="status-value">{isMarketHealthy ? 'Live' : 'Stale'}</span>
					{#if dataAge && dataAge !== 'Never'}
						<span class="status-age">({dataAge})</span>
					{/if}
				</div>
				<button 
					class="refresh-btn" 
					on:click={refreshMarketData}
					title="Refresh market data"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M3 12a9 9 0 1 1 0 6"></path>
						<polyline points="3 15 3 9 9 9"></polyline>
					</svg>
				</button>
			</div>

			<!-- Notifications -->
			<div class="status-item notifications" class:has-alerts={hasNotifications}>
				<button 
					class="notification-btn" 
					on:click={() => {/* Will implement notification panel */}}
					title="Notifications"
				>
					<svg class="notification-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
						<path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
					</svg>
					{#if hasNotifications}
						<span class="notification-badge">{$notificationSummary.unread}</span>
					{/if}
				</button>
			</div>
		</div>

		<!-- Navigation -->
		<nav class="header-nav">
			<button 
				class="nav-item" 
				class:active={$currentPage === 'dashboard'}
				on:click={() => navigateTo('dashboard')}
			>
				Dashboard
			</button>
			<button 
				class="nav-item" 
				class:active={$currentPage === 'analytics'}
				on:click={() => navigateTo('analytics')}
			>
				Analytics
			</button>
			<button 
				class="nav-item" 
				class:active={$currentPage === 'settings'}
				on:click={() => navigateTo('settings')}
			>
				Settings
			</button>
		</nav>
	</div>
</header>

<style>
	.powerhodl-header {
		background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
		border-bottom: 1px solid #333;
		position: sticky;
		top: 0;
		z-index: 100;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
	}

	.header-container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 24px;
		height: 70px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 32px;
	}

	/* Logo and Branding */
	.header-brand {
		flex-shrink: 0;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.logo-icon {
		font-size: 32px;
		font-weight: bold;
		color: #f7931a;
		text-shadow: 0 0 10px rgba(247, 147, 26, 0.3);
	}

	.logo-text h1 {
		font-size: 24px;
		font-weight: 700;
		color: #fff;
		margin: 0;
		letter-spacing: -0.5px;
	}

	.tagline {
		font-size: 11px;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 1px;
		font-weight: 500;
	}

	/* Status Indicators */
	.header-status {
		display: flex;
		align-items: center;
		gap: 24px;
		flex: 1;
		justify-content: center;
	}

	.status-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.status-indicator {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #666;
		animation: pulse 2s infinite;
	}

	.status-item.healthy .status-indicator {
		background: #10b981;
		box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
	}

	.status-item.warning .status-indicator {
		background: #f59e0b;
		box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
	}

	.status-text {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.status-label {
		font-size: 10px;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		font-weight: 500;
	}

	.status-value {
		font-size: 12px;
		color: #fff;
		font-weight: 600;
	}

	.status-age {
		font-size: 10px;
		color: #666;
	}
	
	.refresh-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 6px;
		margin-left: 8px;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #888;
	}
	
	.refresh-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
		color: #fff;
	}
	
	.refresh-btn:active {
		transform: scale(0.95);
	}
	
	.refresh-btn svg {
		transition: transform 0.3s ease;
	}
	
	.refresh-btn:hover svg {
		transform: rotate(180deg);
	}

	/* Notifications */
	.notifications {
		padding: 0;
		background: none;
		border: none;
	}

	.notification-btn {
		position: relative;
		background: none;
		border: none;
		padding: 12px;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.notification-btn:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.notification-icon {
		width: 18px;
		height: 18px;
		color: #888;
		transition: color 0.2s ease;
	}

	.has-alerts .notification-icon {
		color: #f59e0b;
	}

	.notification-badge {
		position: absolute;
		top: 6px;
		right: 6px;
		background: #ef4444;
		color: white;
		font-size: 10px;
		font-weight: 600;
		padding: 2px 5px;
		border-radius: 10px;
		min-width: 16px;
		text-align: center;
		line-height: 1;
	}

	/* Navigation */
	.header-nav {
		display: flex;
		gap: 4px;
		flex-shrink: 0;
	}

	.nav-item {
		background: none;
		border: none;
		color: #888;
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
	}

	.nav-item:hover {
		color: #fff;
		background: rgba(255, 255, 255, 0.1);
	}

	.nav-item.active {
		color: #f7931a;
		background: rgba(247, 147, 26, 0.1);
	}

	.nav-item.active::after {
		content: '';
		position: absolute;
		bottom: -2px;
		left: 50%;
		transform: translateX(-50%);
		width: 20px;
		height: 2px;
		background: #f7931a;
		border-radius: 1px;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.header-container {
			padding: 0 16px;
			height: 60px;
			gap: 16px;
		}

		.logo-text h1 {
			font-size: 20px;
		}

		.tagline {
			display: none;
		}

		.header-status {
			gap: 16px;
		}

		.status-text {
			display: none;
		}

		.status-item {
			padding: 8px;
		}

		.header-nav {
			gap: 2px;
		}

		.nav-item {
			padding: 6px 12px;
			font-size: 13px;
		}
	}

	@media (max-width: 480px) {
		.header-container {
			gap: 12px;
		}

		.logo-icon {
			font-size: 24px;
		}

		.logo-text h1 {
			font-size: 18px;
		}

		.header-status {
			flex: none;
		}

		.nav-item {
			padding: 6px 8px;
			font-size: 12px;
		}
	}
</style>
