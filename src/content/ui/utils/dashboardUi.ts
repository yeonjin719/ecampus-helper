import { COURSE_FILTER_ALL, REPORT_EMAIL } from '../constants';
import type {
    DashboardItem,
    DashboardRuntime,
    ItemStatus,
    ItemType,
    UiState,
} from '../types';

export function cleanText(value: unknown) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function normalizeCourseName(value: unknown) {
    const text = cleanText(value || '');
    if (!text) return '';
    return cleanText(text.replace(/\s*\bnew\b\s*$/i, ''));
}

export function hasCourseNewToken(value: unknown) {
    return /\bnew\b\s*$/i.test(cleanText(value || ''));
}

function getVisibleCachedCourses(
    runtime: DashboardRuntime,
    includeSmClass: boolean,
) {
    const cachedCourses = Array.isArray(window.__ECDASH_COURSES__)
        ? window.__ECDASH_COURSES__
        : [];

    const normalizedCourses =
        typeof runtime.normalizeCourseCache === 'function'
            ? runtime.normalizeCourseCache(cachedCourses)
            : cachedCourses;

    return includeSmClass
        ? normalizedCourses
        : typeof runtime.filterSmClassCourses === 'function'
          ? runtime.filterSmClassCourses(normalizedCourses, false)?.courses || []
          : normalizedCourses.filter(
                (course: any) => !Boolean(course?.isSmClass),
            );
}

export function splitMetaByPeriod(
    metaText: string | undefined,
    itemType: ItemType,
) {
    const raw = cleanText(metaText || '');
    if (!raw) return { detailText: '', periodText: '' };

    const parts = raw
        .split(/\s*·\s*/)
        .map((part) => cleanText(part))
        .filter(Boolean);

    const detailParts: string[] = [];
    const periodParts: string[] = [];

    for (const part of parts) {
        if (/^(?:기간(?:\s|$)|period\b)/i.test(part)) {
            periodParts.push(part);
        } else if (itemType === 'RESOURCE' && /\d{1,3}\s*%/.test(part)) {
            continue;
        } else {
            detailParts.push(part);
        }
    }

    return {
        detailText: detailParts.join(' · '),
        periodText: periodParts.join(' · '),
    };
}

