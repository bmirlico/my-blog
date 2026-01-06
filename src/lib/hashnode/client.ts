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
 */
export const HASHNODE_HOST = import.meta.env.HASHNODE_HOST as string;

// Vérification que la variable d'environnement est définie
if (!HASHNODE_HOST) {
  console.warn(
    "HASHNODE_HOST n'est pas défini dans les variables d'environnement. " +
    "Crée un fichier .env avec HASHNODE_HOST=ton-blog.hashnode.dev"
  );
}
