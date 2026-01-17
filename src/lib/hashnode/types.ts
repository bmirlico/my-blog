/**
 * Types TypeScript pour l'API Hashnode
 *
 * Ces types correspondent à la structure des données retournées par l'API GraphQL.
 * Ils permettent l'autocomplétion dans l'IDE et la détection d'erreurs à la compilation.
 */

// ==================== Types de base ====================

/**
 * Auteur d'un article
 */
export interface Author {
	name: string;
	profilePicture?: string;
	bio?: string;
}

/**
 * Tag d'un article
 */
export interface Tag {
	name: string;
	slug: string;
}

/**
 * Image de couverture
 */
export interface CoverImage {
	url: string;
}

/**
 * Contenu d'un article (HTML ou Markdown)
 */
export interface Content {
	html: string;
	markdown?: string;
}

/**
 * Description (pour les séries)
 */
export interface Description {
	html: string;
	text?: string;
}

// ==================== Types principaux ====================

/**
 * Article/Post de Hashnode
 */
export interface Post {
	id: string;
	title: string;
	slug: string;
	brief: string;
	publishedAt: string;
	readTimeInMinutes: number;
	coverImage?: CoverImage;
	author: Author;
	tags?: Tag[];
	content?: Content;
	series?: {
		name: string;
		slug: string;
	};
}

/**
 * Série d'articles
 */
export interface Series {
	id: string;
	name: string;
	slug: string;
	description?: Description;
	coverImage?: string;
	posts?: {
		totalDocuments: number;
		edges?: Array<{
			node: Post;
		}>;
	};
}

// ==================== Types de réponse API ====================

/**
 * Structure d'un edge (noeud) dans une liste paginée
 */
export interface PostEdge {
	node: Post;
}

export interface SeriesEdge {
	node: Series;
}

/**
 * Réponse pour la liste des articles
 */
export interface PostsResponse {
	publication: {
		posts: {
			edges: PostEdge[];
			pageInfo?: {
				hasNextPage: boolean;
				endCursor?: string;
			};
		};
	};
}

/**
 * Réponse pour un article unique
 */
export interface PostResponse {
	publication: {
		post: Post | null;
	};
}

/**
 * Réponse pour la liste des séries
 */
export interface SeriesListResponse {
	publication: {
		seriesList: {
			edges: SeriesEdge[];
			totalDocuments?: number;
		};
	};
}

/**
 * Réponse pour une série unique
 */
export interface SeriesResponse {
	publication: {
		series: Series | null;
	};
}

/**
 * Réponse pour les informations de la publication (blog)
 */
export interface PublicationResponse {
	publication: {
		title: string;
		displayTitle?: string;
		descriptionSEO?: string;
		about?: {
			html: string;
		};
	};
}
