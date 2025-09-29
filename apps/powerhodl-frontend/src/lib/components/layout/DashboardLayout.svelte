<!--
	PowerHODL Dashboard Layout
	
	Main layout component that orchestrates header, sidebar, content, and notifications
-->
<script>
	import { onMount } from 'svelte';
	import { 
		loadPreferences, 
		handleKeyboardShortcut, 
		notifications,
		isLoading,
		errorSummary
	} from '$lib/stores';
	
	// Import layout components
	import Header from './Header.svelte';
	import MainContent from './MainContent.svelte';
	import NotificationPanel from './NotificationPanel.svelte';
	
	// Local state
	let notificationPanelOpen = false;
	
	// Initialize application
	onMount(() => {
		// Load user preferences
		loadPreferences();
		
		// Set up keyboard shortcuts
		const handleKeydown = (event) => {
			handleKeyboardShortcut(event);
			
			// Additional shortcuts
			if (event.key === 'n' && (event.ctrlKey || event.metaKey)) {
				event.preventDefault();
				notificationPanelOpen = !notificationPanelOpen;
			}
			
		};
		
		document.addEventListener('keydown', handleKeydown);
		
		// Cleanup
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});
	
	// Auto-open notification panel for errors
	$: if ($errorSummary.hasErrors && !notificationPanelOpen) {
		notificationPanelOpen = true;
	}
	
	// Close notification panel when clicking notification button in header
	function toggleNotificationPanel() {
		notificationPanelOpen = !notificationPanelOpen;
	}
</script>

<!-- Global Loading Overlay -->
{#if $isLoading}
	<div class="loading-overlay">
		<div class="loading-spinner">
			<div class="spinner-ring"></div>
			<div class="spinner-text">Loading PowerHODL...</div>
		</div>
	</div>
{/if}

<!-- Main Dashboard Layout -->
<div class="dashboard-layout">
	<!-- Header -->
	<Header on:toggleNotifications={toggleNotificationPanel} />
	
	<!-- Main Content Area -->
	<div class="dashboard-body">
		<!-- Main Content (Full Width) -->
		<div class="content-area">
			<MainContent />
		</div>
	</div>
	
	<!-- Notification Panel -->
	<NotificationPanel bind:isOpen={notificationPanelOpen} />
</div>

<!-- Toast Notifications (for quick alerts) -->
{#if $notifications.length > 0}
	<div class="toast-container">
		{#each $notifications.slice(0, 3) as notification (notification.id)}
			{#if notification.autoHide}
				<div 
					class="toast-notification" 
					class:error={notification.type === 'error'}
					class:warning={notification.type === 'warning'}
					class:success={notification.type === 'success'}
					class:info={notification.type === 'info'}
				>
					<div class="toast-content">
						<span class="toast-icon">
							{#if notification.type === 'error'}❌
							{:else if notification.type === 'warning'}⚠️
							{:else if notification.type === 'success'}✅
							{:else}ℹ️
							{/if}
						</span>
						<div class="toast-text">
							<div class="toast-title">{notification.title}</div>
							{#if notification.message}
								<div class="toast-message">{notification.message}</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		{/each}
	</div>
{/if}

<style>
	.dashboard-layout {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: #0f0f0f;
		color: #fff;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		overflow: hidden;
	}

	.dashboard-body {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.content-area {
		flex: 1;
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 24px;
	}
	
	@media (max-width: 768px) {
		.content-area {
			padding: 0 16px;
		}
	}
	
	@media (max-width: 480px) {
		.content-area {
			padding: 0 12px;
		}
	}

	/* Loading Overlay */
	.loading-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		backdrop-filter: blur(4px);
	}

	.loading-spinner {
		text-align: center;
	}

	.spinner-ring {
		width: 60px;
		height: 60px;
		border: 3px solid rgba(247, 147, 26, 0.2);
		border-top: 3px solid #f7931a;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 16px;
	}

	.spinner-text {
		font-size: 16px;
		color: #f7931a;
		font-weight: 600;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	/* Toast Notifications */
	.toast-container {
		position: fixed;
		bottom: 24px;
		right: 24px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		z-index: 1000;
		pointer-events: none;
	}

	.toast-notification {
		background: rgba(30, 30, 30, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 16px;
		min-width: 300px;
		max-width: 400px;
		backdrop-filter: blur(10px);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
		animation: slideIn 0.3s ease-out;
		pointer-events: auto;
	}

	.toast-notification.error {
		border-color: rgba(239, 68, 68, 0.3);
		background: rgba(239, 68, 68, 0.1);
	}

	.toast-notification.warning {
		border-color: rgba(245, 158, 11, 0.3);
		background: rgba(245, 158, 11, 0.1);
	}

	.toast-notification.success {
		border-color: rgba(16, 185, 129, 0.3);
		background: rgba(16, 185, 129, 0.1);
	}

	.toast-notification.info {
		border-color: rgba(59, 130, 246, 0.3);
		background: rgba(59, 130, 246, 0.1);
	}

	.toast-content {
		display: flex;
		align-items: flex-start;
		gap: 12px;
	}

	.toast-icon {
		font-size: 16px;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.toast-text {
		flex: 1;
	}

	.toast-title {
		font-size: 14px;
		font-weight: 600;
		color: #fff;
		margin-bottom: 4px;
	}

	.toast-message {
		font-size: 13px;
		color: #ccc;
		line-height: 1.4;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(100%);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	/* Responsive Design */
	@media (max-width: 1200px) {

		.toast-container {
			bottom: 16px;
			right: 16px;
			left: 16px;
		}

		.toast-notification {
			min-width: auto;
			max-width: none;
		}
	}

	@media (max-width: 480px) {
		.toast-container {
			bottom: 12px;
			right: 12px;
			left: 12px;
		}

		.toast-notification {
			padding: 12px;
		}

		.toast-content {
			gap: 8px;
		}

		.toast-title {
			font-size: 13px;
		}

		.toast-message {
			font-size: 12px;
		}
	}

	/* Dark mode scrollbar */
	:global(::-webkit-scrollbar) {
		width: 8px;
		height: 8px;
	}

	:global(::-webkit-scrollbar-track) {
		background: rgba(255, 255, 255, 0.05);
	}

	:global(::-webkit-scrollbar-thumb) {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 4px;
	}

	:global(::-webkit-scrollbar-thumb:hover) {
		background: rgba(255, 255, 255, 0.3);
	}

	/* Global focus styles */
	:global(*:focus) {
		outline: 2px solid #f7931a;
		outline-offset: 2px;
	}

	:global(button:focus) {
		outline-offset: 1px;
	}
</style>
