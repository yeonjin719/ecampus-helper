import type { ReactNode } from 'react';

export interface HiddenItemPreview {
    id: string;
    title: string;
    courseName: string;
    typeLabel: string;
    statusLabel: string;
    dueLabel: string;
}

export interface DashboardSelectOption {
    value: string;
    label: string;
}

export interface DashboardShellProps {
    collapsed: boolean;
    sub: string;
    filter: string[];
    typeFilter: string[];
    allCourses: string[];
    newCourseNames: string[];
    courseFilter: string;
    courseFilterAllValue: string;
    settingsOpen: boolean;
    contactLink: string;
    hidePastLectures: boolean;
    hidePastAssignments: boolean;
    hidePastForums: boolean;
    includeSmClass: boolean;
    hiddenItemCount: number;
    hiddenItems: HiddenItemPreview[];
    onToggleCollapsed: () => void | Promise<void>;
    onFilterChange: (values: string[]) => void;
    onTypeFilterChange: (values: string[]) => void;
    onRefresh: () => void;
    onOpenSettings: () => void;
    onSelectCourse: (course: string) => void;
    onCloseSettings: () => void;
    onHidePastLecturesChange: (checked: boolean) => void | Promise<void>;
    onHidePastAssignmentsChange: (checked: boolean) => void | Promise<void>;
    onHidePastForumsChange: (checked: boolean) => void | Promise<void>;
    onIncludeSmClassChange: (checked: boolean) => void | Promise<void>;
    onUnhideItem: (itemId: string) => void | Promise<void>;
    onResetHiddenItems: () => void | Promise<void>;
    children: ReactNode;
}
