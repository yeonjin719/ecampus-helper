// @ts-nocheck
(() => {
    const E = window.__ECDASH__;
    if (!E) return;

    const VOD_SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2];

    E.isVodPlayerPage = function isVodPlayerPage() {
        return document.getElementById('vod_player') != null;
    };

    E.getSync = async function getSync(keys) {
        try {
            return await chrome.storage?.sync?.get?.(keys);
        } catch (_) {
            return {};
        }
    };

    E.setSync = async function setSync(obj) {
        try {
            await chrome.storage?.sync?.set?.(obj);
        } catch (_) {
            // 무시
        }
    };

    E.getVodLanguageSet = function getVodLanguageSet(lang) {
        if (lang === 'en') {
            return ['[Ready] ', '[Paused] ', '[Playing] ', '[Complete] '];
        }
        return ['[재생준비] ', '[일시정지] ', '[재생중] ', '[재생완료] '];
    };

    E.stripVodTitleStatePrefix = function stripVodTitleStatePrefix(title) {
        let base = String(title || '');
        const prefixes = [
            '[재생준비] ',
            '[일시정지] ',
            '[재생중] ',
            '[재생완료] ',
            '[Ready] ',
            '[Paused] ',
            '[Playing] ',
            '[Complete] ',
        ];

        let changed = true;
        while (changed) {
            changed = false;
            for (const prefix of prefixes) {
                if (base.startsWith(prefix)) {
                    base = base.slice(prefix.length);
                    changed = true;
                }
            }
        }

        return base.trimStart();
    };

    E.closeVideoWindowRandomDelay = function closeVideoWindowRandomDelay() {
        const randomSec = Math.floor(Math.random() * 11);
        setTimeout(() => window.close(), randomSec * 1000);
    };

    E.normalizeVodPlaybackRate = function normalizeVodPlaybackRate(raw) {
        const value = Number(raw);
        if (!Number.isFinite(value)) return 1;
        if (value < VOD_SPEED_OPTIONS[0]) return VOD_SPEED_OPTIONS[0];
        if (value > VOD_SPEED_OPTIONS[VOD_SPEED_OPTIONS.length - 1]) {
            return VOD_SPEED_OPTIONS[VOD_SPEED_OPTIONS.length - 1];
        }
        return Math.round(value * 100) / 100;
    };

    E.closestVodSpeedOption = function closestVodSpeedOption(raw) {
        const value = E.normalizeVodPlaybackRate(raw);
        let best = VOD_SPEED_OPTIONS[0];
        let diff = Math.abs(value - best);

        for (const option of VOD_SPEED_OPTIONS) {
            const nextDiff = Math.abs(value - option);
            if (nextDiff < diff) {
                best = option;
                diff = nextDiff;
            }
        }

        return best;
    };

    E.nextVodSpeedOption = function nextVodSpeedOption(raw, direction) {
        const current = E.closestVodSpeedOption(raw);
        const idx = VOD_SPEED_OPTIONS.findIndex(
            (option) => Math.abs(option - current) < 0.001,
        );
        const safeIdx = idx >= 0 ? idx : 1;
        const delta = direction > 0 ? 1 : -1;
        const nextIdx = Math.max(
            0,
            Math.min(VOD_SPEED_OPTIONS.length - 1, safeIdx + delta),
        );
        return VOD_SPEED_OPTIONS[nextIdx];
    };

    E.findVodVideoElement = function findVodVideoElement() {
        return (
            document.querySelector('#vod_player video') ||
            document.querySelector('video')
        );
    };

    E.getVodJwPlayerInstance = function getVodJwPlayerInstance() {
        if (typeof window.jwplayer !== 'function') return null;

        const candidates = ['vod_player', undefined];
        for (const candidate of candidates) {
            try {
                const instance =
                    typeof candidate === 'undefined'
                        ? window.jwplayer()
                        : window.jwplayer(candidate);
                if (!instance) continue;
                if (
                    typeof instance.setPlaybackRate === 'function' ||
                    typeof instance.getPlaybackRate === 'function'
                ) {
                    return instance;
                }
            } catch (_) {
                // 무시
            }
        }

        return null;
    };

    E.getCurrentVodPlaybackRate = function getCurrentVodPlaybackRate() {
        const player = E.getVodJwPlayerInstance();
        if (player && typeof player.getPlaybackRate === 'function') {
            try {
                const rate = Number(player.getPlaybackRate());
                if (Number.isFinite(rate)) return E.normalizeVodPlaybackRate(rate);
            } catch (_) {
                // 무시
            }
        }

        const video = E.findVodVideoElement();
        if (video) {
            const rate = Number(video.playbackRate);
            if (Number.isFinite(rate)) return E.normalizeVodPlaybackRate(rate);
        }

        return 1;
    };

    E.toAbsoluteVodUrl = function toAbsoluteVodUrl(rawUrl) {
        const value = String(rawUrl || '').trim();
        if (!value) return '';
        if (value.startsWith('blob:')) return value;

        try {
            return new URL(value, location.href).toString();
        } catch (_) {
            return '';
        }
    };

    E.rankVodDownloadUrl = function rankVodDownloadUrl(url) {
        const lower = String(url || '').toLowerCase();
        if (!lower) return 0;
        if (lower.startsWith('blob:')) return 0;
        if (/\.(?:mp4|m4v|mov|webm)(?:$|[?#])/.test(lower)) return 5;
        if (/\.(?:mp3|m4a|aac)(?:$|[?#])/.test(lower)) return 4;
        if (/\.(?:m3u8|mpd)(?:$|[?#])/.test(lower)) return 1;
        return 2;
    };

    E.getCurrentVodDownloadUrl = function getCurrentVodDownloadUrl() {
        const candidates = [];

        const video = E.findVodVideoElement();
        if (video) {
            candidates.push(video.currentSrc || '');
            candidates.push(video.src || '');
            const sourceEl = video.querySelector('source[src]');
            candidates.push(sourceEl?.src || '');
        }

        const player = E.getVodJwPlayerInstance();
        if (player) {
            try {
                const item =
                    typeof player.getPlaylistItem === 'function'
                        ? player.getPlaylistItem()
                        : null;
                if (item) {
                    candidates.push(item.file || '');
                    if (Array.isArray(item.sources)) {
                        item.sources.forEach((source) => {
                            candidates.push(source?.file || source?.src || '');
                        });
                    }
                }
            } catch (_) {
                // 무시
            }
        }

        const normalized = candidates
            .map((url) => E.toAbsoluteVodUrl(url))
            .filter(Boolean);

        const unique = [...new Set(normalized)];
        const direct = unique
            .filter((url) => !url.startsWith('blob:'))
            .sort((a, b) => E.rankVodDownloadUrl(b) - E.rankVodDownloadUrl(a));
        if (direct.length) return direct[0];

        const blob = unique.find((url) => url.startsWith('blob:'));
        if (blob) return blob;

        return normalized[0] || '';
    };

    E.getVodDownloadFilename = function getVodDownloadFilename(url) {
        const baseRaw = E.stripVodTitleStatePrefix(document.title) || 'lecture';
        const base = baseRaw
            .replace(/[\\/:*?"<>|]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        let ext = 'mp4';
        try {
            if (url && !url.startsWith('blob:')) {
                const pathname = new URL(url).pathname || '';
                const match = pathname.match(/\.([a-z0-9]{2,5})$/i);
                if (match?.[1]) ext = match[1].toLowerCase();
            }
        } catch (_) {
            // 무시
        }

        return `${base || 'lecture'}.${ext}`;
    };

    E.triggerVodDownloadByAnchor = function triggerVodDownloadByAnchor(
        url,
        filename,
    ) {
        if (!url) return false;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename || '';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        return true;
    };

    E.requestExtensionDownload = function requestExtensionDownload(url, filename) {
        const chromeRuntime = globalThis?.chrome?.runtime;
        if (!chromeRuntime?.sendMessage) {
            return Promise.resolve(false);
        }

        return new Promise((resolve) => {
            try {
                chromeRuntime.sendMessage(
                    {
                        type: 'ecdash:download-resource',
                        payload: { url, filename },
                    },
                    (response) => {
                        const lastError = globalThis?.chrome?.runtime?.lastError;
                        if (lastError) {
                            resolve(false);
                            return;
                        }
                        resolve(Boolean(response?.ok));
                    },
                );
            } catch (_) {
                resolve(false);
            }
        });
    };

    E.triggerVodDownload = async function triggerVodDownload(url, filename) {
        const normalizedUrl = E.toAbsoluteVodUrl(url);
        if (!normalizedUrl) return false;

        if (!normalizedUrl.startsWith('blob:')) {
            const requestedByExtension = await E.requestExtensionDownload(
                normalizedUrl,
                filename,
            );
            if (requestedByExtension) return true;

            try {
                const response = await fetch(normalizedUrl, {
                    credentials: 'include',
                    cache: 'no-store',
                });
                if (response.ok) {
                    const blob = await response.blob();
                    if (blob && blob.size > 0) {
                        const blobUrl = URL.createObjectURL(blob);
                        const triggered = E.triggerVodDownloadByAnchor(
                            blobUrl,
                            filename,
                        );
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
                        if (triggered) return true;
                    }
                }
            } catch (_) {
                // 무시
            }
            return false;
        }

        return E.triggerVodDownloadByAnchor(normalizedUrl, filename);
    };

    E.updateVodDownloadButtonState = function updateVodDownloadButtonState(
        panel,
    ) {
        if (!panel) return;
        const button = panel.querySelector('#ecdash-vod-download');
        if (!button) return;

        const url = E.getCurrentVodDownloadUrl();
        const isDownloading = button.dataset.downloading === '1';
        button.dataset.url = url;
        button.disabled = isDownloading || !url;
        if (isDownloading) {
            button.title = '다운로드 준비 중...';
            return;
        }
        button.title = url
            ? '현재 재생 강의 파일 다운로드'
            : '다운로드 URL을 찾는 중...';
    };

    E.applyVodPlaybackRate = function applyVodPlaybackRate(rawRate) {
        const rate = E.closestVodSpeedOption(rawRate);
        let applied = false;

        const player = E.getVodJwPlayerInstance();
        if (player && typeof player.setPlaybackRate === 'function') {
            try {
                player.setPlaybackRate(rate);
                applied = true;
            } catch (_) {
                // 무시
            }
        }

        const video = E.findVodVideoElement();
        if (video) {
            try {
                video.defaultPlaybackRate = rate;
                video.playbackRate = rate;
                applied = true;
            } catch (_) {
                // 무시
            }
        }

        return { applied, rate };
    };

    E.seekVodByDelta = function seekVodByDelta(rawDeltaSec) {
        const deltaSec = Number(rawDeltaSec);
        if (!Number.isFinite(deltaSec) || deltaSec === 0) return false;

        const player = E.getVodJwPlayerInstance();
        if (
            player &&
            typeof player.getPosition === 'function' &&
            typeof player.seek === 'function'
        ) {
            try {
                const position = Number(player.getPosition());
                const duration =
                    typeof player.getDuration === 'function'
                        ? Number(player.getDuration())
                        : NaN;
                const hasDuration = Number.isFinite(duration) && duration > 0;
                const next = Math.max(
                    0,
                    Math.min(
                        hasDuration ? Math.max(duration - 0.05, 0) : Number.POSITIVE_INFINITY,
                        (Number.isFinite(position) ? position : 0) + deltaSec,
                    ),
                );
                player.seek(next);
                return true;
            } catch (_) {
                // 무시
            }
        }

        const video = E.findVodVideoElement();
        if (video && Number.isFinite(Number(video.currentTime))) {
            try {
                const duration = Number(video.duration);
                const hasDuration = Number.isFinite(duration) && duration > 0;
                const next = Math.max(
                    0,
                    Math.min(
                        hasDuration ? Math.max(duration - 0.05, 0) : Number.POSITIVE_INFINITY,
                        Number(video.currentTime) + deltaSec,
                    ),
                );
                video.currentTime = next;
                return true;
            } catch (_) {
                // 무시
            }
        }

        return false;
    };

    E.initVodEnhancements = async function initVodEnhancements() {
        if (!E.isVodPlayerPage()) return;

        const stored = await E.getSync([
            E.constants.VOD_AUTO_CLOSE_KEY,
            E.constants.VOD_LANG_KEY,
            E.constants.VOD_PLAYBACK_RATE_KEY,
        ]);

        if (typeof stored[E.constants.VOD_LANG_KEY] === 'undefined') {
            await E.setSync({ [E.constants.VOD_LANG_KEY]: 'ko' });
        }
        if (typeof stored[E.constants.VOD_AUTO_CLOSE_KEY] === 'undefined') {
            await E.setSync({ [E.constants.VOD_AUTO_CLOSE_KEY]: false });
        }
        if (typeof stored[E.constants.VOD_PLAYBACK_RATE_KEY] === 'undefined') {
            await E.setSync({ [E.constants.VOD_PLAYBACK_RATE_KEY]: 1 });
        }

        const lang = stored[E.constants.VOD_LANG_KEY] === 'en' ? 'en' : 'ko';
        const autoClose = Boolean(stored[E.constants.VOD_AUTO_CLOSE_KEY]);
        const playbackRate = E.closestVodSpeedOption(
            stored[E.constants.VOD_PLAYBACK_RATE_KEY],
        );
        const languageSet = E.getVodLanguageSet(lang);

        const baseTitle = E.stripVodTitleStatePrefix(document.title);
        document.title = languageSet[0] + baseTitle;

        const target = document.getElementById('vod_player');
        if (!target) return;

        if (E.__vodStateObserver) {
            try {
                E.__vodStateObserver.disconnect();
            } catch (_) {
                // 무시
            }
            E.__vodStateObserver = null;
        }

        const observer = new MutationObserver(() => {
            const state = Array.from(target.classList).find((c) =>
                c.startsWith('jw-state-'),
            );

            if (state === 'jw-state-paused') {
                document.title = languageSet[1] + baseTitle;
            } else if (state === 'jw-state-playing') {
                document.title = languageSet[2] + baseTitle;
            } else if (state === 'jw-state-complete') {
                document.title = languageSet[3] + baseTitle;
                observer.disconnect();
                E.__vodStateObserver = null;
                if (autoClose) E.closeVideoWindowRandomDelay();
            }
        });

        E.__vodStateObserver = observer;
        observer.observe(target, { attributes: true });

        // 화면 패널 모듈은 별도 파일에서 로드됨.
        if (typeof E.initVodPlaybackRateControls === 'function') {
            await E.initVodPlaybackRateControls(playbackRate);
        }
    };
})();
