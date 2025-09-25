<!--
	PowerHODL Main Content Area
	
	Primary content area that adapts to different page views
-->
<script>
	import { currentPage } from '$lib/stores';
	
	// Import page components
	import DashboardView from '../views/DashboardView.svelte';
	import AnalyticsView from '../views/AnalyticsView.svelte';
	// import SettingsView from '../views/SettingsView.svelte';
</script>

<main class="powerhodl-main">
	<div class="content-container">
		<!-- Page Router -->
		{#if $currentPage === 'dashboard'}
			<div class="page-content">
				<DashboardView />
			</div>
		{:else if $currentPage === 'analytics'}
			<div class="page-content">
				<AnalyticsView />
			</div>
		{:else if $currentPage === 'settings'}
			<div class="page-content">
				<div class="placeholder-content">
					<div class="placeholder-card">
						<h2>Settings View</h2>
						<p>Trading parameters, preferences, and system configuration.</p>
						<div class="placeholder-grid">
							<div class="placeholder-item">Trading Parameters</div>
							<div class="placeholder-item">API Settings</div>
							<div class="placeholder-item">Notifications</div>
							<div class="placeholder-item">Data Export</div>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<div class="page-content">
				<div class="placeholder-content">
					<div class="placeholder-card error">
						<h2>Page Not Found</h2>
						<p>The requested page "{$currentPage}" does not exist.</p>
						<button on:click={() => currentPage.set('dashboard')} class="back-button">
							← Back to Dashboard
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</main>

<style>
	.powerhodl-main {
		flex: 1;
		height: 100vh;
		overflow-y: auto;
		background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
		position: relative;
	}

	.content-container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 32px 24px;
		min-height: 100%;
	}

	.page-content {
		animation: fadeIn 0.3s ease-in-out;
	}

	/* Placeholder Content (will be replaced with real components) */
	.placeholder-content {
		display: flex;
		justify-content: center;
		align-items: flex-start;
		min-height: 500px;
		padding: 40px 0;
	}

	.placeholder-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 40px;
		max-width: 800px;
		width: 100%;
		text-align: center;
		backdrop-filter: blur(10px);
	}

	.placeholder-card.error {
		border-color: rgba(239, 68, 68, 0.3);
		background: rgba(239, 68, 68, 0.05);
	}

	.placeholder-card h2 {
		font-size: 32px;
		font-weight: 700;
		color: #fff;
		margin: 0 0 16px 0;
		background: linear-gradient(135deg, #f7931a 0%, #ff9500 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.placeholder-card p {
		font-size: 16px;
		color: #ccc;
		margin: 0 0 32px 0;
		line-height: 1.6;
	}

	.placeholder-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 16px;
		margin-top: 32px;
	}

	.placeholder-item {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		padding: 24px 16px;
		font-size: 14px;
		font-weight: 500;
		color: #888;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 80px;
		transition: all 0.2s ease;
		position: relative;
		overflow: hidden;
	}

	.placeholder-item:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(247, 147, 26, 0.3);
		color: #f7931a;
		transform: translateY(-2px);
	}

	.placeholder-item::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(247, 147, 26, 0.1), transparent);
		transition: left 0.5s ease;
	}

	.placeholder-item:hover::before {
		left: 100%;
	}

	.back-button {
		background: #f7931a;
		color: #000;
		border: none;
		padding: 12px 24px;
		border-radius: 8px;
		font-weight: 600;
		font-size: 14px;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-top: 16px;
	}

	.back-button:hover {
		background: #ff9500;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(247, 147, 26, 0.3);
	}

	/* Page Transition Animation */
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.content-container {
			padding: 20px 16px;
		}

		.placeholder-card {
			padding: 24px 20px;
		}

		.placeholder-card h2 {
			font-size: 24px;
		}

		.placeholder-card p {
			font-size: 14px;
		}

		.placeholder-grid {
			grid-template-columns: 1fr;
			gap: 12px;
		}

		.placeholder-item {
			padding: 20px 16px;
			min-height: 60px;
			font-size: 13px;
		}
	}

	@media (max-width: 480px) {
		.content-container {
			padding: 16px 12px;
		}

		.placeholder-card {
			padding: 20px 16px;
		}

		.placeholder-card h2 {
			font-size: 20px;
		}
	}

	/* Loading states and animations */
	.placeholder-item {
		animation: shimmer 2s infinite;
	}

	@keyframes shimmer {
		0% {
			background-position: -1000px 0;
		}
		100% {
			background-position: 1000px 0;
		}
	}

	.placeholder-item:nth-child(1) { animation-delay: 0s; }
	.placeholder-item:nth-child(2) { animation-delay: 0.2s; }
	.placeholder-item:nth-child(3) { animation-delay: 0.4s; }
	.placeholder-item:nth-child(4) { animation-delay: 0.6s; }
</style>
