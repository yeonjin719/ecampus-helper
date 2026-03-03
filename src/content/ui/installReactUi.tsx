import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DashboardApp } from './components/DashboardApp';
import { attachDashboardRuntimeApi } from './runtime/dashboardRuntimeApi';
import {
    applyInitialStateFromStorage,
    createUiStore,
    initializeRuntimeState,
} from './runtime/dashboardRuntimeSetup';

(() => {
    // React UI 설치 진입점: 런타임 초기화 후 루트 마운트와 공개 API를 연결한다.
    const runtime = (window.__ECDASH__ = window.__ECDASH__ || {});

    initializeRuntimeState(runtime);
    const store = createUiStore(runtime);

    let mountedRoot: Root | null = null;
    let rootEl: HTMLElement | null = null;

    // 대시보드 루트를 지연 생성해 초기 로드 비용을 줄인다.
    function mountReactRoot() {
        if (rootEl && mountedRoot) return rootEl;

        if (!rootEl) {
            rootEl = document.getElementById(runtime.constants.ROOT_ID);
            if (!rootEl) {
                rootEl = document.createElement('div');
                rootEl.id = runtime.constants.ROOT_ID;
                document.body.appendChild(rootEl);
            }
        }
        if (!mountedRoot) {
            mountedRoot = createRoot(rootEl);
            mountedRoot.render(
                <DashboardApp store={store} runtime={runtime} />,
            );
            void applyInitialStateFromStorage(runtime, store);
        }

        return rootEl;
    }

    attachDashboardRuntimeApi({
        runtime,
        store,
        mountReactRoot,
    });
})();
