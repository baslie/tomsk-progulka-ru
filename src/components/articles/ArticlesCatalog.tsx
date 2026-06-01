import * as React from "react";
import { ARTICLE_CATEGORY_LABELS } from "@/lib/constants";
import { replaceSearch } from "@/lib/url";

export interface ArticleListItem {
  slug: string;
  title: string;
  description?: string;
  category: keyof typeof ARTICLE_CATEGORY_LABELS;
  coverImage?: string;
  publishedAt: string;
  authorName?: string;
}

const CATEGORIES: Array<{ value: "all" | keyof typeof ARTICLE_CATEGORY_LABELS; label: string }> = [
  { value: "all", label: "Все" },
  { value: "how_to_get", label: ARTICLE_CATEGORY_LABELS.how_to_get },
  { value: "what_to_take", label: ARTICLE_CATEGORY_LABELS.what_to_take },
  { value: "general", label: ARTICLE_CATEGORY_LABELS.general },
];

function readCategory(search: string): "all" | keyof typeof ARTICLE_CATEGORY_LABELS {
  const sp = new URLSearchParams(search);
  const c = sp.get("category");
  if (c === "how_to_get" || c === "what_to_take" || c === "general") return c;
  return "all";
}

export function ArticlesCatalog({ articles }: { articles: ArticleListItem[] }) {
  const [hydrated, setHydrated] = React.useState(false);
  const [category, setCategory] = React.useState<
    "all" | keyof typeof ARTICLE_CATEGORY_LABELS
  >("all");

  React.useEffect(() => {
    setCategory(readCategory(window.location.search));
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    const sp = new URLSearchParams(window.location.search);
    if (category === "all") sp.delete("category");
    else sp.set("category", category);
    replaceSearch(sp);
  }, [category, hydrated]);

  const filtered =
    category === "all" ? articles : articles.filter((a) => a.category === category);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const active = category === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              aria-pressed={active}
              className={
                "inline-flex h-9 items-center rounded-full border px-4 text-sm transition-colors " +
                (active
                  ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)]")
              }
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((article) => (
            <a
              key={article.slug}
              href={`/articles/${article.slug}/`}
              className="group flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition-all hover:shadow-md"
            >
              {article.coverImage && (
                <div className="aspect-[16/9] overflow-hidden bg-[var(--muted)]">
                  <img
                    src={article.coverImage}
                    alt={article.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-3 p-5">
                <span className="self-start rounded-full bg-[var(--secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--secondary-foreground)]">
                  {ARTICLE_CATEGORY_LABELS[article.category]}
                </span>
                <h3 className="line-clamp-2 text-lg font-semibold leading-tight">
                  {article.title}
                </h3>
                {article.description && (
                  <p className="line-clamp-3 text-sm text-[var(--muted-foreground)]">
                    {article.description}
                  </p>
                )}
                {article.authorName && (
                  <div className="mt-auto text-xs text-[var(--muted-foreground)]">
                    {article.authorName}
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border)] py-16 text-center text-[var(--muted-foreground)]">
          В этой категории пока нет статей.
        </div>
      )}
    </div>
  );
}
