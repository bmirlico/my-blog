/**
 * Point d'entrée du module Hashnode
 *
 * Ce fichier permet d'importer toutes les fonctions depuis un seul endroit:
 *
 * import { getAllPosts, getAllSeries, formatDate } from '@/lib/hashnode';
 */

// Réexporter toutes les fonctions API
export {
  getAllPosts,
  getPostBySlug,
  getRecentPosts,
  getAllSeries,
  getSeriesBySlug,
  getFeaturedSeries,
  getPublicationInfo,
  getPostsBySeries,
  formatDate,
} from "./api";

// Réexporter les types pour une utilisation dans les composants
export type {
  Post,
  Series,
  Author,
  Tag,
  CoverImage,
  Content,
} from "./types";

// Réexporter le client si besoin de requêtes personnalisées
export { getClient, HASHNODE_HOST } from "./client";
