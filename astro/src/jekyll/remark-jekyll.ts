/**
 * remark plugin: makes Jekyll/Chirpy Markdown render in Astro without editing the posts.
 *
 * - `{% include x.html a="b" %}` lines render the real _includes/x.html through Liquid (see site.ts).
 * - Chirpy prompts (`> text` followed by `{: .prompt-tip }`) become styled callouts.
 * - Other kramdown attribute lists (`{: .class width="700" }`) are dropped.
 * - `{% raw %}` / `{% endraw %}` markers are removed, so code that shows Liquid renders literally.
 */
import path from "node:path";
import { visit, SKIP } from "unist-util-visit";
import { getSite, renderInclude } from "./site";

const INCLUDE_RE = /\{%-?\s*include\s+([\w./-]+)([\s\S]*?)-?%\}/g;
const PARAM_RE = /([\w-]+)\s*=\s*(?:["“”]([^"“”]*)["“”]|'([^']*)'|([^\s"']+))/g;
const PROMPT_RE = /\n?\{:\s*\.prompt-(tip|info|warning|danger)\s*\}\s*$/;
const IAL_RE = /\{:\s*[^}]*\}/g;
const RAW_RE = /\{%-?\s*(?:raw|endraw)\s*-?%\}/g;

function parseParams(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of s.matchAll(PARAM_RE)) out[m[1]] = m[2] ?? m[3] ?? m[4] ?? "";
  return out;
}

function nodeText(node: any): string {
  if (node.type === "text" || node.type === "inlineCode") return node.value;
  return (node.children ?? []).map(nodeText).join("");
}

export default function remarkJekyll() {
  return async (tree: any, file: any) => {
    const filePath: string = file.path ?? file.history?.[0] ?? "";
    const site = getSite();
    const page = site.posts.find((p: any) => p.path === path.resolve(filePath)) ?? {};

    // 1. raw markers, everywhere (including code blocks)
    visit(tree, (node: any) => {
      if (typeof node.value === "string" && node.value.includes("raw")) node.value = node.value.replace(RAW_RE, "");
    });

    // 1b. ```mermaid fences: drawn in the browser (src/custom/BodyEnd.astro)
    visit(tree, "code", (node: any, index: number | undefined, parent: any) => {
      if (node.lang !== "mermaid" || parent == null || index == null) return;
      const esc = node.value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      parent.children[index] = { type: "html", value: `<pre class="mermaid">${esc}</pre>` };
    });

    // 2. prompts: a blockquote whose last paragraph ends with the attribute list
    visit(tree, "blockquote", (node: any) => {
      const last = node.children?.[node.children.length - 1];
      const tail = last?.children?.[last.children.length - 1];
      if (tail?.type !== "text") return;
      const m = tail.value.match(PROMPT_RE);
      if (!m) return;
      tail.value = tail.value.replace(PROMPT_RE, "");
      node.data = { ...(node.data ?? {}), hProperties: { className: ["prompt", `prompt-${m[1]}`] } };
    });

    // 3. includes: paragraphs that are only include tags, or html nodes that contain them
    const jobs: Promise<void>[] = [];
    visit(tree, (node: any, index: number | undefined, parent: any) => {
      if (parent == null || index == null) return;
      const isPara = node.type === "paragraph" && /^\s*\{%-?\s*include\s/.test(nodeText(node));
      const isHtml = node.type === "html" && INCLUDE_RE.test(node.value);
      INCLUDE_RE.lastIndex = 0;
      if (!isPara && !isHtml) return;
      const source = isPara ? nodeText(node) : node.value;
      const replacement: any = { type: "html", value: "" };
      parent.children[index] = replacement;
      jobs.push(
        (async () => {
          let html = "";
          let cursor = 0;
          for (const m of source.matchAll(INCLUDE_RE)) {
            html += source.slice(cursor, m.index);
            html += await renderInclude(m[1], parseParams(m[2]), page);
            cursor = (m.index ?? 0) + m[0].length;
          }
          replacement.value = html + source.slice(cursor);
        })()
      );
      return SKIP;
    });
    await Promise.all(jobs);

    // 4. remaining kramdown attribute lists in prose
    visit(tree, "text", (node: any) => {
      if (node.value.includes("{:")) node.value = node.value.replace(IAL_RE, "");
    });
  };
}
