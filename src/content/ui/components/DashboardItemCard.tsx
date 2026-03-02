import React from 'react';
import type { DashboardItem, DashboardRuntime } from '../types';
import {
    ddayBadgeClass,
    itemCardToneClass,
    splitMetaByPeriod,
    statusChipClass,
    triggerResourceDownload,
    typeBadgeClass,
} from '../utils/dashboardUi';
import { MdOutlineFileDownload } from 'react-icons/md';
interface DashboardItemCardProps {
    item: DashboardItem;
    runtime: DashboardRuntime;
}

export function DashboardItemCard({ item, runtime }: DashboardItemCardProps) {
    const { detailText, periodText } = splitMetaByPeriod(item.meta, item.type);
    const hideDueDateText = Boolean(periodText && item.dueAt);
    const ddayText = item.dueAt ? runtime.ddayLabel?.(item.dueAt) || '' : '';
    const dueText = hideDueDateText
        ? ''
        : item.type === 'NOTICE'
          ? ''
          : item.dueAt
            ? new Date(item.dueAt).toLocaleString()
            : '마감 정보 없음';

    return (
        <button
            type="button"
            className={[
                'w-full rounded-xl border px-3 py-3 text-left shadow-[0_5px_14px_rgba(0,0,0,0.04)] transition',
                itemCardToneClass(item.type),
            ].join(' ')}
            onClick={() => {
                if (item.url) {
                    window.open(item.url, '_blank');
                }
            }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col">
                    <div className="flex items-center gap-1.5">
                        <span
                            className={[
                                'inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[12px] font-semibold',
                                typeBadgeClass(item.type),
                            ].join(' ')}
                        >
                            {runtime.TYPE_LABEL?.[item.type] || item.type}
                        </span>
                        <span className="truncate text-[14px] font-semibold leading-5 text-zinc-900">
                            {item.title}
                        </span>
                    </div>

                    {dueText && (
                        <p className="mt-1 text-[12px] leading-5 text-zinc-500">
                            {dueText}
                        </p>
                    )}

                    {item.section || detailText ? (
                        <div>
                            <p className="mt-0.5 flex flex-wrap text-[12px] leading-5 text-zinc-500">
                                {item.section}
                            </p>
                            <p className="mt-0.5 flex flex-wrap text-[12px] leading-5 text-zinc-500">
                                {detailText}
                            </p>
                        </div>
                    ) : null}

                    {periodText && (
                        <p className="mt-0.5 text-[12px] leading-5 text-zinc-500">
                            {periodText}
                        </p>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                    {item.type !== 'NOTICE' && (
                        <div className="flex items-center gap-1">
                            {ddayText && (
                                <span
                                    className={[
                                        'inline-flex rounded-md px-2 py-0.5 text-[12px] font-semibold',
                                        ddayBadgeClass(item.dueAt),
                                    ].join(' ')}
                                >
                                    {ddayText}
                                </span>
                            )}
                            <span
                                className={[
                                    'inline-flex rounded-md px-1.5 py-0.5 text-[12px] font-semibold',
                                    statusChipClass(runtime, item.status),
                                ].join(' ')}
                            >
                                {runtime.statusLabel?.(item.status) ||
                                    item.status}
                            </span>
                        </div>
                    )}

                    {item.type === 'RESOURCE' && item.url && (
                        <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-300 bg-white p-0 text-[14px] text-zinc-700 transition hover:border-zinc-500 hover:bg-zinc-100"
                            title="자료 다운로드"
                            aria-label="자료 다운로드"
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                triggerResourceDownload(
                                    runtime,
                                    item.url,
                                    item.title,
                                );
                            }}
                        >
                            <MdOutlineFileDownload />
                        </button>
                    )}
                </div>
            </div>
        </button>
    );
}
