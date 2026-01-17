/**
 * Fonctions API pour Hashnode
 *
 * Ce fichier expose des fonctions simples pour récupérer les données.
 * Ces fonctions encapsulent les requêtes GraphQL et retournent des données typées.
 *
 * Utilisation dans une page Astro:
 * ```
 * import { getAllPosts } from '@/lib/hashnode/api';
 * const posts = await getAllPosts();
 * ```
 */

import { getClient, HASHNODE_HOST } from "./client";
import {
	GET_ALL_POSTS,
	GET_ALL_SERIES,
	GET_POST_BY_SLUG,
	GET_PUBLICATION_INFO,
	GET_SERIES_BY_SLUG,
} from "./queries";
import type {
	Post,
	PostResponse,
	PostsResponse,
	PublicationResponse,
	Series,
	SeriesListResponse,
	SeriesResponse,
} from "./types";

// ==================== Fonctions pour les Articles ====================

/**
 * Récupère tous les articles publiés
 * @param first - Nombre d'articles à récupérer (défaut: 50)
 * @returns Liste des articles triés par date de publication (plus récent en premier)
 */
export async function getAllPosts(first: number = 50): Promise<Post[]> {
	console.log(
		"[Hashnode API] getAllPosts called with host:",
		HASHNODE_HOST,
		"first:",
		first,
	);

	// Query nommée avec timestamp pour bypasser le cache Stellate
	// Stellate cache basé sur le texte de la query - un nom unique = pas de cache
	const timestamp = Date.now();
	const query = `
query GetAllPosts_${timestamp} {
	publication(host: "${HASHNODE_HOST}") {
		posts(first: ${first}) {
				edges {
					node {
						id
						title
						slug
						brief
						publishedAt
						readTimeInMinutes
						coverImage { url }
						author { name profilePicture }
						tags { name slug }
						series { name slug }
					}
				}
			}
		}
	}`;
	console.log("[Hashnode API] Query timestamp:", timestamp);
	console.log("[Hashnode API] Query:", query.substring(0, 100));

	try {
		const response = await fetch("https://gql.hashnode.com", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "no-cache, no-store, must-revalidate",
				Pragma: "no-cache",
			},
			body: JSON.stringify({ query }),
			cache: "no-store",
		});

		console.log("[Hashnode API] Response status:", response.status);

		const data = await response.json();
		console.log(
			"[Hashnode API] Response data:",
			JSON.stringify(data, null, 2).slice(0, 1000),
		);

		// Vérifier les erreurs GraphQL
		if (data.errors) {
			console.error(
				"[Hashnode API] GraphQL errors:",
				JSON.stringify(data.errors),
			);
			return [];
		}

		// Vérifier que la publication existe
		if (!data?.data?.publication) {
			console.error(
				"[Hashnode API] Publication not found for host:",
				HASHNODE_HOST,
			);
			return [];
		}

		if (!data.data.publication.posts?.edges) {
			console.error("[Hashnode API] No posts edges found");
			return [];
		}

		const posts = data.data.publication.posts.edges.map(
			(edge: any) => edge.node,
		);
		console.log("[Hashnode API] Found", posts.length, "posts");
		return posts;
	} catch (error) {
		console.error("[Hashnode API] Error fetching posts:", error);
		return [];
	}
}

/**
 * Récupère un article par son slug
 * @param slug - Identifiant unique de l'article (dans l'URL)
 * @returns L'article ou null si non trouvé
 */
export async function getPostBySlug(slug: string): Promise<Post | null> {
	console.log(
		"[Hashnode API] getPostBySlug called with slug:",
		slug,
		"host:",
		HASHNODE_HOST,
	);

	const query = `
    query GetPost($host: String!, $slug: String!) {
      publication(host: $host) {
        post(slug: $slug) {
          id
          title
          slug
          brief
          publishedAt
          readTimeInMinutes
          coverImage { url }
          author { name profilePicture }
          tags { name slug }
          content { html markdown }
          series { name slug }
        }
      }
    }
  `;

	// Timestamp pour forcer un cache-bust absolu
	const timestamp = Date.now();

	try {
		const response = await fetch("https://gql.hashnode.com", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "no-cache, no-store, must-revalidate",
				Pragma: "no-cache",
				"X-Request-Time": timestamp.toString(),
				"User-Agent": `Astro-Blog-Builder/1.0 (${timestamp})`,
			},
			body: JSON.stringify({
				query,
				variables: { host: HASHNODE_HOST, slug },
			}),
			cache: "no-store",
		});

		console.log(
			"[Hashnode API] getPostBySlug response status:",
			response.status,
		);

		const data = await response.json();
		console.log(
			"[Hashnode API] getPostBySlug raw response:",
			JSON.stringify(data).slice(0, 500),
		);
		console.log(
			"[Hashnode API] getPostBySlug for",
			slug,
			":",
			data?.data?.publication?.post ? "FOUND" : "NOT FOUND",
		);

		if (data.errors) {
			console.error(
				"[Hashnode API] GraphQL errors:",
				JSON.stringify(data.errors),
			);
			return null;
		}

		return data?.data?.publication?.post || null;
	} catch (error) {
		console.error(`[Hashnode API] Error fetching post "${slug}":`, error);
		return null;
	}
}

