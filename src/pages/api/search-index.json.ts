import type { APIRoute } from "astro";
import { getAllPosts } from "@/lib/hashnode/api";

export const prerender = true;

export const GET: APIRoute = async () => {
	try {
		const posts = await getAllPosts();

		const searchIndex = posts.map((post) => {
			// Extract text content from HTML content (remove tags)
			const htmlContent = post.content?.html || "";
			const textContent = htmlContent
				.replace(/<[^>]+>/g, " ")
				.replace(/\s+/g, " ")
				.trim();

			return {
				id: post.id || "",
				title: post.title || "",
				description: post.brief || "",
				date: post.publishedAt || new Date().toISOString(),
				tags: post.tags?.map((tag) => tag.name) || [],
				authors: post.author ? [post.author.name] : [],
				url: `/articles/${post.slug}`,
				// Include full content for better search results
				content: textContent, // Full content for indexing
			};
		});

		return new Response(JSON.stringify(searchIndex), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, max-age=3600",
			},
		});
	} catch (error) {
		console.error("Error generating search index:", error);
		// Return empty array on error instead of failing
		return new Response(JSON.stringify([]), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, max-age=3600",
			},
		});
	}
};
