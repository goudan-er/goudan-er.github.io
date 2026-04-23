import fs from "node:fs/promises";
import path from "node:path";

const ROOT = "/workspace";
const POSTS_DIR = path.join(ROOT, "_posts");
const PAGES_DIR = path.join(ROOT, "pages");
const OUT_POSTS = path.join(ROOT, "src", "content", "posts");
const OUT_PAGES = path.join(ROOT, "src", "content", "pages");

const CATEGORY_MAP = {
  cpp: "C++",
  go: "Go",
  system: "后端技术 / 系统 / 分布式",
  algorithm: "算法",
  graphics: "图形学",
  "杂": "杂项",
  misc: "杂项",
  report: "项目日志",
};

const PAGE_ROUTE_MAP = {
  "algorithm.md": "/share/algorithm/",
  "cpp.md": "/share/cpp/",
  "go.md": "/share/go/",
  "misc.md": "/share/misc/",
  "system.md": "/share/system/",
  "report.md": "/report/",
  "worklog.md": "/worklog/",
  "search.md": "/search/",
  "topics.md": "/topics/",
  "cv.md": "/cv/",
  "info.md": "/info/",
  "palette.md": "/palette/",
  "markdown.md": "/markdown/",
  "404.md": "/404",
  "graphics-old.md": "/graphics-old/",
};

const GENERATED_PAGE_CONTENT = {
  "system.md": `## 后端技术 / 系统 / 分布式

这里汇总系统与分布式相关文章入口。你也可以直接在[所有文章](/blog/archive/)中按时间浏览。
`,
  "cpp.md": `## C++

这里汇总 C++ 相关文章入口。你也可以直接在[所有文章](/blog/archive/)中按时间浏览。
`,
  "go.md": `## Go

这里汇总 Go 相关文章入口。你也可以直接在[所有文章](/blog/archive/)中按时间浏览。
`,
  "algorithm.md": `## 算法

这里汇总算法相关文章入口。你也可以直接在[所有文章](/blog/archive/)中按时间浏览。
`,
  "misc.md": `## 杂项

这里汇总杂项相关文章入口。你也可以直接在[所有文章](/blog/archive/)中按时间浏览。
`,
  "report.md": `## 项目日志

这里保留项目相关日志入口。
`,
  "worklog.md": `## 工作日志

工作日志页面已收敛为单独入口。
`,
  "search.md": `## 站内搜索

请使用顶部导航中的「搜索」页面进行实时检索。
`,
  "topics.md": `## 编程语言

- [C++](/share/cpp/)
- [Go](/share/go/)

## 系统与后端

- [后端技术 / 系统 / 分布式](/share/system/)

## 算法与图形学

- [算法](/share/algorithm/)
- [图形学](/graphics/archive/)

## 其他

- [杂项](/share/misc/)
- [项目日志](/report/)
`,
};

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");

const parseFrontmatter = (raw) => {
  if (!raw.startsWith("---")) {
    return { data: {}, body: raw };
  }
  const parts = raw.split("---");
  if (parts.length < 3) {
    return { data: {}, body: raw };
  }
  const fm = parts[1];
  const body = parts.slice(2).join("---").trimStart();
  const data = {};
  let currentArrayKey = null;

  for (const line of fm.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const listMatch = trimmed.match(/^- (.+)$/);
    if (listMatch && currentArrayKey) {
      data[currentArrayKey] = data[currentArrayKey] || [];
      data[currentArrayKey].push(listMatch[1].trim().replace(/^"(.*)"$/, "$1"));
      continue;
    }
    const kvMatch = line.match(/^([A-Za-z0-9_\-]+):\s*(.*)$/);
    if (!kvMatch) continue;
    const key = kvMatch[1];
    let value = kvMatch[2].trim();
    if (!value) {
      currentArrayKey = key;
      data[key] = [];
      continue;
    }
    currentArrayKey = null;
    value = value.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    if (value === "true") value = true;
    else if (value === "false") value = false;
    data[key] = value;
  }
  return { data, body };
};

