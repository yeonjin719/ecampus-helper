import React from 'react';
import type { DashboardItem, DashboardRuntime } from '../types';
import { CourseGroupSection } from './CourseGroupSection';

interface DashboardContentProps {
    runtime: DashboardRuntime;
    hasItems: boolean;
    loading: boolean;
    loadingMessage: string;
    filteredItems: DashboardItem[];
    groupEntries: Array<[string, DashboardItem[]]>;
    courseOpenMap: Record<string, boolean>;
    onToggleCourse: (courseName: string) => void;
}

export function DashboardContent({
    runtime,
    hasItems,
    loading,
    loadingMessage,
    filteredItems,
    groupEntries,
    courseOpenMap,
    onToggleCourse,
}: DashboardContentProps) {
    const now = Date.now();
    const dueSoonThreshold = now + 3 * 24 * 60 * 60 * 1000;
    const dueSoonCount = filteredItems.filter(
        (item) =>
            item.type !== 'NOTICE' &&
            typeof item.dueAt === 'number' &&
            item.dueAt >= now &&
            item.dueAt <= dueSoonThreshold,
    ).length;
    const overdueCount = filteredItems.filter(
        (item) =>
            item.type !== 'NOTICE' &&
            typeof item.dueAt === 'number' &&
            item.dueAt < now,
    ).length;

    if (!hasItems) {
        if (loading) {
            return (
                <div className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-3 text-[12px] leading-5 text-zinc-600 shadow-[0_4px_10px_rgba(0,0,0,0.04)]">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
                    <span>{loadingMessage || '데이터를 가져오는 중...'}</span>
                </div>
            );
        }

        return (
            <div className="rounded-xl border border-zinc-300 bg-white px-3 py-3 text-[12px] leading-5 text-zinc-600 shadow-[0_4px_10px_rgba(0,0,0,0.04)]">
                {runtime.isDashboardSMU?.()
                    ? '데이터를 아직 가져오지 못했어요. ↻ 새로고침을 눌러보세요.'
                    : '대시보드 화면에서 과목 목록을 찾은 뒤, 활동을 크롤링해요. (대시보드로 이동해 주세요)'}
            </div>
        );
    }

    if (!filteredItems.length) {
        return (
            <div className="rounded-xl border border-zinc-300 bg-white px-3 py-3 text-[12px] leading-5 text-zinc-600 shadow-[0_4px_10px_rgba(0,0,0,0.04)]">
                조건에 맞는 항목이 없어요.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <section className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 shadow-[0_4px_10px_rgba(0,0,0,0.04)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-zinc-700">
                        현재 필터 기준 총 {filteredItems.length}개 항목
                    </p>
                    <div className="flex items-center gap-1.5 text-[12px]">
                        <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
                            3일 이내 {dueSoonCount}개
                        </span>
                        <span className="inline-flex rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">
                            마감 지남 {overdueCount}개
                        </span>
                    </div>
                </div>
            </section>

            {groupEntries.map(([courseName, items]) => (
                <CourseGroupSection
                    key={courseName}
                    courseName={courseName}
                    items={items}
                    isOpen={courseOpenMap[courseName] ?? true}
                    runtime={runtime}
                    onToggle={() => {
                        onToggleCourse(courseName);
                    }}
                />
            ))}
        </div>
    );
}
