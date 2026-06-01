# Томская Прогулка

[![Deploy to GitHub Pages](https://github.com/baslie/tomsk-progulka-ru/actions/workflows/deploy.yml/badge.svg)](https://github.com/baslie/tomsk-progulka-ru/actions/workflows/deploy.yml)

Статический сайт сообщества **Томская Прогулка** — каталог пешеходных маршрутов по Томску и области, статьи и информация о проекте.

🌐 **Live:** [tomsk-progulka.ru](https://tomsk-progulka.ru)

## Стек

- [Astro](https://astro.build/) v5 — статический генератор (SSG)
- [Tailwind CSS](https://tailwindcss.com/) v4 — стили
- [React](https://react.dev/) v19 — только для интерактивных островов (фильтры, карты)
- [Leaflet](https://leafletjs.com/) — карты маршрутов (vanilla, без `react-leaflet`)
- Контент: Markdown через Astro Content Collections с Zod-валидацией
- Хостинг: GitHub Pages + кастомный домен

## Локальный запуск

```bash
npm install
npm run dev          # http://localhost:4321
```

## Сборка

```bash
npm run build        # → dist/
npm run preview      # локальный предпросмотр продакшен-сборки
npm run check        # astro check (типы и контент-схемы)
```

## Структура проекта

```
src/
├── components/      # Astro- и React-компоненты
│   ├── articles/    # каталог статей
│   ├── layout/      # хедер, футер
│   ├── maps/        # Leaflet-карты
│   ├── routes/      # каталог и карточки маршрутов
│   ├── seo/         # мета-теги, OG, structured data
│   └── ui/          # базовые UI-примитивы (Button, Badge)
├── content/         # Markdown-контент с Zod-схемами
│   ├── articles/    # статьи блога
│   ├── pages/       # статические страницы (about, contacts)
│   └── routes/      # маршруты с GeoJSON-треком во frontmatter
├── layouts/         # макеты страниц
├── lib/             # утилиты (фильтры, GPX, slug, cn)
├── pages/           # роуты Astro
├── styles/          # глобальные стили
└── types/           # TS-типы
public/              # статика (картинки, favicon, robots.txt, CNAME)
```

Схемы полей контента описаны в [`src/content/config.ts`](./src/content/config.ts).

## Маршруты (роуты сайта)

Адреса указаны относительно корня сайта (`base` в `astro.config.mjs` не задан).

| Адрес              | Файл                              | Назначение                        |
| ------------------ | --------------------------------- | --------------------------------- |
| `/`                | `src/pages/index.astro`           | Главная страница                  |
| `/about`           | `src/pages/about.astro`           | О проекте                         |
| `/contacts`        | `src/pages/contacts.astro`        | Контакты                          |
| `/trails`          | `src/pages/trails.astro`          | Каталог маршрутов                 |
| `/articles`        | `src/pages/articles/index.astro`  | Список статей                     |
| `/articles/<slug>` | `src/pages/articles/[slug].astro` | Статья (динамический)             |
| `/routes/<slug>`   | `src/pages/routes/[slug].astro`   | Конкретный маршрут (динамический) |
| `/404`             | `src/pages/404.astro`             | Страница ошибки 404               |

Динамические роуты (`<slug>`) генерируются из контент-коллекций через `getStaticPaths`.

## Как добавить маршрут

Создайте файл `src/content/routes/<slug>.md` с frontmatter (см. существующие маршруты как пример). Обязательные поля: `title`, `description`, `cover`, `length_km`, `difficulty`, `duration_minutes`, `track` (GeoJSON LineString).

## Деплой

Автоматический деплой на GitHub Pages через GitHub Actions при пуше в `main` — см. [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml).

Кастомный домен сконфигурирован через `public/CNAME`.

## Лицензия

Контент сайта (тексты маршрутов, статьи, фотографии) принадлежит сообществу «Томская Прогулка». Исходный код — для образовательных целей.
