import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				// The page's <title> in search results and browser tabs, when it should say more than the
				// page's heading (src/seo.ts).
				seoTitle: z.string().optional(),
			}),
		}),
	}),
};
