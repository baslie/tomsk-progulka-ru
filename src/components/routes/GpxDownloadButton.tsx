import * as React from "react";
import { Button } from "@/components/ui/Button";
import { downloadGpx } from "@/lib/gpx";
import type { GeoJsonLineString } from "@/lib/gpx";

export type GpxVariant =
  | { name: string; label?: string; gpx: GeoJsonLineString; slug: string }
  | { name: string; label?: string; href: string };

interface Props {
  // Одиночный режим (обратная совместимость).
  gpx?: GeoJsonLineString;
  slug?: string;
  name?: string;
  // Несколько вариантов для скачивания.
  variants?: GpxVariant[];
  // Inline-режим: каждый вариант — отдельная кнопка (без выпадающего меню).
  inline?: boolean;
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function triggerVariant(v: GpxVariant) {
  if ("href" in v) {
    const a = document.createElement("a");
    a.href = v.href;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else {
    downloadGpx(v.gpx, v.slug, v.name);
  }
}

export function GpxDownloadButton({ gpx, slug, name, variants, inline }: Props) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Inline-режим → отдельная кнопка на каждый вариант (без меню).
  if (inline && variants && variants.length > 0) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {variants.map((v) => (
          <Button
            key={v.name}
            variant="default"
            onClick={() => triggerVariant(v)}
            className="gap-2"
          >
            <DownloadIcon />
            {v.label ?? v.name}
          </Button>
        ))}
      </div>
    );
  }

  // Несколько вариантов → выпадающее меню.
  if (variants && variants.length > 1) {
    return (
      <div ref={ref} className="relative">
        <Button variant="outline" onClick={() => setOpen((v) => !v)} className="gap-2">
          <DownloadIcon />
          Скачать GPX
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Button>
        {open && (
          <div className="absolute z-[500] mt-1 min-w-[16rem] rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg">
            {variants.map((v) => (
              <button
                key={v.name}
                type="button"
                onClick={() => {
                  triggerVariant(v);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--muted)]"
              >
                <DownloadIcon />
                <span>{v.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Один вариант.
  const single = variants?.[0];
  return (
    <Button
      variant="outline"
      onClick={() => {
        if (single) triggerVariant(single);
        else if (gpx && slug && name) downloadGpx(gpx, slug, name);
      }}
      className="gap-2"
    >
      <DownloadIcon />
      Скачать GPX
    </Button>
  );
}
