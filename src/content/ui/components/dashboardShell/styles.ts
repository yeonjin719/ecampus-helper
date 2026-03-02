export const DASHBOARD_SHELL_STYLES = {
    root: "fixed right-2 top-4 z-[999999] [font-family:'Pretendard',sans-serif] md:right-4",
    panelBase:
        'overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.08)]',
    panelCollapsed: 'h-14 w-14',
    panelExpanded:
        'flex max-h-[calc(100vh-20px)] w-[min(468px,calc(100vw-16px))] flex-col md:w-[min(468px,calc(100vw-32px))]',
    headerCollapsed: 'flex h-full items-center justify-center bg-white text-zinc-900',
    headerExpanded: 'border-b border-zinc-100 bg-white px-4 py-3 text-zinc-900',
    iconButton:
        'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-[15px] font-semibold leading-none text-zinc-600 transition hover:border-zinc-300 hover:bg-white hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100',
    contentLayout: 'flex min-h-0 flex-1 flex-col',
    filterSection: 'space-y-2 border-b border-zinc-100 bg-zinc-50/70 px-4 py-3',
    filterSelectGrid: 'grid grid-cols-2 gap-2',
    dropdown:
        'h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] font-medium text-zinc-700 outline-none transition focus-visible:border-sky-400 focus-visible:ring-2 focus-visible:ring-sky-100',
    filterChipRow: 'flex flex-wrap items-center gap-1.5',
    filterChipBase:
        'inline-flex h-8 items-center rounded-full border px-3 text-[12px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100',
    filterChipActive: 'border-sky-300 bg-sky-50 text-sky-700',
    filterChipInactive: 'border-zinc-200 bg-white text-zinc-600 hover:bg-sky-50',
    list: 'ecdash-scroll min-h-0 max-h-[50vh] flex-1 overflow-y-auto bg-[#f9fafb] px-4 py-3',
    footer:
        'flex items-center justify-between border-t border-zinc-100 bg-white px-4 py-2 text-[12px] text-zinc-500',
    copyright: 'ecdash-copyright font-medium',
    contactLink:
        'ecdash-contact-link font-semibold text-zinc-700 underline decoration-zinc-300 underline-offset-2 transition hover:text-zinc-900',
    settingsOverlay: 'fixed inset-0 z-[1000000] grid place-items-center p-3',
    settingsBackdrop: 'absolute inset-0 bg-zinc-950/55',
    settingsDialog:
        'ecdash-settings-dialog ecdash-scroll relative max-h-[min(80vh,560px)] w-[min(360px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.16)]',
    settingsHead: 'ecdash-settings-head flex items-center justify-between',
    settingsTitle: 'text-[14px] m-0 font-semibold tracking-tight text-zinc-900',
    settingsClose:
        'ecdash-settings-close inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-white text-[14px] text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100',
    settingsContent: 'mt-3 space-y-2',
    settingsCard: 'rounded-xl border border-zinc-200 bg-white px-3 py-2.5',
    settingsOption:
        'ecdash-settings-option flex items-center gap-2 text-[14px] font-medium leading-5 text-zinc-800',
    settingsCheckbox: 'ecdash-settings-checkbox m-0 h-4 w-4 shrink-0 accent-black',
    hiddenHeader: 'mb-2 flex items-center justify-between',
    hiddenHeaderTitle: 'text-[13px] font-semibold text-zinc-800',
    hiddenHeaderCount:
        'rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600',
    hiddenList: 'ecdash-scroll m-0 max-h-48 space-y-2 overflow-y-auto pr-1',
    hiddenItem: 'rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2',
    hiddenItemBody: 'flex items-start justify-between gap-2',
    hiddenItemMeta: 'min-w-0',
    hiddenItemTitle: 'm-0 truncate text-[12px] font-semibold text-zinc-900',
    hiddenItemCourse: 'mt-0.5 truncate text-[11px] text-zinc-600',
    hiddenItemDetail: 'mt-1 truncate text-[11px] text-zinc-500',
    hiddenItemRestore:
        'shrink-0 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100',
    hiddenEmpty:
        'm-0 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-[12px] text-zinc-500',
    resetButtonBase:
        'inline-flex h-8 w-full items-center justify-center rounded-lg border text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-100',
    resetButtonEnabled:
        'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white',
    resetButtonDisabled:
        'cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400',
} as const;
