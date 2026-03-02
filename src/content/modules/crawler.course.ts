// @ts-nocheck
(() => {
    const E = window.__ECDASH__;
    if (!E) return;

    // 대시보드 과목 수집 + 과목 캐시 + 공통 크롤링 입출력.
    E.isDashboardSMU = function isDashboardSMU() {
        return document.querySelector('ul.my-course-lists') != null;
    };

    E.hasSmClassLabel = function hasSmClassLabel(labelText) {
        const text = E.cleanText(labelText || '');
        if (!text) return false;
        return /sm\s*-\s*class|sm\s*class/i.test(text);
    };

    E.collectCourseLabelTexts = function collectCourseLabelTexts(courseLinkEl) {
        if (!courseLinkEl) return [];
        return [
            ...courseLinkEl.querySelectorAll(
                '.course-label .label-course, .course-label .label',
            ),
        ]
            .map((node) => E.cleanText(node.textContent))
            .filter(Boolean);
    };

    E.stripCourseNewToken = function stripCourseNewToken(value) {
        const text = E.cleanText(value || '');
        if (!text) return '';
        return E.cleanText(text.replace(/\s*\bnew\b\s*$/i, ''));
    };

    E.detectCourseTitleHasNewBadge = function detectCourseTitleHasNewBadge(
        courseLinkEl,
    ) {
        if (!courseLinkEl) return false;

        const badgeText = E.cleanText(
            courseLinkEl.querySelector('.course-title h3 .new, .course-title .new')
                ?.textContent,
        );
        if (badgeText) {
            return /\bnew\b/i.test(badgeText);
        }

        const titleText = E.cleanText(
            courseLinkEl.querySelector('.course-title h3')?.textContent,
        );
        return /\bnew\b/i.test(titleText);
    };

    E.extractCourseNameFromLink = function extractCourseNameFromLink(courseLinkEl) {
        if (!courseLinkEl) return '';

        const h3 = courseLinkEl.querySelector('.course-title h3');
        if (h3) {
            const clone = h3.cloneNode(true);
            clone.querySelectorAll('.new').forEach((el) => {
                el.remove();
            });

            const fromClone = E.stripCourseNewToken(clone.textContent);
            if (fromClone) return fromClone;
        }

        return E.stripCourseNewToken(
            E.cleanText(h3?.textContent) || E.cleanText(courseLinkEl.textContent),
        );
    };

    E.isSmClassCourse = function isSmClassCourse(course) {
        if (!course) return false;
        if (course.isSmClass === true) return true;

        if (Array.isArray(course.courseLabels)) {
            return course.courseLabels.some((label) => E.hasSmClassLabel(label));
        }

        return false;
    };

    E.filterSmClassCourses = function filterSmClassCourses(courses, includeSmClass) {
        const normalized = E.normalizeCourseCache(courses);
        if (includeSmClass) {
            return {
                courses: normalized,
                excludedCourseIds: new Set(),
            };
        }

        const excludedCourseIds = new Set();
        const visibleCourses = normalized.filter((course) => {
            if (E.isSmClassCourse(course)) {
                excludedCourseIds.add(String(course.courseId));
                return false;
            }
            return true;
        });

        return {
            courses: visibleCourses,
            excludedCourseIds,
        };
    };

    E.collectCoursesFromDashboardSMU =
        function collectCoursesFromDashboardSMU() {
            const links = [
                ...document.querySelectorAll(
                    'ul.my-course-lists a.course_link[href*="/course/view.php?id="]',
                ),
            ];

            const seen = new Set();
            const courses = [];

            for (const a of links) {
                try {
                    const u = new URL(a.href, location.origin);
                    const courseId = u.searchParams.get('id');
                    if (!courseId || seen.has(courseId)) continue;

                    const courseLabels = E.collectCourseLabelTexts(a);
                    const isSmClass = courseLabels.some((label) =>
                        E.hasSmClassLabel(label),
                    );
                    const isNew = E.detectCourseTitleHasNewBadge(a);

                    const courseName =
                        E.extractCourseNameFromLink(a) ||
                        `course-${courseId}`;

                    seen.add(courseId);
                    courses.push({
                        courseId,
                        courseName,
                        courseLabels,
                        isSmClass,
                        isNew,
                    });
                } catch {
                    // 깨진 링크는 무시
                }
            }

            return courses;
        };

    E.normalizeCourseCache = function normalizeCourseCache(courses) {
        if (!Array.isArray(courses) || !courses.length) return [];

        return courses
            .map((course) => {
                const courseLabels = Array.isArray(course?.courseLabels)
                    ? course.courseLabels
                          .map((label) => E.cleanText(label))
                          .filter(Boolean)
                    : [];

                const isSmClass =
                    Boolean(course?.isSmClass) ||
                    courseLabels.some((label) => E.hasSmClassLabel(label));
                const rawCourseName = E.cleanText(course?.courseName || '');
                const isNew =
                    Boolean(course?.isNew) || /\bnew\b/i.test(rawCourseName);

                return {
                    courseId: String(course?.courseId || '').trim(),
                    courseName: E.stripCourseNewToken(rawCourseName),
                    courseLabels,
                    isSmClass,
                    isNew,
                };
            })
            .filter((course) => course.courseId);
    };

    E.getCourseCacheSignature = function getCourseCacheSignature(courses) {
        const normalized = E.normalizeCourseCache(courses)
            .slice()
            .sort((a, b) => String(a.courseId).localeCompare(String(b.courseId)));

        return normalized
            .map(
                (course) =>
                    `${course.courseId}::${course.courseName}::${
                        course.isSmClass ? '1' : '0'
                    }::${course.isNew ? '1' : '0'}`,
            )
            .join('||');
    };

    E.saveCourseCache = async function saveCourseCache(courses) {
        // 빈 목록은 덮어쓰지 않고, 과목 구성이 실제로 바뀌었을 때만 저장.
        const normalized = E.normalizeCourseCache(courses);
        if (!normalized.length) {
            return { updated: false, reason: 'empty' };
        }

        try {
            const key = E.constants.STORAGE_COURSES_KEY;
            const prev = await chrome.storage?.local?.get?.([key]);
            const prevCourses = E.normalizeCourseCache(prev?.[key] || []);

            const nextSig = E.getCourseCacheSignature(normalized);
            const prevSig = E.getCourseCacheSignature(prevCourses);
            if (nextSig === prevSig) {
                return { updated: false, reason: 'unchanged' };
            }

            await chrome.storage?.local?.set?.({
                [E.constants.STORAGE_COURSES_KEY]: normalized,
                [E.constants.STORAGE_COURSES_LAST_SYNC]: Date.now(),
            });

            return { updated: true, reason: 'changed' };
        } catch (_) {
            return { updated: false, reason: 'error' };
        }
    };

    E.loadCourseCache = async function loadCourseCache() {
        try {
            const res = await chrome.storage?.local?.get?.([
                E.constants.STORAGE_COURSES_KEY,
                E.constants.STORAGE_COURSES_LAST_SYNC,
            ]);

            const courses = E.normalizeCourseCache(
                res?.[E.constants.STORAGE_COURSES_KEY],
            );

            return {
                courses,
                lastSyncAt: Number(res?.[E.constants.STORAGE_COURSES_LAST_SYNC] || 0),
            };
        } catch (_) {
            return { courses: [], lastSyncAt: 0 };
        }
    };

    E.getCurrentCourseFromLocation = function getCurrentCourseFromLocation() {
        const path = location.pathname.toLowerCase();
        const isCourseRelated =
            path.includes('/course/view.php') ||
            path.includes('/report/ubcompletion/') ||
            path.includes('/grade/report/user/') ||
            path.includes('/grade/report/');
        if (!isCourseRelated) return null;

        const courseId = new URL(location.href).searchParams.get('id');
        if (!courseId) return null;

        const rawPageCourseName =
            E.cleanText(
                document.querySelector(
                    '.page-header-headings h1, .coursename h1, .course-title h1, h1',
                )?.textContent,
            ) || '';
        const pageCourseName = E.stripCourseNewToken(rawPageCourseName);
        const isNew = /\bnew\b/i.test(rawPageCourseName);

        return {
            courseId: String(courseId),
            courseName: pageCourseName || `course-${courseId}`,
            isNew,
        };
    };

    E.fetchHtml = async function fetchHtml(pathOrUrl) {
        const url = pathOrUrl.startsWith('http')
            ? pathOrUrl
            : new URL(pathOrUrl, location.origin).toString();

        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
        return await res.text();
    };

    E.parseAssignIndexHtml = function parseAssignIndexHtml(
        htmlText,
        courseId,
        courseName,
        courseIsNew = false,
    ) {
        const doc = new DOMParser().parseFromString(htmlText, 'text/html');
        const items = [];

        doc.querySelectorAll(
            'table.generaltable.table.table-bordered tbody tr',
        ).forEach((tr) => {
            if (tr.querySelector('.tabledivider')) return;

            const a = tr.querySelector('td.c1 a');
            const title = E.cleanText(a?.textContent);
            const url = E.normalizeUrl(a?.href || '');
            if (!title || !url) return;

            const section =
                E.cleanText(tr.querySelector('td.c0')?.textContent) ||
                undefined;
            const dueText =
                E.cleanText(tr.querySelector('td.c2')?.textContent) || '';
            const submitText =
                E.cleanText(tr.querySelector('td.c3')?.textContent) || '';

            const dueAt =
                dueText && dueText !== '-' ? E.parseDueAt(dueText) : undefined;
            const status = E.inferStatusFromText(submitText);

            items.push({
                id: E.makeId('ASSIGNMENT', courseId, title, url),
                type: 'ASSIGNMENT',
                courseId,
                courseName,
                courseIsNew: Boolean(courseIsNew),
                title,
                url,
                section,
                dueAt,
                status,
                meta: submitText && submitText !== '-' ? submitText : undefined,
            });
        });

        return items;
    };

    E.mapWithConcurrency = async function mapWithConcurrency(
        list,
        limit,
        mapper,
    ) {
        if (!Array.isArray(list) || !list.length) return [];

        const results = new Array(list.length);
        let cursor = 0;

        const workerCount = Math.max(1, Math.min(limit, list.length));
        const workers = Array.from({ length: workerCount }, async () => {
            while (true) {
                const index = cursor;
                cursor += 1;
                if (index >= list.length) break;
                results[index] = await mapper(list[index], index);
            }
        });

        await Promise.all(workers);
        return results;
    };
})();
