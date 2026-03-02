import { DASHBOARD_SHELL_STYLES as styles } from './styles';

interface DashboardHeaderProps {
    collapsed: boolean;
    onToggleCollapsed: () => void | Promise<void>;
    onRefresh: () => void;
    onOpenSettings: () => void;
}

export function DashboardHeader({
    collapsed,
    onToggleCollapsed,
    onRefresh,
    onOpenSettings,
}: DashboardHeaderProps) {
    return (
        <header className={collapsed ? styles.headerCollapsed : styles.headerExpanded}>
            {collapsed ? (
                <button
                    id="ecdash-toggle"
                    type="button"
                    className={styles.iconButton}
                    title="펼치기"
                    aria-label="펼치기"
                    onClick={() => {
                        void onToggleCollapsed();
                    }}
                >
                    ▾
                </button>
            ) : (
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <h1 className="truncate m-0 text-[15px] font-bold tracking-tight text-zinc-900">
                            SMU eCampus
                        </h1>
                    </div>
                    <div className="flex h-fit w-fit items-center gap-1.5">
                        <button
                            id="ecdash-refresh"
                            type="button"
                            className={styles.iconButton}
                            title="새로고침"
                            aria-label="새로고침"
                            onClick={onRefresh}
                        >
                            ↻
                        </button>

                        <button
                            id="ecdash-settings-open"
                            type="button"
                            className={styles.iconButton}
                            title="설정"
                            aria-label="설정"
                            onClick={onOpenSettings}
                        >
                            ⚙
                        </button>
                        <button
                            id="ecdash-toggle"
                            type="button"
                            className={styles.iconButton}
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
            )}
        </header>
    );
}