const sanitizeBody = (body) => {
  let out = body;
  out = out.replace(
    /<pre class="brush:\s*([^;"]+)[^"]*"[^>]*>([\s\S]*?)<\/pre>/gim,
    (_, lang, code) => {
      const decoded = code
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"');
      return `\n\`\`\`${lang.trim()}\n${decoded.trim()}\n\`\`\`\n`;
    },
  );
  out = out.replace(/\{\{\s*site\.url\s*\}\}/g, "");
  out = out.replace(/\{\{\s*site\.baseurl\s*\}\}/g, "");
  out = out.replace(/\{\{\s*site\.urlimg\s*\}\}/g, "/images");
  out = out.replace(/\{\%\s*include [^\%]+\%\}/g, "");
  out = out.replace(/\{\%\s*for[\s\S]*?\%\}[\s\S]*?\{\%\s*endfor\s*\%\}/g, "");
  out = out.replace(/\{\%\s*if[\s\S]*?\%\}[\s\S]*?\{\%\s*endif\s*\%\}/g, "");
  return out.trim() + "\n";
};

const collectFiles = async (dir) => {
  const out = [];
  const walk = async (d) => {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const abs = path.join(d, e.name);
      if (e.isDirectory()) await walk(abs);
      else if (e.isFile() && e.name.endsWith(".md")) out.push(abs);
    }
  };
  await walk(dir);
  return out;
};

const migratePosts = async () => {
  await ensureDir(OUT_POSTS);
  const files = await collectFiles(POSTS_DIR);
  const seen = new Set();

  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    const { data, body } = parseFrontmatter(raw);
    if (data.published === false || data.published === "false") continue;
    const base = path.basename(file, ".md");
    const m = base.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
    if (!m) continue;
    const date = m[1];
    const slug = m[2];

    const categories = Array.isArray(data.categories)
      ? data.categories
      : data.categories
        ? [data.categories]
        : [];
    const tags = Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [];
    const normalizedCats = categories
      .map((c) => String(c).trim())
      .filter(Boolean)
      .map((c) => CATEGORY_MAP[c] || c);

    if (normalizedCats.some((c) => c.includes("report") || c.includes("项目日志"))) {
      continue;
    }

    const permalink = `/${date.slice(0, 4)}/${slug}/`;
    const title = data.title || slug;
    const teaser = data.teaser || data.meta_description || "";
    const uid = slugify(`${date}-${slug}`) || slug;
    const outName = `${uid}.md`;
    if (seen.has(outName)) continue;
    seen.add(outName);

    const fm = [
      "---",
      `title: "${String(title).replace(/"/g, '\\"')}"`,
      `date: "${date}"`,
      `slug: "${slug}"`,
      `permalink: "${permalink}"`,
      `description: "${String(teaser).replace(/"/g, '\\"')}"`,
      `categories: [${normalizedCats.map((c) => `"${String(c).replace(/"/g, '\\"')}"`).join(", ")}]`,
      `tags: [${tags.map((t) => `"${String(t).replace(/"/g, '\\"')}"`).join(", ")}]`,
      "---",
      "",
    ].join("\n");

    const out = fm + sanitizeBody(body);
    await fs.writeFile(path.join(OUT_POSTS, outName), out, "utf8");
  }
};

const migratePages = async () => {
  await ensureDir(OUT_PAGES);
  const files = await collectFiles(PAGES_DIR);
  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    const { data, body } = parseFrontmatter(raw);
    const name = path.basename(file);
    const route = PAGE_ROUTE_MAP[name];
    if (!route) continue;
    const title = data.title || name.replace(/\.md$/, "");
    const hidden = route === "/404";
    const fm = [
      "---",
      `title: "${String(title).replace(/"/g, '\\"')}"`,
      `route: "${route}"`,
      `hidden: ${hidden ? "true" : "false"}`,
      "---",
      "",
    ].join("\n");
    const bodyContent = GENERATED_PAGE_CONTENT[name] || sanitizeBody(body);
    await fs.writeFile(path.join(OUT_PAGES, name), fm + bodyContent, "utf8");
  }
};

await migratePosts();
await migratePages();
console.log("Migration completed: Astro content generated.");
