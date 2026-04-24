export type NavItem = {
  title: string;
  href: string;
};

export const navLeft: NavItem[] = [
  { title: "首页", href: "/" },
  { title: "全部文章", href: "/blog/" },
  { title: "主题索引", href: "/topics/" }
];

export const navRight: NavItem[] = [
  { title: "搜索", href: "/search/" },
  { title: "关于", href: "/info/" }
];
