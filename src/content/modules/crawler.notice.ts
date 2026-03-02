// @ts-nocheck
(() => {
    const E = window.__ECDASH__;
    if (!E) return;

    // 과목 상세 페이지에서 과목 범위의 공지 활동만 수집.
    E.collectUbboardCandidatesFromCourseView =
        function collectUbboardCandidatesFromCourseView(doc) {
            const out = [];
            const seen = new Set();

            const sectionSelector =
                'li.section, section[id^="section-"], .course-section';
            const ubboardActivitySelector = [
                'li.activity.modtype_ubboard',
                'li.modtype_ubboard',
                '.activity-item.modtype_ubboard',
                'div.activity.modtype_ubboard',
                'li[class*="modtype_ubboard"]',
            ].join(', ');

            let sectionNodes = [...doc.querySelectorAll(sectionSelector)];
            if (!sectionNodes.length) {
                const contentRoot =
                    doc.querySelector('#region-main, #page-content, main') ||
                    doc.body;
                sectionNodes = [contentRoot];
            }

            for (const sectionNode of sectionNodes) {
                const section = E.extractSectionName(sectionNode);
                const activityNodes = [
                    ...sectionNode.querySelectorAll(ubboardActivitySelector),
                ];

                for (const node of activityNodes) {
                    const link = node.querySelector(
                        'a[href*="/mod/ubboard/view.php"]',
                    );
                    const href = E.normalizeUrl(link?.href || '');
                    if (!href || seen.has(href)) continue;

                    const boardTitle =
                        E.extractActivityTitle(link) ||
                        E.cleanText(link?.textContent) ||
                        '공지사항';

                    seen.add(href);
                    out.push({
                        url: href,
                        boardTitle,
                        section,
                    });
                }
            }

            return out;
        };

    E.parseUbboardItemsFromHtml = function parseUbboardItemsFromHtml(
        htmlText,
        courseId,
        courseName,
        courseIsNew = false,
        boardContext = {},
    ) {
        const doc = new DOMParser().parseFromString(htmlText, 'text/html');
        const rows = [
            ...doc.querySelectorAll(
                'table.ubboard_table tbody tr, table.table-hover tbody tr',
            ),
        ];
        if (!rows.length) return [];

        const boardTitle =
            E.cleanText(boardContext.boardTitle) ||
            E.cleanText(
                doc.querySelector('.page-header-headings h1, .ubboard h3, h1')
                    ?.textContent,
            ) ||
            '공지사항';
        const section = E.cleanText(boardContext.section) || boardTitle;

        const items = [];
        const seen = new Set();
        const limitedRows = rows.slice(0, 12);

        for (const row of limitedRows) {
            const link = row.querySelector(
                'td:nth-child(2) a[href], a[href*="/mod/ubboard/article.php"]',
            );
            const title = E.cleanText(link?.textContent);
            const url = E.normalizeUrl(link?.href || '');
            if (!title || !url || seen.has(url)) continue;

            const cells = [...row.querySelectorAll('td')];
            const writer = E.cleanText(
                cells[2]?.textContent ||
                    row.querySelector('td:nth-child(3)')?.textContent,
            );
            const dateText = E.cleanText(
                cells[3]?.textContent ||
                    row.querySelector('td:nth-child(4)')?.textContent,
            );
            const views = E.cleanText(
                cells[4]?.textContent ||
                    row.querySelector('td:nth-child(5)')?.textContent,
            );

            const metaParts = [];
            if (writer) metaParts.push(`작성자 ${writer}`);
            if (dateText) metaParts.push(`작성일 ${dateText}`);
            if (views) metaParts.push(`조회 ${views}`);

            items.push({
                id: E.makeId('NOTICE', courseId, title, url),
                type: 'NOTICE',
                courseId,
                courseName,
                courseIsNew: Boolean(courseIsNew),
                title,
                url,
                section,
                dueAt: undefined,
                status: 'UNKNOWN',
                meta: metaParts.length ? metaParts.join(' · ') : undefined,
            });

            seen.add(url);
        }

        return items;
    };

    E.collectNoticeItemsFromCourseView = async function collectNoticeItemsFromCourseView(
        courseDoc,
        courseId,
        courseName,
        courseIsNew = false,
    ) {
        const boards = E.collectUbboardCandidatesFromCourseView(courseDoc);
        if (!boards.length) return [];

        const chunked = await E.mapWithConcurrency(
            boards,
            Math.min(2, boards.length),
            async (board) => {
                try {
                    const html = await E.fetchHtml(board.url);
                    return E.parseUbboardItemsFromHtml(
                        html,
                        courseId,
                        courseName,
                        courseIsNew,
                        board,
                    );
                } catch (err) {
                    console.warn('[ECDASH] ubboard crawl failed:', board.url, err);
                    return [];
                }
            },
        );

        return E.dedupeItems(chunked.flat());
    };
})();
