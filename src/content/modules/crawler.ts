// @ts-nocheck
(() => {
    const E = window.__ECDASH__;
    E.reportPathSupport = E.reportPathSupport || {
        progress: false,
        completion: false,
    };

    // 활동 파싱 + 리포트 상태 병합 파이프라인.
    E.extractSectionName = function extractSectionName(sectionNode) {
        const selectors = [
            '.sectionname',
            'h3.sectionname',
            '.section-title',
            '.course-section-header h3',
            'h4',
        ];

        for (const selector of selectors) {
            const text = E.cleanText(
                sectionNode.querySelector(selector)?.textContent,
            );
            if (text) return text;
        }

        return undefined;
    };

    E.extractActivityTitle = function extractActivityTitle(linkEl) {
        if (!linkEl) return '';

        const preferred =
            linkEl.querySelector('.instancename') ||
            linkEl.querySelector('.activityname') ||
            linkEl;

        const clone = preferred.cloneNode(true);
        clone
            .querySelectorAll('.accesshide, .sr-only, .visually-hidden')
            .forEach((el) => {
                el.remove();
            });

        return E.cleanText(clone.textContent);
    };

    E.detectTypeFromActivity = function detectTypeFromActivity(
        activityNode,
        href,
        title,
    ) {
        const lowerHref = href.toLowerCase();
        const lowerTitle = title.toLowerCase();
        const nodeClass = String(activityNode.className || '').toLowerCase();

        if (lowerHref.includes('/mod/assign/')) return 'ASSIGNMENT';

        if (
            lowerHref.includes('/mod/forum/') ||
            nodeClass.includes('modtype_forum')
        ) {
            return 'FORUM';
        }

        if (
            lowerHref.includes('/mod/resource/') ||
            lowerHref.includes('/mod/folder/') ||
            lowerHref.includes('/mod/url/') ||
            lowerHref.includes('/mod/page/') ||
            lowerHref.includes('/mod/file/') ||
            nodeClass.includes('modtype_resource') ||
            nodeClass.includes('modtype_folder') ||
            nodeClass.includes('modtype_url') ||
            nodeClass.includes('modtype_page')
        ) {
            return 'RESOURCE';
        }

        if (
            lowerHref.includes('/mod/vod/') ||
            lowerHref.includes('/mod/video/') ||
            lowerHref.includes('/mod/econtents/') ||
            lowerHref.includes('/mod/ubonline/') ||
            lowerHref.includes('/vod/') ||
            nodeClass.includes('modtype_vod') ||
            nodeClass.includes('modtype_video') ||
            nodeClass.includes('modtype_econtents') ||
            nodeClass.includes('modtype_ubonline') ||
            /(vod|강의영상|동영상|온라인\s*강의|강의\s*보기|lecture\s*video|e-?contents)/i.test(
                lowerTitle,
            )
        ) {
            return 'LECTURE';
        }

        return undefined;
    };

    E.looksLikeActivityLink = function looksLikeActivityLink(url) {
        const lower = url.toLowerCase();
        return lower.includes('/mod/') || lower.includes('/vod/');
    };

    E.collectTextBySelectors = function collectTextBySelectors(
        root,
        selectors,
    ) {
        const out = [];
        for (const selector of selectors) {
            root.querySelectorAll(selector).forEach((el) => {
                const text = E.cleanText(el.textContent);
                if (text) out.push(text);
            });
        }
        return out;
    };

    E.extractSignalsFromActivityNode = function extractSignalsFromActivityNode(
        activityNode,
    ) {
        // 점검 필요: 현재 테마/페이지 구조에 맞춰 조정할 완료/진도 표시 셀렉터
        const completionTexts = E.collectTextBySelectors(activityNode, [
            '.completion-info',
            '.activity-completion',
            '[data-region*="completion"]',
            '.automatic-completion-conditions',
            '.activity-information',
            '.progress',
        ]);

        const completionMerged = completionTexts.join(' | ');
        const status = E.inferStatusFromText(completionMerged);

        // 점검 필요: 현재 테마/페이지 구조에 맞춰 조정할 마감/기간 표시 셀렉터
        const dueTexts = E.collectTextBySelectors(activityNode, [
            '.activity-dates',
            '[data-region="activity-dates"]',
            '.availabilityinfo',
            '.description',
            '.contentafterlink',
            '.activity-information',
            '.displayoptions',
            '.displayoptions .text-ubstrap',
            '.displayoptions .text-info',
            '.date',
            '.text-ubstrap',
            '.text-warning',
        ]);

        const metaTexts = E.collectTextBySelectors(activityNode, [
            '.text-info',
            '.text-ubstrap',
            '.displayoptions',
            '.displayoptions .text-ubstrap',
            '.displayoptions .text-info',
            '.activity-information',
            '.description',
        ]);

        const dueAt = E.pickDueAtFromTexts(dueTexts);
        const meta = E.pickMetaFromTexts([
            ...completionTexts,
            ...dueTexts,
            ...metaTexts,
        ]);

        return { status, dueAt, meta };
    };

    E.collectModuleItemsFromCourseView =
        function collectModuleItemsFromCourseView(
            doc,
            courseId,
            courseName,
            courseIsNew = false,
            includeAssignments = false,
        ) {
            const items = [];
            const seenUrl = new Set();

            // 점검 필요: 현재 테마/페이지 구조에 맞춰 조정할 섹션/활동 블록 셀렉터
            let sectionNodes = [
                ...doc.querySelectorAll(
                    'li.section, section[id^="section-"], .course-section',
                ),
            ];

            if (!sectionNodes.length) {
                sectionNodes = [doc.body];
            }

            for (const sectionNode of sectionNodes) {
                const section = E.extractSectionName(sectionNode);

                let activityNodes = [
                    ...sectionNode.querySelectorAll(
                        'li.activity, .activity-item, li[class*="modtype_"], div.activity',
                    ),
                ];

                if (!activityNodes.length && sectionNode === doc.body) {
                    activityNodes = [
                        ...doc.querySelectorAll(
                            'li.activity, .activity-item, li[class*="modtype_"], div.activity',
                        ),
                    ];
                }

                for (const activityNode of activityNodes) {
                    const links = [...activityNode.querySelectorAll('a[href]')];
                    if (!links.length) continue;

                    let pickedLink;
                    for (const link of links) {
                        const href = E.normalizeUrl(link.href);
                        if (!href) continue;
                        if (!E.looksLikeActivityLink(href)) continue;
                        if (href.includes('action=editswitch')) continue;
                        pickedLink = link;
                        break;
                    }

                    if (!pickedLink) continue;

                    const href = E.normalizeUrl(pickedLink.href);
                    if (!href || seenUrl.has(href)) continue;

                    const title = E.extractActivityTitle(pickedLink);
                    if (!title) continue;

                    const type = E.detectTypeFromActivity(
                        activityNode,
                        href,
                        title,
                    );
                    if (!type) continue;
                    if (type === 'ASSIGNMENT' && !includeAssignments) continue;

                    const { status, dueAt, meta } =
                        E.extractSignalsFromActivityNode(activityNode);

                    items.push({
                        id: E.makeId(type, courseId, title, href),
                        type,
                        courseId,
                        courseName,
                        courseIsNew: Boolean(courseIsNew),
                        title,
                        url: href,
                        section,
                        dueAt,
                        status,
                        meta,
                    });

                    seenUrl.add(href);
                }
            }

            return items;
        };

    E.collectProgressReportUrls = function collectProgressReportUrls(
        doc,
        courseId,
    ) {
        // 과목 페이지 내부 링크와 알려진 리포트 패턴을 후보로 수집.
        // 온라인출석부 경로가 주 경로라서 다른 보고서 경로는
        // 지원 가능성이 있을 때만 제한적으로 시도한다.
        const urls = new Set();
        const discovered = [];

        // 점검 필요: 현재 테마/페이지 구조에 맞춰 조정할 진도/완료 보고서 링크 탐색 규칙
        doc.querySelectorAll('a[href]').forEach((a) => {
            const href = E.normalizeUrl(a.href);
            if (!href) return;

            const text = E.cleanText(a.textContent).toLowerCase();
            const lowerHref = href.toLowerCase();

            const looksLikeReport =
                lowerHref.includes('/report/progress/') ||
                lowerHref.includes('/report/completion/') ||
                lowerHref.includes('/report/ubcompletion/') ||
                ((lowerHref.includes('report') ||
                    lowerHref.includes('progress') ||
                    lowerHref.includes('completion') ||
                    lowerHref.includes('ubcompletion')) &&
                    /(진도|완료|progress|completion|report)/i.test(text));

            if (looksLikeReport) discovered.push(href);
        });

        discovered.forEach((href) => urls.add(href));

        const ubcompletionCandidates = [
            `/report/ubcompletion/progress.php?id=${courseId}`,
            `/report/ubcompletion/user_progress.php?id=${courseId}`,
            `/report/ubcompletion/user_progress_a.php?id=${courseId}`,
        ];

        for (const c of ubcompletionCandidates) {
            urls.add(new URL(c, location.origin).toString());
        }

        const hasDiscoveredProgress = discovered.some((href) =>
            href.includes('/report/progress/index.php'),
        );
        const hasDiscoveredCompletion = discovered.some((href) =>
            href.includes('/report/completion/index.php'),
        );

        if (E.reportPathSupport.progress || hasDiscoveredProgress) {
            urls.add(
                new URL(
                    `/report/progress/index.php?course=${courseId}`,
                    location.origin,
                ).toString(),
            );
            urls.add(
                new URL(
                    `/report/progress/index.php?id=${courseId}`,
                    location.origin,
                ).toString(),
            );
        }

        if (E.reportPathSupport.completion || hasDiscoveredCompletion) {
            urls.add(
                new URL(
                    `/report/completion/index.php?course=${courseId}`,
                    location.origin,
                ).toString(),
            );
            urls.add(
                new URL(
                    `/report/completion/index.php?id=${courseId}`,
                    location.origin,
                ).toString(),
            );
        }

        return [...urls];
    };

    E.parseStatusRowsFromReportHtml = function parseStatusRowsFromReportHtml(
        htmlText,
    ) {
        // 온라인출석부 테이블을 표준 형태로 변환해 반환:
        // - 주소/제목 기반 조회맵: 기존 강의 항목 보강용
        // - 행 목록: 과목 페이지에 강의 링크가 없을 때 리포트 기반 항목 생성용
        const doc = new DOMParser().parseFromString(htmlText, 'text/html');

        const byUrl = new Map();
        const byTitle = new Map();
        const rows = [];

        const inferStatusFromAttendanceText = (text) => {
            const t = E.cleanText(text).toLowerCase();
            if (!t) return 'UNKNOWN';

            if (/(출석|인정|완료|attend|present|o|y)/i.test(t)) return 'DONE';
            if (/(미출석|결석|미완료|absent|x|n)/i.test(t)) return 'TODO';
            return 'UNKNOWN';
        };

        doc.querySelectorAll(
            'table.user_progress_table tbody tr, table.user_progress_table tr, table.user_progress tbody tr, table.user_progress tr',
        ).forEach((row) => {
            const link = row.querySelector(
                'a[href*="/mod/"], a[href*="/vod/"]',
            );
            const rowText = E.cleanText(row.textContent);
            const cells = [...row.querySelectorAll('td')];
            if (!cells.length) return;

            const textLeftCell = row.querySelector('td.text-left');
            const titleFromCell = E.cleanText(
                textLeftCell?.querySelector('a')?.textContent ||
                    textLeftCell?.textContent,
            );

            const href = E.normalizeUrl(link?.href || '');
            const title = titleFromCell || E.extractActivityTitle(link);
            if (!href && !title) return;

            // 주차만 있고 강의명이 없는 행은 건너뜀
            if (!title || title === '-') return;

            // 온라인출석부 표: 요구시간과 총학습시간 + 출석 컬럼으로 상태 추정.
            const requiredTimeText = E.cleanText(
                row.querySelector('td.text-center.hidden-xs.hidden-sm')
                    ?.textContent,
            );
            const titleIdx = cells.findIndex((c) => c === textLeftCell);
            const totalTimeTextRaw =
                titleIdx >= 0
                    ? E.cleanText(cells[titleIdx + 2]?.textContent)
                    : E.cleanText(cells[3]?.textContent);
            const attendanceText =
                titleIdx >= 0
                    ? E.cleanText(cells[titleIdx + 3]?.textContent)
                    : E.cleanText(cells[4]?.textContent);

            const isMissingViewedTime =
                !totalTimeTextRaw ||
                totalTimeTextRaw === '&nbsp;' ||
                /^\s*-\s*/.test(totalTimeTextRaw);
            const totalTimeText = isMissingViewedTime
                ? '00:00'
                : totalTimeTextRaw;

            const statusFromTimes = E.inferStatusFromPlayTimes(
                requiredTimeText,
                totalTimeText,
            );
            const statusFromAttendance =
                inferStatusFromAttendanceText(attendanceText);
            const status =
                statusFromAttendance !== 'UNKNOWN'
                    ? statusFromAttendance
                    : statusFromTimes !== 'UNKNOWN'
                      ? statusFromTimes
                      : E.inferStatusFromText(rowText);

            const pct = E.extractProgressPercent(rowText);
            let meta;
            if (requiredTimeText || totalTimeTextRaw) {
                const viewed = isMissingViewedTime ? '00:00' : totalTimeTextRaw;
                const required = requiredTimeText || '-';
                meta = `학습: ${viewed} / ${required}`;
                if (attendanceText) meta += ` · 출석 ${attendanceText}`;
            } else if (typeof pct === 'number') {
                meta = `진도 ${pct}%`;
            } else if (
                /(완료|미완료|completed|incomplete|not completed)/i.test(
                    rowText,
                )
            ) {
                meta = rowText;
            }

            const payload = { status, meta };
            if (href) byUrl.set(href, payload);
            if (title) byTitle.set(E.canonicalTitle(title), payload);

            const weekMatch = title.match(/(\d+)\s*주차/);
            rows.push({
                title,
                url: href || '',
                section: weekMatch ? `${weekMatch[1]}주차` : undefined,
                status,
                meta,
            });
        });

        return { byUrl, byTitle, rows };
    };

    E.buildLectureItemsFromReportRows =
        function buildLectureItemsFromReportRows(
            rows,
            courseId,
            courseName,
            fallbackBase,
            courseIsNew = false,
        ) {
            // 리포트 행을 통합 아이템 모델로 변환.
            // 링크가 없는 행은 식별 가능한 대체 링크를 부여해 클릭/중복 제거가 가능하게 함.
            if (!Array.isArray(rows) || !rows.length) return [];

            const items = rows
                .filter((row) => row.title)
                .filter(
                    (row) => !/학생에게\s*보이지\s*않음|출결/i.test(row.title),
                )
                .map((row) => {
                    const stableUrl =
                        row.url ||
                        `${fallbackBase}&ecdash_item=${encodeURIComponent(
                            E.canonicalTitle(row.title),
                        )}`;

                    return {
                        id: E.makeId('LECTURE', courseId, row.title, stableUrl),
                        type: 'LECTURE',
                        courseId,
                        courseName,
                        courseIsNew: Boolean(courseIsNew),
                        title: row.title,
                        url: stableUrl,
                        section: row.section,
                        dueAt: undefined,
                        status: row.status || 'UNKNOWN',
                        meta: row.meta,
                    };
                });

            return E.dedupeItems(items);
        };

    E.collectActivityLinkCandidatesFromCourseView =
        function collectActivityLinkCandidatesFromCourseView(doc) {
            // 과목 페이지의 실제 활동 링크 목록을 수집해
            // 출석부 기반 아이템(링크 없음)과 제목 매칭할 때 사용.
            const candidates = [];
            const seen = new Set();
            const extractTitleFromNode = (node) => {
                if (!node) return '';
                const nameEl = node.querySelector(
                    '.instancename, .activityname',
                );
                if (!nameEl) return '';

                const clone = nameEl.cloneNode(true);
                clone
                    .querySelectorAll('.accesshide, .sr-only, .visually-hidden')
                    .forEach((el) => {
                        el.remove();
                    });
                return E.cleanText(clone.textContent);
            };

            const activityNodes = [
                ...doc.querySelectorAll(
                    // 점검 필요: 현재 테마/페이지 구조에 맞춰 조정할 활동 노드 셀렉터
                    'li.activity, .activity-item, li[class*="modtype_"], div.activity, .activityinstance, [class*="activityinstance"]',
                ),
            ];

            for (const node of activityNodes) {
                const signals = E.extractSignalsFromActivityNode(node);
                const sectionNode = node.closest(
                    'li.section, section[id^="section-"], .course-section',
                );
                const section = sectionNode
                    ? E.extractSectionName(sectionNode)
                    : undefined;

                const links = [...node.querySelectorAll('a[href]')];
                const closestLink = node.closest('a[href]');
                if (closestLink) links.push(closestLink);

                if (!links.length) {
                    const title = extractTitleFromNode(node);
                    if (!title) continue;

                    const key = `no-url::${E.canonicalTitle(title)}`;
                    if (seen.has(key)) continue;
                    seen.add(key);

                    candidates.push({
                        title,
                        url: '',
                        section,
                        dueAt: signals.dueAt,
                        meta: signals.meta,
                    });
                    continue;
                }

                for (const link of links) {
                    const href = E.normalizeUrl(link.href || '');
                    const title = E.extractActivityTitle(link);
                    if (!title) continue;

                    const looksLikeActivityHref =
                        href &&
                        (href.includes('/mod/') ||
                            href.includes('/vod/') ||
                            href.includes('/local/ubonline/'));

                    const key = `${href || 'no-url'}::${E.canonicalTitle(title)}`;
                    if (seen.has(key)) continue;
                    seen.add(key);

                    candidates.push({
                        title,
                        url: looksLikeActivityHref ? href : '',
                        section,
                        dueAt: signals.dueAt,
                        meta: signals.meta,
                    });
                }
            }

            return candidates;
        };

    E.rankLectureUrl = function rankLectureUrl(url) {
        const normalized = E.normalizeUrl(url || '');
        if (!normalized) return 0;

        const lower = normalized.toLowerCase();
        if (lower.includes('/mod/vod/viewer.php')) return 5;
        if (lower.includes('/mod/vod/view.php')) return 4;
        if (lower.includes('/mod/vod/index.php')) return 3;
        if (lower.includes('/mod/')) return 2;
        if (lower.includes('/course/view.php')) return 1;
        return 0;
    };

    E.isLectureUrlUnresolved = function isLectureUrlUnresolved(url) {
        const normalized = E.normalizeUrl(url || '');
        if (!normalized) return true;

        const lower = normalized.toLowerCase();
        if (lower.includes('ecdash_item=')) return true;
        if (lower.includes('/report/ubcompletion/')) return true;
        if (lower.includes('/report/progress/')) return true;
        if (lower.includes('/report/completion/')) return true;
        if (lower.includes('/course/view.php')) return true;
        if (lower.includes('/mod/vod/index.php')) return true;
        if (lower.includes('/mod/vod/view.php')) return true;
        return false;
    };

    E.collectVodIndexUrlsFromCourseView =
        function collectVodIndexUrlsFromCourseView(doc, courseId) {
            const urls = new Set();

            doc.querySelectorAll('a[href*="/mod/vod/index.php"]').forEach(
                (a) => {
                    const href = E.normalizeUrl(a.href);
                    if (href) urls.add(href);
                },
            );

            const hasVodHint = Boolean(
                doc.querySelector(
                    'a[href*="/mod/vod/"], li[class*="modtype_vod"], li[class*="modtype_video"], img[src*="/vod/"]',
                ),
            );
            if (hasVodHint || courseId) {
                urls.add(
                    new URL(
                        `/mod/vod/index.php?id=${courseId}`,
                        location.origin,
                    ).toString(),
                );
            }

            return [...urls];
        };

    E.extractVodViewerUrlFromOnclick = function extractVodViewerUrlFromOnclick(
        onclickText,
        baseUrl,
    ) {
        const source = E.cleanText(onclickText || '').replace(/&amp;/g, '&');
        if (!source) return '';

        const match = source.match(/window\.open\(\s*['"]([^'"]+)['"]/i);
        if (!match || !match[1]) return '';

        try {
            return new URL(match[1], baseUrl || location.origin).toString();
        } catch {
            return '';
        }
    };

    E.parseVodIndexCandidatesFromHtml =
        function parseVodIndexCandidatesFromHtml(htmlText, indexUrl) {
            // 점검 필요: 현재 테마/페이지 구조에 맞춰 조정할 동영상 인덱스 테이블 셀렉터
            const doc = new DOMParser().parseFromString(htmlText, 'text/html');
            const rows = [
                ...doc.querySelectorAll(
                    'table.generaltable.mod_index tbody tr, table.mod_index tbody tr',
                ),
            ];
            if (!rows.length) return [];

            const candidates = [];
            let lastSection;

            for (const row of rows) {
                const sectionText = E.cleanText(
                    row.querySelector('td.c0')?.textContent,
                );
                if (sectionText) lastSection = sectionText;

                const link = row.querySelector('td.c1 a[href]');
                const title = E.cleanText(link?.textContent);
                if (!title) continue;

                const rawHref = E.cleanText(link?.getAttribute('href') || '');
                let resolvedHref = '';
                if (rawHref) {
                    try {
                        resolvedHref = new URL(rawHref, indexUrl).toString();
                    } catch {
                        resolvedHref = '';
                    }
                }

                const viewerUrl = E.extractVodViewerUrlFromOnclick(
                    link?.getAttribute('onclick'),
                    indexUrl,
                );
                const bestUrl = E.normalizeUrl(viewerUrl || resolvedHref);
                if (!bestUrl) continue;

                candidates.push({
                    title,
                    url: bestUrl,
                    section: lastSection,
                });
            }

            return candidates;
        };

    E.collectVodLectureLinkCandidates =
        async function collectVodLectureLinkCandidates(doc, courseId) {
            const vodIndexUrls = E.collectVodIndexUrlsFromCourseView(
                doc,
                courseId,
            );
            if (!vodIndexUrls.length) return [];

            const chunked = await E.mapWithConcurrency(
                vodIndexUrls,
                Math.min(2, vodIndexUrls.length),
                async (indexUrl) => {
                    try {
                        const html = await E.fetchHtml(indexUrl);
                        return E.parseVodIndexCandidatesFromHtml(
                            html,
                            indexUrl,
                        );
                    } catch (err) {
                        const msg = String(err?.message || err || '');
                        const is404 = msg.includes('Fetch failed 404');
                        if (!is404) {
                            console.warn(
                                '[ECDASH] vod index crawl failed:',
                                indexUrl,
                                err,
                            );
                        }
                        return [];
                    }
                },
            );

            return chunked.flat();
        };

    E.resolveLectureUrlsByCandidates = function resolveLectureUrlsByCandidates(
        items,
        candidates,
        fallbackCourseUrl,
    ) {
        // 매칭 전략:
        // 1) 정규화 제목 정확 일치
        // 2) 부분 일치
        // 3) 실패 시 과목 페이지 링크로 대체
        if (!Array.isArray(items) || !items.length) return [];

        const normalizedCandidates = (candidates || [])
            .filter((c) => c?.title)
            .map((c) => ({
                ...c,
                key: E.canonicalTitle(c.title),
                rank: E.rankLectureUrl(c.url),
            }));

        const mergeMeta = (base, extra) => {
            const left = E.cleanText(base || '');
            const right = E.cleanText(extra || '');
            if (!left) return right || undefined;
            if (!right) return left || undefined;
            if (left.includes(right)) return left;
            if (right.includes(left)) return right;
            return `${left} · ${right}`;
        };

        const pickBestUrlCandidate = (hits) => {
            if (!Array.isArray(hits) || !hits.length) return undefined;
            const withUrl = hits.filter((hit) =>
                Boolean(E.normalizeUrl(hit.url)),
            );
            if (!withUrl.length) return undefined;
            return withUrl.reduce((best, current) => {
                if (!best) return current;
                return current.rank > best.rank ? current : best;
            }, undefined);
        };

        const pickBestMetaCandidate = (hits) => {
            if (!Array.isArray(hits) || !hits.length) return undefined;
            return hits.find(
                (hit) => hit?.dueAt || E.cleanText(hit?.meta || ''),
            );
        };

        return items.map((item) => {
            const currentUrl = E.normalizeUrl(item.url || '');
            const unresolved = E.isLectureUrlUnresolved(currentUrl);
            const currentRank = E.rankLectureUrl(currentUrl);

            const itemKey = E.canonicalTitle(item.title);
            let hits = normalizedCandidates.filter((c) => c.key === itemKey);
            if (!hits.length) {
                hits = normalizedCandidates.filter(
                    (c) => c.key.includes(itemKey) || itemKey.includes(c.key),
                );
            }

            const urlHit = pickBestUrlCandidate(hits);
            const metaHit = pickBestMetaCandidate(hits) || urlHit;
            const mergedBase = {
                ...item,
                section: item.section || urlHit?.section || metaHit?.section,
                dueAt: item.dueAt ?? metaHit?.dueAt ?? urlHit?.dueAt,
                meta: mergeMeta(item.meta, metaHit?.meta || urlHit?.meta),
            };

            if (urlHit?.url && (unresolved || urlHit.rank > currentRank)) {
                return {
                    ...mergedBase,
                    url: urlHit.url,
                };
            }

            if (unresolved) {
                return {
                    ...mergedBase,
                    url: fallbackCourseUrl || item.url,
                };
            }

            return mergedBase;
        });
    };

    E.applyReportStatus = function applyReportStatus(items, reportMap) {
        return items.map((item) => {
            const hitByUrl = reportMap.byUrl.get(E.normalizeUrl(item.url));
            const hitByTitle = reportMap.byTitle.get(
                E.canonicalTitle(item.title),
            );
            const hit = hitByUrl || hitByTitle;
            if (!hit) return item;

            const status = hit.status !== 'UNKNOWN' ? hit.status : item.status;
            const meta = item.meta || hit.meta;

            return {
                ...item,
                status,
                meta,
            };
        });
    };

    E.extractDueMetaFromDoc = function extractDueMetaFromDoc(doc) {
        // 점검 필요: 현재 테마/페이지 구조에 맞춰 조정할 상세 페이지 마감/기간 셀렉터
        const texts = [
            ...E.collectTextBySelectors(doc, [
                '[data-region="activity-dates"]',
                '.activity-dates',
                '.availabilityinfo',
                '.box.generalbox',
                '.description',
                '.activity-information',
                '.forumintro',
            ]),
        ];

        if (!texts.length) {
            const bodyText = E.cleanText(doc.body?.textContent || '');
            if (bodyText) texts.push(bodyText.slice(0, 2000));
        }

        return {
            dueAt: E.pickDueAtFromTexts(texts),
            meta: E.pickMetaFromTexts(texts),
        };
    };

    E.inferForumParticipationStatus = function inferForumParticipationStatus(
        doc,
    ) {
        const text = E.cleanText(doc.body?.textContent || '');
        if (!text) return 'UNKNOWN';

        if (
            /(아직\s*참여하지|작성한\s*글이\s*없|게시물\s*없음|you\s+have\s+not\s+posted)/i.test(
                text,
            )
        ) {
            return 'TODO';
        }

        if (
            /(내\s*글|내가\s*시작한\s*토론|게시물\s*\d+\s*개|you\s+have\s+posted)/i.test(
                text,
            )
        ) {
            return 'DONE';
        }

        return 'UNKNOWN';
    };

    E.enrichForumItems = async function enrichForumItems(items, limit = 1) {
        return await E.mapWithConcurrency(items, limit, async (item) => {
            try {
                const html = await E.fetchHtml(item.url);
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const detail = E.extractDueMetaFromDoc(doc);
                const participation = E.inferForumParticipationStatus(doc);

                return {
                    ...item,
                    dueAt: item.dueAt ?? detail.dueAt,
                    status:
                        item.status === 'UNKNOWN' && participation !== 'UNKNOWN'
                            ? participation
                            : item.status,
                    meta: item.meta || detail.meta,
                };
            } catch (err) {
                console.warn(
                    '[ECDASH] forum detail crawl failed:',
                    item.url,
                    err,
                );
                return item;
            }
        });
    };

    E.enrichResourceItems = async function enrichResourceItems(
        items,
        limit = 1,
    ) {
        return await E.mapWithConcurrency(items, limit, async (item) => {
            try {
                const html = await E.fetchHtml(item.url);
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const detail = E.extractDueMetaFromDoc(doc);

                const completionTexts = E.collectTextBySelectors(doc, [
                    '.completion-info',
                    '.activity-completion',
                    '[data-region*="completion"]',
                ]);
                const completionStatus = E.inferStatusFromText(
                    completionTexts.join(' | '),
                );

                return {
                    ...item,
                    dueAt: item.dueAt ?? detail.dueAt,
                    status:
                        item.status === 'UNKNOWN' &&
                        completionStatus !== 'UNKNOWN'
                            ? completionStatus
                            : item.status,
                    meta: item.meta || detail.meta,
                };
            } catch (err) {
                console.warn(
                    '[ECDASH] resource detail crawl failed:',
                    item.url,
                    err,
                );
                return item;
            }
        });
    };

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
                meta: prev.meta || item.meta,
                section: prev.section || item.section,
            });
        }

        return [...map.values()];
    };

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
                for (const reportUrl of reportUrls) {
                    try {
                        const reportHtml = await E.fetchHtml(reportUrl);
                        const reportMap =
                            E.parseStatusRowsFromReportHtml(reportHtml);
                        lectureItems = E.applyReportStatus(
                            lectureItems,
                            reportMap,
                        );

                        if (
                            Array.isArray(reportMap.rows) &&
                            reportMap.rows.length
                        ) {
                            const fallbackBase = new URL(
                                `/report/ubcompletion/progress.php?id=${courseId}`,
                                location.origin,
                            ).toString();

                            const fromReport =
                                E.buildLectureItemsFromReportRows(
                                    reportMap.rows,
                                    courseId,
                                    normalizedCourseName,
                                    fallbackBase,
                                    normalizedCourseIsNew,
                                );
                            const courseViewUrl = new URL(
                                `/course/view.php?id=${courseId}`,
                                location.origin,
                            ).toString();
                            const resolvedFromReport =
                                E.resolveLectureUrlsByCandidates(
                                    fromReport,
                                    lectureLinkCandidates,
                                    courseViewUrl,
                                );

                            lectureItems = E.dedupeItems([
                                ...lectureItems,
                                ...resolvedFromReport,
                            ]);
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

    E.crawlAllItemsFromDashboardSMU =
        async function crawlAllItemsFromDashboardSMU(coursesInput) {
            const courses = Array.isArray(coursesInput)
                ? E.normalizeCourseCache(coursesInput)
                : E.collectCoursesFromDashboardSMU();
            if (!courses.length) return [];

            E.setBadge?.('CRAWL');
            E.setSub?.(
                `과목 ${courses.length}개에서 과제/강의/토론/자료 정보를 가져오는 중…`,
            );

            const perCourse = await E.mapWithConcurrency(
                courses,
                E.constants.CRAWL_CONCURRENCY,
                async (course) => {
                    try {
                        return await E.crawlCourseItems(course);
                    } catch (err) {
                        console.warn(
                            `[ECDASH] course crawl skipped. courseId=${course.courseId}`,
                            err,
                        );
                        return [];
                    }
                },
            );

            return E.dedupeItems(perCourse.flat());
        };
})();
