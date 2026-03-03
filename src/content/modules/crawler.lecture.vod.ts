// @ts-nocheck
(() => {
    // VOD 인덱스/뷰어 링크 복원 전용 모듈.
    const E = window.__ECDASH__;
    // course/view 문서에서 VOD 인덱스 경로 후보를 만든다.
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

    // 동영상 인덱스 표를 파싱해 강의명-뷰어URL 후보 목록으로 변환한다.
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

    // 여러 VOD 인덱스 페이지를 병렬 조회해 후보를 합친다.
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
})();
