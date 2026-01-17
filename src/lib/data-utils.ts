/**
 * Utilitaires pour les données locales (Content Collections)
 *
 * Ce fichier contient uniquement les fonctions pour la collection "projects".
 * Les articles et séries viennent maintenant de Hashnode (voir src/lib/hashnode/).
 */

import { getCollection, type CollectionEntry } from "astro:content";

/**
 * Récupère tous les projets triés par date de début
 */
export async function getAllProjects(): Promise<CollectionEntry<"projects">[]> {
	const projects = await getCollection("projects");
	return projects.sort((a, b) => {
		const dateA = a.data.startDate?.getTime() || 0;
		const dateB = b.data.startDate?.getTime() || 0;
		return dateB - dateA;
	});
}
