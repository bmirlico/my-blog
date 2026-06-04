/**
 * Client GraphQL pour Hashnode
 *
 * Ce fichier configure la connexion à l'API GraphQL de Hashnode.
 * L'endpoint (Pro) est https://gql-beta.hashnode.com (voir HASHNODE_ENDPOINT).
 * Le host (ton blog) est configuré via la variable d'environnement HASHNODE_HOST
 */

import { GraphQLClient } from "graphql-request";

// L'endpoint GraphQL de Hashnode pour les publications Pro.
// Depuis le passage en Pro (2026), l'API se trouve sur gql-beta.hashnode.com.
// L'ancien gql.hashnode.com 301-redirige toutes les requêtes vers une page
// d'annonce (d'où les erreurs "Unexpected token '<'" / status 522).
// Surchargeable via HASHNODE_ENDPOINT au cas où l'URL évoluerait.
export const HASHNODE_ENDPOINT =
	import.meta.env.HASHNODE_ENDPOINT ||
	process.env.HASHNODE_ENDPOINT ||
	"https://gql-beta.hashnode.com";

/**
 * Crée et retourne un client GraphQL configuré
 * On crée une nouvelle instance à chaque appel pour éviter les problèmes de cache
 */
export function getClient(): GraphQLClient {
	return new GraphQLClient(HASHNODE_ENDPOINT, { headers: getAuthHeaders() });
}

/**
 * Construit les headers HTTP pour les requêtes GraphQL.
 *
 * Depuis le 13 mai 2026, Hashnode a placé l'API GraphQL derrière le plan Pro :
 * sans token valide d'une publication Pro, l'endpoint redirige toutes les
 * requêtes vers une page d'annonce HTML (d'où les erreurs "Unexpected token '<'").
 *
 * Hashnode attend le Personal Access Token brut dans le header `Authorization`
 * (PAS de préfixe "Bearer"). Les requêtes authentifiées bypassent aussi le
 * cache CDN Stellate — on n'a donc plus besoin des hacks de cache-busting.
 */
export function getAuthHeaders(): Record<string, string> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (HASHNODE_TOKEN) {
		headers.Authorization = HASHNODE_TOKEN;
	}
	return headers;
}

/**
 * Exécute une requête GraphQL contre l'API Hashnode.
 *
 * Centralise : endpoint propre, header d'auth, et un garde-fou qui transforme
 * les réponses HTML (panne, 301/522, accès bloqué) en erreur explicite au lieu
 * du JSON.parse('<!DOCTYPE...') illisible.
 *
 * @param body - Le corps de la requête ({ query, variables })
 * @returns Le JSON parsé de la réponse
 * @throws Error lisible si la réponse n'est pas du JSON
 */
export async function hashnodeFetch(body: {
	query: string;
	variables?: Record<string, unknown>;
}): Promise<any> {
	const response = await fetch(HASHNODE_ENDPOINT, {
		method: "POST",
		headers: getAuthHeaders(),
		body: JSON.stringify(body),
		cache: "no-store",
	});

	const text = await response.text();

	// Garde-fou : une réponse qui ne commence pas par "{" n'est pas du JSON GraphQL.
	// C'est typiquement la page d'erreur/redirection HTML de Cloudflare quand
	// l'API est indisponible ou que la publication n'est pas Pro (allow-listée).
	if (!text.trimStart().startsWith("{")) {
		const hint = !HASHNODE_TOKEN
			? "Aucun HASHNODE_TOKEN configuré — l'API Hashnode requiert un plan Pro depuis le 13 mai 2026."
			: "Token présent mais refusé — vérifie que la publication est bien Pro et que le token est valide.";
		throw new Error(
			`[Hashnode] Réponse non-JSON (status ${response.status}). ${hint} Début: ${text.slice(0, 120)}`,
		);
	}

	return JSON.parse(text);
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
