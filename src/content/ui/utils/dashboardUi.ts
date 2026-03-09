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

function decodeUriComponentSafe(value: string) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function decodeFilenameText(value: string) {
    let current = String(value || '');
    let prev = '';

    while (current !== prev && /%[0-9a-f]{2}/i.test(current)) {
        prev = current;
        current = decodeUriComponentSafe(current);
    }

    return cleanText(current);
}

function stripCourseDecorators(value: string) {
    let text = cleanText(value || '');
    if (!text) return '';

    text = text.replace(/^\s*(?:\[[^\]]+\]\s*)+/, '');
    text = text.replace(/\s*(?:\[[^\]]+\]\s*)+$/, '');

    let prev = '';
    while (text && prev !== text) {
        prev = text;
        text = text.replace(/\s*\([^()]*\)\s*$/, '').trim();
    }

    return cleanText(text);
}

export function normalizeCourseName(value: unknown) {
    const text = cleanText(value || '');
    if (!text) return '';
    const noNew = cleanText(text.replace(/\s*\bnew\b\s*$/i, ''));
    return stripCourseDecorators(noNew) || noNew;
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
          ? runtime.filterSmClassCourses(normalizedCourses, false)?.courses ||
            []
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
        if (/^(?:기간|period)\s*(?::|：|\s|$)/i.test(part)) {
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
    return decodeFilenameText(value || 'resource')
        .replace(/[\\/:*?"<>|%]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getFilenameExtension(name: string) {
    const match = String(name || '').match(/\.([a-z0-9]{2,10})$/i);
    return match?.[1] ? match[1].toLowerCase() : '';
}

function getExtensionFromUrl(url: string) {
    try {
        const pathname = new URL(url).pathname || '';
        const filename = decodeFilenameText(pathname.split('/').pop() || '');
        return getFilenameExtension(filename);
    } catch {
        return '';
    }
}

function ensureFilenameExtension(filename: string, url: string) {
    const safeBase = sanitizeFilename(filename || 'resource');
    if (!safeBase) return 'resource';
    if (getFilenameExtension(safeBase)) return safeBase;

    const ext = getExtensionFromUrl(url);
    return ext ? `${safeBase}.${ext}` : safeBase;
}

function extractFilenameFromContentDisposition(
    contentDisposition: string | null,
) {
    const raw = String(contentDisposition || '');
    if (!raw) return '';

    const utf8Match = raw.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        return sanitizeFilename(decodeFilenameText(utf8Match[1]));
    }

    const basicMatch = raw.match(/filename\s*=\s*"?([^";]+)"?/i);
    if (basicMatch?.[1]) {
        return sanitizeFilename(decodeFilenameText(basicMatch[1]));
    }

    return '';
}

function triggerDownloadByAnchor(url: string, filename: string) {
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener';
    if (filename) {
        a.download = filename;
    }
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function requestExtensionDownload(url: string, filename: string) {
    const chromeRuntime = (globalThis as any)?.chrome?.runtime;
    if (!chromeRuntime?.sendMessage) {
        return Promise.resolve(false);
    }

    return new Promise<boolean>((resolve) => {
        try {
            chromeRuntime.sendMessage(
                {
                    type: 'ecdash:download-resource',
                    payload: { url, filename },
                },
                (response: any) => {
                    const lastError = (globalThis as any)?.chrome?.runtime
                        ?.lastError;
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
}

export async function triggerResourceDownload(
    runtime: DashboardRuntime,
    url?: string,
    title?: string,
) {
    const normalizedUrl = runtime.normalizeUrl?.(url || '') || '';
    if (!normalizedUrl) return;

    const filename = ensureFilenameExtension(
        sanitizeFilename(title || 'resource'),
        normalizedUrl,
    );
    if (!normalizedUrl.startsWith('blob:')) {
        const requestedByExtension = await requestExtensionDownload(
            normalizedUrl,
            filename,
        );
        if (requestedByExtension) {
            return;
        }

        try {
            const response = await fetch(normalizedUrl, {
                credentials: 'include',
                cache: 'no-store',
            });

            if (response.ok) {
                const filenameFromHeader =
                    extractFilenameFromContentDisposition(
                        response.headers.get('content-disposition'),
                    );
                const finalFilename = ensureFilenameExtension(
                    filenameFromHeader || filename,
                    normalizedUrl,
                );
                const blob = await response.blob();
                if (blob && blob.size > 0) {
                    const blobUrl = URL.createObjectURL(blob);
                    triggerDownloadByAnchor(blobUrl, finalFilename);
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
                    return;
                }
            }
        } catch (_) {
            // 무시
        }
        return;
    }

    triggerDownloadByAnchor(normalizedUrl, filename);
}

export function buildErrorReportMailto(sub: string) {
    const subject = '[eHelper] 오류 제보';
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
        return 'bg-rose-50 text-rose-500 ring-1 ring-rose-100';
    if (type === 'LECTURE') return 'bg-sky-50 text-sky-500 ring-1 ring-sky-100';
    if (type === 'FORUM')
        return 'bg-amber-50 text-amber-500 ring-1 ring-amber-100';
    if (type === 'RESOURCE')
        return 'bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100';
    if (type === 'NOTICE')
        return 'bg-violet-50 text-violet-500 ring-1 ring-violet-100';
    return 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200';
}

export function statusChipClass(runtime: DashboardRuntime, status: ItemStatus) {
    const statusClass = runtime.statusClass?.(status);
    if (statusClass === 'todo')
        return 'bg-rose-50 text-rose-600 ring-1 ring-rose-100';
    if (statusClass === 'done')
        return 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100';
    return 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200';
}

export function stateBadgeClass(
    runtime: DashboardRuntime,
    status: ItemStatus,
    dueAt?: number,
) {
    const statusClass = runtime.statusClass?.(status);
    const now = Date.now();
    const in3days = now + 3 * 24 * 60 * 60 * 1000;

    if (statusClass === 'done') {
        return 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100';
    }

    if (statusClass === 'todo') {
        return 'bg-rose-50 text-rose-600 ring-1 ring-rose-100';
    }

    if (typeof dueAt === 'number') {
        if (dueAt < now) {
            return 'bg-rose-50 text-rose-600 ring-1 ring-rose-100';
        }
        if (dueAt <= in3days) {
            return 'bg-amber-50 text-amber-600 ring-1 ring-amber-100';
        }
    }

    return 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200';
}

export function itemCardToneClass(type: ItemType) {
    if (type === 'ASSIGNMENT')
        return 'border-zinc-200 border-l-[3px] border-l-rose-200 bg-white hover:border-rose-100 hover:bg-rose-50/35';
    if (type === 'LECTURE')
        return 'border-zinc-200 border-l-[3px] border-l-sky-200 bg-white hover:border-sky-100 hover:bg-sky-50/35';
    if (type === 'FORUM')
        return 'border-zinc-200 border-l-[3px] border-l-amber-200 bg-white hover:border-amber-100 hover:bg-amber-50/35';
    if (type === 'RESOURCE')
        return 'border-zinc-200 border-l-[3px] border-l-emerald-200 bg-white hover:border-emerald-100 hover:bg-emerald-50/35';
    if (type === 'NOTICE')
        return 'border-zinc-200 border-l-[3px] border-l-violet-200 bg-white hover:border-violet-100 hover:bg-violet-50/35';
    return 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50';
}

export function ddayBadgeClass(dueAt?: number) {
    if (typeof dueAt !== 'number') {
        return 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200';
    }

    const diff = dueAt - Date.now();
    const day = 24 * 60 * 60 * 1000;

    if (diff < 0) {
        return 'bg-rose-50 text-rose-600 ring-1 ring-rose-100';
    }

    if (diff <= day) {
        return 'bg-orange-50 text-orange-600 ring-1 ring-orange-100';
    }

    if (diff <= 3 * day) {
        return 'bg-amber-50 text-amber-600 ring-1 ring-amber-100';
    }

    return 'bg-sky-50 text-sky-600 ring-1 ring-sky-100';
}

export function collectCourseNames(
    runtime: DashboardRuntime,
    items: DashboardItem[],
    includeSmClass: boolean,
) {
    const visibleCachedCourses = getVisibleCachedCourses(
        runtime,
        includeSmClass,
    );

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
    const visibleCachedCourses = getVisibleCachedCourses(
        runtime,
        includeSmClass,
    );

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
    const selectedFilters = Array.isArray(state.filter) ? state.filter : [];
    const selectedTypes = Array.isArray(state.typeFilter)
        ? state.typeFilter
        : [];
    const hiddenItemIdSet = new Set(
        Array.isArray(state.hiddenItemIds) ? state.hiddenItemIds : [],
    );

    const filtered = state.items.filter((item) => {
        if (hiddenItemIdSet.has(cleanText(item.id))) {
            return false;
        }

        const itemCourseName = normalizeCourseName(item.courseName);
        if (
            normalizedCourseFilter !== COURSE_FILTER_ALL &&
            itemCourseName !== normalizedCourseFilter
        ) {
            return false;
        }

        if (selectedTypes.length && !selectedTypes.includes(item.type)) {
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

        if (
            state.hidePastAssignments &&
            item.type === 'ASSIGNMENT' &&
            typeof item.dueAt === 'number' &&
            item.dueAt < now
        ) {
            return false;
        }

        if (
            state.hidePastForums &&
            item.type === 'FORUM' &&
            typeof item.dueAt === 'number' &&
            item.dueAt < now
        ) {
            return false;
        }

        if (!selectedFilters.length) return true;

        const matchesFilter = selectedFilters.some((filterValue) => {
            if (filterValue === 'DUE_SOON') {
                return (
                    item.dueAt != null &&
                    item.dueAt <= in3days &&
                    item.dueAt >= now
                );
            }

            if (filterValue === 'OVERDUE') {
                return item.dueAt != null && item.dueAt < now;
            }

            if (filterValue === 'TODO_ONLY') {
                return item.status === 'TODO';
            }

            if (filterValue === 'NOT_DONE') {
                return item.type !== 'NOTICE' && item.status !== 'DONE';
            }

            return false;
        });

        if (!matchesFilter) {
            return false;
        }

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
