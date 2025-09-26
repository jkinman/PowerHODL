<!--
	PowerHODL Notification Panel
	
	Sliding notification panel for alerts, errors, and system messages
-->
<script>
	import { 
		notifications, 
		notificationSummary,
		removeNotification,
		markNotificationRead,
		clearNotifications 
	} from '$lib/stores';
	
	export let isOpen = false;
	
	// Notification type icons
	const typeIcons = {
		success: '✅',
		error: '❌',
		warning: '⚠️',
		info: 'ℹ️'
	};
	
	// Close panel when clicking outside
	function handleBackdropClick(event) {
		if (event.target === event.currentTarget) {
			isOpen = false;
		}
	}
	
	// Format notification timestamp
	function formatTime(timestamp) {
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
	
	// Handle notification click
	function handleNotificationClick(notification) {
		if (!notification.read) {
			markNotificationRead(notification.id);
		}
	}
</script>

<!-- Backdrop -->
{#if isOpen}
	<div 
		class="notification-backdrop" 
		on:click={handleBackdropClick}
		on:keydown={(e) => e.key === 'Escape' && (isOpen = false)}
		role="button"
		tabindex="0"
	></div>
{/if}

<!-- Notification Panel -->
<div class="notification-panel" class:open={isOpen}>
	<div class="panel-header">
		<div class="panel-title">
			<span class="panel-icon">🔔</span>
			<h3>Notifications</h3>
			{#if $notificationSummary.unread > 0}
				<span class="unread-badge">{$notificationSummary.unread}</span>
			{/if}
		</div>
		
		<div class="panel-actions">
			{#if $notifications.length > 0}
				<button 
					class="action-btn" 
					on:click={clearNotifications}
					title="Clear all notifications"
				>
					Clear All
				</button>
			{/if}
			<button 
				class="close-btn" 
				on:click={() => isOpen = false}
				title="Close notifications"
			>
				✕
			</button>
		</div>
	</div>
	
	<div class="panel-content">
		{#if $notifications.length === 0}
			<div class="empty-state">
				<div class="empty-icon">🔕</div>
				<h4>No notifications</h4>
				<p>You're all caught up! New notifications will appear here.</p>
			</div>
		{:else}
			<div class="notification-list">
				{#each $notifications as notification (notification.id)}
					<div 
						class="notification-item" 
						class:unread={!notification.read}
						class:error={notification.type === 'error'}
						class:warning={notification.type === 'warning'}
						class:success={notification.type === 'success'}
						class:info={notification.type === 'info'}
						on:click={() => handleNotificationClick(notification)}
						role="button"
						tabindex="0"
						on:keydown={(e) => e.key === 'Enter' && handleNotificationClick(notification)}
					>
						<div class="notification-content">
							<div class="notification-header">
								<span class="notification-type-icon">
									{typeIcons[notification.type] || 'ℹ️'}
								</span>
								<span class="notification-title">
									{notification.title}
								</span>
								<span class="notification-time">
									{formatTime(notification.timestamp)}
								</span>
							</div>
							
							{#if notification.message}
								<div class="notification-message">
									{notification.message}
								</div>
							{/if}
						</div>
						
						<button 
							class="notification-remove"
							on:click|stopPropagation={() => removeNotification(notification.id)}
							title="Remove notification"
						>
							✕
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.notification-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 199;
		backdrop-filter: blur(2px);
	}

	.notification-panel {
		position: fixed;
		top: 0;
		right: -400px;
		width: 400px;
		height: 100vh;
		background: linear-gradient(180deg, #1a1a1a 0%, #151515 100%);
		border-left: 1px solid #333;
		z-index: 200;
		transition: right 0.3s ease;
		display: flex;
		flex-direction: column;
		box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
	}

	.notification-panel.open {
		right: 0;
	}

	.panel-header {
		padding: 20px 24px;
		border-bottom: 1px solid #333;
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: rgba(255, 255, 255, 0.02);
	}

	.panel-title {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.panel-icon {
		font-size: 20px;
	}

	.panel-title h3 {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
		color: #fff;
	}

	.unread-badge {
		background: #ef4444;
		color: white;
		font-size: 11px;
		font-weight: 600;
		padding: 3px 6px;
		border-radius: 10px;
		min-width: 18px;
		text-align: center;
	}

	.panel-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.action-btn {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #ccc;
		padding: 6px 12px;
		border-radius: 4px;
		font-size: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.action-btn:hover {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
	}

	.close-btn {
		background: none;
		border: none;
		color: #888;
		font-size: 16px;
		cursor: pointer;
		padding: 4px;
		border-radius: 2px;
		transition: color 0.2s ease;
	}

	.close-btn:hover {
		color: #fff;
	}

	.panel-content {
		flex: 1;
		overflow-y: auto;
		padding: 16px 0;
	}

	/* Empty State */
	.empty-state {
		padding: 60px 24px;
		text-align: center;
		color: #888;
	}

	.empty-icon {
		font-size: 48px;
		margin-bottom: 16px;
		opacity: 0.5;
	}

	.empty-state h4 {
		margin: 0 0 8px 0;
		font-size: 18px;
		font-weight: 600;
		color: #ccc;
	}

	.empty-state p {
		margin: 0;
		font-size: 14px;
		line-height: 1.5;
	}

	/* Notification List */
	.notification-list {
		display: flex;
		flex-direction: column;
	}

	.notification-item {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 16px 24px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
	}

	.notification-item:hover {
		background: rgba(255, 255, 255, 0.02);
	}

	.notification-item.unread {
		background: rgba(247, 147, 26, 0.05);
		border-left: 3px solid #f7931a;
	}

	.notification-item.error {
		border-left-color: #ef4444;
	}

	.notification-item.warning {
		border-left-color: #f59e0b;
	}

	.notification-item.success {
		border-left-color: #10b981;
	}

	.notification-item.info {
		border-left-color: #3b82f6;
	}

	.notification-content {
		flex: 1;
	}

	.notification-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 4px;
	}

	.notification-type-icon {
		font-size: 14px;
		flex-shrink: 0;
	}

	.notification-title {
		font-size: 14px;
		font-weight: 600;
		color: #fff;
		flex: 1;
	}

	.notification-time {
		font-size: 11px;
		color: #666;
		flex-shrink: 0;
	}

	.notification-message {
		font-size: 13px;
		color: #ccc;
		line-height: 1.4;
		margin-top: 4px;
	}

	.notification-remove {
		background: none;
		border: none;
		color: #666;
		font-size: 12px;
		cursor: pointer;
		padding: 4px;
		border-radius: 2px;
		transition: color 0.2s ease;
		opacity: 0;
		flex-shrink: 0;
	}

	.notification-item:hover .notification-remove {
		opacity: 1;
	}

	.notification-remove:hover {
		color: #ef4444;
		background: rgba(239, 68, 68, 0.1);
	}

	/* Responsive Design */
	@media (max-width: 480px) {
		.notification-panel {
			width: 100vw;
			right: -100vw;
		}

		.notification-panel.open {
			right: 0;
		}

		.panel-header {
			padding: 16px 20px;
		}

		.panel-title h3 {
			font-size: 16px;
		}

		.notification-item {
			padding: 14px 20px;
		}

		.empty-state {
			padding: 40px 20px;
		}

		.empty-icon {
			font-size: 36px;
		}
	}

	/* Scrollbar Styling */
	.panel-content::-webkit-scrollbar {
		width: 4px;
	}

	.panel-content::-webkit-scrollbar-track {
		background: transparent;
	}

	.panel-content::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 2px;
	}

	.panel-content::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.3);
	}
</style>
