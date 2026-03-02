import React from 'react';
import type { DashboardItem, DashboardRuntime } from '../types';
import {
    itemCardToneClass,
    stateBadgeClass,
    splitMetaByPeriod,
    triggerResourceDownload,
    typeBadgeClass,
} from '../utils/dashboardUi';
import {
    MdOutlineAssignment,
    MdOutlineCampaign,
    MdOutlineFileDownload,
    MdOutlineFolderOpen,
    MdOutlineForum,
    MdOutlinePlayCircleOutline,
    MdOutlineVisibilityOff,
} from 'react-icons/md';
interface DashboardItemCardProps {
    item: DashboardItem;
    runtime: DashboardRuntime;
    onHideItem: (itemId: string) => void;
}

function TypeBadgeIcon({ type }: { type: DashboardItem['type'] }) {
    if (type === 'ASSIGNMENT')
        return <MdOutlineAssignment aria-hidden="true" />;
    if (type === 'LECTURE')
        return <MdOutlinePlayCircleOutline aria-hidden="true" />;
    if (type === 'FORUM') return <MdOutlineForum aria-hidden="true" />;
    if (type === 'RESOURCE') return <MdOutlineFolderOpen aria-hidden="true" />;
    return <MdOutlineCampaign aria-hidden="true" />;
}

function formatDueDate(dueAt?: number) {
    if (typeof dueAt !== 'number') return '';
    const date = new Date(dueAt);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${month}.${day} ${hour}:${minute}`;
}

export function DashboardItemCard({
    item,
    runtime,
    onHideItem,
}: DashboardItemCardProps) {
    const { detailText, periodText } = splitMetaByPeriod(item.meta, item.type);
    const ddayText = item.dueAt ? runtime.ddayLabel?.(item.dueAt) || '' : '';
    const statusTextRaw = String(
        runtime.statusLabel?.(item.status) || item.status,
    );
    const normalizedStatusText = /상태\s*미상|unknown/i.test(statusTextRaw)
        ? '확인필요'
        : statusTextRaw;
    const unifiedStateText =
        item.type === 'NOTICE'
            ? ''
            : [ddayText, normalizedStatusText].filter(Boolean).join(' ');

    const detailMetaLines = [detailText]
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .join(' · ')
        .split(/\s*·\s*/)
        .map((value) => String(value || '').trim())
        .filter(Boolean);
    const periodMetaLines = [periodText]
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .join(' · ')
        .split(/\s*·\s*/)
        .map((value) => String(value || '').trim())
        .filter(Boolean);
    const dueText =
        item.type === 'NOTICE'
            ? ''
            : item.dueAt
              ? `마감기간 ${formatDueDate(item.dueAt)}까지`
              : '';

    return (
        <button
            type="button"
            className={[
                'w-full rounded-xl border px-3 py-3 text-left shadow-[0_4px_10px_rgba(15,23,42,0.05)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100',
                itemCardToneClass(item.type),
            ].join(' ')}
            onClick={() => {
                if (item.url) {
                    window.open(item.url, '_blank');
                }
            }}
        >
            <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        {item.section && (
                            <p className="mb-0 text-[12px] leading-4 break-words whitespace-normal text-zinc-500">
                                {item.section}
                            </p>
                        )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                        {unifiedStateText && (
                            <span
                                className={[
                                    'inline-flex self-start rounded-md px-2 py-0.5 text-[12px] font-semibold',
                                    stateBadgeClass(
                                        runtime,
                                        item.status,
                                        item.dueAt,
                                    ),
                                ].join(' ')}
                            >
                                {unifiedStateText}
                            </span>
                        )}

                        <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 p-0 text-[14px] text-zinc-700 transition hover:border-zinc-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100"
                            title="이 항목 숨기기"
                            aria-label="이 항목 숨기기"
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                onHideItem(item.id);
                            }}
                        >
                            <MdOutlineVisibilityOff />
                        </button>

                        {item.type === 'RESOURCE' && item.url && (
                            <button
                                type="button"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 p-0 text-[14px] text-zinc-700 transition hover:border-zinc-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100"
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

                <div className="mb-[2px] flex items-center gap-1.5">
                    {(() => {
                        const typeLabel =
                            runtime.TYPE_LABEL?.[item.type] || item.type;
                        return (
                            <span
                                className={[
                                    'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[14px]',
                                    typeBadgeClass(item.type),
                                ].join(' ')}
                                title={typeLabel}
                                aria-label={typeLabel}
                            >
                                <TypeBadgeIcon type={item.type} />
                                <span className="sr-only">{typeLabel}</span>
                            </span>
                        );
                    })()}
                    <span className=" text-[13px] font-semibold leading-5 text-zinc-900">
                        {item.title}
                    </span>
                </div>

                <div className="flex flex-col gap-0.5">
                    {dueText && (
                        <p className="mt-0.5 text-[12px] leading-5 font-medium text-zinc-700">
                            {dueText}
                        </p>
                    )}

                    {detailMetaLines.map((line, index) => (
                        <p
                            key={`detail-${item.id}-${index}`}
                            className="mb-0 mt-0.5 text-[12px] leading-5 break-words whitespace-normal text-zinc-500"
                        >
                            {line}
                        </p>
                    ))}

                    {periodMetaLines.map((line, index) => (
                        <p
                            key={`period-${item.id}-${index}`}
                            className="mb-0 mt-0.5 text-[12px] leading-5 break-words whitespace-normal text-zinc-500"
                        >
                            {line}
                        </p>
                    ))}
                </div>
            </div>
        </button>
    );
}
