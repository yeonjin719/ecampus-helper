// @ts-nocheck
(() => {
    // 메타 문자열 정규화 유틸: 중복 메타 병합 시 형식을 통일한다.
    const E = window.__ECDASH__;
    // 여러 셀렉터에서 텍스트만 모아 공통 파서 입력으로 사용한다.
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

    E.normalizeDurationText = function normalizeDurationText(value) {
        const text = E.cleanText(value || '');
        if (!text || text === '-' || text === '&nbsp;') return '';
        const match = text.match(/\d{1,3}:\d{2}(?::\d{2})?/);
        return match?.[0] || text;
    };

    E.normalizeAttendanceMeta = function normalizeAttendanceMeta(value) {
        const text = E.cleanText(value || '');
        if (!text) return '';

        const pct = text.match(/(\d{1,3})\s*%/);
        if (pct?.[1]) return `출석 ${pct[1]}%`;

        if (/^(?:출석|attendance)\b/i.test(text)) {
            return text.replace(/^(?:attendance)\s*/i, '출석 ');
        }

        if (/(출석|인정|완료|attend|present|o|y)/i.test(text)) return '출석 완료';
        if (/(미출석|결석|미완료|absent|x|n)/i.test(text)) return '출석 미완료';

        return `출석 ${text}`;
    };

    // 학습 시간/출석/기간 항목을 정규화해 동일한 의미의 문자열을 같은 키로 취급한다.
    E.normalizeMetaPart = function normalizeMetaPart(value) {
        const part = E.cleanText(value || '');
        if (!part) return '';

        if (/^학습\s*:/i.test(part)) {
            const times = part.match(/\d{1,3}:\d{2}(?::\d{2})?/g) || [];
            if (times.length >= 2) return `학습: ${times[0]} / ${times[1]}`;
            if (times.length === 1) return `학습: ${times[0]}`;
            return part.replace(/^학습\s*:\s*/i, '학습: ');
        }

        if (/^(?:출석|attendance)\b/i.test(part)) {
            return E.normalizeAttendanceMeta(part);
        }

        if (/^(?:기간|period)\s*(?::|：|\s|$)/i.test(part)) {
            const rest = E.cleanText(
                part.replace(/^(?:기간|period)\s*(?::|：)?\s*/i, ''),
            );
            return rest ? `기간: ${rest}` : '기간:';
        }

        return part;
    };

    E.metaPartKind = function metaPartKind(part) {
        if (/^학습\s*:/i.test(part)) return 'study';
        if (/^출석\b/i.test(part)) return 'attendance';
        if (/^(?:기간|period)\s*:/i.test(part)) return 'period';
        return `text:${E.canonicalTitle(part)}`;
    };

    E.metaPartScore = function metaPartScore(kind, part) {
        const text = E.cleanText(part || '');
        if (!text) return 0;

        if (kind === 'study') {
            const timeMatches = text.match(/\d{1,3}:\d{2}(?::\d{2})?/g) || [];
            return timeMatches.length >= 2 ? 3 : timeMatches.length === 1 ? 2 : 1;
        }
        if (kind === 'attendance') {
            if (/\d{1,3}\s*%/.test(text)) return 3;
            if (/(완료|미완료)/.test(text)) return 2;
            return 1;
        }
        if (kind === 'period') {
            if (/\d{4}[^~\-]*[~\-][^~\-]*\d{4}/.test(text)) return 3;
            if (/\d{4}\s*[.\-/]\s*\d{1,2}\s*[.\-/]\s*\d{1,2}/.test(text))
                return 2;
            return 1;
        }
        return text.length > 40 ? 2 : 1;
    };

    // 두 메타 문자열을 병합하면서 항목별 우선순위와 중복 제거를 적용한다.
    E.mergeMetaText = function mergeMetaText(primary, secondary) {
        const partsByKey = new Map();
        const order = [];

        const upsert = (raw, preferIncoming = false) => {
            const normalized = E.normalizeMetaPart(raw);
            if (!normalized) return;
            const key = E.metaPartKind(normalized);
            const prev = partsByKey.get(key);
            if (!prev) {
                partsByKey.set(key, normalized);
                order.push(key);
                return;
            }

            const nextScore = E.metaPartScore(key, normalized);
            const prevScore = E.metaPartScore(key, prev);
            if (nextScore > prevScore || (preferIncoming && nextScore === prevScore)) {
                partsByKey.set(key, normalized);
            }
        };

        const ingest = (value, preferIncoming = false) => {
            const source = E.cleanText(value || '');
            if (!source) return;
            source
                .split(/\s*[·\n\r]+\s*/g)
                .map((part) => E.cleanText(part))
                .filter(Boolean)
                .forEach((part) => upsert(part, preferIncoming));
        };

        ingest(primary, false);
        ingest(secondary, true);

        const merged = order
            .map((key) => partsByKey.get(key))
            .filter(Boolean)
            .join(' · ');

        return merged || undefined;
    };
})();
