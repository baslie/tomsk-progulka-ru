// Кодировщик треков в формат «nktk» сервиса nakarte.me.
//
// Позволяет открыть наш маршрут на https://nakarte.me/ по ссылке вида
// `https://nakarte.me/#nktk=<urlSafeBase64(трек)>` — геометрия линии целиком
// закодирована в самом URL, без обращения к внешним файлам и CORS-прокси.
//
// Это минимальный порт формата версии 1 (собственный packed-формат: varint со
// смещениями + дельта-кодирование координат, БЕЗ protobuf) из MIT-репозитория
// wladich/nakarte (src/lib/leaflet.control.track-list/lib/parsers/nktk.js).
// Реализация — точное обратное к парсеру `unpackNumber`/`parseNktkOld`.
//
// Используется в build-time (вызывается из frontmatter .astro), поэтому работает
// в Node и не тянет клиентских зависимостей.

import type { GeoJsonLineString } from "@/lib/gpx";

// Масштаб координат: градусы → целочисленные «арк-юниты» (как в nakarte).
const ARC_UNIT = ((1 << 24) - 1) / 360;

/**
 * Упаковывает целое число в packed-varint nakarte — обратное к `unpackNumber`.
 * Старший бит каждого байта (кроме последнего) — признак продолжения; значение
 * хранится со смещением, зависящим от длины. Диапазон — до ±268 435 456.
 */
function packNumber(n: number): number[] {
  if (n >= -64 && n <= 63) {
    return [n + 64];
  }
  if (n >= -8192 && n <= 8191) {
    const raw = n + 8192;
    return [(raw & 0x7f) | 0x80, (raw >> 7) & 0x7f];
  }
  if (n >= -1048576 && n <= 1048575) {
    const raw = n + 1048576;
    return [(raw & 0x7f) | 0x80, ((raw >> 7) & 0x7f) | 0x80, (raw >> 14) & 0x7f];
  }
  const raw = n + 268435456;
  return [
    (raw & 0x7f) | 0x80,
    ((raw >> 7) & 0x7f) | 0x80,
    ((raw >> 14) & 0x7f) | 0x80,
    (raw >> 21) & 0xff,
  ];
}

/** utf8-строка → массив байтов (0–255). */
function utf8Bytes(s: string): number[] {
  return Array.from(new TextEncoder().encode(s));
}

/** Бинарная строка (символы 0–255) → url-safe base64 (padding `=` сохраняем). */
function urlSafeBase64(binary: string): string {
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(binary, "latin1").toString("base64")
      : btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * Кодирует одну линию маршрута в nktk-фрагмент (версия 1, один сегмент).
 * Порядок осей в потоке строго: сначала Δlng (x), затем Δlat (y).
 */
export function encodeNktkTrack(line: GeoJsonLineString, name: string): string {
  const bytes: number[] = [];

  // Версия формата: байт читается как `code - 64`, поэтому 1 → код 65.
  bytes.push(1 + 64);

  // Имя трека (utf8): длина + содержимое.
  const nameBytes = utf8Bytes(name);
  bytes.push(...packNumber(nameBytes.length), ...nameBytes);

  // Один сегмент.
  bytes.push(...packNumber(1));

  // Точки сегмента: количество + дельты целочисленных координат.
  const coords = line.coordinates;
  bytes.push(...packNumber(coords.length));
  let prevX = 0;
  let prevY = 0;
  for (const [lng, lat] of coords) {
    const x = Math.round(lng * ARC_UNIT);
    const y = Math.round(lat * ARC_UNIT);
    bytes.push(...packNumber(x - prevX));
    bytes.push(...packNumber(y - prevY));
    prevX = x;
    prevY = y;
  }

  // color=0, ticksShown=0 — чтобы парсер v1 не пометил трек как CORRUPT.
  bytes.push(...packNumber(0), ...packNumber(0));

  const binary = String.fromCharCode(...bytes);
  return urlSafeBase64(binary);
}

/**
 * Строит ссылку на nakarte.me с одним или несколькими треками
 * (несколько фрагментов разделяются `/`).
 */
export function nakarteUrl(
  tracks: { line: GeoJsonLineString; name: string }[],
): string {
  const encoded = tracks.map((t) => encodeNktkTrack(t.line, t.name));
  return `https://nakarte.me/#nktk=${encoded.join("/")}`;
}
