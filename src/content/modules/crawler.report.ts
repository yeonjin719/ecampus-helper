// @ts-nocheck
(() => {
    // 진도/완료 리포트 파싱 전용 모듈: 출석부 표를 대시보드 모델로 변환한다.
    const E = window.__ECDASH__;
    // 과목 페이지에서 접근 가능한 리포트 URL 후보를 수집한다.
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

    // 리포트 HTML을 상태 조회맵(byUrl/byTitle)과 행 목록(rows)으로 정규화한다.
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
            const normalizedRequiredTime = E.normalizeDurationText(requiredTimeText);
            const normalizedViewedTime = E.normalizeDurationText(totalTimeTextRaw);
            const normalizedAttendance =
                E.normalizeAttendanceMeta(attendanceText);

            const isMissingViewedTime =
                !totalTimeTextRaw ||
                totalTimeTextRaw === '&nbsp;' ||
                /^\s*-\s*/.test(totalTimeTextRaw);
            const totalTimeText = isMissingViewedTime
                ? '00:00'
                : normalizedViewedTime || totalTimeTextRaw;

            const statusFromTimes = E.inferStatusFromPlayTimes(
                normalizedRequiredTime || requiredTimeText,
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
                const viewed = isMissingViewedTime
                    ? '00:00'
                    : normalizedViewedTime || totalTimeTextRaw;
                const required = normalizedRequiredTime || requiredTimeText || '-';
                meta = `학습: ${viewed} / ${required}`;
                if (normalizedAttendance) meta += ` · ${normalizedAttendance}`;
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

    // 리포트 행을 클릭 가능한 강의 아이템으로 변환한다.
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
    // 기존 강의 아이템에 리포트 기반 상태/메타를 병합한다.
    E.applyReportStatus = function applyReportStatus(items, reportMap) {
        return items.map((item) => {
            const hitByUrl = reportMap.byUrl.get(E.normalizeUrl(item.url));
            const hitByTitle = reportMap.byTitle.get(
                E.canonicalTitle(item.title),
            );
            const hit = hitByUrl || hitByTitle;
            if (!hit) return item;

            const status = hit.status !== 'UNKNOWN' ? hit.status : item.status;
            const meta = E.mergeMetaText(hit.meta, item.meta);

            return {
                ...item,
                status,
                meta,
            };
        });
    };
})();
