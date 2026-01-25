/**
 * Client GraphQL pour Hashnode
 *
 * Ce fichier configure la connexion à l'API GraphQL de Hashnode.
 * L'endpoint est toujours https://gql.hashnode.com
 * Le host (ton blog) est configuré via la variable d'environnement HASHNODE_HOST
 */

import { GraphQLClient } from "graphql-request";

// L'endpoint GraphQL de Hashnode (fixe, ne change jamais)
const HASHNODE_ENDPOINT = "https://gql.hashnode.com";

/**
 * Crée et retourne un client GraphQL configuré
 * On crée une nouvelle instance à chaque appel pour éviter les problèmes de cache
 */
export function getClient(): GraphQLClient {
	return new GraphQLClient(HASHNODE_ENDPOINT);
}

/**
 * Le host de ton blog Hashnode (ex: the-learning-machine.hashnode.dev)
 * Récupéré depuis les variables d'environnement
 *
 * Note: On utilise process.env comme fallback car Vercel peut exposer
 * les variables différemment selon le contexte de build
 */
export const HASHNODE_HOST =
	import.meta.env.HASHNODE_HOST ||
	process.env.HASHNODE_HOST ||
	"the-learning-machine.hashnode.dev"; // Fallback hardcodé pour garantir le fonctionnement

/**
 * Hashnode Personal Access Token (optional)
 * Used to authenticate API requests - authenticated requests bypass Stellate CDN cache
 */
export const HASHNODE_TOKEN =
	import.meta.env.HASHNODE_TOKEN || process.env.HASHNODE_TOKEN || "";

// Log pour debug (visible dans les logs de build Vercel)
console.log("[Hashnode] HASHNODE_HOST:", HASHNODE_HOST);

// Vérification que la variable d'environnement est définie
if (!import.meta.env.HASHNODE_HOST && !process.env.HASHNODE_HOST) {
	console.warn(
		"[Hashnode] Variables d'environnement non détectées, utilisation du fallback hardcodé",
	);
}
