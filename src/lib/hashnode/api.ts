/**
 * Hashnode API Functions
 *
 * This file exposes simple functions to fetch data.
 * These functions encapsulate GraphQL queries and return typed data.
 *
 * Usage in an Astro page:
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

// ==================== Article Functions ====================

/**
 * Fetches all published articles
 * @param first - Number of articles to fetch (default: 50)
 * @returns List of articles sorted by publication date (newest first)
 */
export async function getAllPosts(first: number = 50): Promise<Post[]> {
	console.log(
		"[Hashnode API] getAllPosts called with host:",
		HASHNODE_HOST,
		"first:",
		first,
	);

	// Static query - ISR on Vercel handles data freshness
	const query = `
query GetAllPosts {
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

		// Check for GraphQL errors
		if (data.errors) {
			console.error(
				"[Hashnode API] GraphQL errors:",
				JSON.stringify(data.errors),
			);
			return [];
		}

		// Check that publication exists
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
 * Fetches an article by its slug
 * @param slug - Unique identifier of the article (in URL)
 * @returns The article or null if not found
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

	// Timestamp to force absolute cache-bust
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
 * Fetches the N most recent articles
 * @param count - Number of articles to fetch
 * @returns List of recent articles
 */
export async function getRecentPosts(count: number = 5): Promise<Post[]> {
	// Always fetch 50 to avoid Stellate cache issues with small values
	const posts = await getAllPosts(50);
	return posts.slice(0, count);
}

// ==================== Series Functions ====================

/**
 * Fetches all series
 * @param first - Number of series to fetch (default: 20)
 * @returns List of series
 */
export async function getAllSeries(first: number = 20): Promise<Series[]> {
	console.log(
		"[Hashnode API] getAllSeries called with host:",
		HASHNODE_HOST,
		"first:",
		first,
	);

	// Static query - ISR on Vercel handles data freshness
	const query = `
query GetAllSeries {
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
 * Fetches a series by its slug with all its articles
 * @param slug - Unique identifier of the series
 * @returns The series with its articles or null if not found
 */
export async function getSeriesBySlug(slug: string): Promise<Series | null> {
	console.log(
		"[Hashnode API] getSeriesBySlug called with slug:",
		slug,
		"host:",
		HASHNODE_HOST,
	);

	// Inline query (without variables) to avoid Stellate cache issues
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
 * Fetches the N "featured" series (to highlight on the Home page)
 * @param count - Number of series to fetch
 * @returns List of featured series
 */
export async function getFeaturedSeries(count: number = 2): Promise<Series[]> {
	// Always fetch 20 to avoid Stellate cache issues with small values
	const series = await getAllSeries(20);
	return series.slice(0, count);
}

// ==================== Publication Functions ====================

/**
 * Fetches general blog information
 * @returns Publication information
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
		console.error("Error fetching blog info:", error);
		return null;
	}
}

// ==================== Utilities ====================

/**
 * Type for headings extracted from HTML (compatible with Astro MarkdownHeading)
 */
export interface ExtractedHeading {
	depth: number;
	slug: string;
	text: string;
}

/**
 * Extracts headings (h2-h6) from HTML content to generate a table of contents
 * @param html - HTML content of the article
 * @returns List of headings with their depth, slug and text
 */
export function extractHeadingsFromHtml(html: string): ExtractedHeading[] {
	if (!html) return [];

	const headings: ExtractedHeading[] = [];

	// Regex to find h2-h6 tags with their content
	// Captures: level (2-6), optional id, and text
	const headingRegex =
		/<h([2-6])(?:[^>]*id=["']([^"']+)["'])?[^>]*>(.*?)<\/h\1>/gi;

	let match;
	while ((match = headingRegex.exec(html)) !== null) {
		const depth = parseInt(match[1], 10);
		let id = match[2] || "";
		const rawText = match[3];

		// Clean HTML text (remove internal tags)
		const text = rawText.replace(/<[^>]+>/g, "").trim();

		// If no id, generate a slug from the text
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
 * Formats an ISO date to a readable format
 * @param dateString - Date in ISO format
 * @returns Formatted date (e.g.: "January 6, 2026")
 */
export function formatDate(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

/**
 * Fetches articles from a specific series
 * @param seriesSlug - Series slug
 * @returns List of articles in the series
 */
export async function getPostsBySeries(seriesSlug: string): Promise<Post[]> {
	const series = await getSeriesBySlug(seriesSlug);

	if (!series || !series.posts?.edges) {
		return [];
	}

	return series.posts.edges.map((edge) => edge.node);
}

/**
 * Fetches adjacent articles (previous and next) for navigation
 * @param currentSlug - Current article slug
 * @returns { older: Post | null, newer: Post | null }
 */
export async function getAdjacentPosts(currentSlug: string): Promise<{
	older: Post | null;
	newer: Post | null;
}> {
	const allPosts = await getAllPosts(50); // All articles sorted by date (max 50 per Hashnode API)
	const currentIndex = allPosts.findIndex((post) => post.slug === currentSlug);

	if (currentIndex === -1) {
		return { older: null, newer: null };
	}

	return {
		// newer = more recent article (lower index in array)
		newer: currentIndex > 0 ? allPosts[currentIndex - 1] : null,
		// older = older article (higher index in array)
		older:
			currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null,
	};
}
