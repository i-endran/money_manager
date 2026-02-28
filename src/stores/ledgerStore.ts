import { create } from 'zustand';

interface LedgerState {
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    nextMonth: () => void;
    prevMonth: () => void;
    refreshTick: number;
    refresh: () => void;
}

export const useLedgerStore = create<LedgerState>(set => ({
    currentDate: new Date(),
    setCurrentDate: date => set({ currentDate: date }),
    nextMonth: () =>
        set(state => ({
            currentDate: new Date(
                state.currentDate.getFullYear(),
                state.currentDate.getMonth() + 1,
                1,
            ),
        })),
    prevMonth: () =>
        set(state => ({
            currentDate: new Date(
                state.currentDate.getFullYear(),
                state.currentDate.getMonth() - 1,
                1,
            ),
        })),
    refreshTick: 0,
    refresh: () => set(state => ({ refreshTick: state.refreshTick + 1 })),
}));
