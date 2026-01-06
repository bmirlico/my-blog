/**
 * Requêtes GraphQL pour l'API Hashnode
 *
 * GraphQL permet de demander exactement les données dont on a besoin.
 * Chaque requête est une chaîne de caractères qui décrit la structure des données souhaitées.
 *
 * Variables:
 * - $host: Le hostname de ton blog (ex: the-learning-machine.hashnode.dev)
 * - $first: Nombre d'éléments à récupérer (pagination)
 * - $slug: Identifiant unique d'un article ou d'une série
 */

import { gql } from "graphql-request";

// ==================== Requêtes pour les Articles ====================

/**
 * Récupère tous les articles publiés
 * Utilisé sur la page Articles et pour générer les routes statiques
 */
export const GET_ALL_POSTS = gql`
  query GetAllPosts($host: String!, $first: Int!) {
    publication(host: $host) {
      posts(first: $first) {
        edges {
          node {
            id
            title
            slug
            brief
            publishedAt
            readTimeInMinutes
            coverImage {
              url
            }
            author {
              name
              profilePicture
            }
            tags {
              name
              slug
            }
            series {
              name
              slug
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

/**
 * Récupère un article par son slug
 * Utilisé sur la page de détail d'un article
 */
export const GET_POST_BY_SLUG = gql`
  query GetPost($host: String!, $slug: String!) {
    publication(host: $host) {
      post(slug: $slug) {
        id
        title
        slug
        brief
        publishedAt
        readTimeInMinutes
        coverImage {
          url
        }
        author {
          name
          profilePicture
          bio
        }
        tags {
          name
          slug
        }
        content {
          html
          markdown
        }
        series {
          name
          slug
        }
      }
    }
  }
`;

// ==================== Requêtes pour les Séries ====================

/**
 * Récupère toutes les séries
 * Utilisé sur la page Series et la page Home (featured series)
 */
export const GET_ALL_SERIES = gql`
  query GetAllSeries($host: String!, $first: Int!) {
    publication(host: $host) {
      seriesList(first: $first) {
        edges {
          node {
            id
            name
            slug
            description {
              html
              text
            }
            coverImage
            posts(first: 1) {
              totalDocuments
            }
          }
        }
      }
    }
  }
`;

/**
 * Récupère une série avec tous ses articles
 * Utilisé sur la page de détail d'une série
 */
export const GET_SERIES_BY_SLUG = gql`
  query GetSeries($host: String!, $slug: String!) {
    publication(host: $host) {
      series(slug: $slug) {
        id
        name
        slug
        description {
          html
          text
        }
        coverImage
        posts(first: 50) {
          totalDocuments
          edges {
            node {
              id
              title
              slug
              brief
              publishedAt
              readTimeInMinutes
              coverImage {
                url
              }
            }
          }
        }
      }
    }
  }
`;

// ==================== Requêtes pour la Publication (informations du blog) ====================

/**
 * Récupère les informations générales du blog
 * Peut être utilisé pour la page About ou les métadonnées
 */
export const GET_PUBLICATION_INFO = gql`
  query GetPublicationInfo($host: String!) {
    publication(host: $host) {
      title
      displayTitle
      descriptionSEO
      about {
        html
      }
    }
  }
`;
