// ==UserScript==
// @name         Clean YouTube Reysu (Text Only)
// @namespace    reysu
// @version      2.0
// @description  Прячет ВСЕ превью YouTube (главная, трансляции, игры, новости, спорт, обучение, поиск, разделы — везде), оставляет только текст и аватарки, добавляет аккуратные разделители под цвет темы.
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
            min-height: 0 !important;
            max-height: 0 !important;
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
        /* Размер 36px — ТОЛЬКО для аватарок внутри карточек ленты. */
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
            width: 36px !important;
            height: 36px !important;
            max-width: 36px !important;
            max-height: 36px !important;
            aspect-ratio: 1 / 1 !important;
            border-radius: 50% !important;
            object-fit: cover !important;
        }

        /* ===== РАЗДЕЛИТЕЛИ под цвет темы =====
           Тонкая серая линия между карточками, чтобы текст не "сливался".
           Цвет берём из токена темы YouTube (адаптируется к тёмной/светлой),
           серый запасной вариант — если токена нет. */
        ytm-video-with-context-renderer,
        ytm-compact-video-renderer,
        ytm-video-card-renderer,
        ytm-channel-video-card-renderer,
        ytm-media-item,
        ytm-large-media-item-renderer,
        ytm-playlist-video-renderer,
        yt-lockup-view-model {
            display: block !important;
            border-bottom: 1px solid var(--yt-spec-10-percent-layer, rgba(128, 128, 128, 0.28)) !important;
            padding-bottom: 12px !important;
            margin-bottom: 12px !important;
        }
        /* Чуть больше воздуха у карточек главной сетки */
        ytm-rich-item-renderer {
            margin-bottom: 4px !important;
        }
        /* Разделитель между горизонтальными полками/разделами */
        ytm-rich-section-renderer,
        ytm-shelf-renderer,
        ytm-item-section-renderer {
            border-bottom: 1px solid var(--yt-spec-10-percent-layer, rgba(128, 128, 128, 0.28)) !important;
            padding-bottom: 8px !important;
            margin-bottom: 8px !important;
        }
        /* Последний элемент списка — без линии снизу */
        ytm-item-section-renderer:last-child,
        ytm-rich-section-renderer:last-child {
            border-bottom: none !important;
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

        /* ===== SHORTS ===== */
        ytm-reel-shelf-renderer,
        ytm-rich-section-renderer:has(ytm-reel-shelf-renderer),
        ytm-rich-item-renderer:has(a[href*="/shorts"]),
        ytm-video-with-context-renderer:has(a[href*="/shorts"]),
        yt-lockup-view-model:has(a[href*="/shorts"]),
        grid-shelf-view-model:has([href*="/shorts"]),
        ytm-shorts-lockup-view-model-v2,
        ytm-pivot-bar-item-renderer:has(a[href*="/shorts"]),
        ytm-pivot-bar-item-renderer:has([aria-label*="Shorts" i]) {
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
    const thumbWrap = (img) => {
        const known = img.closest(
            'ytm-thumbnail-cover, a.media-item-thumbnail-container, ' +
            '.media-item-thumbnail-container, yt-thumbnail-view-model, ' +
            '.ytThumbnailViewModelHost, .ytLockupViewModelHostThumbnailContainer, ' +
            'yt-collection-thumbnail-view-model, ytm-thumbnail-overlay'
        );
        if (known) return known;
        // обёртка по классу, в названии которого есть "thumbnail" (но не аватарка)
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
        return img;
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

    const showAvatars = (root) => {
        if (!root.querySelectorAll) return;
        root.querySelectorAll('img').forEach(img => {
            if (!isAvatar(img)) return;
            const inCard = img.closest(
                'ytm-rich-item-renderer, yt-lockup-view-model, ' +
                'ytm-video-with-context-renderer, ytm-compact-video-renderer, ' +
                'ytm-media-item'
            );
            const inChrome = img.closest(
                'ytm-pivot-bar, ytm-pivot-bar-renderer, ' +
                'ytm-mobile-topbar-renderer, ytm-masthead, ' +
                'ytm-account-section-renderer, [class*="pivot-bar" i]'
            );
            if (!inCard || inChrome) return;
            img.style.setProperty('display', 'inline-block', 'important');
            img.style.setProperty('visibility', 'visible', 'important');
            img.style.setProperty('width', '36px', 'important');
            img.style.setProperty('height', '36px', 'important');
            img.style.setProperty('max-width', '36px', 'important');
            img.style.setProperty('max-height', '36px', 'important');
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
                'yt-lockup-view-model, ytm-video-with-context-renderer, ytm-reel-item-renderer'
            );
            if (item) item.style.display = 'none';
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
        showAvatars(root);
        hideAds(root);
        hideShorts(root);
        hideCommunity(root);
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
    };

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start);
})();