/**
 * Récupère les N articles les plus récents
 * @param count - Nombre d'articles à récupérer
 * @returns Liste des articles récents
 */
export async function getRecentPosts(count: number = 5): Promise<Post[]> {
	// Toujours fetch 50 pour éviter les problèmes de cache Stellate avec petites valeurs
	const posts = await getAllPosts(50);
	return posts.slice(0, count);
}

// ==================== Fonctions pour les Séries ====================

/**
 * Récupère toutes les séries
 * @param first - Nombre de séries à récupérer (défaut: 20)
 * @returns Liste des séries
 */
export async function getAllSeries(first: number = 20): Promise<Series[]> {
	console.log(
		"[Hashnode API] getAllSeries called with host:",
		HASHNODE_HOST,
		"first:",
		first,
	);

	// Query nommée avec timestamp pour bypasser le cache Stellate
	const timestamp = Date.now();
	const query = `
query GetAllSeries_${timestamp} {
	publication(host: "${HASHNODE_HOST}") {
		seriesList(first: ${first}) {
				edges {
					node {
						id
						name
						slug
						description { html text }
						coverImage
						posts(first: 20) {
							totalDocuments
							edges {
								node {
									id
									title
									slug
									brief
									publishedAt
									readTimeInMinutes
								}
							}
						}
					}
				}
			}
		}
	}`;

	try {
		const response = await fetch("https://gql.hashnode.com", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "no-cache, no-store, must-revalidate",
				Pragma: "no-cache",
			},
			body: JSON.stringify({ query }),
			cache: "no-store",
		});

		console.log(
			"[Hashnode API] getAllSeries response status:",
			response.status,
		);

		const data = await response.json();
		console.log(
			"[Hashnode API] getAllSeries response:",
			JSON.stringify(data, null, 2).slice(0, 1000),
		);

		if (data.errors) {
			console.error(
				"[Hashnode API] GraphQL errors:",
				JSON.stringify(data.errors),
			);
			return [];
		}

		if (!data?.data?.publication?.seriesList?.edges) {
			console.error("[Hashnode API] No series found");
			return [];
		}

		const series = data.data.publication.seriesList.edges.map(
			(edge: any) => edge.node,
		);
		console.log("[Hashnode API] Found", series.length, "series");
		return series;
	} catch (error) {
		console.error("[Hashnode API] Error fetching series:", error);
		return [];
	}
}

/**
 * Récupère une série par son slug avec tous ses articles
 * @param slug - Identifiant unique de la série
 * @returns La série avec ses articles ou null si non trouvée
 */
export async function getSeriesBySlug(slug: string): Promise<Series | null> {
	console.log(
		"[Hashnode API] getSeriesBySlug called with slug:",
		slug,
		"host:",
		HASHNODE_HOST,
	);

	// Requête inline (sans variables) pour éviter les problèmes de cache Stellate
	const query = `{
		publication(host: "${HASHNODE_HOST}") {
			series(slug: "${slug}") {
				id
				name
				slug
				description { html text }
				coverImage
				posts(first: 20) {
					totalDocuments
					edges {
						node {
							id
							title
							slug
							brief
							publishedAt
							readTimeInMinutes
							coverImage { url }
						}
					}
				}
			}
		}
	}`;

	try {
		const response = await fetch("https://gql.hashnode.com", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "no-cache, no-store, must-revalidate",
				Pragma: "no-cache",
			},
			body: JSON.stringify({ query }),
			cache: "no-store",
		});

		console.log(
			"[Hashnode API] getSeriesBySlug response status:",
			response.status,
		);

		const data = await response.json();
		console.log(
			"[Hashnode API] getSeriesBySlug for",
			slug,
			":",
			data?.data?.publication?.series ? "FOUND" : "NOT FOUND",
		);

		if (data.errors) {
			console.error(
				"[Hashnode API] GraphQL errors:",
				JSON.stringify(data.errors),
			);
			return null;
		}

		return data?.data?.publication?.series || null;
	} catch (error) {
		console.error(`[Hashnode API] Error fetching series "${slug}":`, error);
		return null;
	}
}

