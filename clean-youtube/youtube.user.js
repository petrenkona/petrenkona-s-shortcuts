// ==UserScript==
// @name         Clean YouTube Reysu (Text Only)
// @namespace    reysu
// @version      3.1
// @description  Текстовый YouTube: убирает ВСЕ превью, лишние разделы (Музыка/Трансляции/Видеоигры/Новости/Спорт/Обучение/Мода/Студия/Music/Детям/Create) и «Ещё темы». Единый крупный вид карточек (главная == подписки), контент строго по центру, ровно один разделитель под цвет темы.
// @match        *://m.youtube.com/*
// @match        *://*.youtube.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const css = `
        /* ===== ПРЕВЬЮ: убираем ВЕЗДЕ, оба движка =====
           Старый: ytm-thumbnail-cover / a.media-item-thumbnail-container / ytm-thumbnail-overlay
           Новый:  yt-thumbnail-view-model / .ytThumbnailViewModelHost / .yt-thumbnail-cover
           Плюс разделы (трансляции, игры, новости, спорт, обучение, мода): шелфы,
           карусели, сетки, компактные карточки, карточки каналов и т.д. */
        ytm-thumbnail-cover,
        a.media-item-thumbnail-container,
        .media-item-thumbnail-container,
        ytm-thumbnail-overlay,
        yt-thumbnail-view-model,
        .ytThumbnailViewModelHost,
        .ytLockupViewModelHostThumbnailContainer,
        yt-collection-thumbnail-view-model,
        .yt-lockup-view-model-wiz__content-image,
        .ytLockupViewModelHostThumbnailContainerVertical,
        .collections-stack-wiz,
        .shortsLockupViewModelHostThumbnailContainer,
        ytm-shorts-lockup-view-model-v2 .shortsLockupViewModelHostThumbnailContainer,
        ytm-rich-item-renderer ytm-thumbnail-cover,
        ytm-video-with-context-renderer ytm-thumbnail-cover,
        ytm-compact-video-renderer ytm-thumbnail-cover,
        ytm-video-card-renderer ytm-thumbnail-cover,
        ytm-channel-video-card-renderer ytm-thumbnail-cover,
        ytm-media-item .media-item-thumbnail-container,
        ytm-large-media-item-renderer .media-item-thumbnail-container,
        ytm-playlist-video-renderer .media-item-thumbnail-container,
        ytm-horizontal-card-list-renderer ytm-thumbnail-cover,
        ytm-carousel ytm-thumbnail-cover,
        ytm-shelf-renderer ytm-thumbnail-cover,
        grid-shelf-view-model yt-thumbnail-view-model,
        yt-lockup-view-model yt-thumbnail-view-model,
        yt-lockup-view-model .ytThumbnailViewModelHost,
        [class*="thumbnail" i]:not([class*="avatar" i]):not([class*="profile" i]):not([class*="channel" i]):not([class*="decorated" i]) {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            min-width: 0 !important;
            min-height: 0 !important;
            max-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            aspect-ratio: auto !important;
        }

        /* Метка длительности / "идёт трансляция" / прочие плашки поверх превью */
        ytm-thumbnail-overlay-time-status-renderer,
        ytm-thumbnail-overlay-now-playing-renderer,
        .badge-shape-wiz__text,
        [class*="time-status" i],
        [class*="ThumbnailOverlay" i],
        [class*="ThumbnailBottomOverlay" i] {
            display: none !important;
        }

        /* ===== АВАТАРКИ — ВИДНЫ (оба движка). Размер задаём ТОЛЬКО в карточках. =====
           Полосу каналов, профиль и нижнюю панель НЕ трогаем вообще. */
        ytm-rich-item-renderer ytm-profile-icon,
        ytm-rich-item-renderer ytm-profile-icon img,
        ytm-rich-item-renderer .ytProfileIconHost img,
        ytm-rich-item-renderer yt-avatar-shape img,
        ytm-rich-item-renderer yt-decorated-avatar-view-model img,
        ytm-rich-item-renderer ytm-channel-thumbnail-with-link-renderer img,
        yt-lockup-view-model ytm-profile-icon img,
        yt-lockup-view-model yt-avatar-shape img,
        yt-lockup-view-model yt-decorated-avatar-view-model img,
        ytm-video-with-context-renderer ytm-profile-icon img,
        ytm-compact-video-renderer ytm-profile-icon img,
        ytm-media-item ytm-profile-icon img {
            display: inline-block !important;
            visibility: visible !important;
        }
        /* Размер 40px — ТОЛЬКО для аватарок внутри карточек ленты. */
        ytm-rich-item-renderer ytm-profile-icon img,
        ytm-rich-item-renderer .ytProfileIconHost img,
        ytm-rich-item-renderer yt-avatar-shape img,
        ytm-rich-item-renderer yt-decorated-avatar-view-model img,
        ytm-rich-item-renderer ytm-channel-thumbnail-with-link-renderer img,
        yt-lockup-view-model ytm-profile-icon img,
        yt-lockup-view-model yt-avatar-shape img,
        yt-lockup-view-model yt-decorated-avatar-view-model img,
        ytm-video-with-context-renderer ytm-profile-icon img,
        ytm-compact-video-renderer ytm-profile-icon img,
        ytm-media-item ytm-profile-icon img {
            width: 40px !important;
            height: 40px !important;
            max-width: 40px !important;
            max-height: 40px !important;
            aspect-ratio: 1 / 1 !important;
            border-radius: 50% !important;
            object-fit: cover !important;
        }

        /* ===== ЕДИНЫЙ ВИД КАРТОЧЕК (как на главной — везде) =====
           НЕ навязываем свой flex/row: родная вёрстка карточки после удаления
           превью уже даёт идеальный «домашний» вид. Мы лишь убираем остаточное
           место от превью/плеера и задаём ровный симметричный отступ, чтобы
           разделитель плотно облегал контент и текст стоял по центру. */
        ytm-rich-item-renderer {
            height: auto !important;
            min-height: 0 !important;
            aspect-ratio: auto !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        ytm-video-with-context-renderer,
        ytm-compact-video-renderer,
        ytm-video-card-renderer,
        ytm-channel-video-card-renderer,
        ytm-media-item,
        ytm-large-media-item-renderer,
        ytm-playlist-video-renderer,
        ytm-compact-playlist-renderer,
        ytm-playlist-renderer,
        yt-lockup-view-model {
            width: 100% !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 8px 8px !important;     /* плотнее — больше контента на экран */
            min-height: 0 !important;
            height: auto !important;
            aspect-ratio: auto !important;
        }
        /* Остаточное место от встроенного плеера */
        ytm-inline-player-renderer {
            display: none !important;
            height: 0 !important;
        }

        /* ===== РОВНО ОДИН РАЗДЕЛИТЕЛЬ МЕЖДУ ВИДЕО =====
           Линию вешаем на внешний контейнер карточки. Полки/секции линий НЕ
           получают — иначе появлялись «двойные» палки. */
        ytm-rich-item-renderer,
        ytm-video-with-context-renderer,
        ytm-compact-video-renderer,
        ytm-video-card-renderer,
        ytm-channel-video-card-renderer,
        ytm-media-item,
        ytm-large-media-item-renderer,
        ytm-playlist-video-renderer,
        ytm-compact-playlist-renderer,
        ytm-playlist-renderer,
        yt-lockup-view-model {
            border-bottom: 1px solid var(--yt-spec-10-percent-layer, rgba(128, 128, 128, 0.28)) !important;
        }
        /* Если карточка вложена в rich-item — линия только у rich-item (без дублей) */
        ytm-rich-item-renderer ytm-video-with-context-renderer,
        ytm-rich-item-renderer ytm-compact-video-renderer,
        ytm-rich-item-renderer ytm-video-card-renderer,
        ytm-rich-item-renderer ytm-media-item,
        ytm-rich-item-renderer yt-lockup-view-model {
            border-bottom: none !important;
        }
        /* Полки и секции — без собственных линий */
        ytm-rich-section-renderer,
        ytm-shelf-renderer,
        ytm-item-section-renderer,
        ytm-section-list-renderer {
            border-bottom: none !important;
        }

        /* ===== КРУПНЫЕ НАЗВАНИЯ + НИКАКОЙ ОБРЕЗКИ (главная == подписки == история) =====
           На мобильном YouTube 1rem = 10px, поэтому 1.5rem = 15px ≈ размер
           главной. Контейнер заголовка разжимаем по высоте, чтобы 2 строки не
           срезались. */
        ytm-video-with-context-renderer .media-item-headline,
        ytm-compact-video-renderer .media-item-headline,
        ytm-video-card-renderer .media-item-headline,
        ytm-channel-video-card-renderer .media-item-headline,
        ytm-media-item .media-item-headline,
        ytm-playlist-video-renderer .media-item-headline {
            max-height: none !important;
            height: auto !important;
            display: -webkit-box !important;
            -webkit-box-orient: vertical !important;
            -webkit-line-clamp: 2 !important;
            overflow: hidden !important;   /* 3+ строки обрезаются, не наезжают */
        }
        ytm-video-with-context-renderer .media-item-headline .yt-core-attributed-string,
        ytm-compact-video-renderer .media-item-headline .yt-core-attributed-string,
        ytm-video-card-renderer .media-item-headline .yt-core-attributed-string,
        ytm-media-item .media-item-headline .yt-core-attributed-string,
        ytm-video-with-context-renderer .media-item-headline span,
        ytm-compact-video-renderer .media-item-headline span,
        ytm-video-card-renderer .media-item-headline span,
        yt-lockup-view-model .yt-lockup-metadata-view-model-wiz__title,
        yt-lockup-view-model [class*="metadata" i] [class*="title" i] {
            font-size: 1.5rem !important;
            line-height: 1.35 !important;
            font-weight: 500 !important;
            white-space: normal !important;
            -webkit-line-clamp: 2 !important;
            display: -webkit-box !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
        }

        /* ===== ПЛЕЙЛИСТЫ: текст на всю ширину, не уезжает вправо =====
           Только в карточках плейлистов (главную/ленту НЕ трогаем). После
           удаления превью метаданные занимают всю строку слева. */
        ytm-compact-playlist-renderer .media-item-metadata,
        ytm-playlist-renderer .media-item-metadata,
        ytm-compact-playlist-renderer [class*="metadata" i],
        ytm-playlist-renderer [class*="metadata" i],
        ytm-playlist-video-renderer [class*="metadata" i] {
            width: 100% !important;
            max-width: 100% !important;
            margin-left: 0 !important;
            padding-left: 0 !important;
            text-align: left !important;
            flex: 1 1 auto !important;
        }
        /* Гарантированная высота карточек плейлистов — чтобы «Смотреть позже» и
           «Понравившиеся» не наезжали друг на друга. */
        ytm-compact-playlist-renderer,
        ytm-playlist-renderer {
            display: block !important;
            min-height: 56px !important;
            position: relative !important;
            overflow: hidden !important;
        }

        /* ===== ГОРИЗОНТАЛЬНЫЕ ПОЛКИ → ВЕРТИКАЛЬНЫЙ СПИСОК =====
           История, "Лучшие игровые трансляции", карусели в разделах и т.п.
           раньше были узкими столбиками под ширину превью — текст обрезался.
           Разворачиваем их в нормальный список на всю ширину. */
        ytm-horizontal-card-list-renderer .horizontal-card-list__card-list,
        ytm-horizontal-card-list-renderer [class*="card-list"],
        ytm-horizontal-list-renderer [class*="horizontal-list"],
        ytm-carousel [class*="carousel-items"],
        yt-horizontal-list-renderer #items,
        grid-shelf-view-model .grid-shelf-view-model-wiz__grid,
        grid-shelf-view-model [class*="grid" i],
        [class*="horizontal-list" i],
        [class*="card-list" i],
        .yt-horizontal-list-renderer-wiz__items {
            display: flex !important;
            flex-direction: column !important;
            overflow: visible !important;
            width: 100% !important;
            transform: none !important;
            scroll-snap-type: none !important;
        }
        /* Каждый элемент такой полки — на всю ширину, БЛОКОМ (внутренняя
           вёрстка карточки остаётся вертикальной: заголовок → канал/просмотры,
           без наложения текста друг на друга). */
        ytm-horizontal-card-list-renderer > *,
        ytm-horizontal-card-list-renderer ytm-video-card-renderer,
        ytm-horizontal-card-list-renderer ytm-video-with-context-renderer,
        ytm-horizontal-card-list-renderer ytm-compact-video-renderer,
        ytm-carousel ytm-video-card-renderer,
        grid-shelf-view-model > *,
        grid-shelf-view-model yt-lockup-view-model,
        [class*="card-list" i] > *,
        [class*="horizontal-list" i] > * {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            flex: none !important;
        }
        /* Заголовки видео в таких карточках — переносим, а не режем */
        ytm-video-card-renderer .yt-core-attributed-string,
        ytm-video-card-renderer [class*="title" i] {
            white-space: normal !important;
            -webkit-line-clamp: 2 !important;
            display: -webkit-box !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
        }

        /* ===== РЕКЛАМА ===== */
        ad-slot-renderer,
        ytm-promoted-video-renderer,
        ytm-rich-item-renderer:has(ad-slot-renderer),
        ytm-rich-item-renderer:has(ytm-promoted-video-renderer),
        ytm-companion-slot,
        ytm-promoted-sparkles-web-renderer {
            display: none !important;
        }

        /* ===== SHORTS — нигде, даже через историю ===== */
        ytm-reel-shelf-renderer,
        ytm-rich-section-renderer:has(ytm-reel-shelf-renderer),
        ytm-rich-item-renderer:has(a[href*="/shorts"]),
        ytm-video-with-context-renderer:has(a[href*="/shorts"]),
        ytm-compact-video-renderer:has(a[href*="/shorts"]),
        ytm-video-card-renderer:has(a[href*="/shorts"]),
        ytm-media-item:has(a[href*="/shorts"]),
        ytm-playlist-video-renderer:has(a[href*="/shorts"]),
        yt-lockup-view-model:has(a[href*="/shorts"]),
        grid-shelf-view-model:has([href*="/shorts"]),
        ytm-shelf-renderer:has(a[href*="/shorts"]),
        ytm-shorts-lockup-view-model-v2,
        ytm-pivot-bar-item-renderer:has(a[href*="/shorts"]),
        ytm-pivot-bar-item-renderer:has([aria-label*="Shorts" i]) {
            display: none !important;
        }

        /* ===== ЛОАДЕР/СПИННЕР («крутится фигня» в профиле и не только) =====
           ВАЖНО: НЕ display:none! Спиннер внизу ленты — это триггер подгрузки
           (бесконечная прокрутка). Если его убрать из потока, лента грузит
           только первую порцию. Поэтому делаем невидимым, но оставляем в
           разметке: opacity:0 — крутится незаметно, подгрузка работает. */
        tp-yt-paper-spinner,
        tp-yt-paper-spinner-lite,
        ml-spinner,
        .ytSpinner,
        .ytSpinnerHost,
        [class*="spinner" i] {
            opacity: 0 !important;
            pointer-events: none !important;
        }

        /* ===== УБРАННЫЕ РАЗДЕЛЫ (меню/боковая панель) =====
           Музыка, Трансляции, Видеоигры, Новости, Спорт, Обучение, Мода,
           Творческая студия, YouTube Music/Детям/Create — нигде не доступны.
           Прячем по адресу назначения (надёжно, без привязки к языку). */
        a[href^="/gaming"], a[href^="/news"], a[href^="/sports"],
        a[href^="/learning"], a[href^="/fashion"],
        a[href*="music.youtube.com"], a[href*="studio.youtube.com"],
        a[href*="youtubekids.com"], a[href*="youtube.com/create"],
        ytm-guide-entry-renderer:has(a[href^="/gaming"]),
        ytm-guide-entry-renderer:has(a[href^="/news"]),
        ytm-guide-entry-renderer:has(a[href^="/sports"]),
        ytm-guide-entry-renderer:has(a[href^="/learning"]),
        ytm-guide-entry-renderer:has(a[href^="/fashion"]),
        ytm-guide-entry-renderer:has(a[href*="music.youtube.com"]),
        ytm-guide-entry-renderer:has(a[href*="studio.youtube.com"]),
        ytm-guide-entry-renderer:has(a[href*="youtubekids.com"]),
        ytm-guide-entry-renderer:has(a[href*="youtube.com/create"]) {
            display: none !important;
        }

        /* ===== РАЗДЕЛ "ЕЩЁ ТЕМЫ" / "MORE TOPICS" =====
           Это полка-секция с набором чипов внутри ленты. Верхнюю панель
           фильтров (Все/Видеоигры/Музыка) НЕ трогаем — она вне rich-section. */
        ytm-rich-section-renderer:has(ytm-feed-filter-chip-bar-renderer),
        ytm-rich-section-renderer:has(ytm-chip-cloud-renderer),
        ytm-rich-section-renderer:has(.chip-bar) {
            display: none !important;
        }

        /* ===== РЕКОМЕНДАЦИИ ПОД ВИДЕО ===== */
        ytm-item-section-renderer[section-identifier="related-items"],
        ytm-related-chip-cloud-renderer,
        ytm-watch-next-secondary-results-renderer,
        ytm-compact-autoplay-renderer {
            display: none !important;
        }

        /* ===== СООБЩЕСТВО ===== */
        ytm-post-renderer,
        ytm-backstage-post-renderer,
        ytm-backstage-post-thread-renderer,
        ytm-rich-item-renderer:has(ytm-post-renderer),
        ytm-rich-item-renderer:has(ytm-backstage-post-renderer),
        ytm-rich-section-renderer:has(ytm-post-renderer),
        ytm-poll-renderer,
        ytm-backstage-poll-renderer,
        a[href*="/community"],
        ytm-pivot-bar-item-renderer:has(a[href*="/community"]),
        tp-yt-paper-tab:has([href*="/community"]) {
            display: none !important;
        }
    `;

    const injectCSS = () => {
        if (document.getElementById('reysu-clean-yt')) return;
        const style = document.createElement('style');
        style.id = 'reysu-clean-yt';
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    };
    injectCSS();
    document.addEventListener('DOMContentLoaded', injectCSS);

    // ===== JS-страховка =====
    // Аватарка: лежит на yt3./ggpht или внутри профильного контейнера.
    const isAvatar = (img) => {
        const src = img.src || img.getAttribute('src') || '';
        if (src.includes('yt3.') || src.includes('ggpht')) return true;
        return !!img.closest(
            'ytm-profile-icon, .ytProfileIconHost, yt-avatar-shape, ' +
            'yt-decorated-avatar-view-model, .ytAvatarShapeHost, ' +
            'ytm-channel-thumbnail-with-link-renderer'
        );
    };

    // Превью видео по адресу картинки — движко-независимо, работает в ЛЮБОМ разделе.
    const isThumbSrc = (src) => {
        if (!src) return false;
        return src.includes('i.ytimg.com') || src.includes('ytimg') ||
               src.includes('/vi/') || src.includes('/vi_webp/') ||
               src.includes('hqdefault') || src.includes('mqdefault') ||
               src.includes('sddefault') || src.includes('maxresdefault') ||
               src.includes('default.jpg') || src.includes('default.webp');
    };

    const isThumb = (el) => {
        return el.matches && el.matches(
            'ytm-thumbnail-cover, a.media-item-thumbnail-container, ' +
            '.media-item-thumbnail-container, yt-thumbnail-view-model, ' +
            '.ytThumbnailViewModelHost, yt-collection-thumbnail-view-model'
        );
    };

    // Находит контейнер-обёртку превью, чтобы схлопнуть её целиком (а не только img).
    // 1) известные контейнеры по селектору; 2) обёртка по классу "thumbnail";
    // 3) самый верхний предок БЕЗ собственного текста (=чистый блок превью) —
    //    так убираем остаточное место там, где класс контейнера нестандартный,
    //    НЕ задевая метаданные (в них есть текст, на них climb останавливается).
    const thumbWrap = (img) => {
        const known = img.closest(
            'ytm-thumbnail-cover, a.media-item-thumbnail-container, ' +
            '.media-item-thumbnail-container, yt-thumbnail-view-model, ' +
            '.ytThumbnailViewModelHost, .ytLockupViewModelHostThumbnailContainer, ' +
            'yt-collection-thumbnail-view-model, ytm-thumbnail-overlay'
        );
        if (known) return known;
        let el = img.parentElement, depth = 0;
        while (el && depth < 5) {
            const cls = (el.className && el.className.toString
                ? el.className.toString() : '').toLowerCase();
            const tag = el.tagName.toLowerCase();
            if ((cls.includes('thumbnail') || tag.includes('thumbnail')) &&
                !cls.includes('avatar') && !cls.includes('profile') &&
                !cls.includes('channel') && !cls.includes('decorated')) {
                return el;
            }
            el = el.parentElement; depth++;
        }
        // climb по предкам без текста (длительность из цифр/двоеточий игнорируем)
        let best = img, p = img.parentElement, d = 0;
        while (p && d < 5) {
            const txt = (p.textContent || '').replace(/[\d:\s.,]/g, '').trim();
            if (txt.length > 0) break;          // дошли до текста — дальше не идём
            // не подниматься выше самой карточки
            if (p.matches && p.matches(
                'ytm-rich-item-renderer, ytm-video-with-context-renderer, ' +
                'ytm-compact-video-renderer, ytm-video-card-renderer, ' +
                'ytm-media-item, ytm-playlist-video-renderer, ' +
                'ytm-compact-playlist-renderer, yt-lockup-view-model')) break;
            best = p; p = p.parentElement; d++;
        }
        return best;
    };

    const collapse = (el) => {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('height', '0', 'important');
        el.style.setProperty('min-height', '0', 'important');
        el.style.setProperty('aspect-ratio', 'auto', 'important');
    };

    const killThumbs = (root) => {
        if (!root.querySelectorAll) return;
        const sel = 'ytm-thumbnail-cover, a.media-item-thumbnail-container, ' +
                    '.media-item-thumbnail-container, yt-thumbnail-view-model, ' +
                    '.ytThumbnailViewModelHost, .ytLockupViewModelHostThumbnailContainer, ' +
                    'yt-collection-thumbnail-view-model, ytm-thumbnail-overlay, ' +
                    '.yt-lockup-view-model-wiz__content-image';
        root.querySelectorAll(sel).forEach(collapse);
        // превью-картинки по src — главная страховка для ВСЕХ разделов
        root.querySelectorAll('img').forEach(img => {
            const src = img.src || img.getAttribute('src') || '';
            if (!isAvatar(img) && isThumbSrc(src)) {
                collapse(thumbWrap(img));
            }
        });
        // <yt-image> и source внутри picture — новый движок раздаёт превью так
        root.querySelectorAll('yt-image, picture source').forEach(node => {
            const srcset = node.getAttribute && (node.getAttribute('srcset') || node.getAttribute('src') || '');
            if (srcset && isThumbSrc(srcset)) {
                const img = node.querySelector && node.querySelector('img');
                if (img && isAvatar(img)) return;
                collapse(thumbWrap(node));
            }
        });
    };

    // ТОЛЬКО плейлисты (карточки, ведущие на плейлист). Главную/ленту (/watch)
    // НЕ трогаем — поэтому текст там не съезжает. Внутри карточки плейлиста
    // прячем ВСЮ обложку (в плейлистах аватарок нет) и растягиваем метаданные
    // на всю ширину слева — пустая левая колонка пропадает.
    const collapsePlaylistThumbs = (root) => {
        if (!root.querySelectorAll) return;
        const seen = new Set();
        root.querySelectorAll('a[href*="list="], a[href*="/playlist"]').forEach(a => {
            const card = a.closest(
                'ytm-compact-playlist-renderer, ytm-playlist-renderer, ' +
                'yt-lockup-view-model, ytm-playlist-video-renderer, ' +
                'lockup-view-model, [class*="lockup" i], ' +
                '[class*="playlist" i], [role="listitem"], li'
            );
            if (!card || seen.has(card)) return;
            seen.add(card);
            // гарантированная высота + разделитель, чтобы плейлисты
            // («Смотреть позже» / «Понравившиеся») не наезжали друг на друга
            card.style.setProperty('display', 'block', 'important');
            card.style.setProperty('box-sizing', 'border-box', 'important');
            card.style.setProperty('padding', '10px 0', 'important');
            card.style.setProperty('margin', '0', 'important');
            card.style.setProperty('min-height', '44px', 'important');
            card.style.setProperty('border-bottom',
                '1px solid var(--yt-spec-10-percent-layer, rgba(128,128,128,0.28))',
                'important');
            // Убираем ВСЁ, кроме текста и меню: обложки плейлистов бывают не
            // картинкой, а цветным блоком (те самые «синяя/красная полоса»).
            // Поэтому прячем любой блок БЕЗ текста (кроме меню/иконок/кнопок).
            // В плейлистах аватарок нет — так что это безопасно.
            card.querySelectorAll('*').forEach(el => {
                if (el.matches(
                    'button, [role="button"], a[aria-label], ytm-menu, ' +
                    '[class*="menu" i], yt-icon, [class*="icon" i], svg, path'
                )) return;
                if (el.querySelector && el.querySelector(
                    'button, [role="button"], ytm-menu, [class*="menu" i]'
                )) return;
                let t = '';
                try { t = (el.innerText || '').trim(); } catch (e) {}
                if (t) return;                       // есть текст — оставляем
                el.style.setProperty('display', 'none', 'important');
                el.style.setProperty('height', '0', 'important');
                el.style.setProperty('min-height', '0', 'important');
            });
            // текст/метаданные на всю ширину слева
            card.querySelectorAll(
                '[class*="metadata" i], .media-item-metadata, ' +
                '.compact-media-item-metadata'
            ).forEach(m => {
                m.style.setProperty('display', 'block', 'important');
                m.style.setProperty('width', '100%', 'important');
                m.style.setProperty('max-width', '100%', 'important');
                m.style.setProperty('margin-left', '0', 'important');
                m.style.setProperty('padding-left', '0', 'important');
                m.style.setProperty('text-align', 'left', 'important');
            });
        });
    };

    const showAvatars = (root) => {
        if (!root.querySelectorAll) return;
        root.querySelectorAll('img').forEach(img => {
            if (!isAvatar(img)) return;
            const inCard = img.closest(
                'ytm-rich-item-renderer, yt-lockup-view-model, ' +
                'ytm-video-with-context-renderer, ytm-compact-video-renderer, ' +
                'ytm-media-item, ytm-video-card-renderer, ' +
                'ytm-channel-video-card-renderer, ytm-playlist-video-renderer'
            );
            const inChrome = img.closest(
                'ytm-pivot-bar, ytm-pivot-bar-renderer, ' +
                'ytm-mobile-topbar-renderer, ytm-masthead, ' +
                'ytm-account-section-renderer, [class*="pivot-bar" i]'
            );
            if (!inCard || inChrome) return;
            img.style.setProperty('display', 'inline-block', 'important');
            img.style.setProperty('visibility', 'visible', 'important');
            img.style.setProperty('width', '40px', 'important');
            img.style.setProperty('height', '40px', 'important');
            img.style.setProperty('max-width', '40px', 'important');
            img.style.setProperty('max-height', '40px', 'important');
            img.style.setProperty('aspect-ratio', '1 / 1', 'important');
            img.style.setProperty('border-radius', '50%', 'important');
            img.style.setProperty('object-fit', 'cover', 'important');
            let wrap = img.parentElement, g = 0;
            while (wrap && wrap !== inCard.parentElement && g < 4) {
                if (!isThumb(wrap)) {
                    wrap.style.setProperty('display', 'inline-block', 'important');
                    wrap.style.setProperty('visibility', 'visible', 'important');
                }
                if (wrap.matches && wrap.matches(
                    'ytm-profile-icon, .ytProfileIconHost, yt-avatar-shape, ' +
                    'yt-decorated-avatar-view-model, ytm-channel-thumbnail-with-link-renderer'
                )) break;
                wrap = wrap.parentElement; g++;
            }
        });
    };

    const hideAds = (root) => {
        if (!root.querySelectorAll) return;
        root.querySelectorAll('ad-slot-renderer, ytm-promoted-video-renderer').forEach(ad => {
            const wrap = ad.closest('ytm-rich-item-renderer') || ad;
            wrap.style.display = 'none';
        });
    };

    const hideShorts = (root) => {
        if (!root.querySelectorAll) return;
        root.querySelectorAll('a[href*="/shorts"]').forEach(a => {
            const item = a.closest(
                'ytm-pivot-bar-item-renderer, ytm-rich-item-renderer, ' +
                'yt-lockup-view-model, ytm-video-with-context-renderer, ' +
                'ytm-compact-video-renderer, ytm-video-card-renderer, ' +
                'ytm-media-item, ytm-playlist-video-renderer, ytm-reel-item-renderer'
            );
            if (item) item.style.setProperty('display', 'none', 'important');
        });
        root.querySelectorAll('ytm-pivot-bar-item-renderer').forEach(item => {
            const host = item.querySelector('[aria-label], [title], button, a');
            const label = (
                (host?.getAttribute('aria-label') || '') + ' ' +
                (host?.getAttribute('title') || '') + ' ' +
                (item.textContent || '')
            ).toLowerCase();
            if (label.includes('shorts') || label.includes('шортс') ||
                label.includes('кратко') || item.innerHTML.includes('/shorts'))
                item.style.display = 'none';
        });
    };

    const hideCommunity = (root) => {
        if (!root.querySelectorAll) return;
        root.querySelectorAll(
            'ytm-post-renderer, ytm-backstage-post-renderer, ' +
            'ytm-backstage-post-thread-renderer, ytm-poll-renderer, ' +
            'ytm-backstage-poll-renderer'
        ).forEach(post => {
            const wrap = post.closest('ytm-rich-item-renderer, ytm-rich-section-renderer');
            (wrap || post).style.display = 'none';
        });
    };

    // Раздел "Ещё темы" / "More topics" — прячем по тексту заголовка
    // (надёжнее, чем по классам: работает на любом языке интерфейса).
    const MORE_TOPICS = [
        'ещё темы', 'еще темы', 'больше тем', 'ещё на youtube', 'еще на youtube',
        'more topics', 'explore more', 'more from youtube'
    ];
    const SECTION_BOX = 'ytm-rich-section-renderer, ytm-shelf-renderer, ' +
        'ytm-rich-shelf-renderer, grid-shelf-view-model, ytm-item-section-renderer';
    const hideMoreTopics = (root) => {
        if (!root.querySelectorAll) return;
        // Перебираем короткие текстовые узлы-заголовки и сверяем точное совпадение.
        root.querySelectorAll(
            'h2, h3, [role="heading"], .shelf-title, yt-formatted-string, span'
        ).forEach(head => {
            const t = (head.textContent || '').trim().toLowerCase();
            if (!t || t.length > 24) return;
            if (MORE_TOPICS.some(l => t === l)) {
                const sec = head.closest(SECTION_BOX);
                (sec || head).style.setProperty('display', 'none', 'important');
            }
        });
    };

    // ===== УБРАННЫЕ РАЗДЕЛЫ: меню + чипы фильтров =====
    // Точные подписи (как видит пользователь) + английские варианты.
    const REMOVED_LABELS = new Set([
        'музыка', 'music', 'youtube music',
        'трансляции', 'прямые трансляции', 'live',
        'видеоигры', 'игры', 'gaming', 'games',
        'новости', 'news',
        'спорт', 'sport', 'sports',
        'обучение', 'courses', 'learning',
        'мода и красота', 'мода', 'fashion & beauty', 'fashion and beauty', 'fashion',
        'творческая студия youtube', 'творческая студия', 'youtube studio', 'studio',
        'youtube детям', 'youtube kids', 'youtube create'
    ]);
    const REMOVED_HREFS = [
        '/gaming', '/news', '/sports', '/learning', '/fashion',
        'music.youtube.com', 'studio.youtube.com', 'youtubekids.com',
        'youtube.com/create'
    ];
    const inFeedCard = (el) => !!el.closest(
        'ytm-rich-item-renderer, ytm-video-with-context-renderer, ' +
        'ytm-compact-video-renderer, yt-lockup-view-model, ytm-media-item'
    );
    const hideRemovedSections = (root) => {
        if (!root.querySelectorAll) return;
        // 1) Пункты бокового меню (ссылки) — по адресу или по точной подписи.
        root.querySelectorAll('a[href]').forEach(a => {
            const href = (a.getAttribute('href') || '').toLowerCase();
            const text = (a.textContent || '').trim().toLowerCase();
            const byHref = REMOVED_HREFS.some(h => href.includes(h));
            // подпись сверяем только ВНЕ карточек видео (чтобы не трогать каналы)
            const byText = REMOVED_LABELS.has(text) && !inFeedCard(a);
            if (byHref || byText) {
                const row = a.closest(
                    'ytm-guide-entry-renderer, .guide-entry, ' +
                    '[role="menuitem"], li'
                ) || a;
                row.style.setProperty('display', 'none', 'important');
            }
        });
        // 2) Чипы-фильтры сверху (Музыка/Видеоигры/...) — кроме «Все».
        root.querySelectorAll(
            'ytm-chip-cloud-chip-renderer, .chip-container, ' +
            'button[role="tab"], yt-chip-cloud-chip-view-model'
        ).forEach(chip => {
            const text = (chip.textContent || '').trim().toLowerCase();
            if (text === 'все' || text === 'all') return;
            if (REMOVED_LABELS.has(text)) {
                chip.style.setProperty('display', 'none', 'important');
            }
        });
    };

    // ===== АВАТАРКИ В ИСТОРИИ (как на главной) =====
    // Компактные карточки истории не содержат аватарку в разметке. Поэтому
    // собираем пары «канал → аватарка» с карточек, где аватарка ЕСТЬ (главная,
    // подписки), и подставляем нужную слева в карточки истории.
    const avatarCache = new Map(); // имя канала (lc) -> src аватарки

    const cardChannelName = (card) => {
        // имя канала = текст ссылки на канал (а не на /watch)
        for (const a of card.querySelectorAll('a[href]')) {
            const h = a.getAttribute('href') || '';
            if (h.startsWith('/@') || h.includes('/channel/') ||
                h.includes('/user/') || h.startsWith('/c/')) {
                const t = (a.textContent || '').trim();
                if (t) return t.toLowerCase();
            }
        }
        const by = card.querySelector(
            '.media-item-byline, [class*="byline" i], [class*="metadata" i]'
        );
        let t = (by?.textContent || '').trim();
        t = t.split('•')[0].split('·')[0];
        // отрезаем "N тыс./млн просмотров…" — имя канала идёт первым (имена с
        // цифрами, напр. LuCAS8, при этом сохраняются)
        t = t.replace(/\s*\d[\d.,\s]*(тыс\.?|млн|млрд|просмотр\w*|views?|view).*$/i, '');
        return t.trim().toLowerCase();
    };

    const harvestAvatars = (root) => {
        if (!root.querySelectorAll) return;
        root.querySelectorAll(
            'ytm-rich-item-renderer, ytm-video-with-context-renderer, ' +
            'ytm-compact-video-renderer, yt-lockup-view-model'
        ).forEach(card => {
            let img = null;
            for (const im of card.querySelectorAll('img')) {
                if (isAvatar(im)) { img = im; break; }
            }
            if (!img) return;
            const src = img.src || img.getAttribute('src') || '';
            if (!src) return;
            const name = cardChannelName(card);
            if (name) avatarCache.set(name, src);
        });
    };

    const injectHistoryAvatars = (root) => {
        if (!root.querySelectorAll) return;
        root.querySelectorAll(
            'ytm-video-card-renderer, ytm-playlist-video-renderer, ' +
            'ytm-compact-video-renderer, ytm-media-item, yt-lockup-view-model'
        ).forEach(card => {
            try {
                if (card.dataset.reysuAvatar) return;
                // уже есть своя аватарка — ничего не делаем
                for (const im of card.querySelectorAll('img'))
                    if (isAvatar(im)) { card.dataset.reysuAvatar = 'native'; return; }
                const name = cardChannelName(card);
                if (!name) return;
                const src = avatarCache.get(name);
                if (!src) return;
                const img = document.createElement('img');
                img.src = src;
                img.alt = '';
                img.referrerPolicy = 'no-referrer';
                img.style.cssText =
                    'position:absolute;left:8px;top:50%;transform:translateY(-50%);' +
                    'width:40px;height:40px;border-radius:50%;object-fit:cover;z-index:1;';
                card.style.setProperty('position', 'relative', 'important');
                card.style.setProperty('padding-left', '60px', 'important');
                card.appendChild(img);
                card.dataset.reysuAvatar = '1';
            } catch (e) {}
        });
    };

    const killInlinePlayback = (root) => {
        if (!root.querySelectorAll) return;
        const onWatch = location.pathname.startsWith('/watch');
        root.querySelectorAll('video').forEach(v => {
            const inFeed = v.closest(
                'ytm-rich-item-renderer, yt-lockup-view-model, ' +
                'ytm-video-with-context-renderer, ytm-inline-player-renderer'
            );
            if (onWatch && !inFeed) return;
            try {
                v.muted = true; v.autoplay = false;
                v.removeAttribute('autoplay'); v.pause();
                if (!v.dataset.reysuBlocked) {
                    v.dataset.reysuBlocked = '1';
                    v.addEventListener('play', () => {
                        const stillFeed = v.closest('ytm-rich-item-renderer, yt-lockup-view-model');
                        if (stillFeed && !location.pathname.startsWith('/watch')) v.pause();
                    });
                }
            } catch (e) {}
        });
    };

    const sweep = (root = document) => {
        killThumbs(root);
        collapsePlaylistThumbs(root);
        showAvatars(root);
        hideAds(root);
        hideShorts(root);
        hideCommunity(root);
        hideMoreTopics(root);
        hideRemovedSections(root);
        harvestAvatars(root);
        injectHistoryAvatars(root);
        killInlinePlayback(root);
    };

    const observer = new MutationObserver((mutations) => {
        for (const m of mutations)
            for (const node of m.addedNodes)
                if (node.nodeType === 1) sweep(node);
    });

    const start = () => {
        sweep(document);
        observer.observe(document.documentElement, { childList: true, subtree: true });
        // Повторные проходы: ловим элементы, у которых на первом проходе ещё не
        // было раскладки (высота 0), и подставляем аватарки после наполнения кэша.
        [400, 1000, 2500].forEach(ms => setTimeout(() => sweep(document), ms));
    };

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start);
})();
