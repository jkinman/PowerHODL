import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Enable preprocessing for TypeScript, SCSS, PostCSS, etc.
	preprocess: vitePreprocess(),
	kit: {
		// Vercel adapter for deployment
		adapter: adapter({
			runtime: 'nodejs18.x',
			regions: ['cle1'], // Cleveland (closest to your likely location)
			maxDuration: 30
		}),

		// Alias configuration for clean imports
		alias: {
			$lib: 'src/lib',
			$components: 'src/lib/components',
			$stores: 'src/lib/stores',
			$utils: 'src/lib/utils'
		},

		// Environment variable configuration
		env: {
			publicPrefix: 'PUBLIC_',
			privatePrefix: 'PRIVATE_'
		}
	}
};

export default config;
