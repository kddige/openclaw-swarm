import { createFileRoute, notFound } from '@tanstack/react-router'
import { source } from '@/lib/source'

export const Route = createFileRoute('/llms.mdx/docs/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugs = params._splat?.split('/') ?? []
        const page = source.getPage(slugs)
        if (!page) throw notFound()

        const text = await page.data.getText('processed')

        return new Response(`# ${page.data.title} (${page.url})\n\n${text}`, {
          headers: {
            'Content-Type': 'text/markdown',
          },
        })
      },
    },
  },
})
