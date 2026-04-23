import type { CollectionEntry } from "astro:content";
import { getCollection } from "astro:content";

export type BlogPost = CollectionEntry<"posts">;

export const isWorklogPost = (post: BlogPost): boolean => {
  const joinedCategories = (post.data.categories || []).join(" ").toLowerCase();
  const title = post.data.title.toLowerCase();
  return (
    joinedCategories.includes("report") ||
    joinedCategories.includes("worklog") ||
    joinedCategories.includes("项目日志") ||
    title.includes("工作周报")
  );
};

export const sortedBlogPosts = (posts: BlogPost[]): BlogPost[] =>
  [...posts]
    .filter((p) => !isWorklogPost(p))
    .sort(
      (a, b) =>
        new Date(b.data.date as unknown as string).getTime() -
        new Date(a.data.date as unknown as string).getTime(),
    );

export const getVisiblePosts = async (): Promise<BlogPost[]> => {
  const posts = await getCollection("posts");
  return sortedBlogPosts(posts);
};
