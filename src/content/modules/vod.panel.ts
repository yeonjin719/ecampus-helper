// @ts-nocheck
import { buildVodPanelMarkup } from './vod.panel.template';

(() => {
    const E = window.__ECDASH__;
    if (!E) return;

    const VOD_SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2];
    const VOD_SPEED_PANEL_ID = 'ecdash-vod-speed-panel';
    const VOD_SPEED_MENU_ID = 'ecdash-vod-speed-menu';
    const VOD_PANEL_BODY_ID = 'ecdash-vod-panel-body';
    const VOD_PANEL_TOGGLE_ID = 'ecdash-vod-panel-toggle';

    E.updateVodSpeedPanelRate = function updateVodSpeedPanelRate(rate) {
        const panel = document.getElementById(VOD_SPEED_PANEL_ID);
        if (!panel) return;

        const current = E.closestVodSpeedOption(rate);
        const label = panel.querySelector('#ecdash-vod-speed-current');
        if (!label) return;
        label.textContent = `${current.toFixed(2)}x`;
        label.setAttribute('aria-label', `현재 배속 ${current.toFixed(2)}x`);
    };

    E.updateVodSpeedMenuSelection = function updateVodSpeedMenuSelection(rate) {
        const panel = document.getElementById(VOD_SPEED_PANEL_ID);
        if (!panel) return;

        const current = E.closestVodSpeedOption(rate);
        panel.querySelectorAll('.ecdash-vod-speed-option').forEach((btn) => {
            const value = Number(btn.dataset.rate);
            const active = Math.abs(value - current) < 0.001;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
    };

    E.setVodSpeedMenuOpen = function setVodSpeedMenuOpen(panel, isOpen) {
        if (!panel) return;

        const menu = panel.querySelector(`#${VOD_SPEED_MENU_ID}`);
        const trigger = panel.querySelector('#ecdash-vod-speed-current');
        if (!menu || !trigger) return;

        const open = Boolean(isOpen);
        panel.classList.toggle('is-menu-open', open);
        menu.hidden = !open;
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    E.setVodSpeedPanelCollapsed = function setVodSpeedPanelCollapsed(
        panel,
        isCollapsed,
    ) {
        if (!panel) return;

        const body = panel.querySelector(`#${VOD_PANEL_BODY_ID}`);
        const toggle = panel.querySelector(`#${VOD_PANEL_TOGGLE_ID}`);
        if (!body || !toggle) return;

        const collapsed = Boolean(isCollapsed);
        panel.classList.toggle('is-collapsed', collapsed);
        body.hidden = collapsed;
        toggle.textContent = collapsed ? '▶' : '◁';
        toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        toggle.setAttribute('aria-label', collapsed ? '패널 펼치기' : '패널 접기');
        toggle.title = collapsed ? '펼치기' : '접기';
    };

    E.ensureVodSpeedPanel = function ensureVodSpeedPanel() {
        let panel = document.getElementById(VOD_SPEED_PANEL_ID);
        if (panel) return panel;

        panel = document.createElement('div');
        panel.id = VOD_SPEED_PANEL_ID;
        panel.innerHTML = buildVodPanelMarkup(
            VOD_SPEED_MENU_ID,
            VOD_PANEL_BODY_ID,
            VOD_PANEL_TOGGLE_ID,
        );

        const menu = panel.querySelector(`#${VOD_SPEED_MENU_ID}`);
        if (menu) {
            VOD_SPEED_OPTIONS.forEach((option) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'ecdash-vod-speed-option';
                btn.dataset.rate = String(option);
                btn.setAttribute('role', 'option');
                btn.setAttribute('aria-selected', 'false');
                btn.textContent = `${option.toFixed(2)}x`;
                menu.appendChild(btn);
            });
        }
        E.setVodSpeedPanelCollapsed(panel, false);

        document.body.appendChild(panel);
        return panel;
    };

    // 패널 이벤트 연결 + 재생/다운로드 상태 동기화.
    E.initVodPlaybackRateControls = async function initVodPlaybackRateControls(
        initialRate,
    ) {
        const panel = E.ensureVodSpeedPanel();
        let targetRate = E.closestVodSpeedOption(initialRate);
        const closeMenu = () => E.setVodSpeedMenuOpen(panel, false);

        const persistRate = async (rate) => {
            try {
                await E.setSync({ [E.constants.VOD_PLAYBACK_RATE_KEY]: rate });
            } catch (_) {
                // 무시
            }
        };

        const applyAndPersist = async (nextRate, persist = true) => {
            const { rate } = E.applyVodPlaybackRate(nextRate);
            targetRate = E.closestVodSpeedOption(rate);
            E.updateVodSpeedPanelRate(targetRate);
            E.updateVodSpeedMenuSelection(targetRate);
            if (persist) await persistRate(targetRate);
        };

        panel
            .querySelector(`#${VOD_PANEL_TOGGLE_ID}`)
            ?.addEventListener('click', () => {
                const nextCollapsed = !panel.classList.contains('is-collapsed');
                if (nextCollapsed) {
                    closeMenu();
                }
                E.setVodSpeedPanelCollapsed(panel, nextCollapsed);
            });

        panel
            .querySelector('#ecdash-vod-speed-down')
            ?.addEventListener('click', () => {
                closeMenu();
                void applyAndPersist(
                    E.nextVodSpeedOption(targetRate, -1),
                    true,
                );
            });

        panel
            .querySelector('#ecdash-vod-speed-up')
            ?.addEventListener('click', () => {
                closeMenu();
                void applyAndPersist(E.nextVodSpeedOption(targetRate, 1), true);
            });

        panel
            .querySelector('#ecdash-vod-speed-current')
            ?.addEventListener('click', () => {
                const isOpen = panel.classList.contains('is-menu-open');
                E.setVodSpeedMenuOpen(panel, !isOpen);
                if (!isOpen) {
                    E.updateVodSpeedMenuSelection(targetRate);
                }
            });

        panel
            .querySelector(`#${VOD_SPEED_MENU_ID}`)
            ?.addEventListener('click', (event) => {
                const optionBtn = event.target.closest('button[data-rate]');
                if (!optionBtn) return;

                const nextRate = Number(optionBtn.dataset.rate);
                closeMenu();
                void applyAndPersist(nextRate, true);
            });

        panel
            .querySelector('#ecdash-vod-download')
            ?.addEventListener('click', async () => {
                const button = panel.querySelector('#ecdash-vod-download');
                if (!button || button.dataset.downloading === '1') return;

                const url = button.dataset.url || E.getCurrentVodDownloadUrl();
                if (!url) {
                    E.updateVodDownloadButtonState(panel);
                    return;
                }

                const filename = E.getVodDownloadFilename(url);
                button.dataset.downloading = '1';
                E.updateVodDownloadButtonState(panel);

                try {
                    await E.triggerVodDownload(url, filename);
                } finally {
                    delete button.dataset.downloading;
                    E.updateVodDownloadButtonState(panel);
                }
            });

        panel
            .querySelector('#ecdash-vod-seek-back')
            ?.addEventListener('click', () => {
                closeMenu();
                E.seekVodByDelta(-5);
            });

        panel
            .querySelector('#ecdash-vod-seek-forward')
            ?.addEventListener('click', () => {
                closeMenu();
                E.seekVodByDelta(5);
            });

        document.addEventListener('click', (event) => {
            if (panel.contains(event.target)) return;
            closeMenu();
        });

        document.addEventListener('keydown', (event) => {
            const tagName = String(event.target?.tagName || '').toLowerCase();
            const isTyping =
                tagName === 'input' ||
                tagName === 'textarea' ||
                tagName === 'select' ||
                Boolean(event.target?.isContentEditable);
            if (event.key === 'Escape') {
                closeMenu();
                return;
            }
            if (isTyping || !event.altKey) return;

            if (event.key === ',' || event.key === '<') {
                event.preventDefault();
                closeMenu();
                void applyAndPersist(
                    E.nextVodSpeedOption(targetRate, -1),
                    true,
                );
            } else if (event.key === '.' || event.key === '>') {
                event.preventDefault();
                closeMenu();
                void applyAndPersist(E.nextVodSpeedOption(targetRate, 1), true);
            } else if (event.key === '/') {
                event.preventDefault();
                closeMenu();
                void applyAndPersist(1, true);
            }
        });

        const bindVideoListeners = () => {
            const videos = [
                ...document.querySelectorAll('#vod_player video, video'),
            ];
            for (const video of videos) {
                if (video.dataset.ecdashSpeedBound === '1') continue;
                video.dataset.ecdashSpeedBound = '1';

                const sync = () => {
                    const applied = E.applyVodPlaybackRate(targetRate);
                    if (applied.applied) {
                        E.updateVodSpeedPanelRate(applied.rate);
                        E.updateVodSpeedMenuSelection(applied.rate);
                    }
                    E.updateVodDownloadButtonState(panel);
                };

                video.addEventListener('loadedmetadata', sync);
                video.addEventListener('play', sync);
            }
        };

        const vodRoot = document.getElementById('vod_player');
        if (vodRoot) {
            const speedObserver = new MutationObserver(() => {
                bindVideoListeners();
                const applied = E.applyVodPlaybackRate(targetRate);
                if (applied.applied) {
                    E.updateVodSpeedPanelRate(applied.rate);
                    E.updateVodSpeedMenuSelection(applied.rate);
                }
                E.updateVodDownloadButtonState(panel);
            });

            speedObserver.observe(vodRoot, {
                childList: true,
                subtree: true,
                attributes: true,
            });
        }

        bindVideoListeners();
        const first = E.applyVodPlaybackRate(targetRate);
        if (!first.applied) {
            // 플레이어 초기화 지연 대비: 짧은 시간 동안 재시도
            let retries = 0;
            const timer = setInterval(() => {
                retries += 1;
                const next = E.applyVodPlaybackRate(targetRate);
                if (next.applied || retries >= 12) {
                    clearInterval(timer);
                }
                E.updateVodSpeedPanelRate(next.rate);
                E.updateVodSpeedMenuSelection(next.rate);
                E.updateVodDownloadButtonState(panel);
            }, 1200);
        } else {
            E.updateVodSpeedPanelRate(first.rate);
            E.updateVodSpeedMenuSelection(first.rate);
        }

        E.updateVodDownloadButtonState(panel);
    };
})();
