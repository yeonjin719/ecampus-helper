// @ts-nocheck
(() => {
    const E = window.__ECDASH__;
    if (!E) return;

    // 진입 오케스트레이터: 캐시 초기화, 크롤링 스케줄링, 자동 새로고침.
    let inFlight = false;
    let lastCourseSignature = '';
    let autoRefreshTimer = null;
    const UI_INCLUDE_SM_CLASS_KEY = 'ecdash:smu:ui:includeSmClass';

    function setKnownCourses(courses) {
        window.__ECDASH_COURSES__ = E.normalizeCourseCache(courses || []);
    }

    function isSmClassCourse(course) {
        if (typeof E.isSmClassCourse === 'function') {
            return E.isSmClassCourse(course);
        }
        return Boolean(course?.isSmClass);
    }

    function getFilteredCourseState(courses, includeSmClass) {
        if (typeof E.filterSmClassCourses === 'function') {
            return E.filterSmClassCourses(courses, includeSmClass);
        }

        const normalized = E.normalizeCourseCache(courses || []);
        if (includeSmClass) {
            return {
                courses: normalized,
                excludedCourseIds: new Set(),
            };
        }

        const excludedCourseIds = new Set();
        const visibleCourses = normalized.filter((course) => {
            if (Boolean(course?.isSmClass)) {
                excludedCourseIds.add(String(course.courseId));
                return false;
            }
            return true;
        });

        return {
            courses: visibleCourses,
            excludedCourseIds,
        };
    }

    function filterItemsByExcludedCourses(items, excludedCourseIds) {
        const source = Array.isArray(items) ? items : [];
        if (!excludedCourseIds || !excludedCourseIds.size) return source;
        return source.filter(
            (item) => !excludedCourseIds.has(String(item?.courseId)),
        );
    }

    async function loadIncludeSmClassSetting() {
        let includeSmClass = Boolean(E.__includeSmClass);
        try {
            const res = await chrome.storage?.local?.get?.([
                UI_INCLUDE_SM_CLASS_KEY,
            ]);
            includeSmClass = Boolean(res?.[UI_INCLUDE_SM_CLASS_KEY]);
        } catch (_) {
            // 무시
        }
        E.__includeSmClass = includeSmClass;
        return includeSmClass;
    }

    function getCourseSignature() {
        if (!E.isDashboardSMU()) return '';
        const courses = E.collectCoursesFromDashboardSMU();
        if (!courses.length) return '';

        const { courses: visibleCourses } = getFilteredCourseState(
            courses,
            Boolean(E.__includeSmClass),
        );
        if (!visibleCourses.length) return '';

        return visibleCourses
            .map(
                (c) =>
                    `${String(c.courseId)}::${E.cleanText(c.courseName || '')}::${c.isNew ? '1' : '0'}`,
            )
            .filter(Boolean)
            .sort()
            .join(',');
    }

    async function refreshAll({ force = false } = {}) {
        if (inFlight) return;
        inFlight = true;

        try {
            E.ensureRoot();
            const includeSmClass = await loadIncludeSmClassSetting();

            let preflightCourses = [];
            if (E.isDashboardSMU()) {
                preflightCourses = E.collectCoursesFromDashboardSMU();
                if (preflightCourses.length) {
                    setKnownCourses(preflightCourses);
                }
            }

            const snap = await E.loadSnapshot();
            let fallbackCourses = preflightCourses;
            if (!fallbackCourses.length) {
                const cachedForFilter = await E.loadCourseCache();
                fallbackCourses = Array.isArray(cachedForFilter.courses)
                    ? cachedForFilter.courses
                    : [];
                if (fallbackCourses.length) {
                    setKnownCourses(fallbackCourses);
                }
            }
            const fallbackFiltered = getFilteredCourseState(
                fallbackCourses,
                includeSmClass,
            );
            const visibleSnapshotItems = filterItemsByExcludedCourses(
                snap.items,
                fallbackFiltered.excludedCourseIds,
            );

            if (
                !force &&
                snap.lastRunAt &&
                Date.now() - snap.lastRunAt < 3 * 60 * 1000
            ) {
                window.__ECDASH_ITEMS__ = visibleSnapshotItems;
                E.setBadge('CACHE');
                E.setSub('최근 캐시 데이터를 사용 중이에요. ↻로 강제 새로고침 가능');
                E.render(visibleSnapshotItems);
                return;
            }
            E.setLoading?.(true, '데이터를 가져오는 중...');

            if (E.isDashboardSMU()) {
                // 대시보드 과목 목록이 일시적으로 비면 기존 과목 캐시를 대체값으로 사용.
                const dashboardCourses = E.collectCoursesFromDashboardSMU();
                let crawlCourses = [];
                let excludedCourseIds = new Set();

                if (dashboardCourses.length) {
                    lastCourseSignature = getCourseSignature() || lastCourseSignature;
                    await E.saveCourseCache?.(dashboardCourses);
                    setKnownCourses(dashboardCourses);
                    const filtered = getFilteredCourseState(
                        dashboardCourses,
                        includeSmClass,
                    );
                    crawlCourses = filtered.courses;
                    excludedCourseIds = filtered.excludedCourseIds;
                } else {
                    const cachedCourses = await E.loadCourseCache();
                    const rawCachedCourses = Array.isArray(cachedCourses.courses)
                        ? cachedCourses.courses
                        : [];
                    setKnownCourses(rawCachedCourses);
                    const filtered = getFilteredCourseState(
                        rawCachedCourses,
                        includeSmClass,
                    );
                    crawlCourses = filtered.courses;
                    excludedCourseIds = filtered.excludedCourseIds;
                }

                if (!crawlCourses.length) {
                    E.setBadge('WAIT');
                    E.setSub(
                        includeSmClass
                            ? '과목 목록을 아직 찾지 못해 기존 캐시를 유지해요. 잠시 후 다시 시도해 주세요.'
                            : 'SM-Class 제외 설정으로 현재 크롤링할 과목이 없어요. 설정에서 포함할 수 있어요.',
                    );
                    window.__ECDASH_ITEMS__ = filterItemsByExcludedCourses(
                        snap.items,
                        excludedCourseIds,
                    );
                    E.render(window.__ECDASH_ITEMS__);
                    return;
                }

                const items = await E.crawlAllItemsFromDashboardSMU(crawlCourses);
                const visibleItems = filterItemsByExcludedCourses(
                    items,
                    excludedCourseIds,
                );
                window.__ECDASH_ITEMS__ = visibleItems;
                E.saveSnapshot(visibleItems);

                E.setBadge('OK');
                E.setSub(
                    `${E.summarizeCounts(visibleItems)} · 마지막 갱신 ${new Date().toLocaleTimeString()}`,
                );
                E.render(visibleItems);
                return;
            }

            const cached = await E.loadCourseCache();
            const currentCourse = E.getCurrentCourseFromLocation?.();

            // 비-대시보드 페이지에서는 캐시된 과목 목록을 기준으로 재크롤링.
            // 현재 페이지의 과목 식별자를 우선 반영해 캐시 신선도를 유지.
            const rawCachedCourses = Array.isArray(cached.courses)
                ? [...cached.courses]
                : [];
            const filteredCourses = getFilteredCourseState(
                rawCachedCourses,
                includeSmClass,
            );
            let crawlCourses = [...filteredCourses.courses];
            const excludedCourseIds = filteredCourses.excludedCourseIds;

            if (currentCourse?.courseId) {
                const currentCourseId = String(currentCourse.courseId);
                const rawIndex = rawCachedCourses.findIndex(
                    (course) => String(course.courseId) === currentCourseId,
                );
                const knownCurrent = rawIndex >= 0 ? rawCachedCourses[rawIndex] : null;
                const skipCurrentCourse =
                    !includeSmClass && isSmClassCourse(knownCurrent || currentCourse);

                if (skipCurrentCourse) {
                    excludedCourseIds.add(currentCourseId);
                } else {
                    if (rawIndex === -1) {
                        rawCachedCourses.unshift(currentCourse);
                    } else if (
                        currentCourse.courseName &&
                        currentCourse.courseName !== `course-${currentCourse.courseId}`
                    ) {
                        rawCachedCourses[rawIndex] = {
                            ...rawCachedCourses[rawIndex],
                            courseName: currentCourse.courseName,
                            isNew:
                                Boolean(rawCachedCourses[rawIndex]?.isNew) ||
                                Boolean(currentCourse.isNew),
                        };
                    }

                    const crawlIndex = crawlCourses.findIndex(
                        (course) => String(course.courseId) === currentCourseId,
                    );
                    if (crawlIndex === -1) {
                        crawlCourses.unshift(currentCourse);
                    } else if (
                        currentCourse.courseName &&
                        currentCourse.courseName !== `course-${currentCourse.courseId}`
                    ) {
                        crawlCourses[crawlIndex] = {
                            ...crawlCourses[crawlIndex],
                            courseName: currentCourse.courseName,
                            isNew:
                                Boolean(crawlCourses[crawlIndex]?.isNew) ||
                                Boolean(currentCourse.isNew),
                        };
                    }
                }
            }
            setKnownCourses(rawCachedCourses.length ? rawCachedCourses : crawlCourses);

            if (!crawlCourses.length) {
                window.__ECDASH_ITEMS__ = filterItemsByExcludedCourses(
                    snap.items,
                    excludedCourseIds,
                );
                E.setBadge('WAIT');
                E.setSub(
                    includeSmClass
                        ? '대시보드에서 과목을 찾은 뒤 크롤링해요. (대시보드로 이동해 주세요)'
                        : 'SM-Class 제외 설정으로 현재 크롤링할 과목이 없어요. 설정에서 포함할 수 있어요.',
                );
                E.render(window.__ECDASH_ITEMS__);
                return;
            }

            await E.saveCourseCache?.(
                rawCachedCourses.length ? rawCachedCourses : crawlCourses,
            );
            E.setBadge('CRAWL');
            E.setSub(`캐시된 과목 ${crawlCourses.length}개 기준으로 갱신 중…`);

            const perCourse = await E.mapWithConcurrency(
                crawlCourses,
                E.constants.CRAWL_CONCURRENCY,
                async (course) => {
                    try {
                        return await E.crawlCourseItems(course);
                    } catch (err) {
                        console.warn(
                            `[ECDASH] cached course crawl skipped. courseId=${course.courseId}`,
                            err,
                        );
                        return [];
                    }
                },
            );

            const crawledItems = filterItemsByExcludedCourses(
                E.dedupeItems(perCourse.flat()),
                excludedCourseIds,
            );
            const targetIds = new Set(
                crawlCourses.map((course) => String(course.courseId)),
            );
            // 새로 크롤링한 과목만 교체하고, 나머지 과목 항목은 기존 스냅샷을 유지.
            const keepItems = filterItemsByExcludedCourses(
                (Array.isArray(snap.items) ? snap.items : []).filter(
                    (item) => !targetIds.has(String(item.courseId)),
                ),
                excludedCourseIds,
            );
            const mergedItems = E.dedupeItems([...keepItems, ...crawledItems]);

            window.__ECDASH_ITEMS__ = mergedItems;
            E.saveSnapshot(mergedItems);

            E.setBadge('OK');
            E.setSub(
                `${E.summarizeCounts(mergedItems)} · 마지막 갱신 ${new Date().toLocaleTimeString()}`,
            );
            E.render(mergedItems);
        } catch (e) {
            console.error(e);
            E.setBadge('ERR');
            E.setSub('크롤링 중 오류가 발생했어요. (로그인 상태/권한/네트워크 확인)');
        } finally {
            E.setLoading?.(false);
            inFlight = false;
        }
    }

    async function boot() {
        E.refreshAll = refreshAll;

        E.initVodEnhancements();

        if (E.isVodPlayerPage() && !E.isDashboardSMU()) {
            // 동영상 페이지에서는 탭 타이틀 기능만 유지하고 사이드바는 강제로 띄우지 않음.
            return;
        }

        E.ensureRoot();

        if (E.isUbcompletionProgressPage?.()) {
            E.setLoading?.(true, '온라인출석부 데이터를 가져오는 중...');
            try {
                const lectureItems =
                    (await E.collectLectureItemsFromCurrentProgressPage?.()) || [];
                window.__ECDASH_ITEMS__ = lectureItems;
                E.setBadge('OK');
                E.setSub(
                    `강의 ${lectureItems.length}개 · 온라인출석부에서 불러옴`,
                );
                E.render(lectureItems);
            } finally {
                E.setLoading?.(false);
            }
            return;
        }

        const includeSmClass = await loadIncludeSmClassSetting();
        const snap = await E.loadSnapshot();
        const cachedCourses = await E.loadCourseCache();
        const normalizedCachedCourses = Array.isArray(cachedCourses.courses)
            ? cachedCourses.courses
            : [];
        setKnownCourses(normalizedCachedCourses);
        const cachedCourseFilter = getFilteredCourseState(
            normalizedCachedCourses,
            includeSmClass,
        );
        const visibleSnapItems = filterItemsByExcludedCourses(
            snap.items,
            cachedCourseFilter.excludedCourseIds,
        );

        if (visibleSnapItems.length) {
            window.__ECDASH_ITEMS__ = visibleSnapItems;
            E.setBadge('CACHE');
            E.setSub(
                `${E.summarizeCounts(visibleSnapItems)} · 캐시 표시 중 (↻로 갱신)`,
            );
            E.render(visibleSnapItems);
        } else {
            window.__ECDASH_ITEMS__ = [];
            E.setBadge('READY');
            E.render([]);
        }

        if (E.isDashboardSMU()) {
            lastCourseSignature = getCourseSignature();
            refreshAll({ force: false });
        } else {
            E.setBadge('WAIT');
            E.setSub('캐시된 과목 정보가 있으면 현재 페이지에서도 갱신해요.');
            refreshAll({ force: false });
        }

        const obs = new MutationObserver(() => {
            if (!E.isDashboardSMU() || inFlight) return;

            const nextSignature = getCourseSignature();
            if (!nextSignature || nextSignature === lastCourseSignature) return;
            lastCourseSignature = nextSignature;

            if (autoRefreshTimer) clearTimeout(autoRefreshTimer);
            autoRefreshTimer = setTimeout(() => {
                refreshAll({ force: false });
            }, 500);
        });

        obs.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    }

    boot();
})();
