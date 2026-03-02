// @ts-nocheck
(() => {
    const E = (window.__ECDASH__ = window.__ECDASH__ || {});
    const adapters = [];

    const cleanText = (value) =>
        String(value || '')
            .replace(/\s+/g, ' ')
            .trim();

    const toHostMatcher = (pattern) => {
        if (!pattern) return null;
        if (pattern instanceof RegExp) {
            return (host) => pattern.test(host);
        }

        const text = cleanText(pattern).toLowerCase();
        if (!text) return null;
        return (host) => host === text || host.endsWith(`.${text}`);
    };

    const matchByHostPatterns = (adapter) => {
        const host = String(location.hostname || '').toLowerCase();
        const patterns = Array.isArray(adapter?.hostPatterns)
            ? adapter.hostPatterns
            : [];

        return patterns
            .map((pattern) => toHostMatcher(pattern))
            .filter(Boolean)
            .some((matcher) => {
                try {
                    return matcher(host);
                } catch {
                    return false;
                }
            });
    };

    const adapterContext = () => ({
        location,
        document,
        runtime: E,
    });

    E.registerSchoolAdapter = function registerSchoolAdapter(adapter) {
        const id = cleanText(adapter?.id);
        if (!id) return false;

        const normalized = {
            ...adapter,
            id,
            label: cleanText(adapter?.label || id),
        };

        const index = adapters.findIndex(
            (candidate) => candidate.id === normalized.id,
        );
        if (index >= 0) {
            adapters[index] = normalized;
        } else {
            adapters.push(normalized);
        }

        E.__schoolAdapters = adapters;
        return true;
    };

    E.listSchoolAdapters = function listSchoolAdapters() {
        return [...adapters];
    };

    E.resolveSchoolAdapter = function resolveSchoolAdapter() {
        const ctx = adapterContext();

        for (const adapter of adapters) {
            try {
                if (typeof adapter.match === 'function' && adapter.match(ctx)) {
                    return adapter;
                }
            } catch {
                // 무시
            }

            if (matchByHostPatterns(adapter)) {
                return adapter;
            }
        }

        return null;
    };

    E.getActiveSchoolAdapter = function getActiveSchoolAdapter() {
        const selectedAdapterId = cleanText(E.__activeSchoolAdapterId);
        if (selectedAdapterId) {
            const selected = adapters.find(
                (adapter) => adapter.id === selectedAdapterId,
            );
            if (selected) return selected;
        }

        const resolved = E.resolveSchoolAdapter();
        if (resolved) {
            E.__activeSchoolAdapterId = resolved.id;
            E.__activeSchoolAdapterLabel = resolved.label;
            return resolved;
        }

        return null;
    };

    E.getStoragePrefix = function getStoragePrefix(fallback = 'ecdash:smu') {
        const adapter = E.getActiveSchoolAdapter?.();
        const adapterPrefix = cleanText(adapter?.storagePrefix);
        if (adapterPrefix) return adapterPrefix;

        const adapterId = cleanText(adapter?.id);
        if (adapterId) return `ecdash:${adapterId}`;

        return cleanText(fallback) || 'ecdash:smu';
    };

    E.isDashboardPage = function isDashboardPage() {
        const adapter = E.getActiveSchoolAdapter?.();
        if (typeof adapter?.isDashboardPage === 'function') {
            try {
                return Boolean(adapter.isDashboardPage(adapterContext()));
            } catch {
                // 무시
            }
        }

        return Boolean(E.isDashboardSMU?.());
    };

    E.collectDashboardCourses = function collectDashboardCourses() {
        const adapter = E.getActiveSchoolAdapter?.();
        if (typeof adapter?.collectDashboardCourses === 'function') {
            try {
                const courses = adapter.collectDashboardCourses(adapterContext());
                return Array.isArray(courses) ? courses : [];
            } catch {
                // 무시
            }
        }

        return E.collectCoursesFromDashboardSMU?.() || [];
    };

    E.crawlAllItemsFromDashboard = async function crawlAllItemsFromDashboard(
        courses,
    ) {
        const adapter = E.getActiveSchoolAdapter?.();
        if (typeof adapter?.crawlAllDashboardItems === 'function') {
            try {
                const items = await adapter.crawlAllDashboardItems(
                    adapterContext(),
                    courses,
                );
                return Array.isArray(items) ? items : [];
            } catch {
                // 무시
            }
        }

        const fallback = await E.crawlAllItemsFromDashboardSMU?.(courses);
        return Array.isArray(fallback) ? fallback : [];
    };

    E.getCurrentCourse = function getCurrentCourse() {
        const adapter = E.getActiveSchoolAdapter?.();
        if (typeof adapter?.getCurrentCourse === 'function') {
            try {
                return adapter.getCurrentCourse(adapterContext()) || null;
            } catch {
                // 무시
            }
        }

        return E.getCurrentCourseFromLocation?.() || null;
    };

    E.isProgressPage = function isProgressPage() {
        const adapter = E.getActiveSchoolAdapter?.();
        if (typeof adapter?.isProgressPage === 'function') {
            try {
                return Boolean(adapter.isProgressPage(adapterContext()));
            } catch {
                // 무시
            }
        }

        return Boolean(E.isUbcompletionProgressPage?.());
    };

    E.collectProgressPageItems = async function collectProgressPageItems() {
        const adapter = E.getActiveSchoolAdapter?.();
        if (typeof adapter?.collectProgressPageItems === 'function') {
            try {
                const items = await adapter.collectProgressPageItems(
                    adapterContext(),
                );
                return Array.isArray(items) ? items : [];
            } catch {
                // 무시
            }
        }

        const fallback = await E.collectLectureItemsFromCurrentProgressPage?.();
        return Array.isArray(fallback) ? fallback : [];
    };

    E.getDashboardCourseSignature = function getDashboardCourseSignature(
        options = {},
    ) {
        const adapter = E.getActiveSchoolAdapter?.();
        if (typeof adapter?.getDashboardCourseSignature === 'function') {
            try {
                return cleanText(
                    adapter.getDashboardCourseSignature(adapterContext(), options) ||
                        '',
                );
            } catch {
                // 무시
            }
        }

        return '';
    };
})();
