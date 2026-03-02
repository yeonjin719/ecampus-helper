import React from 'react';
import type { DashboardItem, DashboardRuntime } from '../types';
import { DashboardItemCard } from './DashboardItemCard';

interface CourseGroupSectionProps {
    courseName: string;
    items: DashboardItem[];
    isOpen: boolean;
    runtime: DashboardRuntime;
    onToggle: () => void;
}

export function CourseGroupSection({
    courseName,
    items,
    isOpen,
    runtime,
    onToggle,
}: CourseGroupSectionProps) {
    const now = Date.now();
    const dueSoonThreshold = now + 3 * 24 * 60 * 60 * 1000;
    const dueSoonCount = items.filter(
        (item) =>
            item.type !== 'NOTICE' &&
            typeof item.dueAt === 'number' &&
            item.dueAt >= now &&
            item.dueAt <= dueSoonThreshold,
    ).length;
    const overdueCount = items.filter(
        (item) =>
            item.type !== 'NOTICE' &&
            typeof item.dueAt === 'number' &&
            item.dueAt < now,
    ).length;
    const isNewCourse = items.some(
        (item) =>
            Boolean(item.courseIsNew) ||
            /\bnew\b\s*$/i.test(String(item.courseName || '')),
    );

    return (
        <article className="mb-3 last:mb-0">
            <button
                type="button"
                className="mb-2 flex w-full items-center justify-between rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-left text-[12px] text-zinc-600 shadow-[0_5px_12px_rgba(0,0,0,0.05)] transition hover:border-zinc-500 hover:bg-zinc-50"
                aria-expanded={isOpen}
                onClick={onToggle}
            >
                <div className="min-w-0 pr-2">
                    <span className="inline-flex max-w-full items-center gap-1.5 text-[14px] font-semibold text-zinc-900">
                        {isNewCourse && (
                            <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500"
                                aria-hidden="true"
                            />
                        )}
                        <span className="truncate">{courseName}</span>
                    </span>
                    <span className="mt-0.5 block text-[12px] text-zinc-500">
                        과목별 활동 현황
                    </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-[12px] font-semibold text-zinc-700">
                        {items.length}개
                    </span>
                    {dueSoonCount > 0 && (
                        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[12px] font-semibold text-amber-800">
                            임박 {dueSoonCount}
                        </span>
                    )}
                    {overdueCount > 0 && (
                        <span className="rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[12px] font-semibold text-rose-700">
                            지남 {overdueCount}
                        </span>
                    )}
                    <span className="w-4 text-center text-[12px] text-zinc-600">
                        {isOpen ? '▾' : '▸'}
                    </span>
                </div>
            </button>

            {isOpen && (
                <div className="space-y-2">
                    {items.map((item) => (
                        <DashboardItemCard
                            key={item.id}
                            item={item}
                            runtime={runtime}
                        />
                    ))}
                </div>
            )}
        </article>
    );
}
