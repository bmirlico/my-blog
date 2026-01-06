/**
 * Flux RSS
 *
 * Génère un flux RSS avec tous les articles de Hashnode.
 */

import { SITE } from '@/consts'
import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { getAllPosts } from '@/lib/hashnode/api'

export async function GET(context: APIContext) {
  try {
    const posts = await getAllPosts()

    return rss({
      title: SITE.title,
      description: SITE.description,
      site: context.site ?? SITE.href,
      items: posts.map((post) => ({
        title: post.title,
        description: post.brief,
        pubDate: new Date(post.publishedAt),
        link: `/articles/${post.slug}/`,
      })),
    })
  } catch (error) {
    console.error('Error generating RSS feed:', error)
    return new Response('Error generating RSS feed', { status: 500 })
  }
}
