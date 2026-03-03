// @ts-nocheck
(() => {
    // 크롤링 결과를 URL/제목 기준으로 통합해 중복 항목을 제거한다.
    const E = window.__ECDASH__;
    E.dedupeItems = function dedupeItems(items) {
        const map = new Map();

        for (const item of items) {
            const normalizedUrl = E.normalizeUrl(item.url);
            const key = `${item.type}::${item.courseId}::${
                normalizedUrl || 'no-url'
            }::${E.canonicalTitle(item.title) || item.id}`;
            const prev = map.get(key);
            if (!prev) {
                map.set(key, item);
                continue;
            }

            map.set(key, {
                ...prev,
                courseName:
                    (typeof E.cleanCourseDisplayName === 'function'
                        ? E.cleanCourseDisplayName(
                              prev.courseName || item.courseName,
                          )
                        : E.stripCourseNewToken(
                              prev.courseName || item.courseName,
                          )) || '',
                courseIsNew: Boolean(prev.courseIsNew || item.courseIsNew),
                dueAt: prev.dueAt ?? item.dueAt,
                status:
                    prev.status === 'UNKNOWN' && item.status !== 'UNKNOWN'
                        ? item.status
                        : prev.status,
                meta: E.mergeMetaText(prev.meta, item.meta),
                section: prev.section || item.section,
            });
        }

        return [...map.values()];
    };
})();
