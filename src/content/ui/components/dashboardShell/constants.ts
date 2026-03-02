import type { DashboardSelectOption } from './types';

export const DUE_FILTER_OPTIONS: DashboardSelectOption[] = [
    { value: 'ALL', label: '마감 전체' },
    { value: 'DUE_SOON', label: '3일 이내' },
    { value: 'OVERDUE', label: '마감' },
    { value: 'TODO_ONLY', label: '미제출' },
    { value: 'NOT_DONE', label: '미완료' },
];

export const TYPE_FILTER_OPTIONS: DashboardSelectOption[] = [
    { value: 'ASSIGNMENT', label: '과제' },
    { value: 'LECTURE', label: '강의' },
    { value: 'FORUM', label: '토론' },
    { value: 'RESOURCE', label: '자료' },
    { value: 'NOTICE', label: '공지' },
];
