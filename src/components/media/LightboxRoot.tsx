import * as React from "react";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";

interface Props {
  /** Контейнер, внутри которого ищутся ссылки-триггеры. */
  gallerySelector?: string;
  /** Селектор ссылок-триггеров лайтбокса. */
  childrenSelector?: string;
}

/**
 * Единый контроллер лайтбокса на страницу. Монтируется один раз и подхватывает
 * ВСЕ ссылки `a[data-pswp]` внутри контейнера — и inline-фото из MDX (Figure),
 * и сетку RouteGallery. Ядро PhotoSwipe грузится лениво при первом открытии.
 */
export function LightboxRoot({
  gallerySelector = "#route-content",
  childrenSelector = "a[data-pswp]",
}: Props) {
  React.useEffect(() => {
    const lightbox = new PhotoSwipeLightbox({
      gallery: gallerySelector,
      children: childrenSelector,
      pswpModule: () => import("photoswipe"),
      bgOpacity: 0.92,
      paddingFn: () => ({ top: 24, bottom: 64, left: 16, right: 16 }),
    });

    lightbox.on("uiRegister", () => {
      lightbox.pswp?.ui?.registerElement({
        name: "custom-caption",
        order: 9,
        isButton: false,
        appendTo: "root",
        html: "",
        onInit: (el) => {
          el.className = "pswp__custom-caption";
          const update = () => {
            const slideEl = lightbox.pswp?.currSlide?.data?.element as
              | HTMLElement
              | undefined;
            const caption =
              slideEl?.dataset?.pswpCaption ??
              slideEl?.querySelector("img")?.getAttribute("alt") ??
              "";
            el.innerHTML = caption;
            el.style.display = caption ? "" : "none";
          };
          lightbox.pswp?.on("change", update);
          update();
        },
      });
    });

    lightbox.init();
    return () => lightbox.destroy();
  }, [gallerySelector, childrenSelector]);

  return null;
}
