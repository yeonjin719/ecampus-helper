import {
    COURSE_FILTER_ALL,
    UI_COLLAPSED_KEY,
    UI_HIDDEN_ITEM_IDS_KEY,
    UI_HIDE_PAST_ASSIGNMENTS_KEY,
    UI_HIDE_PAST_FORUMS_KEY,
    UI_HIDE_PAST_LECTURES_KEY,
    UI_INCLUDE_SM_CLASS_KEY,
} from '../constants';
import { UiStore } from '../store/UiStore';
import type { DashboardItem, DashboardRuntime } from '../types';
import { cleanText, normalizeCourseName } from '../utils/dashboardUi';
import { normalizeHiddenItemIds } from '../utils/hiddenItems';

// window.__ECDASH__의 UI 관련 필드를 안전한 기본값으로 맞춘다.
export function initializeRuntimeState(runtime: DashboardRuntime) {
    runtime.__isLoading = Boolean(runtime.__isLoading);
    runtime.__loadingMessage = cleanText(
        runtime.__loadingMessage || '데이터를 가져오는 중...',
    );
    runtime.__courseFilter =
        normalizeCourseName(runtime.__courseFilter || COURSE_FILTER_ALL) ||
        COURSE_FILTER_ALL;
    runtime.__hidePastLectures = Boolean(runtime.__hidePastLectures);
    runtime.__hidePastAssignments = Boolean(runtime.__hidePastAssignments);
    runtime.__hidePastForums = Boolean(runtime.__hidePastForums);
    runtime.__includeSmClass = Boolean(runtime.__includeSmClass);
    runtime.__hiddenItemIds = normalizeHiddenItemIds(runtime.__hiddenItemIds);
    runtime.__lastBadge = cleanText(runtime.__lastBadge || '');
    runtime.__lastSub = cleanText(runtime.__lastSub || '');
}

// 런타임 값을 기준으로 UIStore의 초기 상태를 생성한다.
export function createUiStore(runtime: DashboardRuntime) {
    return new UiStore({
        items: Array.isArray(window.__ECDASH_ITEMS__)
            ? (window.__ECDASH_ITEMS__ as DashboardItem[])
            : [],
        filter: [],
        typeFilter: [],
        hiddenItemIds: normalizeHiddenItemIds(runtime.__hiddenItemIds),
        courseFilter: runtime.__courseFilter || COURSE_FILTER_ALL,
        hidePastLectures: Boolean(runtime.__hidePastLectures),
        hidePastAssignments: Boolean(runtime.__hidePastAssignments),
        hidePastForums: Boolean(runtime.__hidePastForums),
        includeSmClass: Boolean(runtime.__includeSmClass),
        collapsed: false,
        loading: Boolean(runtime.__isLoading),
        loadingMessage: runtime.__loadingMessage || '데이터를 가져오는 중...',
        badge: runtime.__lastBadge || '',
        sub: runtime.__lastSub || '대시보드에서 과목을 찾고 활동을 크롤링해요.',
        settingsOpen: false,
    });
}

// 저장소 설정을 읽어 런타임/스토어 상태에 반영한다.
export async function applyInitialStateFromStorage(
    runtime: DashboardRuntime,
    store: UiStore,
) {
    try {
        const res = await chrome.storage?.local?.get?.([
            UI_COLLAPSED_KEY,
            UI_HIDE_PAST_LECTURES_KEY,
            UI_HIDE_PAST_ASSIGNMENTS_KEY,
            UI_HIDE_PAST_FORUMS_KEY,
            UI_INCLUDE_SM_CLASS_KEY,
            UI_HIDDEN_ITEM_IDS_KEY,
        ]);

        const nextCollapsed = Boolean(res?.[UI_COLLAPSED_KEY]);
        const nextHidePastLectures = Boolean(res?.[UI_HIDE_PAST_LECTURES_KEY]);
        const nextHidePastAssignments = Boolean(
            res?.[UI_HIDE_PAST_ASSIGNMENTS_KEY],
        );
        const nextHidePastForums = Boolean(res?.[UI_HIDE_PAST_FORUMS_KEY]);
        const nextIncludeSmClass = Boolean(res?.[UI_INCLUDE_SM_CLASS_KEY]);
        const nextHiddenItemIds = normalizeHiddenItemIds(
            res?.[UI_HIDDEN_ITEM_IDS_KEY],
        );

        runtime.__hidePastLectures = nextHidePastLectures;
        runtime.__hidePastAssignments = nextHidePastAssignments;
        runtime.__hidePastForums = nextHidePastForums;
        runtime.__includeSmClass = nextIncludeSmClass;
        runtime.__hiddenItemIds = nextHiddenItemIds;

        store.setState({
            collapsed: nextCollapsed,
            hidePastLectures: nextHidePastLectures,
            hidePastAssignments: nextHidePastAssignments,
            hidePastForums: nextHidePastForums,
            includeSmClass: nextIncludeSmClass,
            hiddenItemIds: nextHiddenItemIds,
        });
    } catch {
        // ignore
    }

    if (typeof runtime.render === 'function') {
        runtime.render(window.__ECDASH_ITEMS__ || []);
    }
}

// runtime.render 호출 시 런타임 값을 기준으로 스토어를 동기화한다.
export function syncStoreFromRuntime(
    runtime: DashboardRuntime,
    store: UiStore,
    items: DashboardItem[],
) {
    store.setState({
        items,
        courseFilter:
            normalizeCourseName(runtime.__courseFilter || COURSE_FILTER_ALL) ||
            COURSE_FILTER_ALL,
        hidePastLectures: Boolean(runtime.__hidePastLectures),
        hidePastAssignments: Boolean(runtime.__hidePastAssignments),
        hidePastForums: Boolean(runtime.__hidePastForums),
        includeSmClass: Boolean(runtime.__includeSmClass),
        hiddenItemIds: normalizeHiddenItemIds(runtime.__hiddenItemIds),
    });
}
