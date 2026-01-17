/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

// Types pour les variables d'environnement
interface ImportMetaEnv {
	readonly HASHNODE_HOST: string;
	readonly PUBLIC_GOOGLE_ANALYTICS_ID?: string;
	readonly PUBLIC_UMAMI_WEBSITE_ID?: string;
	readonly PUBLIC_DISQUS_SHORTNAME?: string;
	readonly BREVO_API_KEY?: string;
	readonly BREVO_LIST_ID?: string;
	readonly BREVO_TEMPLATE_ID?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare global {
	interface Window {
		adsbygoogle?: any[] & { loaded?: boolean };
	}
}

export {};
