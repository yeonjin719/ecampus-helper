import type { UiState } from '../types';

export class UiStore {
    private state: UiState;

    private listeners = new Set<() => void>();

    constructor(initialState: UiState) {
        this.state = initialState;
    }

    getState = () => this.state;

    setState = (patch: Partial<UiState>) => {
        this.state = { ...this.state, ...patch };
        this.listeners.forEach((listener) => listener());
    };

    subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };
}
