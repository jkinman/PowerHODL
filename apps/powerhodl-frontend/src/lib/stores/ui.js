/**
 * UI Store
 * 
 * Manages user interface state, notifications, modals, and user preferences
 */

import { writable, derived } from 'svelte/store';

// === UI State ===

/**
 * Current active page/section
 */
export const currentPage = writable('dashboard');

/**
 * Modal state management
 */
export const modals = writable({
	gradientDescentSandbox: false,
	threeDVisualization: false,
	settings: false,
	help: false
});

/**
 * Notification system
 */
export const notifications = writable([]);

/**
 * Loading states for different components
 */
export const loadingStates = writable({
	dashboard: false,
	portfolio: false,
	market: false,
	backtest: false,
	charts: false
});

/**
 * User preferences
 */
export const userPreferences = writable({
	// Display preferences
	theme: 'dark',
	currency: 'BTC', // 'BTC', 'USD'
	chartTimeframe: 'ALL', // '1M', '3M', '1Y', '2Y', 'ALL'
	refreshInterval: 30, // seconds
	
	// Notification preferences
	enableNotifications: true,
	enableSoundAlerts: false,
	enableTradingAlerts: true,
	
	// Advanced preferences
	showAdvancedMetrics: false,
	autoRefresh: true,
	compactMode: false,
	
	// Developer preferences
	showDebugInfo: false,
	enableConsoleLogging: true
});

/**
 * Error state management
 */
export const errors = writable({
	global: null,
	api: null,
	market: null,
	portfolio: null,
	backtest: null
});

// === Derived UI State ===

/**
 * Active modals count and state
 */
export const modalState = derived(
	modals,
	($modals) => {
		const activeModals = Object.entries($modals).filter(([_, isOpen]) => isOpen);
		
		return {
			hasActiveModal: activeModals.length > 0,
			activeModalCount: activeModals.length,
			activeModals: activeModals.map(([name]) => name),
			topModal: activeModals.length > 0 ? activeModals[activeModals.length - 1][0] : null
		};
	}
);

/**
 * Notification summary
 */
export const notificationSummary = derived(
	notifications,
	($notifications) => {
		const unread = $notifications.filter(n => !n.read);
		const byType = $notifications.reduce((acc, n) => {
			acc[n.type] = (acc[n.type] || 0) + 1;
			return acc;
		}, {});
		
		return {
			total: $notifications.length,
			unread: unread.length,
			byType,
			latest: $notifications[0] || null,
			hasErrors: byType.error > 0,
			hasWarnings: byType.warning > 0
		};
	}
);

/**
 * Global loading state
 */
export const isLoading = derived(
	loadingStates,
	($states) => Object.values($states).some(state => state)
);

/**
 * Error summary
 */
export const errorSummary = derived(
	errors,
	($errors) => {
		const activeErrors = Object.entries($errors).filter(([_, error]) => error);
		
		return {
			hasErrors: activeErrors.length > 0,
			errorCount: activeErrors.length,
			errors: activeErrors.reduce((acc, [component, error]) => {
				acc[component] = error;
				return acc;
			}, {}),
			latestError: activeErrors.length > 0 ? activeErrors[activeErrors.length - 1] : null
		};
	}
);

// === Store Actions ===

/**
 * Navigate to a page
 */
export function navigateTo(page) {
	currentPage.set(page);
}

/**
 * Open a modal
 */
export function openModal(modalName) {
	modals.update(current => ({
		...current,
		[modalName]: true
	}));
}

/**
 * Close a modal
 */
export function closeModal(modalName) {
	modals.update(current => ({
		...current,
		[modalName]: false
	}));
}

/**
 * Close all modals
 */
export function closeAllModals() {
	modals.update(current => {
		const newModals = { ...current };
		Object.keys(newModals).forEach(key => {
			newModals[key] = false;
		});
		return newModals;
	});
}

/**
 * Toggle a modal
 */
export function toggleModal(modalName) {
	modals.update(current => ({
		...current,
		[modalName]: !current[modalName]
	}));
}

/**
 * Add a notification
 */
