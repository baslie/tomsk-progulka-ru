/**
 * Заменяет query-строку текущего URL без перезагрузки и без записи в историю.
 * Пустые параметры → URL без «?». Безопасно вызывать на сервере (no-op).
 */
export function replaceSearch(params: URLSearchParams | string): void {
  if (typeof window === "undefined") return;
  const search = typeof params === "string" ? params : params.toString();
  const url = search
    ? `${window.location.pathname}?${search}`
    : window.location.pathname;
  window.history.replaceState(null, "", url);
}
