/**
 * Logger Service
 * 
 * Simple logging utility for SvelteKit API routes
 */

export class LoggerService {
	constructor(prefix = 'APP') {
		this.prefix = prefix;
		this.startTime = Date.now();
	}
	
	formatMessage(level, message, data = null) {
		const timestamp = new Date().toISOString();
		const uptime = Date.now() - this.startTime;
		
		let formattedMessage = `[${timestamp}] [${this.prefix}] [${level.toUpperCase()}] ${message}`;
		
		if (data) {
			formattedMessage += ` ${JSON.stringify(data, null, 2)}`;
		}
		
		return formattedMessage;
	}
	
	info(message, data = null) {
		console.log(this.formatMessage('info', message, data));
	}
	
	warn(message, data = null) {
		console.warn(this.formatMessage('warn', message, data));
	}
	
	error(message, data = null) {
		console.error(this.formatMessage('error', message, data));
	}
	
	debug(message, data = null) {
		if (process.env.NODE_ENV === 'development') {
			console.debug(this.formatMessage('debug', message, data));
		}
	}
}
