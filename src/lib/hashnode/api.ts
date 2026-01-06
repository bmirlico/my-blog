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
  GET_POST_BY_SLUG,
  GET_ALL_SERIES,
  GET_SERIES_BY_SLUG,
  GET_PUBLICATION_INFO,
} from "./queries";
import type {
  Post,
  Series,
  PostsResponse,
  PostResponse,
  SeriesListResponse,
  SeriesResponse,
  PublicationResponse,
} from "./types";

// ==================== Fonctions pour les Articles ====================

/**
 * Récupère tous les articles publiés
 * @param first - Nombre d'articles à récupérer (défaut: 50)
 * @returns Liste des articles triés par date de publication (plus récent en premier)
 */
export async function getAllPosts(first: number = 50): Promise<Post[]> {
  const client = getClient();

  try {
    const data = await client.request<PostsResponse>(GET_ALL_POSTS, {
      host: HASHNODE_HOST,
      first,
    });

    // Extraire les articles des "edges" (structure GraphQL)
    return data.publication.posts.edges.map((edge) => edge.node);
  } catch (error) {
    console.error("Erreur lors de la récupération des articles:", error);
    return [];
  }
}

/**
 * Récupère un article par son slug
 * @param slug - Identifiant unique de l'article (dans l'URL)
 * @returns L'article ou null si non trouvé
 */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const client = getClient();

  try {
    const data = await client.request<PostResponse>(GET_POST_BY_SLUG, {
      host: HASHNODE_HOST,
      slug,
    });

    return data.publication.post;
  } catch (error) {
    console.error(`Erreur lors de la récupération de l'article "${slug}":`, error);
    return null;
  }
}

/**
 * Récupère les N articles les plus récents
 * @param count - Nombre d'articles à récupérer
 * @returns Liste des articles récents
 */
export async function getRecentPosts(count: number = 5): Promise<Post[]> {
  const posts = await getAllPosts(count);
  return posts.slice(0, count);
}

// ==================== Fonctions pour les Séries ====================

/**
 * Récupère toutes les séries
 * @param first - Nombre de séries à récupérer (défaut: 20)
 * @returns Liste des séries
 */
export async function getAllSeries(first: number = 20): Promise<Series[]> {
  const client = getClient();

  try {
    const data = await client.request<SeriesListResponse>(GET_ALL_SERIES, {
      host: HASHNODE_HOST,
      first,
    });

    return data.publication.seriesList.edges.map((edge) => edge.node);
  } catch (error) {
    console.error("Erreur lors de la récupération des séries:", error);
    return [];
  }
}

/**
 * Récupère une série par son slug avec tous ses articles
 * @param slug - Identifiant unique de la série
 * @returns La série avec ses articles ou null si non trouvée
 */
export async function getSeriesBySlug(slug: string): Promise<Series | null> {
  const client = getClient();

  try {
    const data = await client.request<SeriesResponse>(GET_SERIES_BY_SLUG, {
      host: HASHNODE_HOST,
      slug,
    });

    return data.publication.series;
  } catch (error) {
    console.error(`Erreur lors de la récupération de la série "${slug}":`, error);
    return null;
  }
}

/**
 * Récupère les N séries "featured" (à mettre en avant sur la Home)
 * @param count - Nombre de séries à récupérer
 * @returns Liste des séries en vedette
 */
export async function getFeaturedSeries(count: number = 2): Promise<Series[]> {
  const series = await getAllSeries(count);
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
    const data = await client.request<PublicationResponse>(GET_PUBLICATION_INFO, {
      host: HASHNODE_HOST,
    });

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
  const headingRegex = /<h([2-6])(?:[^>]*id=["']([^"']+)["'])?[^>]*>(.*?)<\/h\1>/gi;

  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const depth = parseInt(match[1], 10);
    let id = match[2] || '';
    const rawText = match[3];

    // Nettoyer le texte HTML (enlever les balises internes)
    const text = rawText.replace(/<[^>]+>/g, '').trim();

    // Si pas d'id, générer un slug à partir du texte
    if (!id) {
      id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
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