export function sanitizeFilename(value: string) {
    return cleanText(value || 'resource')
        .replace(/[\\/:*?"<>|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function triggerResourceDownload(
    runtime: DashboardRuntime,
    url?: string,
    title?: string,
) {
    const normalizedUrl = runtime.normalizeUrl?.(url || '') || '';
    if (!normalizedUrl) return;

    const a = document.createElement('a');
    a.href = normalizedUrl;
    a.target = '_blank';
    a.rel = 'noopener';

    const filename = sanitizeFilename(title || 'resource');
    if (filename) {
        a.download = filename;
    }

    document.body.appendChild(a);
    a.click();
    a.remove();
}

export function buildErrorReportMailto(sub: string) {
    const subject = '[SMU eCampus] 오류 제보';
    const body = [
        '안녕하세요. 오류를 제보합니다.',
        '',
        `- 발생 시각: ${new Date().toLocaleString()}`,
        `- 페이지 URL: ${location.href}`,
        `- 메시지: ${sub || '없음'}`,
        '',
        '추가 설명:',
    ].join('\n');

    return `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function typeBadgeClass(type: ItemType) {
    if (type === 'ASSIGNMENT')
        return 'bg-rose-100 text-rose-800 ring-1 ring-rose-300';
    if (type === 'LECTURE')
        return 'bg-sky-100 text-sky-800 ring-1 ring-sky-300';
    if (type === 'FORUM')
        return 'bg-amber-100 text-amber-800 ring-1 ring-amber-300';
    if (type === 'RESOURCE')
        return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300';
    return 'bg-violet-100 text-violet-800 ring-1 ring-violet-300';
}

export function statusChipClass(runtime: DashboardRuntime, status: ItemStatus) {
    const statusClass = runtime.statusClass?.(status);
    if (statusClass === 'todo')
        return 'bg-amber-100 text-amber-900 ring-1 ring-amber-300';
    if (statusClass === 'done')
        return 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300';
    return 'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-300';
}

export function itemCardToneClass(type: ItemType) {
    if (type === 'ASSIGNMENT')
        return 'border-rose-200 bg-rose-50/50 hover:border-rose-300';
    if (type === 'LECTURE')
        return 'border-sky-200 bg-sky-50/50 hover:border-sky-300';
    if (type === 'FORUM')
        return 'border-amber-200 bg-amber-50/50 hover:border-amber-300';
    if (type === 'RESOURCE')
        return 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300';
    return 'border-violet-200 bg-violet-50/50 hover:border-violet-300';
}

export function ddayBadgeClass(dueAt?: number) {
    if (typeof dueAt !== 'number') {
        return 'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-300';
    }

    const diff = dueAt - Date.now();
    const day = 24 * 60 * 60 * 1000;

    if (diff < 0) {
        return 'bg-rose-600 text-white ring-1 ring-rose-700';
    }

    if (diff <= day) {
        return 'bg-red-600 text-white ring-1 ring-red-700';
    }

    if (diff <= 3 * day) {
        return 'bg-amber-400 text-amber-950 ring-1 ring-amber-500';
    }

    return 'bg-sky-100 text-sky-900 ring-1 ring-sky-300';
}

export function collectCourseNames(
    runtime: DashboardRuntime,
    items: DashboardItem[],
    includeSmClass: boolean,
) {
    const visibleCachedCourses = getVisibleCachedCourses(runtime, includeSmClass);

    return [
        ...new Set(
            [
                ...items.map((item) => normalizeCourseName(item?.courseName)),
                ...visibleCachedCourses.map((course: any) =>
                    normalizeCourseName(course?.courseName),
                ),
            ].filter(Boolean),
        ),
    ].sort((a, b) => a.localeCompare(b));
}

export function collectNewCourseNames(
    runtime: DashboardRuntime,
    items: DashboardItem[],
    includeSmClass: boolean,
) {
    const visibleCachedCourses = getVisibleCachedCourses(runtime, includeSmClass);

    return [
        ...new Set(
            [
                ...items
                    .filter(
                        (item) =>
                            Boolean(item?.courseIsNew) ||
                            hasCourseNewToken(item?.courseName),
                    )
                    .map((item) => normalizeCourseName(item?.courseName)),
                ...visibleCachedCourses
                    .filter(
                        (course: any) =>
                            Boolean(course?.isNew) ||
                            hasCourseNewToken(course?.courseName),
                    )
                    .map((course: any) =>
                        normalizeCourseName(course?.courseName),
                    ),
            ].filter(Boolean),
        ),
    ].sort((a, b) => a.localeCompare(b));
}

export function selectFilteredItems(state: UiState) {
    const now = Date.now();
    const in3days = now + 3 * 24 * 60 * 60 * 1000;
    const normalizedCourseFilter = normalizeCourseName(state.courseFilter);

    const filtered = state.items.filter((item) => {
        const itemCourseName = normalizeCourseName(item.courseName);
        if (
            normalizedCourseFilter !== COURSE_FILTER_ALL &&
            itemCourseName !== normalizedCourseFilter
        ) {
            return false;
        }

        if (state.typeFilter !== 'ALL_TYPES' && item.type !== state.typeFilter) {
            return false;
        }

        if (
            state.hidePastLectures &&
            item.type === 'LECTURE' &&
            typeof item.dueAt === 'number' &&
            item.dueAt < now
        ) {
            return false;
        }

        if (state.filter === 'ALL') return true;
        if (state.filter === 'DUE_SOON')
            return (
                item.dueAt != null && item.dueAt <= in3days && item.dueAt >= now
            );
        if (state.filter === 'OVERDUE') return item.dueAt != null && item.dueAt < now;
        if (state.filter === 'TODO_ONLY') return item.status === 'TODO';
        if (state.filter === 'NOT_DONE')
            return item.type !== 'NOTICE' && item.status !== 'DONE';

        return true;
    });

    filtered.sort((a, b) => {
        const aDue = a.dueAt ?? Number.POSITIVE_INFINITY;
        const bDue = b.dueAt ?? Number.POSITIVE_INFINITY;
        if (aDue !== bDue) return aDue - bDue;
        const aCourseName = normalizeCourseName(a.courseName);
        const bCourseName = normalizeCourseName(b.courseName);
        if (aCourseName !== bCourseName)
            return aCourseName.localeCompare(bCourseName);
        return a.title.localeCompare(b.title);
    });

    const groups = new Map<string, DashboardItem[]>();
    filtered.forEach((item) => {
        const normalizedCourseName =
            normalizeCourseName(item.courseName) || cleanText(item.courseName);
        if (!groups.has(normalizedCourseName)) {
            groups.set(normalizedCourseName, []);
        }
        groups.get(normalizedCourseName)?.push(item);
    });

    return { filtered, groups };
}
