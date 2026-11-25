import fs from "node:fs";
import path from "node:path";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import config from "@/config";
import { POSTS_DIR, postDate, postUrl, asList, FILE_RE } from "./jekyll/site";

/**
 * Posts are read straight from the Jekyll repo's _posts folder: nothing is copied or converted.
 * The prototype builds a representative sample (src/prototype-posts.json); set ALL_POSTS=1 to build
 * every published post.
 */
export const BLOG_PATH = path.relative(process.cwd(), POSTS_DIR);

const SAMPLE: string[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src/prototype-posts.json"), "utf8"));
const pattern = process.env.ALL_POSTS ? ["**/20*.md", "!private/**"] : SAMPLE;

function excerpt(file: string): string {
  const body = fs.readFileSync(file, "utf8").replace(/^---[\s\S]*?\n---\r?\n/, "");
  const head = body.split("<!-- more -->")[0];
  const para = head.split(/\n\s*\n/).map(s => s.trim()).find(s => s && !/^[#>{<|!`-]/.test(s)) ?? "";
  const text = para.replace(/\{:[^}]*\}/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, "").replace(/\s+/g, " ");
  return text.length > 200 ? `${text.slice(0, 197).replace(/\s+\S*$/, "")}…` : text;
}

const posts = defineCollection({
  loader: glob({
    pattern,
    base: BLOG_PATH,
    // The id is the Jekyll URL without the /posts/ prefix, so every URL stays the same. Jekyll fills in
    // the date from the file name and the description from the excerpt; this does the same.
    generateId: ({ entry, data }) => {
      const file = path.join(POSTS_DIR, entry);
      data.pubDatetime ??= postDate(file, data);
      // Jekyll titles an untitled post from its file name, and skips `published: false`.
      data.title ??= path.basename(entry).replace(/^\d{4}-\d{2}-\d{2}-|\.md$/g, "").split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      if (data.published === false || !FILE_RE.test(path.basename(entry))) data.draft = true;
      data.description ??= excerpt(file);
      return decodeURIComponent(postUrl(file, data).replace(/^\/posts\/|\/$/g, ""));
    },
  }),
  schema: ({ image }) =>
    z.object({
      author: z.string().default(config.site.author),
      pubDatetime: z.coerce.date(),
      modDatetime: z.coerce.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
      pin: z.boolean().optional(),
      draft: z.boolean().optional(),
      published: z.boolean().optional(),
      categories: z.preprocess(asList, z.array(z.string())).default([]),
      tags: z.preprocess(v => asList(v), z.array(z.string())).default([]),
      image: z.union([z.string(), z.object({ path: z.string(), alt: z.string().optional() })]).optional(),
      ogImage: image().or(z.string()).optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
      hideEditPost: z.boolean().optional(),
      hideToc: z.boolean().optional(),
      mermaid: z.boolean().optional(),
      project: z.string().optional(),
      lab: z.string().optional(),
      timezone: z
        .string()
        .optional()
        .transform(tz => tz || undefined),
    }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    ogImage: z.string().optional(),
    canonicalURL: z.string().optional(),
  }),
});

export const collections = { posts, pages };
