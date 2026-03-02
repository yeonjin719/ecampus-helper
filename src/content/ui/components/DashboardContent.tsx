import React from 'react';
import type { DashboardItem, DashboardRuntime } from '../types';
import { CourseGroupSection } from './CourseGroupSection';

interface DashboardContentProps {
    runtime: DashboardRuntime;
    hasItems: boolean;
    loading: boolean;
    loadingMessage: string;
    hiddenItemCount: number;
    filteredItems: DashboardItem[];
    groupEntries: Array<[string, DashboardItem[]]>;
    courseOpenMap: Record<string, boolean>;
    onToggleCourse: (courseName: string) => void;
    onHideItem: (itemId: string) => void;
}

export function DashboardContent({
    runtime,
    hasItems,
    loading,
    loadingMessage,
    hiddenItemCount,
    filteredItems,
    groupEntries,
    courseOpenMap,
    onToggleCourse,
    onHideItem,
}: DashboardContentProps) {
    const onDashboardPage =
        runtime.isDashboardPage?.() ?? runtime.isDashboardSMU?.();
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
                <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-[12px] leading-5 text-zinc-600 shadow-[0_4px_10px_rgba(15,23,42,0.05)]">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
                    <span>{loadingMessage || '불러오는 중...'}</span>
                </div>
            );
        }

        return (
            <div className="flex h-[40px] items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-center text-[12px] leading-5 text-zinc-600 shadow-[0_4px_10px_rgba(15,23,42,0.05)]">
                {onDashboardPage
                    ? '데이터가 없어요. ↻ 새로고침'
                    : '대시보드에서 사용 가능해요.'}
            </div>
        );
    }

    if (!filteredItems.length) {
        return (
            <div className="flex h-[40px] items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-center text-[12px] leading-5 text-zinc-600 shadow-[0_4px_10px_rgba(15,23,42,0.05)]">
                조건에 맞는 항목이 없어요.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <section className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 shadow-[0_4px_10px_rgba(15,23,42,0.05)]">
                <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                    <span className="inline-flex rounded-full border border-zinc-300 bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-700">
                        총 {filteredItems.length}
                    </span>
                    <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">
                        임박 {dueSoonCount}
                    </span>
                    <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-semibold text-rose-600">
                        지남 {overdueCount}
                    </span>
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
                    onHideItem={onHideItem}
                />
            ))}
        </div>
    );
}
