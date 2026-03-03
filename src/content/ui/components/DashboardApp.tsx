import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
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
import type {
    DashboardRuntime,
    FilterValue,
    TypeFilterValue,
} from '../types';
import {
    buildErrorReportMailto,
    cleanText,
    collectCourseNames,
    collectNewCourseNames,
    normalizeCourseName,
    selectFilteredItems,
} from '../utils/dashboardUi';
import {
    buildHiddenItemPreviews,
    normalizeHiddenItemIds,
} from '../utils/hiddenItems';
import { DashboardContent } from './DashboardContent';
import { DashboardShell } from './DashboardShell';

interface DashboardAppProps {
    store: UiStore;
    runtime: DashboardRuntime;
}

export function DashboardApp({ store, runtime }: DashboardAppProps) {
    // UIStore를 React 상태처럼 구독해 렌더링한다.
    const state = useSyncExternalStore(
        store.subscribe,
        store.getState,
        store.getState,
    );
    const [locationHref, setLocationHref] = useState(() => location.href);
    const [courseOpenMap, setCourseOpenMap] = useState<Record<string, boolean>>(
        {},
    );
    const isDashboardPage = useMemo(
        () => Boolean(runtime.isDashboardPage?.() ?? runtime.isDashboardSMU?.()),
        [runtime, locationHref],
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
    const hiddenItems = useMemo(
        () =>
            buildHiddenItemPreviews(runtime, state.items, state.hiddenItemIds),
        [runtime, state.hiddenItemIds, state.items],
    );

    // 숨김 ID 목록 갱신 + 스토리지 동기화 공통 함수.
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
        // 필터 대상 과목이 사라졌으면 전체 과목 필터로 자동 복귀한다.
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

    useEffect(() => {
        if (!isDashboardPage && state.settingsOpen) {
            store.setState({ settingsOpen: false });
        }
    }, [isDashboardPage, state.settingsOpen, store]);

    useEffect(() => {
        // 화면/주소 전환 시 설정 모달이 열린 채 남지 않도록 정리한다.
        const closeSettings = () => {
            if (store.getState().settingsOpen) {
                store.setState({ settingsOpen: false });
            }
        };

        const onLocationChange = () => {
            setLocationHref(location.href);
            closeSettings();
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                closeSettings();
            }
        };

        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function pushStatePatched(
            ...args: Parameters<History['pushState']>
        ) {
            const result = originalPushState.apply(this, args as any);
            onLocationChange();
            return result;
        };
        history.replaceState = function replaceStatePatched(
            ...args: Parameters<History['replaceState']>
        ) {
            const result = originalReplaceState.apply(this, args as any);
            onLocationChange();
            return result;
        };

        window.addEventListener('popstate', onLocationChange);
        window.addEventListener('hashchange', onLocationChange);
        window.addEventListener('pagehide', onLocationChange);
        window.addEventListener('blur', closeSettings);
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            history.pushState = originalPushState;
            history.replaceState = originalReplaceState;
            window.removeEventListener('popstate', onLocationChange);
            window.removeEventListener('hashchange', onLocationChange);
            window.removeEventListener('pagehide', onLocationChange);
            window.removeEventListener('blur', closeSettings);
            document.removeEventListener(
                'visibilitychange',
                onVisibilityChange,
            );
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
        // 신규 과목 그룹이 추가되면 기본 펼침 상태를 true로 채운다.
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
            isDashboardPage={isDashboardPage}
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
