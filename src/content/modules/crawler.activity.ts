// @ts-nocheck
(() => {
    // 과목 페이지 활동 블록에서 기본 아이템(강의/과제/토론/자료)을 추출한다.
    const E = window.__ECDASH__;
    // 섹션 제목 후보를 순서대로 탐색해 주차/단원 텍스트를 얻는다.
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

    // 링크 내부 보조 텍스트를 제거해 사람이 보는 활동명만 남긴다.
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

    // URL/클래스/제목 패턴을 이용해 활동 유형을 분류한다.
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

    // 활동 카드에서 상태/마감/메타 정보를 한 번에 추출한다.
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

    // course/view 문서 전체를 순회해 대시보드 아이템 배열을 만든다.
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
})();
