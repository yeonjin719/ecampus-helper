export type ItemType = 'ASSIGNMENT' | 'LECTURE' | 'FORUM' | 'RESOURCE' | 'NOTICE';
export type ItemStatus = 'TODO' | 'DONE' | 'UNKNOWN';
export type FilterValue = 'ALL' | 'DUE_SOON' | 'OVERDUE' | 'TODO_ONLY' | 'NOT_DONE';
export type TypeFilterValue = 'ALL_TYPES' | ItemType;

export interface DashboardItem {
    id: string;
    type: ItemType;
    courseId: string;
    courseName: string;
    courseIsNew?: boolean;
    title: string;
    url?: string;
    section?: string;
    dueAt?: number;
    status: ItemStatus;
    meta?: string;
}

export interface UiState {
    items: DashboardItem[];
    filter: FilterValue;
    typeFilter: TypeFilterValue;
    courseFilter: string;
    hidePastLectures: boolean;
    includeSmClass: boolean;
    collapsed: boolean;
    loading: boolean;
    loadingMessage: string;
    badge: string;
    sub: string;
    settingsOpen: boolean;
}

export type DashboardRuntime = Record<string, any>;
