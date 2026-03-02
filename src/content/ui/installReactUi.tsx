import React, {
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
} from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
    COURSE_FILTER_ALL,
    UI_COLLAPSED_KEY,
    UI_HIDE_PAST_LECTURES_KEY,
    UI_INCLUDE_SM_CLASS_KEY,
} from './constants';
import { DashboardContent } from './components/DashboardContent';
import { DashboardShell } from './components/DashboardShell';
import { UiStore } from './store/UiStore';
import type {
    DashboardItem,
    DashboardRuntime,
    FilterValue,
    TypeFilterValue,
} from './types';
import {
    buildErrorReportMailto,
    cleanText,
    collectCourseNames,
    collectNewCourseNames,
    normalizeCourseName,
    selectFilteredItems,
} from './utils/dashboardUi';

function DashboardApp({
    store,
    runtime,
}: {
    store: UiStore;
    runtime: DashboardRuntime;
}) {
    const state = useSyncExternalStore(
        store.subscribe,
        store.getState,
        store.getState,
    );
    const [courseOpenMap, setCourseOpenMap] = useState<Record<string, boolean>>(
        {},
    );

    const allCourses = useMemo(
        () => collectCourseNames(runtime, state.items, state.includeSmClass),
        [runtime, state.items, state.includeSmClass],
    );
    const newCourseNames = useMemo(
        () =>
            collectNewCourseNames(runtime, state.items, state.includeSmClass),
        [runtime, state.items, state.includeSmClass],
    );
    const normalizedCourseFilter = useMemo(
        () => normalizeCourseName(state.courseFilter) || COURSE_FILTER_ALL,
        [state.courseFilter],
    );

    useEffect(() => {
        if (
            normalizedCourseFilter !== COURSE_FILTER_ALL &&
            !allCourses.includes(normalizedCourseFilter)
        ) {
            runtime.__courseFilter = COURSE_FILTER_ALL;
            store.setState({ courseFilter: COURSE_FILTER_ALL });
        }
    }, [allCourses, normalizedCourseFilter, runtime, store]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                store.setState({ settingsOpen: false });
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [store]);

    const { filtered, groups } = useMemo(
        () => selectFilteredItems(state),
        [state],
    );
    const groupEntries = useMemo(() => Array.from(groups.entries()), [groups]);

    const contactLink = useMemo(
        () => buildErrorReportMailto(state.sub),
        [state.sub],
    );

    useEffect(() => {
        const groupNames = groupEntries.map(([courseName]) => courseName);
        setCourseOpenMap((prev) => {
            let changed = false;
            const next: Record<string, boolean> = {};

            for (const courseName of groupNames) {
                if (Object.prototype.hasOwnProperty.call(prev, courseName)) {
                    next[courseName] = prev[courseName];
                } else {
                    next[courseName] = true;
                    changed = true;
                }
            }

            for (const prevKey of Object.keys(prev)) {
                if (!groupNames.includes(prevKey)) {
                    changed = true;
                    break;
                }
            }

            return changed ? next : prev;
        });
    }, [groupEntries]);

    return (
        <DashboardShell
            collapsed={state.collapsed}
            sub={state.sub}
            filter={state.filter}
            typeFilter={state.typeFilter}
            allCourses={allCourses}
            newCourseNames={newCourseNames}
            courseFilter={normalizedCourseFilter}
            courseFilterAllValue={COURSE_FILTER_ALL}
            settingsOpen={state.settingsOpen}
            contactLink={contactLink}
            hidePastLectures={state.hidePastLectures}
            includeSmClass={state.includeSmClass}
            onToggleCollapsed={async () => {
                const nextCollapsed = !state.collapsed;
                store.setState({ collapsed: nextCollapsed });
                try {
                    await chrome.storage?.local?.set?.({
                        [UI_COLLAPSED_KEY]: nextCollapsed,
                    });
                } catch {
                    // ignore
                }
            }}
            onFilterChange={(value) => {
                store.setState({ filter: value as FilterValue });
            }}
            onTypeFilterChange={(value) => {
                store.setState({ typeFilter: value as TypeFilterValue });
            }}
            onRefresh={() => {
                runtime.refreshAll?.({ force: true });
            }}
            onOpenSettings={() => {
                store.setState({ settingsOpen: true });
            }}
            onSelectCourse={(courseName) => {
                runtime.__courseFilter = courseName;
                store.setState({ courseFilter: courseName });
            }}
            onCloseSettings={() => {
                store.setState({ settingsOpen: false });
            }}
            onHidePastLecturesChange={async (checked) => {
                runtime.__hidePastLectures = checked;
                store.setState({ hidePastLectures: checked });
                try {
                    await chrome.storage?.local?.set?.({
                        [UI_HIDE_PAST_LECTURES_KEY]: checked,
                    });
                } catch {
                    // ignore
                }
            }}
            onIncludeSmClassChange={async (checked) => {
                runtime.__includeSmClass = checked;
                store.setState({ includeSmClass: checked });
                try {
                    await chrome.storage?.local?.set?.({
                        [UI_INCLUDE_SM_CLASS_KEY]: checked,
                    });
                } catch {
                    // ignore
                }

                if (typeof runtime.refreshAll === 'function') {
                    runtime.refreshAll({ force: true });
                } else {
                    runtime.render(window.__ECDASH_ITEMS__ || []);
                }
            }}
        >
            <DashboardContent
                runtime={runtime}
                hasItems={state.items.length > 0}
                loading={state.loading}
                loadingMessage={state.loadingMessage}
                filteredItems={filtered}
                groupEntries={groupEntries}
                courseOpenMap={courseOpenMap}
                onToggleCourse={(courseName) => {
                    setCourseOpenMap((prev) => ({
                        ...prev,
                        [courseName]: !(prev[courseName] ?? true),
                    }));
                }}
            />
        </DashboardShell>
    );
}

