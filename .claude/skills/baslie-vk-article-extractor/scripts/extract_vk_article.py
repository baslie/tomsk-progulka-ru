"""
Извлечение VK-статей (формат vk.com/@author-slug) через Crawl4AI.

Использование:
    python extract_vk_article.py URL [URL ...]
                                 [--output-dir DIR]
                                 [--cdp-url URL]
                                 [--no-headless]

Дефолты подобраны под расположение скрипта в скилле:
    <project-root>/.claude/skills/baslie-vk-article-extractor/scripts/extract_vk_article.py
        --output-dir = <project-root>/vk-articles
        --cdp-url    = http://localhost:9222

Авторизация в VK берётся из живого Chrome пользователя, запущенного с флагом
`--remote-debugging-port=9222`. Скрипт подключается к нему по CDP, использует
ту же сессию (куки, localStorage). См. SKILL.md → «Подготовка живого Chrome».

Каждый URL обрабатывается в отдельной папке <output-dir>/<slug>/. Один
Playwright-сеанс на весь batch. Логи: <output-dir>/extractor.log + копия в каждой
подпапке статьи.
"""

import argparse
import asyncio
import base64
import hashlib
import json
import logging
import platform
import re
import sys
import time
import traceback
from pathlib import Path
from urllib.parse import urlparse

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = SKILL_DIR.parent.parent.parent  # skills/<name>/scripts → ../../../

DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "vk-articles"
DEFAULT_CDP_URL = "http://localhost:9222"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)

ARTICLE_SELECTOR = "div.article.article_view"

JS_CLEANUP = r"""
(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // 1. Снести оверлеи VK (cookie-баннер, "перейти в приложение" и т.п.)
    const overlays = [
        '[id^="box_layer"]', '.UnauthActionBox', '.scroll_fix_wrap',
        '.cookies_popup', '.MobileBanner', '.AppPromoBanner',
    ];
    document.querySelectorAll(overlays.join(',')).forEach(el => el.remove());

    // 2. Удалить соседние статьи (нашу опознаём по ID).
    const first = document.querySelector('div.article.article_view');
    if (!first) return;
    const ourId = first.id;
    const killNeighbors = () => {
        document.querySelectorAll('div.article.article_view').forEach(el => {
            if (el.id !== ourId) el.remove();
        });
    };
    killNeighbors();

    // 3. Медленно проскроллить ВНУТРИ первой статьи. ВАЖНО: останавливаемся
    //    на 92% высоты, чтобы не задеть sentinel-элемент VK у самого низа,
    //    который запускает подгрузку «следующей статьи».
    const articleTop = first.offsetTop;
    const articleHeight = first.offsetHeight;
    const safeBottom = articleTop + Math.floor(articleHeight * 0.92);
    const step = 300;
    const pause = 900;

    for (let y = articleTop; y <= safeBottom; y += step) {
        window.scrollTo({top: y, behavior: 'instant'});
        await sleep(pause);
        // принудительно триггерим Intersection Observer'ы, имитируя
        // resize-событие — иногда помогает с lazy-загрузкой VK.
        window.dispatchEvent(new Event('scroll'));
    }
    window.scrollTo({top: safeBottom, behavior: 'instant'});
    await sleep(1500);

    // 4. Дождаться загрузки <img> внутри первой статьи (до 10 секунд на картинку).
    const imgs = Array.from(first.querySelectorAll('img'));
    await Promise.all(imgs.map(img => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise(res => {
            img.addEventListener('load', res, {once: true});
            img.addEventListener('error', res, {once: true});
            setTimeout(res, 10000);
        });
    }));

    // 5. Зачистка служебного UI рядом со статьёй (комменты, related, sidebar).
    document.querySelectorAll(
        '.ArticleView__nextArticle, .ArticleView__comments, ' +
        '.ArticleView__related, .ArticleView__bottomBar, ' +
        '.audio_layer, [class*="NextArticle"], [class*="Related"]'
    ).forEach(el => el.remove());

    // 6. Финальный killNeighbors — на случай, если что-то проскочило.
    killNeighbors();

    // 7. Скролл наверх для красивого скриншота.
    window.scrollTo({top: 0, behavior: 'instant'});
    await sleep(500);

    // observer оставляем активным до конца — он будет работать, пока
    // crawl4ai снимает HTML. Это финальная страховка от поздних подгрузок.
})();
"""


