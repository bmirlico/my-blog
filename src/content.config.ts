/**
 * Configuration des Content Collections Astro
 *
 * Ce fichier définit les collections de contenu local.
 * Note: Le contenu principal (articles, séries) vient maintenant de Hashnode.
 * On garde la collection "projects" si besoin de projets locaux.
 */

import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

// Collection Projects (optionnelle, pour afficher des projets)
const projects = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
	schema: ({ image }) =>
		z.object({
			name: z.string(),
			description: z.string(),
			tags: z.array(z.string()),
			image: image(),
			link: z.string().url(),
			startDate: z.coerce.date().optional(),
			endDate: z.coerce.date().optional(),
		}),
});

export const collections = { projects };
