declare module '*.mdx' {
  import type { ComponentType } from 'react';
  const Component: ComponentType<any>;
  // `frontmatter` is populated by remark-mdx-frontmatter (registered in
  // apps/web/vite.config.ts) — the YAML block at the top of each scene is
  // parsed into a named export so the manifest can derive `mapState`
  // without a parallel literal.
  export const frontmatter: Record<string, any>;
  export default Component;
}
