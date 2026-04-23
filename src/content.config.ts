import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    slug: z.string().optional(),
    description: z.string().optional(),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    teaser: z.string().optional(),
    meta_description: z.string().optional(),
    show_meta: z.boolean().optional(),
    comments: z.boolean().optional(),
    permalink: z.string().optional(),
  }),
});

const pages = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    route: z.string(),
    hidden: z.boolean().optional(),
  }),
});

export const collections = { posts, pages };
