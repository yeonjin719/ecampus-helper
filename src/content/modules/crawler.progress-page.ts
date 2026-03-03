// @ts-nocheck
(() => {
    // 온라인출석부(progress) 페이지 전용 수집 로직.
    const E = window.__ECDASH__;
    // 현재 페이지가 출석부 페이지인지 판별한다.
    E.isUbcompletionProgressPage = function isUbcompletionProgressPage() {
        const p = location.pathname.toLowerCase();
        const isTarget =
            p.includes('/report/ubcompletion/progress.php') ||
            p.includes('/report/ubcompletion/user_progress.php') ||
            p.includes('/report/ubcompletion/user_progress_a.php');

        return (
            isTarget &&
            document.querySelector('table.user_progress_table') != null
        );
    };

    // progress 페이지 테이블을 기반으로 강의 목록을 만들고 실제 URL을 복원한다.
    E.collectLectureItemsFromCurrentProgressPage =
        async function collectLectureItemsFromCurrentProgressPage() {
            // 온라인출석부 페이지에서는 현재 문서 구조를 직접 파싱하고,
            // 추가로 과목 상세 페이지를 가져와 실제 강의 링크까지 복원.
            const url = new URL(location.href);
            const courseId = url.searchParams.get('id') || '';
            const rawCourseName =
                E.cleanText(
                    document.querySelector(
                        '.page-header-headings h1, .coursename h1, h1',
                    )?.textContent,
                ) || `course-${courseId || 'unknown'}`;
            const courseName =
                (typeof E.cleanCourseDisplayName === 'function'
                    ? E.cleanCourseDisplayName(rawCourseName)
                    : E.stripCourseNewToken(rawCourseName)) ||
                `course-${courseId || 'unknown'}`;
            const courseIsNew = /\bnew\b/i.test(rawCourseName);

            const reportMap = E.parseStatusRowsFromReportHtml(
                document.documentElement.outerHTML,
            );

            const fallbackBase = new URL(
                `/report/ubcompletion/progress.php?id=${courseId}`,
                location.origin,
            ).toString();
            const courseViewUrl = new URL(
                `/course/view.php?id=${courseId}`,
                location.origin,
            ).toString();

            const fromReport = E.buildLectureItemsFromReportRows(
                reportMap.rows || [],
                courseId,
                courseName,
                fallbackBase,
                courseIsNew,
            );

            let activityLinkCandidates = [];
            try {
                const courseHtml = await E.fetchHtml(
                    `/course/view.php?id=${courseId}`,
                );
                const courseDoc = new DOMParser().parseFromString(
                    courseHtml,
                    'text/html',
                );
                activityLinkCandidates =
                    E.collectActivityLinkCandidatesFromCourseView(courseDoc);
                const vodLectureLinkCandidates =
                    await E.collectVodLectureLinkCandidates(
                        courseDoc,
                        courseId,
                    );
                if (vodLectureLinkCandidates.length) {
                    activityLinkCandidates = [
                        ...activityLinkCandidates,
                        ...vodLectureLinkCandidates,
                    ];
                }
            } catch (err) {
                console.warn(
                    '[ECDASH] resolve lecture url from course view failed:',
                    courseId,
                    err,
                );
            }

            return E.resolveLectureUrlsByCandidates(
                fromReport,
                activityLinkCandidates,
                courseViewUrl,
            );
        };
})();