export function addNotification(notification) {
	const newNotification = {
		id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
		timestamp: new Date().toISOString(),
		read: false,
		autoHide: true,
		duration: 5000, // 5 seconds default
		...notification
	};
	
	notifications.update(current => [newNotification, ...current.slice(0, 99)]); // Keep last 100
	
	// Auto-hide notification
	if (newNotification.autoHide) {
		setTimeout(() => {
			removeNotification(newNotification.id);
		}, newNotification.duration);
	}
	
	return newNotification.id;
}

/**
 * Remove a notification
 */
export function removeNotification(id) {
	notifications.update(current => current.filter(n => n.id !== id));
}

/**
 * Mark notification as read
 */
export function markNotificationRead(id) {
	notifications.update(current =>
		current.map(n => n.id === id ? { ...n, read: true } : n)
	);
}

/**
 * Clear all notifications
 */
export function clearNotifications() {
	notifications.set([]);
}

/**
 * Set loading state for a component
 */
export function setLoading(component, isLoading) {
	loadingStates.update(current => ({
		...current,
		[component]: isLoading
	}));
}

/**
 * Set error for a component
 */
export function setError(component, error) {
	errors.update(current => ({
		...current,
		[component]: error
	}));
	
	// Also add as notification if it's a new error
	if (error) {
		addNotification({
			type: 'error',
			title: `${component.charAt(0).toUpperCase() + component.slice(1)} Error`,
			message: typeof error === 'string' ? error : error.message,
			autoHide: false
		});
	}
}

/**
 * Clear error for a component
 */
export function clearError(component) {
	errors.update(current => ({
		...current,
		[component]: null
	}));
}

/**
 * Update user preferences
 */
export function updatePreferences(newPrefs) {
	userPreferences.update(current => ({
		...current,
		...newPrefs
	}));
	
	// Persist to localStorage
	if (typeof localStorage !== 'undefined') {
		try {
			localStorage.setItem('powerhodl_preferences', JSON.stringify(newPrefs));
		} catch (error) {
			console.warn('Failed to save preferences:', error);
		}
	}
}

/**
 * Load preferences from localStorage
 */
export function loadPreferences() {
	if (typeof localStorage !== 'undefined') {
		try {
			const saved = localStorage.getItem('powerhodl_preferences');
			if (saved) {
				const preferences = JSON.parse(saved);
				updatePreferences(preferences);
				return preferences;
			}
		} catch (error) {
			console.warn('Failed to load preferences:', error);
		}
	}
	return null;
}

/**
 * Reset all UI state
 */
export function resetUIState() {
	currentPage.set('dashboard');
	closeAllModals();
	clearNotifications();
	loadingStates.set({
		dashboard: false,
		portfolio: false,
		market: false,
		backtest: false,
		charts: false
	});
	errors.set({
		global: null,
		api: null,
		market: null,
		portfolio: null,
		backtest: null
	});
}

// === Notification Helpers ===

/**
 * Show success notification
 */
export function showSuccess(title, message, options = {}) {
	return addNotification({
		type: 'success',
		title,
		message,
		...options
	});
}

/**
 * Show error notification
 */
export function showError(title, message, options = {}) {
	return addNotification({
		type: 'error',
		title,
		message,
		autoHide: false,
		...options
	});
}

/**
 * Show warning notification
 */
export function showWarning(title, message, options = {}) {
	return addNotification({
		type: 'warning',
		title,
		message,
		duration: 8000, // Longer for warnings
		...options
	});
}

/**
 * Show info notification
 */
export function showInfo(title, message, options = {}) {
	return addNotification({
		type: 'info',
		title,
		message,
		...options
	});
}

// === Keyboard Shortcuts ===

/**
 * Handle keyboard shortcuts
 */
export function handleKeyboardShortcut(event) {
	// Escape key - close modals
	if (event.key === 'Escape') {
		closeAllModals();
	}
	
	// Ctrl/Cmd + R - refresh data
	if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
		event.preventDefault();
		addNotification({
			type: 'info',
			title: 'Refreshing Data',
			message: 'Fetching latest market data...',
			duration: 2000
		});
		// Trigger refresh (will be implemented in components)
	}
	
	// Ctrl/Cmd + K - open search/commands
	if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
		event.preventDefault();
		// Could open a command palette in the future
	}
}
