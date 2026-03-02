import { DashboardFilterBar } from './dashboardShell/DashboardFilterBar';
import { DashboardFooter } from './dashboardShell/DashboardFooter';
import { DashboardHeader } from './dashboardShell/DashboardHeader';
import { DashboardSettingsModal } from './dashboardShell/DashboardSettingsModal';
import { DASHBOARD_SHELL_STYLES as styles } from './dashboardShell/styles';
import type { DashboardShellProps } from './dashboardShell/types';

export function DashboardShell({
    collapsed,
    sub: _sub,
    filter,
    typeFilter,
    allCourses,
    newCourseNames,
    courseFilter,
    courseFilterAllValue,
    settingsOpen,
    contactLink,
    hidePastLectures,
    hidePastAssignments,
    hidePastForums,
    includeSmClass,
    hiddenItemCount,
    hiddenItems,
    onToggleCollapsed,
    onFilterChange,
    onTypeFilterChange,
    onRefresh,
    onOpenSettings,
    onSelectCourse,
    onCloseSettings,
    onHidePastLecturesChange,
    onHidePastAssignmentsChange,
    onHidePastForumsChange,
    onIncludeSmClassChange,
    onUnhideItem,
    onResetHiddenItems,
    children,
}: DashboardShellProps) {
    const settingsVisible = settingsOpen && !collapsed;

    return (
        <div className={styles.root}>
            <section
                className={[
                    styles.panelBase,
                    collapsed ? styles.panelCollapsed : styles.panelExpanded,
                ].join(' ')}
            >
                <DashboardHeader
                    collapsed={collapsed}
                    onToggleCollapsed={onToggleCollapsed}
                    onRefresh={onRefresh}
                    onOpenSettings={onOpenSettings}
                />

                {!collapsed && (
                    <div className={styles.contentLayout}>
                        <DashboardFilterBar
                            filter={filter}
                            typeFilter={typeFilter}
                            allCourses={allCourses}
                            newCourseNames={newCourseNames}
                            courseFilter={courseFilter}
                            courseFilterAllValue={courseFilterAllValue}
                            onFilterChange={onFilterChange}
                            onTypeFilterChange={onTypeFilterChange}
                            onSelectCourse={onSelectCourse}
                        />

                        <main id="ecdash-list" className={styles.list}>
                            {children}
                        </main>

                        <DashboardFooter contactLink={contactLink} />
                    </div>
                )}
            </section>

            {!collapsed && (
                <DashboardSettingsModal
                    visible={settingsVisible}
                    hidePastLectures={hidePastLectures}
                    hidePastAssignments={hidePastAssignments}
                    hidePastForums={hidePastForums}
                    includeSmClass={includeSmClass}
                    hiddenItemCount={hiddenItemCount}
                    hiddenItems={hiddenItems}
                    onCloseSettings={onCloseSettings}
                    onHidePastLecturesChange={onHidePastLecturesChange}
                    onHidePastAssignmentsChange={onHidePastAssignmentsChange}
                    onHidePastForumsChange={onHidePastForumsChange}
                    onIncludeSmClassChange={onIncludeSmClassChange}
                    onUnhideItem={onUnhideItem}
                    onResetHiddenItems={onResetHiddenItems}
                />
            )}
        </div>
    );
}
