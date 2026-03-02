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
    UI_HIDDEN_ITEM_IDS_KEY,
    UI_HIDE_PAST_ASSIGNMENTS_KEY,
    UI_HIDE_PAST_FORUMS_KEY,
    UI_HIDE_PAST_LECTURES_KEY,
    UI_INCLUDE_SM_CLASS_KEY,
} from './constants';
import { DashboardContent } from './components/DashboardContent';
import { DashboardShell } from './components/DashboardShell';
import type { HiddenItemPreview } from './components/dashboardShell/types';
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

function normalizeHiddenItemIds(value: unknown) {
    if (!Array.isArray(value)) return [];

    return [...new Set(value.map((id) => cleanText(id)).filter(Boolean))].slice(
        -1000,
    );
}

function formatHiddenItemDueLabel(dueAt?: number) {
    if (typeof dueAt !== 'number') return '';
    return `마감 ${new Date(dueAt).toLocaleString(undefined, {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    })}`;
}

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
    const hiddenItems = useMemo<HiddenItemPreview[]>(() => {
        const itemMap = new Map(
            state.items.map((item) => [cleanText(item.id), item]),
        );

        return state.hiddenItemIds.map((hiddenItemId) => {
            const item = itemMap.get(hiddenItemId);
            if (!item) {
                return {
                    id: hiddenItemId,
                    title: '현재 데이터에서 찾을 수 없는 항목',
                    courseName: '과목 정보 없음',
                    typeLabel: '유형 미상',
                    statusLabel: '목록에서 사라짐',
                    dueLabel: '',
                };
            }

            const statusLabelRaw = cleanText(
                runtime.statusLabel?.(item.status) || item.status,
            );

            return {
                id: hiddenItemId,
                title: cleanText(item.title) || '(제목 없음)',
                courseName:
                    normalizeCourseName(item.courseName) ||
                    cleanText(item.courseName) ||
                    '과목 미상',
                typeLabel: cleanText(runtime.TYPE_LABEL?.[item.type] || item.type),
                statusLabel: /상태\s*미상|unknown/i.test(statusLabelRaw)
                    ? '상태 미상'
                    : statusLabelRaw,
                dueLabel: formatHiddenItemDueLabel(item.dueAt),
            };
        });
    }, [runtime, state.hiddenItemIds, state.items]);

    const updateHiddenItemIds = async (nextHiddenItemIds: string[]) => {
        const normalizedNextHiddenItemIds =
            normalizeHiddenItemIds(nextHiddenItemIds);
        runtime.__hiddenItemIds = normalizedNextHiddenItemIds;
        store.setState({ hiddenItemIds: normalizedNextHiddenItemIds });
        try {
            await chrome.storage?.local?.set?.({
                [UI_HIDDEN_ITEM_IDS_KEY]: normalizedNextHiddenItemIds,
            });
        } catch {
            // ignore
        }
    };

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
            hidePastAssignments={state.hidePastAssignments}
            hidePastForums={state.hidePastForums}
            includeSmClass={state.includeSmClass}
            hiddenItemCount={state.hiddenItemIds.length}
            hiddenItems={hiddenItems}
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
            onFilterChange={(values) => {
                store.setState({ filter: values as FilterValue[] });
            }}
            onTypeFilterChange={(values) => {
                store.setState({ typeFilter: values as TypeFilterValue[] });
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
            onHidePastAssignmentsChange={async (checked) => {
                runtime.__hidePastAssignments = checked;
                store.setState({ hidePastAssignments: checked });
                try {
                    await chrome.storage?.local?.set?.({
                        [UI_HIDE_PAST_ASSIGNMENTS_KEY]: checked,
                    });
                } catch {
                    // ignore
                }
            }}
            onHidePastForumsChange={async (checked) => {
                runtime.__hidePastForums = checked;
                store.setState({ hidePastForums: checked });
                try {
                    await chrome.storage?.local?.set?.({
                        [UI_HIDE_PAST_FORUMS_KEY]: checked,
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
            onUnhideItem={async (itemId) => {
                const normalizedItemId = cleanText(itemId);
                if (!normalizedItemId) return;
                if (!state.hiddenItemIds.includes(normalizedItemId)) return;

                const nextHiddenItemIds = state.hiddenItemIds.filter(
                    (hiddenItemId) => hiddenItemId !== normalizedItemId,
                );
                await updateHiddenItemIds(nextHiddenItemIds);
            }}
            onResetHiddenItems={async () => {
                if (!state.hiddenItemIds.length) return;
                await updateHiddenItemIds([]);
            }}
        >
            <DashboardContent
                runtime={runtime}
                hasItems={state.items.length > 0}
                loading={state.loading}
                loadingMessage={state.loadingMessage}
                hiddenItemCount={state.hiddenItemIds.length}
                filteredItems={filtered}
                groupEntries={groupEntries}
                courseOpenMap={courseOpenMap}
                onToggleCourse={(courseName) => {
                    setCourseOpenMap((prev) => ({
                        ...prev,
                        [courseName]: !(prev[courseName] ?? true),
                    }));
                }}
                onHideItem={async (itemId) => {
                    const normalizedItemId = cleanText(itemId);
                    if (!normalizedItemId) return;
                    if (state.hiddenItemIds.includes(normalizedItemId)) return;

                    const nextHiddenItemIds = normalizeHiddenItemIds([
                        ...state.hiddenItemIds,
                        normalizedItemId,
                    ]);
                    await updateHiddenItemIds(nextHiddenItemIds);
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
    runtime.__hidePastAssignments = Boolean(runtime.__hidePastAssignments);
    runtime.__hidePastForums = Boolean(runtime.__hidePastForums);
    runtime.__includeSmClass = Boolean(runtime.__includeSmClass);
    runtime.__hiddenItemIds = normalizeHiddenItemIds(runtime.__hiddenItemIds);
    runtime.__lastBadge = cleanText(runtime.__lastBadge || '');
    runtime.__lastSub = cleanText(runtime.__lastSub || '');

    const store = new UiStore({
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

    let mountedRoot: Root | null = null;
    let rootEl: HTMLElement | null = null;

    async function applyInitialState() {
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
            const nextHidePastLectures = Boolean(
                res?.[UI_HIDE_PAST_LECTURES_KEY],
            );
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
            hidePastAssignments: Boolean(runtime.__hidePastAssignments),
            hidePastForums: Boolean(runtime.__hidePastForums),
            includeSmClass: Boolean(runtime.__includeSmClass),
            hiddenItemIds: normalizeHiddenItemIds(runtime.__hiddenItemIds),
        });
    };
})();
