import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const build = resolve('apps/web/.next');
const output = resolve('docs/previews');
mkdirSync(output, { recursive: true });
const logo =
  'data:image/png;base64,' +
  readFileSync('apps/web/public/brand/magaram-logo.png').toString('base64');
const pages = {
  '/preview': 'index.html',
  '/preview/1': 'phase-1.html',
  '/preview/2': 'phase-2.html',
  '/preview/3': 'phase-3.html',
  '/preview/4': 'phase-4.html',
  '/preview/7': 'phase-7.html',
  '/preview/8': 'phase-8.html',
  '/preview/7/workspace': 'phase-7-workspace.html',
  '/preview/2/articles': 'articles.html',
  '/preview/2/articles/new': 'editor.html',
  '/preview/2/articles/demo-4': 'review-story.html',
  '/preview/2/review': 'review.html',
  '/preview/2/media': 'media.html',
  '/preview/2/settings': 'settings.html',
};
const links = {
  '/': 'index.html',
  '/login': 'phase-1.html',
  '/admin': 'phase-2.html',
  '/admin/ai': 'phase-3.html',
  '/admin/articles': 'articles.html',
  '/admin/articles/new': 'editor.html',
  '/admin/review': 'review.html',
  '/admin/media': 'media.html',
  '/admin/settings': 'settings.html',
  '/admin/articles/demo-4': 'review-story.html',
  '/news': 'phase-4.html',
  '/local': 'phase-7.html',
  '/admin/businesses': 'phase-7-workspace.html',
  '/admin/campaigns': 'phase-8.html',
  '/trust': 'phase-4.html',
  '/preview/4/news': 'phase-4.html',
  '/preview/4/trust': 'phase-4.html',
  '/preview/4/news/chennai-neighbourhood': 'phase-4.html',
  '/preview/4/news/local-business-guide': 'phase-4.html',
  '/preview/4/news/reading-spaces': 'phase-4.html',
  ...pages,
};
for (const [route, filename] of Object.entries(pages)) {
  let html = readFileSync(resolve(build, 'server/app' + route + '.html'), 'utf8');
  html = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/<link\b[^>]*rel="(?:preload|modulepreload)"[^>]*>/g, '');
  html = html.replace(
    /<link\b[^>]*href="([^"?]+\.css)(?:\?[^\"]*)?"[^>]*>/g,
    (_tag, href) =>
      '<style>' + readFileSync(resolve(build, href.replace('/_next/', '')), 'utf8') + '</style>',
  );
  html = html
    .replaceAll('/brand/magaram-logo.png', logo)
    .replace(/href="(\/[^\"]*)"/g, (_tag, url) => `href="${links[url] || 'index.html'}"`);
  html = html.replace(
    '<body>',
    '<body><div style="padding:10px 20px;background:#39242a;color:#fff;font:12px Arial;position:relative;z-index:100;text-align:center">OFFLINE DESIGN PREVIEW · Sample data · Navigation works; forms and publishing are inactive.</div>',
  );
  html = html.replaceAll(
    '<form',
    '<form onsubmit="event.preventDefault();alert(\'This is an offline design preview. Start the live application to save data.\')"',
  );
  html = html.replace(
    '</body>',
    '<script>document.querySelectorAll("button.mobile-menu").forEach(b=>b.addEventListener("click",()=>document.querySelector(".sidebar")?.classList.toggle("is-open")));document.querySelectorAll("button").forEach(b=>{if(b.textContent.includes("Open sample newsroom"))b.addEventListener("click",()=>location.href="phase-2.html")});</script></body>',
  );
  writeFileSync(resolve(output, filename), html);
}
console.info(
  `Exported ${Object.keys(pages).length} self-contained offline phase previews to docs/previews.`,
);
