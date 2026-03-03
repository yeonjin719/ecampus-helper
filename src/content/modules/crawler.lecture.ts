// @ts-nocheck
(() => {
    // 강의 링크 후보 수집/해결 전용 모듈.
    const E = window.__ECDASH__;
    // 과목 본문에서 활동 제목-링크 후보를 최대한 많이 모은다.
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
    // 리포트 기반 임시 URL을 실제 강의 URL로 치환하고 메타를 보강한다.
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
                meta: E.mergeMetaText(item.meta, metaHit?.meta || urlHit?.meta),
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
})();
