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
 *  4. ajoute une barre de titre (langage + bouton "Copy") à chaque bloc de code
 *     façon Hashnode (le copier-coller est géré côté client par CodeCopy.astro) ;
 *  5. re-sérialise en HTML.
 *
 * Le processeur est construit une seule fois au niveau module : dans un lambda
 * chaud, le highlighter Shiki n'est donc créé qu'une fois et réutilisé entre
 * les requêtes. Le résultat est par ailleurs mis en cache par l'ISR.
 */

import type { Element, Properties, Root } from "hast";
import rehypeParse from "rehype-parse";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";

// Affiche un nom de langage lisible dans la barre de titre (sinon le code brut).
const LANG_LABELS: Record<string, string> = {
	js: "JavaScript",
	javascript: "JavaScript",
	jsx: "JSX",
	ts: "TypeScript",
	typescript: "TypeScript",
	tsx: "TSX",
	py: "Python",
	python: "Python",
	rb: "Ruby",
	ruby: "Ruby",
	go: "Go",
	rs: "Rust",
	rust: "Rust",
	java: "Java",
	c: "C",
	cpp: "C++",
	cs: "C#",
	php: "PHP",
	html: "HTML",
	css: "CSS",
	scss: "SCSS",
	json: "JSON",
	yaml: "YAML",
	yml: "YAML",
	md: "Markdown",
	markdown: "Markdown",
	sql: "SQL",
	graphql: "GraphQL",
	sh: "Shell",
	bash: "Bash",
	shell: "Shell",
	zsh: "Shell",
	console: "Shell",
	diff: "Diff",
	docker: "Dockerfile",
	dockerfile: "Dockerfile",
	text: "Plain Text",
	plaintext: "Plain Text",
	txt: "Plain Text",
};

function prettyLang(lang: string): string {
	return LANG_LABELS[lang.toLowerCase()] ?? lang;
}

/** Petit helper pour construire un nœud hast élément. */
function h(
	tagName: string,
	properties: Properties,
	children: Element["children"] = [],
): Element {
	return { type: "element", tagName, properties, children };
}

/** Icône "clipboard" (inline SVG) pour le bouton Copy. */
function copyIcon(): Element {
	return h(
		"svg",
		{
			className: ["code-copy-icon"],
			viewBox: "0 0 24 24",
			width: "14",
			height: "14",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			"aria-hidden": "true",
		},
		[
			h("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2" }, []),
			h(
				"path",
				{ d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" },
				[],
			),
		],
	);
}

/**
 * Plugin rehype : ajoute une barre de titre à chaque bloc de code généré par
 * rehype-pretty-code (les <figure data-rehype-pretty-code-figure>). La barre
 * contient le nom du langage et un bouton "Copy".
 */
function rehypeCodeHeader() {
	return (tree: Root) => {
		visit(tree, "element", (node: Element) => {
			if (node.tagName !== "figure") return;
			// Le <pre> coloré porte data-language (camelCasé en hast).
			const pre = node.children.find(
				(c): c is Element => c.type === "element" && c.tagName === "pre",
			);
			if (!pre) return;
			// rehype-pretty-code pose la clé brute "data-language" (non camelCasée).
			const rawLang = pre.properties?.["data-language"];
			const lang = typeof rawLang === "string" ? rawLang : "text";

			const header = h("div", { className: ["code-header"] }, [
				h("span", { className: ["code-lang"] }, [
					{ type: "text", value: prettyLang(lang) },
				]),
				h(
					"button",
					{
						type: "button",
						className: ["code-copy"],
						"aria-label": "Copy code to clipboard",
					},
					[
						copyIcon(),
						h("span", { className: ["code-copy-label"] }, [
							{ type: "text", value: "Copy" },
						]),
					],
				),
			]);

			node.children.unshift(header);
		});
	};
}

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
	.use(rehypeCodeHeader)
	.use(rehypeStringify, { allowDangerousHtml: true });

/**
 * Traite le HTML d'un article Hashnode : ids de titres + coloration du code
 * + barre de titre/Copy sur les blocs.
 * @param html - HTML brut renvoyé par l'API Hashnode (post.content.html)
 * @returns HTML traité, prêt à être injecté via set:html
 */
export async function processArticleHtml(html: string): Promise<string> {
	if (!html) return "";
	const file = await processor.process(html);
	return String(file);
}