# --- Логирование ---------------------------------------------------------

log = logging.getLogger("vk_extractor")


def setup_logging(log_file: Path) -> None:
    log.setLevel(logging.DEBUG)
    log.handlers.clear()

    fmt = logging.Formatter(
        "%(asctime)s | %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    log_file.parent.mkdir(parents=True, exist_ok=True)
    fh = logging.FileHandler(log_file, mode="w", encoding="utf-8")
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(fmt)
    log.addHandler(fh)

    sh = logging.StreamHandler(sys.stdout)
    sh.setLevel(logging.INFO)
    sh.setFormatter(fmt)
    log.addHandler(sh)


def log_environment(args, log_file: Path) -> None:
    log.info("=" * 70)
    log.info("baslie-vk-article-extractor — старт")
    log.info("Python: %s", sys.version.replace("\n", " "))
    log.info("Платформа: %s", platform.platform())
    log.info("Cwd: %s", Path.cwd())
    log.info("Скрипт: %s", Path(__file__).resolve())
    log.info("Лог: %s", log_file)
    log.info("Аргументы: %s", vars(args))
    try:
        import crawl4ai
        import httpx
        import playwright
        log.info(
            "crawl4ai: %s | httpx: %s | playwright: %s",
            getattr(crawl4ai, "__version__", "?"),
            httpx.__version__,
            getattr(playwright, "__version__", "?"),
        )
    except Exception as e:  # pragma: no cover
        log.warning("Не удалось получить версии пакетов: %s", e)
    log.info("=" * 70)


# --- Утилиты -------------------------------------------------------------

def slug_from_url(url: str) -> str:
    m = re.search(r"@([^/?#]+)", url)
    if m:
        return m.group(1)
    return hashlib.md5(url.encode()).hexdigest()[:12]


def safe_ext(src: str) -> str:
    path = urlparse(src).path
    ext = path.rsplit(".", 1)[-1].lower() if "." in path else ""
    if ext in ("jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"):
        return ext
    return "jpg"


def extract_article_block(html: str, our_id: str | None = None) -> tuple[str, str | None]:
    """
    Возвращает (обрезанный_html, id) — HTML только нашего блока article_view.
    Если our_id не передан, берёт первый встретившийся.
    Если ничего не найдено — возвращает исходный html и None.
    """
    if not html:
        return html, None
    if our_id:
        m = re.search(
            rf'<div class="article article_view[^"]*"[^>]*id="{re.escape(our_id)}"',
            html,
        )
    else:
        m = re.search(r'<div class="article article_view[^"]*"[^>]*id="([^"]+)"', html)
    if not m:
        return html, None
    found_id = our_id or m.group(1)
    start = m.start()
    # Найти соответствующий </div>: считаем баланс <div ...> и </div> от start.
    depth = 0
    pos = start
    n = len(html)
    while pos < n:
        # ищем следующий <div... или </div>
        open_m = re.search(r"<div\b", html[pos:])
        close_m = re.search(r"</div>", html[pos:])
        if not close_m:
            break
        if open_m and open_m.start() < close_m.start():
            depth += 1
            pos += open_m.end()
        else:
            depth -= 1
            pos += close_m.end()
            if depth == 0:
                return html[start:pos], found_id
    return html[start:], found_id


def trim_markdown_to_first_article(md: str) -> str:
    """
    В markdown иногда просачивается заголовок следующей статьи (`# ...`).
    Обрезаем всё, что идёт от ВТОРОГО `^# ` и далее.
    """
    if not md:
        return md
    matches = list(re.finditer(r"(?m)^# ", md))
    if len(matches) < 2:
        return md
    return md[: matches[1].start()].rstrip() + "\n"


def extract_all_image_sources(article_html: str) -> list[dict]:
    """
    Парсит срезанный HTML контейнера статьи и достаёт ВСЕ потенциальные
    источники картинок: <img src>, srcset (берём максимальный), data-src,
    data-photo (JSON-кодированные VK photo objects).
    Возвращает список словарей в формате crawl4ai media.images.
    """
    if not article_html:
        return []

    seen: set[str] = set()
    out: list[dict] = []

    def add(src: str, alt: str = ""):
        if not src or src.startswith("data:"):
            return
        # VK иногда отдаёт без схемы
        if src.startswith("//"):
            src = "https:" + src
        if src in seen:
            return
        seen.add(src)
        out.append({"src": src, "alt": alt})

    # 1. <img src="...">
    for m in re.finditer(
        r'<img\b[^>]*?src="([^"]+)"[^>]*?(?:alt="([^"]*)")?',
        article_html, flags=re.IGNORECASE,
    ):
        add(m.group(1), m.group(2) or "")

    # 2. srcset — берём последний (самый широкий)
    for m in re.finditer(r'srcset="([^"]+)"', article_html, flags=re.IGNORECASE):
        candidates = [c.strip().split()[0] for c in m.group(1).split(",") if c.strip()]
        if candidates:
            add(candidates[-1])

    # 3. data-src="..."
    for m in re.finditer(r'data-src="([^"]+)"', article_html, flags=re.IGNORECASE):
        add(m.group(1))

    # 4. data-photo='[{"sizes":[...],...}]' или data-photo="..." с экранированным JSON.
    #    VK хранит несколько размеров; берём максимальный по площади.
    for m in re.finditer(r"data-photo='([^']+)'", article_html):
        try:
            payload = json.loads(m.group(1))
            for photo in (payload if isinstance(payload, list) else [payload]):
                sizes = photo.get("sizes") or []
                best = None
                for s in sizes:
                    w, h = s.get("width") or 0, s.get("height") or 0
                    area = w * h
                    if best is None or area > best[0]:
                        best = (area, s.get("url") or s.get("src"))
                if best and best[1]:
                    add(best[1])
        except Exception:
            pass

    return out


def check_cdp_alive(cdp_url: str) -> bool:
    """
    Проверяет, что Chrome слушает CDP по указанному адресу.
    /json/version отвечает быстрым JSON-ом с полями Browser/webSocketDebuggerUrl.
    """
    import httpx
    try:
        r = httpx.get(f"{cdp_url.rstrip('/')}/json/version", timeout=2.0)
        if r.status_code != 200:
            log.error("CDP %s/json/version вернул HTTP %s", cdp_url, r.status_code)
            return False
        data = r.json()
        log.info("CDP жив: %s | %s", data.get("Browser"), data.get("V8-Version"))
        return True
    except Exception as e:
        log.error("CDP endpoint %s не отвечает: %s", cdp_url, e)
        return False


def print_cdp_help(cdp_url: str) -> None:
    log.error("=" * 70)
    log.error("Не удалось подключиться к Chrome по CDP (%s).", cdp_url)
    log.error("Скилл работает поверх ЖИВОГО Chrome пользователя — он должен быть")
    log.error("запущен с флагом `--remote-debugging-port=9222`.")
    log.error("")
    log.error("Что сделать:")
    log.error("  1. Закрой ВСЕ окна обычного Chrome.")
    log.error("  2. Запусти Chrome через ярлык с целью:")
    log.error('     "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" '
              "--remote-debugging-port=9222")
    log.error("  3. Залогинься в VK (vk.com/feed должен отдавать ленту).")
    log.error("  4. Проверь:  curl http://localhost:9222/json/version")
    log.error("  5. Запусти скрипт ещё раз.")
    log.error("")
    log.error("Подробнее — references/troubleshooting.md → раздел про CDP.")
    log.error("=" * 70)


async def fetch_cookies_via_cdp(cdp_url: str) -> list[dict]:
    """
    Подключается к живому Chrome через CDP, забирает все куки из default
    контекста (там сидит залогиненный VK), отключается. Сам Chrome не закрывает.
    Формат куков совместим с тем, что ждёт download_images() (name/value/domain/path).
    """
    from playwright.async_api import async_playwright

    log.info("Подключаюсь к Chrome по CDP (%s) для забора куков...", cdp_url)
    async with async_playwright() as pw:
        browser = await pw.chromium.connect_over_cdp(cdp_url)
        try:
            contexts = browser.contexts
            if not contexts:
                log.warning("В живом Chrome нет открытых контекстов — куков не будет.")
                return []
            ctx = contexts[0]
            cookies = await ctx.cookies()
        finally:
            # close() на CDP-подключении отключает Playwright, но НЕ убивает живой Chrome
            await browser.close()

    log.info("Получено куков из живого Chrome: %d", len(cookies))
    # Эвристика: если нет remixsid — в этом Chrome не залогинен VK
    has_remixsid = any(c.get("name") == "remixsid" for c in cookies)
    if not has_remixsid:
        log.warning("Среди куков нет remixsid — VK скорее всего не залогинен "
                    "в этом Chrome. Открой vk.com/feed в нём и залогинься.")
    return cookies


# --- Скачивание изображений ---------------------------------------------

async def download_images(images, out_dir: Path, cookies_for_httpx: list | None):
    import httpx
    out_dir.mkdir(parents=True, exist_ok=True)
    mapping: list[dict] = []
    headers = {"User-Agent": USER_AGENT, "Referer": "https://vk.com/"}
    sem = asyncio.Semaphore(5)

    cookies_param = None
    if cookies_for_httpx:
        cookies_param = httpx.Cookies()
        for c in cookies_for_httpx:
            try:
                cookies_param.set(
                    c["name"], c["value"],
                    domain=c["domain"].lstrip("."),
                    path=c.get("path") or "/",
                )
            except Exception as e:
                log.debug("httpx cookie set failed (%s/%s): %s", c["domain"], c["name"], e)

    async with httpx.AsyncClient(headers=headers, cookies=cookies_param,
                                 timeout=30, follow_redirects=True) as cli:
        async def fetch(idx, img):
            src = img.get("src") or ""
            if not src or src.startswith("data:"):
                return None
            ext = safe_ext(src)
            h = hashlib.md5(src.encode()).hexdigest()[:8]
            fname = f"{idx:03d}_{h}.{ext}"
            fpath = out_dir / fname
            try:
                async with sem:
                    r = await cli.get(src)
                    if r.status_code == 200 and r.content:
                        fpath.write_bytes(r.content)
                        log.debug("[img %03d] OK %d bytes -> %s", idx, len(r.content), fname)
                        return {
                            "order": idx, "src": src, "local": f"images/{fname}",
                            "alt": img.get("alt", ""), "score": img.get("score"),
                            "size_bytes": len(r.content), "status": r.status_code,
                        }
                    log.warning("[img %03d] HTTP %d for %s", idx, r.status_code, src)
                    return {
                        "order": idx, "src": src, "local": None,
                        "alt": img.get("alt", ""), "score": img.get("score"),
                        "status": r.status_code, "error": f"HTTP {r.status_code}",
                    }
            except Exception as e:
                log.warning("[img %03d] EXC: %s", idx, e)
                return {
                    "order": idx, "src": src, "local": None,
                    "alt": img.get("alt", ""), "score": img.get("score"),
                    "error": str(e)[:200],
                }

        tasks = [fetch(i, img) for i, img in enumerate(images, 1)]
        for coro in asyncio.as_completed(tasks):
            res = await coro
            if res:
                mapping.append(res)

    mapping.sort(key=lambda x: x["order"])
    return mapping


# --- Извлечение одной статьи --------------------------------------------

async def extract_one(crawler, url: str, output_dir: Path,
                      run_cfg, cookies_for_httpx: list | None,
                      common_log_file: Path) -> dict:
    slug = slug_from_url(url)
    out_dir = output_dir / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    log.info("--- Статья: %s ---", url)
    log.info("Slug: %s", slug)
    log.info("Папка результата: %s", out_dir)

    t0 = time.time()
    result = await crawler.arun(url, config=run_cfg)
    log.info("crawl4ai завершён за %.1f сек", time.time() - t0)

    if not result.success:
        log.error("FAILED: status=%s | error=%s", result.status_code, result.error_message)
        return {"url": url, "slug": slug, "ok": False,
                "error": result.error_message, "status_code": result.status_code}

    log.info("status_code=%s", result.status_code)

    md_obj = result.markdown
    raw_md = getattr(md_obj, "raw_markdown", None) or str(md_obj)
    fit_md = getattr(md_obj, "fit_markdown", None) or ""

    # Пост-обрезка markdown по второму '^# ' (если соседняя статья просочилась).
    md_full_chars = len(raw_md)
    raw_md = trim_markdown_to_first_article(raw_md)
    md_trimmed_chars = len(raw_md)
    if md_full_chars != md_trimmed_chars:
        log.info("article.md: обрезано %d → %d символов (удалена соседняя статья)",
                 md_full_chars, md_trimmed_chars)

    (out_dir / "article.md").write_text(raw_md, encoding="utf-8")
    if fit_md:
        (out_dir / "article-fit.md").write_text(fit_md, encoding="utf-8")

    # Обрезка HTML до контейнера нашей статьи.
    html_block, article_id = extract_article_block(result.cleaned_html or "")
    if article_id:
        log.info("Контейнер VK-статьи найден: id=%s, %d символов", article_id, len(html_block))
        (out_dir / "article.html").write_text(html_block, encoding="utf-8")
        (out_dir / "article-full.html").write_text(result.cleaned_html or "", encoding="utf-8")
    elif result.cleaned_html:
        log.warning("Контейнер div.article.article_view не найден, сохраняю весь cleaned_html")
        (out_dir / "article.html").write_text(result.cleaned_html, encoding="utf-8")
        html_block = result.cleaned_html

    (out_dir / "metadata.json").write_text(
        json.dumps(result.metadata or {}, ensure_ascii=False, indent=2),
        encoding="utf-8")
    (out_dir / "links.json").write_text(
        json.dumps(result.links or {}, ensure_ascii=False, indent=2),
        encoding="utf-8")
    media = result.media or {}
    (out_dir / "media.json").write_text(
        json.dumps(media, ensure_ascii=False, indent=2),
        encoding="utf-8")
    if result.screenshot:
        (out_dir / "screenshot.png").write_bytes(base64.b64decode(result.screenshot))

    # Объединяем картинки: те, что нашёл crawl4ai (внутри только нашего HTML-блока)
    # + наш собственный парсер HTML-блока (берёт img/srcset/data-src/data-photo).
    crawl4ai_images = media.get("images", []) or []
    # Фильтруем crawl4ai-изображения по нашему HTML-блоку: оставляем только те,
    # чей src встречается внутри вырезанного контейнера. Это убирает картинки
    # соседних статей, sidebar и UI-иконок.
    images_in_block = [img for img in crawl4ai_images
                       if img.get("src") and img["src"] in html_block]

    fallback_images = extract_all_image_sources(html_block)
    seen_srcs = {img.get("src") for img in images_in_block}
    for img in fallback_images:
        if img.get("src") and img["src"] not in seen_srcs:
            images_in_block.append(img)
            seen_srcs.add(img["src"])

    log.info("Найдено изображений в нашем блоке: %d (crawl4ai: %d, fallback: +%d). Скачиваю...",
             len(images_in_block),
             sum(1 for x in crawl4ai_images if x.get("src") and x["src"] in html_block),
             len(images_in_block) - sum(1 for x in crawl4ai_images if x.get("src") and x["src"] in html_block))
    img_mapping = await download_images(images_in_block, out_dir / "images", cookies_for_httpx)
    (out_dir / "images.json").write_text(
        json.dumps(img_mapping, ensure_ascii=False, indent=2),
        encoding="utf-8")
    images = images_in_block  # для summary

    meta = result.metadata or {}
    summary = {
        "url": url, "slug": slug,
        "title": meta.get("og:title") or meta.get("title"),
        "page_title": meta.get("title"),
        "description": meta.get("og:description") or meta.get("description"),
        "status_code": result.status_code,
        "raw_markdown_chars": len(raw_md),
        "fit_markdown_chars": len(fit_md),
        "cleaned_html_chars": len(result.cleaned_html or ""),
        "images_total": len(images),
        "images_downloaded": sum(1 for x in img_mapping if x.get("local")),
        "videos_total": len(media.get("videos", []) or []),
        "audio_total": len(media.get("audios", []) or media.get("audio", []) or []),
        "internal_links": len((result.links or {}).get("internal", [])),
        "external_links": len((result.links or {}).get("external", [])),
        "screenshot_saved": bool(result.screenshot),
    }
    (out_dir / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8")

    log.info("=== SUMMARY [%s] ===", slug)
    for k, v in summary.items():
        log.info("  %s: %s", k, v)

    # Копия общего лога в папку статьи (текущее состояние, без последующих URL)
    try:
        (out_dir / "extractor.log").write_text(
            common_log_file.read_text(encoding="utf-8"),
            encoding="utf-8")
    except Exception as e:
        log.debug("Не удалось скопировать лог в %s: %s", out_dir / "extractor.log", e)

    return {"ok": True, **summary}


# --- Основной прогон -----------------------------------------------------

async def run(args, common_log_file: Path) -> int:
    try:
        from crawl4ai import (
            AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig,
        )
    except ImportError as e:
        log.error("Не установлен crawl4ai: %s", e)
        log.error("Установи зависимости:")
        log.error("    pip install -U crawl4ai httpx")
        log.error("    python -m playwright install chromium")
        return 5

    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    cdp_url = args.cdp_url.rstrip("/")
    if not check_cdp_alive(cdp_url):
        print_cdp_help(cdp_url)
        return 4

    try:
        cookies_for_httpx = await fetch_cookies_via_cdp(cdp_url)
    except Exception as e:
        log.error("Не удалось забрать куки из живого Chrome: %s", e)
        log.error("Проверь, что Chrome открыт и слушает CDP на %s.", cdp_url)
        return 4

    browser = BrowserConfig(
        headless=args.headless,                # игнорируется при cdp_url, но оставляем для ясности
        cdp_url=cdp_url,
        use_managed_browser=True,
        viewport_width=1366, viewport_height=2200,
        user_agent=USER_AGENT,
        verbose=True,
    )

    run_cfg = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        word_count_threshold=10,
        wait_for_images=True,
        # scan_full_page ОТКЛЮЧЁН: его автопрокрутка триггерит infinite-scroll VK,
        # из-за которого подгружаются следующие статьи.
        scan_full_page=False,
        process_iframes=True,
        remove_overlay_elements=True,
        # css_selector НЕ используем: он обрезал бы media к содержимому селектора
        # ДО того, как мы вытащим список картинок; чистка соседних статей делается
        # самим JS_CLEANUP.
        exclude_external_links=False,
        exclude_social_media_links=False,
        exclude_external_images=False,
        screenshot=True,
        page_timeout=120_000,
        js_code=JS_CLEANUP,
        verbose=True,
    )

    log.info("URLs (%d): %s", len(args.urls), args.urls)
    log.info("Output dir: %s", output_dir)

    overall: list[dict] = []
    async with AsyncWebCrawler(config=browser) as crawler:
        for url in args.urls:
            try:
                res = await extract_one(
                    crawler, url, output_dir, run_cfg, cookies_for_httpx, common_log_file,
                )
                overall.append(res)
            except Exception:
                log.error("Необработанная ошибка для %s:\n%s", url, traceback.format_exc())
                overall.append({"url": url, "ok": False, "error": "exception (см. лог)"})

    # batch summary
    batch_summary = {
        "started_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "output_dir": str(output_dir),
        "urls_total": len(args.urls),
        "urls_ok": sum(1 for x in overall if x.get("ok")),
        "urls_failed": sum(1 for x in overall if not x.get("ok")),
        "results": overall,
    }
    (output_dir / "batch_summary.json").write_text(
        json.dumps(batch_summary, ensure_ascii=False, indent=2),
        encoding="utf-8")

    log.info("=" * 70)
    log.info("Batch завершён: %d/%d успешно",
             batch_summary["urls_ok"], batch_summary["urls_total"])
    for r in overall:
        status = "OK " if r.get("ok") else "FAIL"
        log.info("  [%s] %s — %s", status, r.get("slug") or "-", r.get("url"))
    log.info("=" * 70)

    return 0 if batch_summary["urls_failed"] == 0 else 2


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("urls", nargs="+",
                    help="Один или несколько URL VK-статей через пробел.")
    ap.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR),
                    help=f"Куда складывать результат (по умолчанию {DEFAULT_OUTPUT_DIR})")
    ap.add_argument("--cdp-url", default=DEFAULT_CDP_URL,
                    help=f"CDP endpoint живого Chrome (по умолчанию {DEFAULT_CDP_URL}). "
                         "Chrome должен быть запущен с `--remote-debugging-port=9222`.")
    ap.add_argument("--headless", action=argparse.BooleanOptionalAction, default=True,
                    help="При CDP игнорируется (режим определяется живым Chrome).")
    args = ap.parse_args()

    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    common_log_file = output_dir / "extractor.log"
    setup_logging(common_log_file)
    log_environment(args, common_log_file)

    try:
        rc = asyncio.run(run(args, common_log_file))
    except Exception:
        log.error("Необработанная ошибка верхнего уровня:\n%s", traceback.format_exc())
        rc = 99
    log.info("Завершено с кодом: %d", rc)
    return rc


if __name__ == "__main__":
    sys.exit(main())
