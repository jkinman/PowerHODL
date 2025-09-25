import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],

	// Optimize dependencies for better performance
	optimizeDeps: {
		include: []
	},

	// Development server configuration
	server: {
		port: 5173,
		host: true,
		fs: {
			// Allow serving files from parent directory (for API integration)
			allow: ['..']
		}
	},

	// Build configuration
	build: {
		target: 'es2020',
		minify: 'terser',
		sourcemap: true,
		rollupOptions: {
			// Standard build without external dependencies for now
		}
	},

	// CSS configuration
	css: {
		devSourcemap: true,
		preprocessorOptions: {
			scss: {
				// Global SCSS variables (if we add SCSS later)
				additionalData: `@use "src/lib/styles/variables.scss" as *;`
			}
		}
	},

	// Preview configuration (for npm run preview)
	preview: {
		port: 4173,
		host: true
	},

	// Define global constants
	define: {
		__API_URL__: JSON.stringify(process.env.PUBLIC_API_URL || 'http://localhost:3001')
	}
});
