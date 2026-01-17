/**
 * Point d'entrée du module Hashnode
 *
 * Ce fichier permet d'importer toutes les fonctions depuis un seul endroit:
 *
 * import { getAllPosts, getAllSeries, formatDate } from '@/lib/hashnode';
 */

// Réexporter toutes les fonctions API
export {
	formatDate,
	getAllPosts,
	getAllSeries,
	getFeaturedSeries,
	getPostBySlug,
	getPostsBySeries,
	getPublicationInfo,
	getRecentPosts,
	getSeriesBySlug,
} from "./api";
// Réexporter le client si besoin de requêtes personnalisées
export { getClient, HASHNODE_HOST } from "./client";
// Réexporter les types pour une utilisation dans les composants
export type {
	Author,
	Content,
	CoverImage,
	Post,
	Series,
	Tag,
} from "./types";