/**
 * Récupère les N séries "featured" (à mettre en avant sur la Home)
 * @param count - Nombre de séries à récupérer
 * @returns Liste des séries en vedette
 */
export async function getFeaturedSeries(count: number = 2): Promise<Series[]> {
	// Toujours fetch 20 pour éviter les problèmes de cache Stellate avec petites valeurs
	const series = await getAllSeries(20);
	return series.slice(0, count);
}

// ==================== Fonctions pour la Publication ====================

/**
 * Récupère les informations générales du blog
 * @returns Informations de la publication
 */
export async function getPublicationInfo() {
	const client = getClient();

	try {
		const data = await client.request<PublicationResponse>(
			GET_PUBLICATION_INFO,
			{
				host: HASHNODE_HOST,
			},
		);

		return data.publication;
	} catch (error) {
		console.error("Erreur lors de la récupération des infos du blog:", error);
		return null;
	}
}

// ==================== Utilitaires ====================

/**
 * Type pour les headings extraits du HTML (compatible avec Astro MarkdownHeading)
 */
export interface ExtractedHeading {
	depth: number;
	slug: string;
	text: string;
}

/**
 * Extrait les headings (h2-h6) du contenu HTML pour générer une table des matières
 * @param html - Contenu HTML de l'article
 * @returns Liste des headings avec leur profondeur, slug et texte
 */
export function extractHeadingsFromHtml(html: string): ExtractedHeading[] {
	if (!html) return [];

	const headings: ExtractedHeading[] = [];

	// Regex pour trouver les balises h2-h6 avec leur contenu
	// Capture: le niveau (2-6), l'id optionnel, et le texte
	const headingRegex =
		/<h([2-6])(?:[^>]*id=["']([^"']+)["'])?[^>]*>(.*?)<\/h\1>/gi;

	let match;
	while ((match = headingRegex.exec(html)) !== null) {
		const depth = parseInt(match[1], 10);
		let id = match[2] || "";
		const rawText = match[3];

		// Nettoyer le texte HTML (enlever les balises internes)
		const text = rawText.replace(/<[^>]+>/g, "").trim();

		// Si pas d'id, générer un slug à partir du texte
		if (!id) {
			id = text
				.toLowerCase()
				.replace(/[^\w\s-]/g, "")
				.replace(/\s+/g, "-")
				.replace(/-+/g, "-")
				.trim();
		}

		if (text) {
			headings.push({ depth, slug: id, text });
		}
	}

	return headings;
}

/**
 * Formate une date ISO en format lisible
 * @param dateString - Date au format ISO
 * @returns Date formatée (ex: "6 janvier 2026")
 */
export function formatDate(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString("fr-FR", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

/**
 * Récupère les articles d'une série spécifique
 * @param seriesSlug - Slug de la série
 * @returns Liste des articles de la série
 */
export async function getPostsBySeries(seriesSlug: string): Promise<Post[]> {
	const series = await getSeriesBySlug(seriesSlug);

	if (!series || !series.posts?.edges) {
		return [];
	}

	return series.posts.edges.map((edge) => edge.node);
}

/**
 * Récupère les articles adjacents (précédent et suivant) pour la navigation
 * @param currentSlug - Slug de l'article actuel
 * @returns { older: Post | null, newer: Post | null }
 */
export async function getAdjacentPosts(currentSlug: string): Promise<{
	older: Post | null;
	newer: Post | null;
}> {
	const allPosts = await getAllPosts(50); // Tous les articles triés par date (max 50 selon API Hashnode)
	const currentIndex = allPosts.findIndex((post) => post.slug === currentSlug);

	if (currentIndex === -1) {
		return { older: null, newer: null };
	}

	return {
		// newer = article plus récent (index inférieur dans le tableau)
		newer: currentIndex > 0 ? allPosts[currentIndex - 1] : null,
		// older = article plus ancien (index supérieur dans le tableau)
		older:
			currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null,
	};
}
