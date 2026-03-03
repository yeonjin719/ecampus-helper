import type { HiddenItemPreview } from '../components/dashboardShell/types';
import type { DashboardItem, DashboardRuntime } from '../types';
import { cleanText, normalizeCourseName } from './dashboardUi';

// 숨김 항목 ID 배열을 정규화(공백 제거/중복 제거/최대 길이 제한)한다.
export function normalizeHiddenItemIds(value: unknown) {
    if (!Array.isArray(value)) return [];

    return [...new Set(value.map((id) => cleanText(id)).filter(Boolean))].slice(
        -1000,
    );
}

// 숨김 목록 카드에서 보여줄 마감 라벨 포맷을 통일한다.
export function formatHiddenItemDueLabel(dueAt?: number) {
    if (typeof dueAt !== 'number') return '';
    return `마감 ${new Date(dueAt).toLocaleString(undefined, {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    })}`;
}

// 숨김된 ID 목록을 사용자에게 보여줄 프리뷰 모델로 변환한다.
export function buildHiddenItemPreviews(
    runtime: DashboardRuntime,
    items: DashboardItem[],
    hiddenItemIds: string[],
): HiddenItemPreview[] {
    const itemMap = new Map(items.map((item) => [cleanText(item.id), item]));

    return hiddenItemIds.map((hiddenItemId) => {
        const item = itemMap.get(hiddenItemId);
        if (!item) {
            return {
                id: hiddenItemId,
                title: '현재 데이터에서 찾을 수 없는 항목',
                courseName: '과목 정보 없음',
                typeLabel: '유형 미상',
                statusLabel: '목록에서 사라짐',
                dueLabel: '',
            };
        }

        const statusLabelRaw = cleanText(
            runtime.statusLabel?.(item.status) || item.status,
        );

        return {
            id: hiddenItemId,
            title: cleanText(item.title) || '(제목 없음)',
            courseName:
                normalizeCourseName(item.courseName) ||
                cleanText(item.courseName) ||
                '과목 미상',
            typeLabel: cleanText(runtime.TYPE_LABEL?.[item.type] || item.type),
            statusLabel: /상태\s*미상|unknown/i.test(statusLabelRaw)
                ? '상태 미상'
                : statusLabelRaw,
            dueLabel: formatHiddenItemDueLabel(item.dueAt),
        };
    });
}
