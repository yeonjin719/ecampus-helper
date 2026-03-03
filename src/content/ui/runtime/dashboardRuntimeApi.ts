import { UI_COLLAPSED_KEY } from '../constants';
import { UiStore } from '../store/UiStore';
import type { DashboardItem, DashboardRuntime } from '../types';
import { cleanText } from '../utils/dashboardUi';
import { syncStoreFromRuntime } from './dashboardRuntimeSetup';

interface AttachRuntimeApiParams {
    runtime: DashboardRuntime;
    store: UiStore;
    mountReactRoot: () => HTMLElement;
}

// 외부 모듈에서 사용하는 runtime 공개 메서드를 한 곳에서 등록한다.
export function attachDashboardRuntimeApi({
    runtime,
    store,
    mountReactRoot,
}: AttachRuntimeApiParams) {
    runtime.ensureRoot = function ensureRoot() {
        return mountReactRoot();
    };

    runtime.setCollapsed = function setCollapsedPublic(collapsed: boolean) {
        mountReactRoot();
        const next = Boolean(collapsed);
        store.setState({ collapsed: next });
        void chrome.storage?.local?.set?.({ [UI_COLLAPSED_KEY]: next });
    };

    runtime.setBadge = function setBadge(text: string) {
        mountReactRoot();
        const next = cleanText(text || '');
        runtime.__lastBadge = next;
        store.setState({ badge: next });
    };

    runtime.setSub = function setSub(text: string) {
        mountReactRoot();
        const next = cleanText(text || '');
        runtime.__lastSub = next;
        store.setState({ sub: next });
    };

    runtime.setLoading = function setLoading(
        isLoading: boolean,
        message?: string,
    ) {
        const nextLoading = Boolean(isLoading);
        const nextMessage = cleanText(message || '');

        runtime.__isLoading = nextLoading;
        if (nextMessage) {
            runtime.__loadingMessage = nextMessage;
        }

        mountReactRoot();
        store.setState({
            loading: nextLoading,
            loadingMessage:
                nextMessage ||
                runtime.__loadingMessage ||
                '데이터를 가져오는 중...',
        });
    };

    runtime.render = function render(items: DashboardItem[]) {
        mountReactRoot();
        const nextItems = Array.isArray(items) ? items : [];
        window.__ECDASH_ITEMS__ = nextItems;
        syncStoreFromRuntime(runtime, store, nextItems);
    };
}
