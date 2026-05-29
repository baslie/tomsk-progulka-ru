import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";

export interface LightboxImage {
  /** Оптимизированный WebP-превью для отображения в потоке. */
  thumbSrc: string;
  thumbWidth: number;
  thumbHeight: number;
  /** Полноразмерный WebP для лайтбокса. */
  fullSrc: string;
  fullWidth: number;
  fullHeight: number;
}

interface Options {
  thumbWidth?: number;
  fullWidth?: number;
}

/**
 * Готовит пару оптимизированных изображений (превью + полноразмерное) для
 * связки astro:assets + PhotoSwipe. Размеры считаются по исходным пропорциям
 * (без апскейла) — PhotoSwipe требует точные width/height полного изображения.
 */
export async function buildLightboxImage(
  image: ImageMetadata,
  { thumbWidth = 1400, fullWidth = 2000 }: Options = {}
): Promise<LightboxImage> {
  const ratio = image.height / image.width;
  const tW = Math.min(image.width, thumbWidth);
  const fW = Math.min(image.width, fullWidth);

  const [thumb, full] = await Promise.all([
    getImage({ src: image, format: "webp", width: tW, quality: 78 }),
    getImage({ src: image, format: "webp", width: fW, quality: 80 }),
  ]);

  return {
    thumbSrc: thumb.src,
    thumbWidth: tW,
    thumbHeight: Math.round(tW * ratio),
    fullSrc: full.src,
    fullWidth: fW,
    fullHeight: Math.round(fW * ratio),
  };
}
