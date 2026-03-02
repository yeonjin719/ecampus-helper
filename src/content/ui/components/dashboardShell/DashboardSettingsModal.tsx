import type { HiddenItemPreview } from './types';
import { DASHBOARD_SHELL_STYLES as styles } from './styles';

interface DashboardSettingsModalProps {
    visible: boolean;
    hidePastLectures: boolean;
    hidePastAssignments: boolean;
    hidePastForums: boolean;
    includeSmClass: boolean;
    hiddenItemCount: number;
    hiddenItems: HiddenItemPreview[];
    onCloseSettings: () => void;
    onHidePastLecturesChange: (checked: boolean) => void | Promise<void>;
    onHidePastAssignmentsChange: (checked: boolean) => void | Promise<void>;
    onHidePastForumsChange: (checked: boolean) => void | Promise<void>;
    onIncludeSmClassChange: (checked: boolean) => void | Promise<void>;
    onUnhideItem: (itemId: string) => void | Promise<void>;
    onResetHiddenItems: () => void | Promise<void>;
}

interface SettingsCheckboxItemProps {
    id: string;
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void | Promise<void>;
}

function pinCheckboxStyle(el: HTMLInputElement | null) {
    if (!el) return;
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('margin-top', '0', 'important');
    el.style.setProperty('transform', 'none', 'important');
}

function SettingsCheckboxItem({
    id,
    label,
    checked,
    onChange,
}: SettingsCheckboxItemProps) {
    return (
        <div className={styles.settingsCard}>
            <label className={styles.settingsOption}>
                <input
                    id={id}
                    type="checkbox"
                    className={styles.settingsCheckbox}
                    ref={pinCheckboxStyle}
                    checked={checked}
                    onChange={(event) => {
                        void onChange(Boolean(event.target.checked));
                    }}
                />
                <span>{label}</span>
            </label>
        </div>
    );
}

export function DashboardSettingsModal({
    visible,
    hidePastLectures,
    hidePastAssignments,
    hidePastForums,
    includeSmClass,
    hiddenItemCount,
    hiddenItems,
    onCloseSettings,
    onHidePastLecturesChange,
    onHidePastAssignmentsChange,
    onHidePastForumsChange,
    onIncludeSmClassChange,
    onUnhideItem,
    onResetHiddenItems,
}: DashboardSettingsModalProps) {
    return (
        <div
            id="ecdash-settings-modal"
            className={styles.settingsOverlay}
            aria-hidden={visible ? 'false' : 'true'}
            hidden={!visible}
        >
            <div
                id="ecdash-settings-backdrop"
                className={styles.settingsBackdrop}
                aria-hidden="true"
                onClick={onCloseSettings}
            />

            <div
                className={styles.settingsDialog}
                role="dialog"
                aria-modal={visible ? 'true' : 'false'}
                aria-labelledby="ecdash-settings-title"
            >
                <div className={styles.settingsHead}>
                    <h3 id="ecdash-settings-title" className={styles.settingsTitle}>
                        보기 설정
                    </h3>
                    <button
                        id="ecdash-settings-close"
                        type="button"
                        className={styles.settingsClose}
                        aria-label="닫기"
                        onClick={onCloseSettings}
                    >
                        ✕
                    </button>
                </div>

                <div className={styles.settingsContent}>
                    <SettingsCheckboxItem
                        id="ecdash-setting-hide-past-lectures"
                        label="지난 강의 안보기"
                        checked={hidePastLectures}
                        onChange={onHidePastLecturesChange}
                    />

                    <SettingsCheckboxItem
                        id="ecdash-setting-hide-past-assignments"
                        label="지난 과제 안보기"
                        checked={hidePastAssignments}
                        onChange={onHidePastAssignmentsChange}
                    />

                    <SettingsCheckboxItem
                        id="ecdash-setting-hide-past-forums"
                        label="지난 토론 안보기"
                        checked={hidePastForums}
                        onChange={onHidePastForumsChange}
                    />

                    <SettingsCheckboxItem
                        id="ecdash-setting-include-sm-class"
                        label="SM-Class 포함하기"
                        checked={includeSmClass}
                        onChange={onIncludeSmClassChange}
                    />

                    <div className={styles.settingsCard}>
                        <div className={styles.hiddenHeader}>
                            <span className={styles.hiddenHeaderTitle}>숨김 항목</span>
                            <span className={styles.hiddenHeaderCount}>
                                {hiddenItemCount}개
                            </span>
                        </div>

                        {hiddenItems.length > 0 ? (
                            <ul className={styles.hiddenList}>
                                {hiddenItems.map((item) => (
                                    <li key={item.id} className={styles.hiddenItem}>
                                        <div className={styles.hiddenItemBody}>
                                            <div className={styles.hiddenItemMeta}>
                                                <p className={styles.hiddenItemTitle}>
                                                    {item.title}
                                                </p>
                                                <p className={styles.hiddenItemCourse}>
                                                    {item.courseName}
                                                </p>
                                                <p className={styles.hiddenItemDetail}>
                                                    {[
                                                        item.typeLabel,
                                                        item.statusLabel,
                                                        item.dueLabel,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                className={styles.hiddenItemRestore}
                                                onClick={() => {
                                                    void onUnhideItem(item.id);
                                                }}
                                            >
                                                복원
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className={styles.hiddenEmpty}>숨김된 항목이 없어요.</p>
                        )}
                    </div>

                    <div className={styles.settingsCard}>
                        <button
                            id="ecdash-setting-reset-hidden-items"
                            type="button"
                            className={[
                                styles.resetButtonBase,
                                hiddenItemCount > 0
                                    ? styles.resetButtonEnabled
                                    : styles.resetButtonDisabled,
                            ].join(' ')}
                            disabled={hiddenItemCount === 0}
                            onClick={() => {
                                void onResetHiddenItems();
                            }}
                        >
                            {hiddenItemCount > 0
                                ? `숨김 항목 ${hiddenItemCount}개 전체 복원`
                                : '숨김된 항목 없음'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
