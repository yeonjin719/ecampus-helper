import { DUE_FILTER_OPTIONS, TYPE_FILTER_OPTIONS } from './constants';
import { DASHBOARD_SHELL_STYLES as styles } from './styles';

interface DashboardFilterBarProps {
    filter: string[];
    typeFilter: string[];
    allCourses: string[];
    newCourseNames: string[];
    courseFilter: string;
    courseFilterAllValue: string;
    onFilterChange: (values: string[]) => void;
    onTypeFilterChange: (values: string[]) => void;
    onSelectCourse: (course: string) => void;
}

function toggleMultiValue(
    currentValues: string[],
    targetValue: string,
    onChange: (values: string[]) => void,
) {
    if (currentValues.includes(targetValue)) {
        onChange(currentValues.filter((value) => value !== targetValue));
        return;
    }

    onChange([...currentValues, targetValue]);
}

export function DashboardFilterBar({
    filter,
    typeFilter,
    allCourses,
    newCourseNames,
    courseFilter,
    courseFilterAllValue,
    onFilterChange,
    onTypeFilterChange,
    onSelectCourse,
}: DashboardFilterBarProps) {
    const selectedDueFilter = filter[0] || 'ALL';
    const typeFilterSet = new Set(typeFilter);

    return (
        <div className={styles.filterSection}>
            <div className={styles.filterSelectGrid}>
                <select
                    id="ecdash-due-filter"
                    className={styles.dropdown}
                    value={selectedDueFilter}
                    onChange={(event) => {
                        const value = event.target.value;
                        onFilterChange(value === 'ALL' ? [] : [value]);
                    }}
                >
                    {DUE_FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                <select
                    id="ecdash-course-filter"
                    className={styles.dropdown}
                    value={courseFilter}
                    onChange={(event) => {
                        onSelectCourse(event.target.value);
                    }}
                >
                    <option value={courseFilterAllValue}>과목 전체</option>
                    {allCourses.map((courseName) => (
                        <option key={courseName} value={courseName}>
                            {courseName}
                            {newCourseNames.includes(courseName) ? ' *' : ''}
                        </option>
                    ))}
                </select>
            </div>

            <div className={styles.filterChipRow}>
                <button
                    type="button"
                    className={[
                        styles.filterChipBase,
                        !typeFilter.length
                            ? styles.filterChipActive
                            : styles.filterChipInactive,
                    ].join(' ')}
                    onClick={() => {
                        onTypeFilterChange([]);
                    }}
                >
                    전체
                </button>

                {TYPE_FILTER_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        className={[
                            styles.filterChipBase,
                            typeFilterSet.has(option.value)
                                ? styles.filterChipActive
                                : styles.filterChipInactive,
                        ].join(' ')}
                        onClick={() => {
                            toggleMultiValue(
                                typeFilter,
                                option.value,
                                onTypeFilterChange,
                            );
                        }}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