(() => {
    const runtime = (window.__ECDASH__ = window.__ECDASH__ || {});

    runtime.__isLoading = Boolean(runtime.__isLoading);
    runtime.__loadingMessage = cleanText(
        runtime.__loadingMessage || '데이터를 가져오는 중...',
    );
    runtime.__courseFilter =
        normalizeCourseName(runtime.__courseFilter || COURSE_FILTER_ALL) ||
        COURSE_FILTER_ALL;
    runtime.__hidePastLectures = Boolean(runtime.__hidePastLectures);
    runtime.__includeSmClass = Boolean(runtime.__includeSmClass);
    runtime.__lastBadge = cleanText(runtime.__lastBadge || '');
    runtime.__lastSub = cleanText(runtime.__lastSub || '');

    const store = new UiStore({
        items: Array.isArray(window.__ECDASH_ITEMS__)
            ? (window.__ECDASH_ITEMS__ as DashboardItem[])
            : [],
        filter: 'ALL',
        typeFilter: 'ALL_TYPES',
        courseFilter: runtime.__courseFilter || COURSE_FILTER_ALL,
        hidePastLectures: Boolean(runtime.__hidePastLectures),
        includeSmClass: Boolean(runtime.__includeSmClass),
        collapsed: false,
        loading: Boolean(runtime.__isLoading),
        loadingMessage: runtime.__loadingMessage || '데이터를 가져오는 중...',
        badge: runtime.__lastBadge || '',
        sub: runtime.__lastSub || '대시보드에서 과목을 찾고 활동을 크롤링해요.',
        settingsOpen: false,
    });

    let mountedRoot: Root | null = null;
    let rootEl: HTMLElement | null = null;

    async function applyInitialState() {
        try {
            const res = await chrome.storage?.local?.get?.([
                UI_COLLAPSED_KEY,
                UI_HIDE_PAST_LECTURES_KEY,
                UI_INCLUDE_SM_CLASS_KEY,
            ]);

            const nextCollapsed = Boolean(res?.[UI_COLLAPSED_KEY]);
            const nextHidePastLectures = Boolean(
                res?.[UI_HIDE_PAST_LECTURES_KEY],
            );
            const nextIncludeSmClass = Boolean(res?.[UI_INCLUDE_SM_CLASS_KEY]);

            runtime.__hidePastLectures = nextHidePastLectures;
            runtime.__includeSmClass = nextIncludeSmClass;

            store.setState({
                collapsed: nextCollapsed,
                hidePastLectures: nextHidePastLectures,
                includeSmClass: nextIncludeSmClass,
            });
        } catch {
            // ignore
        }

        if (typeof runtime.render === 'function') {
            runtime.render(window.__ECDASH_ITEMS__ || []);
        }
    }

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
            void applyInitialState();
        }

        return rootEl;
    }

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
        store.setState({
            items: nextItems,
            courseFilter:
                normalizeCourseName(runtime.__courseFilter || COURSE_FILTER_ALL) ||
                COURSE_FILTER_ALL,
            hidePastLectures: Boolean(runtime.__hidePastLectures),
            includeSmClass: Boolean(runtime.__includeSmClass),
        });
    };
})();
