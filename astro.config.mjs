// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import { unified } from "@astrojs/markdown-remark";
import rehypeExternalLinks from "rehype-external-links";

export default defineConfig({
  site: "https://tomsk-progulka.ru",
  redirects: {
    "/trails": "/",
  },
  // Внешние ссылки (http/https на чужие домены) в markdown/MDX-контенте
  // открываем в новой вкладке и не передаём ссылочный вес. Внутренние ссылки
  // (/trails/...) плагин не трогает. mdx() наследует markdown-конфиг, поэтому
  // правило действует и в .md, и в .mdx. См. также точечные rel в компонентах.
  // В Astro 6 плагины передаются через unified-процессор (markdown.processor).
  markdown: {
    processor: unified({
      rehypePlugins: [
        [
          rehypeExternalLinks,
          { target: "_blank", rel: ["nofollow", "noopener", "noreferrer"] },
        ],
      ],
    }),
  },
  integrations: [
    react(),
    mdx(),
    // Раздел «Статьи» временно скрыт: исключаем /articles (и возможные
    // страницы статей) из карты сайта. См. CLAUDE.md, «Скрытый раздел „Статьи“».
    sitemap({ filter: (page) => !page.includes("/articles") }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": new URL("./src", import.meta.url).pathname,
      },
      // Единственная копия React в dev-оптимизаторе и в SSR-графе.
      dedupe: ["react", "react-dom"],
    },
    // Заставляем Vite корректно пребандлить react-dom/client (иначе после
    // пере-оптимизации новых зависимостей ломается экспорт createRoot в dev).
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "photoswipe",
        "photoswipe/lightbox",
      ],
    },
  },
});
