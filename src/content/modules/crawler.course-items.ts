// @ts-nocheck
(() => {
    // 과목 단위 수집 오케스트레이터: 모듈 파싱 + 리포트 보강 + 과제 인덱스를 합친다.
    const E = window.__ECDASH__;
    E.crawlCourseItems = async function crawlCourseItems({
        courseId,
        courseName,
        courseIsNew = false,
    }) {
        // 과목 단위 크롤링은 "과목 페이지 허브 + 상세 보고서 보강 + 과제 인덱스"를 합산.
        const all = [];
        let assignmentFallbackItems = [];
        const normalizedCourseName =
            (typeof E.cleanCourseDisplayName === 'function'
                ? E.cleanCourseDisplayName(courseName)
                : E.stripCourseNewToken(courseName)) || `course-${courseId}`;
        const normalizedCourseIsNew =
            Boolean(courseIsNew) ||
            /\bnew\b/i.test(E.cleanText(courseName || ''));

        let courseDoc;
        try {
            const courseHtml = await E.fetchHtml(
                `/course/view.php?id=${courseId}`,
            );
            courseDoc = new DOMParser().parseFromString(
                courseHtml,
                'text/html',
            );

            const moduleItems = E.collectModuleItemsFromCourseView(
                courseDoc,
                courseId,
                normalizedCourseName,
                normalizedCourseIsNew,
                true,
            );
            assignmentFallbackItems = moduleItems.filter(
                (it) => it.type === 'ASSIGNMENT',
            );
            let lectureLinkCandidates =
                E.collectActivityLinkCandidatesFromCourseView(courseDoc);

            const vodLectureLinkCandidates =
                await E.collectVodLectureLinkCandidates(courseDoc, courseId);
            if (vodLectureLinkCandidates.length) {
                lectureLinkCandidates = [
                    ...lectureLinkCandidates,
                    ...vodLectureLinkCandidates,
                ];
            }

            let lectureItems = moduleItems.filter(
                (it) => it.type === 'LECTURE',
            );
            const forumItems = moduleItems.filter((it) => it.type === 'FORUM');
            const resourceItems = moduleItems.filter(
                (it) => it.type === 'RESOURCE',
            );

            // 강의 정보가 비었거나 불완전하면 리포트를 사용해 강의 상태를 보강한다.
            const needsLectureFallback =
                lectureItems.length === 0 ||
                lectureItems.some((it) => it.status === 'UNKNOWN' || !it.meta);
            const hasAttendanceMenuLink = Boolean(
                courseDoc.querySelector(
                    'a[href*="/report/ubcompletion/progress.php"], a[href*="/report/ubcompletion/user_progress"]',
                ),
            );
            const shouldTryLectureReport =
                needsLectureFallback ||
                lectureItems.length > 0 ||
                hasAttendanceMenuLink;

            if (shouldTryLectureReport) {
                // 리포트 결과는 상태 보강 + 누락 강의 생성 모두에 사용.
                const reportUrls = E.collectProgressReportUrls(
                    courseDoc,
                    courseId,
                );
                let bestReportMap = null;
                let bestReportUrl = '';
                let bestReportScore = -1;

                // 후보 리포트 중 데이터가 가장 풍부한 소스 하나만 선택한다.
                for (const reportUrl of reportUrls) {
                    try {
                        const reportHtml = await E.fetchHtml(reportUrl);
                        const reportMap =
                            E.parseStatusRowsFromReportHtml(reportHtml);
                        const rowsCount = Array.isArray(reportMap.rows)
                            ? reportMap.rows.length
                            : 0;
                        const byUrlCount = reportMap.byUrl?.size || 0;
                        const byTitleCount = reportMap.byTitle?.size || 0;
                        const hasReportData =
                            rowsCount > 0 || byUrlCount > 0 || byTitleCount > 0;
                        if (!hasReportData) continue;

                        const reportScore =
                            rowsCount * 100 +
                            byUrlCount * 10 +
                            byTitleCount +
                            (reportUrl.includes('/report/ubcompletion/')
                                ? 1000
                                : 0);

                        if (reportScore > bestReportScore) {
                            bestReportScore = reportScore;
                            bestReportMap = reportMap;
                            bestReportUrl = reportUrl;
                        }
                    } catch (err) {
                        const msg = String(err?.message || err || '');
                        const is404 = msg.includes('Fetch failed 404');

                        // 404는 "해당 경로 미지원"으로 간주해서 로그 노이즈를 줄인다.
                        if (is404) {
                            if (
                                reportUrl.includes('/report/progress/index.php')
                            ) {
                                E.reportPathSupport.progress = false;
                            }
                            if (
                                reportUrl.includes(
                                    '/report/completion/index.php',
                                )
                            ) {
                                E.reportPathSupport.completion = false;
                            }
                            continue;
                        }

                        console.warn(
                            '[ECDASH] progress report crawl failed:',
                            reportUrl,
                            err,
                        );
                    }
                }

                // 선택된 리포트 결과를 현재 강의 목록에 반영한다.
                if (bestReportMap) {
                    lectureItems = E.applyReportStatus(
                        lectureItems,
                        bestReportMap,
                    );

                    if (
                        Array.isArray(bestReportMap.rows) &&
                        bestReportMap.rows.length
                    ) {
                        const fallbackBase = new URL(
                            `/report/ubcompletion/progress.php?id=${courseId}`,
                            location.origin,
                        ).toString();

                        const fromReport = E.buildLectureItemsFromReportRows(
                            bestReportMap.rows,
                            courseId,
                            normalizedCourseName,
                            fallbackBase,
                            normalizedCourseIsNew,
                        );
                        const courseViewUrl = new URL(
                            `/course/view.php?id=${courseId}`,
                            location.origin,
                        ).toString();
                        const resolvedFromReport = E.resolveLectureUrlsByCandidates(
                            fromReport,
                            lectureLinkCandidates,
                            courseViewUrl,
                        );

                        lectureItems = E.dedupeItems([
                            ...lectureItems,
                            ...resolvedFromReport,
                        ]);
                    }

                    console.info(
                        '[ECDASH] lecture report source selected:',
                        bestReportUrl,
                        {
                            rows: bestReportMap.rows?.length || 0,
                            byUrl: bestReportMap.byUrl?.size || 0,
                            byTitle: bestReportMap.byTitle?.size || 0,
                        },
                    );
                }
            }

            lectureItems = E.resolveLectureUrlsByCandidates(
                lectureItems,
                lectureLinkCandidates,
                new URL(
                    `/course/view.php?id=${courseId}`,
                    location.origin,
                ).toString(),
            );

            const enrichedForums = await E.enrichForumItems(forumItems, 1);
            const enrichedResources = await E.enrichResourceItems(
                resourceItems,
                1,
            );
            const noticeItems = await E.collectNoticeItemsFromCourseView(
                courseDoc,
                courseId,
                normalizedCourseName,
                normalizedCourseIsNew,
            );

            all.push(
                ...lectureItems,
                ...enrichedForums,
                ...enrichedResources,
                ...noticeItems,
            );
        } catch (err) {
            console.warn(
                `[ECDASH] course hub crawl failed. courseId=${courseId} (${normalizedCourseName})`,
                err,
            );
        }

        // 기존 과제 크롤링 로직 유지
        try {
            const assignHtml = await E.fetchHtml(
                `/mod/assign/index.php?id=${courseId}`,
            );
            const assignItems = E.parseAssignIndexHtml(
                assignHtml,
                courseId,
                normalizedCourseName,
                normalizedCourseIsNew,
            );
            if (assignItems.length) {
                all.push(...assignItems);
            } else if (assignmentFallbackItems.length) {
                all.push(...assignmentFallbackItems);
                console.warn(
                    `[ECDASH] assignment index empty. using course-view fallback. courseId=${courseId} count=${assignmentFallbackItems.length}`,
                );
            }
        } catch (err) {
            console.warn(
                `[ECDASH] assignment crawl failed. courseId=${courseId} (${normalizedCourseName})`,
                err,
            );
            if (assignmentFallbackItems.length) {
                all.push(...assignmentFallbackItems);
                console.warn(
                    `[ECDASH] assignment fallback used from course view. courseId=${courseId} count=${assignmentFallbackItems.length}`,
                );
            }
        }

        return E.dedupeItems(all);
    };
})();
