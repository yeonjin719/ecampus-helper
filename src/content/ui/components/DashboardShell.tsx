import { type ReactNode } from 'react';

interface DashboardShellProps {
    collapsed: boolean;
    sub: string;
    filter: string;
    typeFilter: string;
    allCourses: string[];
    newCourseNames: string[];
    courseFilter: string;
    courseFilterAllValue: string;
    settingsOpen: boolean;
    contactLink: string;
    hidePastLectures: boolean;
    includeSmClass: boolean;
    onToggleCollapsed: () => void | Promise<void>;
    onFilterChange: (value: string) => void;
    onTypeFilterChange: (value: string) => void;
    onRefresh: () => void;
    onOpenSettings: () => void;
    onSelectCourse: (course: string) => void;
    onCloseSettings: () => void;
    onHidePastLecturesChange: (checked: boolean) => void | Promise<void>;
    onIncludeSmClassChange: (checked: boolean) => void | Promise<void>;
    children: ReactNode;
}

export function DashboardShell({
    collapsed,
    sub,
    filter,
    typeFilter,
    allCourses,
    newCourseNames,
    courseFilter,
    courseFilterAllValue,
    settingsOpen,
    contactLink,
    hidePastLectures,
    includeSmClass,
    onToggleCollapsed,
    onFilterChange,
    onTypeFilterChange,
    onRefresh,
    onOpenSettings,
    onSelectCourse,
    onCloseSettings,
    onHidePastLecturesChange,
    onIncludeSmClassChange,
    children,
}: DashboardShellProps) {
    const controlClass =
        'h-9 w-full rounded-lg border border-zinc-300 bg-white/95 px-3 text-[12px] font-medium text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition focus-visible:border-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-900/10';
    const headerIconButtonClass =
        'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/30 bg-white/10 text-[13px] font-semibold leading-none text-white transition hover:border-white hover:bg-white hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45';
    const courseTabButtonClass =
        'shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15';
    const newCourseNameSet = new Set(newCourseNames);

    return (
        <div className="fixed right-2 top-4 z-[999999] [font-family:'Pretendard',sans-serif] md:right-4">
            <section
                className={[
                    'overflow-hidden rounded-2xl border border-zinc-300 bg-white/95 shadow-[0_24px_54px_rgba(0,0,0,0.22)] backdrop-blur-[2px]',
                    collapsed
                        ? 'h-14 w-14'
                        : 'flex max-h-[calc(100vh-20px)] w-[min(468px,calc(100vw-16px))] flex-col md:w-[min(468px,calc(100vw-32px))]',
                ].join(' ')}
            >
                <header
                    className={
                        collapsed
                            ? 'flex h-full items-center justify-center bg-[linear-gradient(145deg,#111827,#1f2937)] text-white'
                            : 'border-b border-zinc-800/70 bg-[linear-gradient(140deg,#111827,#0f172a_56%,#1f2937)] px-4 py-3 text-white'
                    }
                >
                    {collapsed ? (
                        <button
                            id="ecdash-toggle"
                            type="button"
                            className={headerIconButtonClass}
                            title="펼치기"
                            aria-label="펼치기"
                            onClick={() => {
                                void onToggleCollapsed();
                            }}
                        >
                            ▾
                        </button>
                    ) : (
                        <>
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <h1 className="truncate text-[15px] font-semibold tracking-tight text-white">
                                        SMU eCampus 한눈에 보기
                                    </h1>
                                    <p className="mt-0.5 text-[12px] text-zinc-300">
                                        과목별 활동 상태를 빠르게 확인
                                    </p>
                                </div>
                                <div className="flex h-fit w-fit items-center gap-1.5">
                                    <button
                                        id="ecdash-refresh"
                                        type="button"
                                        className={headerIconButtonClass}
                                        title="새로고침"
                                        aria-label="새로고침"
                                        onClick={onRefresh}
                                    >
                                        ↻
                                    </button>

                                    <button
                                        id="ecdash-settings-open"
                                        type="button"
                                        className={headerIconButtonClass}
                                        title="설정"
                                        aria-label="설정"
                                        onClick={onOpenSettings}
                                    >
                                        ⚙
                                    </button>
                                    <button
                                        id="ecdash-toggle"
                                        type="button"
                                        className={headerIconButtonClass}
                                        title="접기"
                                        aria-label="접기"
                                        onClick={() => {
                                            void onToggleCollapsed();
                                        }}
                                    >
                                        ▴
                                    </button>
                                </div>
                            </div>

                            <div className="mt-2.5 flex items-center justify-between gap-2">
                                <p
                                    id="ecdash-sub"
                                    className="max-h-10 overflow-hidden text-[12px] leading-5 text-zinc-200"
                                >
                                    {sub ||
                                        '대시보드에서 과목을 찾고 활동을 크롤링해요.'}
                                </p>
                                <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[12px] font-medium text-zinc-100">
                                    실시간
                                </span>
                            </div>
                        </>
                    )}
                </header>

                {!collapsed && (
                    <div className="flex min-h-0 flex-1 flex-col">
                        <div className="space-y-3 border-b border-zinc-200 bg-zinc-50/80 px-4 py-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label
                                        htmlFor="ecdash-filter"
                                        className="block pl-0.5 text-[12px] font-semibold text-zinc-600"
                                    >
                                        진행 상태
                                    </label>
                                    <select
                                        id="ecdash-filter"
                                        className={controlClass}
                                        value={filter}
                                        onChange={(event) => {
                                            onFilterChange(event.target.value);
                                        }}
                                    >
                                        <option value="ALL">전체</option>
                                        <option value="DUE_SOON">
                                            3일 이내 마감
                                        </option>
                                        <option value="OVERDUE">마감됨</option>
                                        <option value="TODO_ONLY">
                                            미제출만
                                        </option>
                                        <option value="NOT_DONE">
                                            미완료만
                                        </option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label
                                        htmlFor="ecdash-type-filter"
                                        className="block pl-0.5 text-[12px] font-semibold text-zinc-600"
                                    >
                                        항목 유형
                                    </label>
                                    <select
                                        id="ecdash-type-filter"
                                        className={controlClass}
                                        value={typeFilter}
                                        onChange={(event) => {
                                            onTypeFilterChange(
                                                event.target.value,
                                            );
                                        }}
                                    >
                                        <option value="ALL_TYPES">
                                            모든 타입
                                        </option>
                                        <option value="ASSIGNMENT">과제</option>
                                        <option value="LECTURE">강의</option>
                                        <option value="FORUM">토론</option>
                                        <option value="RESOURCE">자료</option>
                                        <option value="NOTICE">공지</option>
                                    </select>
                                </div>
                            </div>

                            <div
                                id="ecdash-course-tabs"
                                className="ecdash-scroll flex gap-2 overflow-x-auto rounded-lg border border-zinc-200 bg-white/90 p-1 pb-1.5 whitespace-nowrap"
                                role="tablist"
                                aria-label="과목 필터"
                            >
                                <button
                                    type="button"
                                    className={[
                                        courseTabButtonClass,
                                        courseFilter === courseFilterAllValue
                                            ? 'bg-zinc-900 text-white ring-1 ring-zinc-900 shadow-[0_6px_14px_rgba(0,0,0,0.2)]'
                                            : 'bg-white text-zinc-700 ring-1 ring-zinc-300 hover:bg-zinc-100 hover:text-zinc-900',
                                    ].join(' ')}
                                    onClick={() => {
                                        onSelectCourse(courseFilterAllValue);
                                    }}
                                >
                                    전체
                                </button>

                                {allCourses.map((courseName) => (
                                    <button
                                        key={courseName}
                                        type="button"
                                        className={[
                                            courseTabButtonClass,
                                            courseFilter === courseName
                                                ? 'bg-zinc-900 text-white ring-1 ring-zinc-900 shadow-[0_6px_14px_rgba(0,0,0,0.2)]'
                                                : 'bg-white text-zinc-700 ring-1 ring-zinc-300 hover:bg-zinc-100 hover:text-zinc-900',
                                        ].join(' ')}
                                        onClick={() => {
                                            onSelectCourse(courseName);
                                        }}
                                    >
                                        <span className="inline-flex items-center gap-1.5">
                                            {newCourseNameSet.has(courseName) && (
                                                <span
                                                    className="h-2 w-2 rounded-full bg-rose-500"
                                                    aria-hidden="true"
                                                />
                                            )}
                                            <span>{courseName}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <main
                            id="ecdash-list"
                            className="ecdash-scroll min-h-0 max-h-[50vh] flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#f4f4f5_100%)] px-4 py-3"
                        >
                            {children}
                        </main>

                        <footer
                            id="ecdash-footer"
                            className="flex items-center justify-between border-t border-zinc-200 bg-white px-4 py-2.5 text-[12px] text-zinc-500"
                        >
                            <span className="ecdash-copyright font-medium">
                                © 2026 Cotton · SMU
                            </span>
                            <a
                                id="ecdash-contact-link"
                                href={contactLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ecdash-contact-link font-semibold text-zinc-700 underline decoration-zinc-300 underline-offset-2 transition hover:text-zinc-900"
                            >
                                문의하기
                            </a>
                        </footer>
                    </div>
                )}
            </section>

            {settingsOpen && !collapsed && (
                <div
                    id="ecdash-settings-modal"
                    className="fixed inset-0 z-[1000000] grid place-items-center p-3"
                    aria-hidden="false"
                >
                    <button
                        id="ecdash-settings-backdrop"
                        type="button"
                        className="absolute inset-0 bg-zinc-950/55 backdrop-blur-[2px]"
                        aria-label="설정 닫기"
                        onClick={onCloseSettings}
                    />

                    <div
                        className="ecdash-settings-dialog ecdash-scroll relative max-h-[min(80vh,560px)] w-[min(360px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-zinc-300 bg-zinc-50 p-4 shadow-[0_24px_50px_rgba(0,0,0,0.28)]"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="ecdash-settings-title"
                    >
                        <div className="ecdash-settings-head flex items-center justify-between">
                            <h3
                                id="ecdash-settings-title"
                                className="text-[14px] font-semibold tracking-tight text-zinc-900"
                            >
                                보기 설정
                            </h3>
                            <button
                                id="ecdash-settings-close"
                                type="button"
                                className="ecdash-settings-close inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 bg-white text-[14px] text-zinc-700 transition hover:border-zinc-500 hover:bg-zinc-100"
                                aria-label="닫기"
                                onClick={onCloseSettings}
                            >
                                ✕
                            </button>
                        </div>

                        <p className="mt-1 text-[12px] leading-5 text-zinc-600">
                            목록 노출 범위를 조정해 필요한 정보만 집중해서 볼 수
                            있어요.
                        </p>

                        <div className="mt-3 space-y-2">
                            <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
                                <label className="ecdash-settings-option flex items-center gap-2 text-[14px] font-medium text-zinc-800">
                                    <input
                                        id="ecdash-setting-hide-past-lectures"
                                        type="checkbox"
                                        className="h-4 w-4 accent-black"
                                        checked={hidePastLectures}
                                        onChange={(event) => {
                                            void onHidePastLecturesChange(
                                                Boolean(event.target.checked),
                                            );
                                        }}
                                    />
                                    <span>지난 강의 안보기</span>
                                </label>
                                <p className="ecdash-settings-help mt-1 text-[12px] leading-5 text-zinc-500">
                                    마감일이 지난 강의 항목을 목록에서 숨겨요.
                                </p>
                            </div>

                            <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
                                <label className="ecdash-settings-option flex items-center gap-2 text-[14px] font-medium text-zinc-800">
                                    <input
                                        id="ecdash-setting-include-sm-class"
                                        type="checkbox"
                                        className="h-4 w-4 accent-black"
                                        checked={includeSmClass}
                                        onChange={(event) => {
                                            void onIncludeSmClassChange(
                                                Boolean(event.target.checked),
                                            );
                                        }}
                                    />
                                    <span>SM-Class 포함하기</span>
                                </label>
                                <p className="ecdash-settings-help mt-1 text-[12px] leading-5 text-zinc-500">
                                    대시보드의 SM-Class 라벨 과목도 함께
                                    크롤링해요.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
