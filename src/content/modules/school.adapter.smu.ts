// @ts-nocheck
(() => {
    const E = window.__ECDASH__;
    if (!E || typeof E.registerSchoolAdapter !== 'function') return;

    E.registerSchoolAdapter({
        id: 'smu',
        label: 'SMU eCampus',
        storagePrefix: 'ecdash:smu',
        hostPatterns: [/^ecampus\.smu\.ac\.kr$/i],
        match: ({ location: pageLocation }) =>
            /^ecampus\.smu\.ac\.kr$/i.test(pageLocation.hostname || ''),
        isDashboardPage: () => Boolean(E.isDashboardSMU?.()),
        collectDashboardCourses: () =>
            E.collectCoursesFromDashboardSMU?.() || [],
        crawlAllDashboardItems: async (_ctx, courses) =>
            (await E.crawlAllItemsFromDashboardSMU?.(courses)) || [],
        getCurrentCourse: () => E.getCurrentCourseFromLocation?.() || null,
        isProgressPage: () => Boolean(E.isUbcompletionProgressPage?.()),
        collectProgressPageItems: async () =>
            (await E.collectLectureItemsFromCurrentProgressPage?.()) || [],
        getDashboardCourseSignature: (_ctx, options = {}) => {
            if (!E.isDashboardSMU?.()) return '';

            const allCourses = E.collectCoursesFromDashboardSMU?.() || [];
            if (!allCourses.length) return '';

            const includeSmClass = Boolean(options?.includeSmClass);
            const visibleCourses =
                typeof E.filterSmClassCourses === 'function'
                    ? E.filterSmClassCourses(allCourses, includeSmClass)?.courses ||
                      []
                    : allCourses;

            if (!visibleCourses.length) return '';

            return visibleCourses
                .map(
                    (course) =>
                        `${String(course.courseId)}::${E.cleanText(course.courseName || '')}::${
                            course.isNew ? '1' : '0'
                        }`,
                )
                .filter(Boolean)
                .sort()
                .join(',');
        },
    });
})();
