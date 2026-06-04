/**
 * Post-traitement du HTML des articles Hashnode (côté serveur)
 *
 * Le HTML renvoyé par l'API Hashnode est injecté dans la page via `set:html`,
 * ce qui contourne le pipeline markdown d'Astro (coloration syntaxique, ids de
 * titres). Pour les articles "rich text", ça casse :
 *  - les blocs de code ne sont pas colorés ;
 *  - les titres n'ont pas d'`id`, donc les ancres de la table des matières
 *    ne fonctionnent pas.
 *
 * Ce module fait passer le HTML dans un pipeline unified/rehype qui :
 *  1. parse le fragment HTML ;
 *  2. injecte un `id` sur chaque titre qui n'en a pas (rehype-slug) — sans
 *     écraser les `id` déjà fournis par Hashnode (anciens articles markdown) ;
 *  3. colore les blocs de code avec les MÊMES thèmes que le reste du site
 *     (github-light / github-dark via rehype-pretty-code) ;
 *  4. re-sérialise en HTML.
 *
 * Le processeur est construit une seule fois au niveau module : dans un lambda
 * chaud, le highlighter Shiki n'est donc créé qu'une fois et réutilisé entre
 * les requêtes. Le résultat est par ailleurs mis en cache par l'ISR.
 */

import rehypeParse from "rehype-parse";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";

// Thèmes alignés sur astro.config.ts (markdown) et sur le CSS du site, qui
// consomme les variables --shiki-light / --shiki-dark (voir typography.css).
const processor = unified()
	.use(rehypeParse, { fragment: true })
	.use(rehypeSlug)
	.use(rehypePrettyCode, {
		theme: { light: "github-light", dark: "github-dark" },
		// Laisse le fond hériter du style du site plutôt que du thème Shiki.
		keepBackground: false,
	})
	.use(rehypeStringify, { allowDangerousHtml: true });

/**
 * Traite le HTML d'un article Hashnode : ids de titres + coloration du code.
 * @param html - HTML brut renvoyé par l'API Hashnode (post.content.html)
 * @returns HTML traité, prêt à être injecté via set:html
 */
export async function processArticleHtml(html: string): Promise<string> {
	if (!html) return "";
	const file = await processor.process(html);
	return String(file);
}
