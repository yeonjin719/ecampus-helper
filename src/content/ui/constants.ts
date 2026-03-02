const runtimeStoragePrefix =
    typeof window !== 'undefined'
        ? window.__ECDASH__?.getStoragePrefix?.('ecdash:smu') || 'ecdash:smu'
        : 'ecdash:smu';
const UI_STORAGE_PREFIX = `${runtimeStoragePrefix}:ui`;

export const COURSE_FILTER_ALL = '__ALL__';
export const UI_COLLAPSED_KEY = `${UI_STORAGE_PREFIX}:collapsed`;
export const UI_HIDE_PAST_LECTURES_KEY = `${UI_STORAGE_PREFIX}:hidePastLectures`;
export const UI_HIDE_PAST_ASSIGNMENTS_KEY = `${UI_STORAGE_PREFIX}:hidePastAssignments`;
export const UI_HIDE_PAST_FORUMS_KEY = `${UI_STORAGE_PREFIX}:hidePastForums`;
export const UI_INCLUDE_SM_CLASS_KEY = `${UI_STORAGE_PREFIX}:includeSmClass`;
export const UI_HIDDEN_ITEM_IDS_KEY = `${UI_STORAGE_PREFIX}:hiddenItemIds`;
export const REPORT_EMAIL = 'kyj0719@gmail.com';
