import { create } from 'zustand';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
    isLocked: boolean;
    appPin: string | null;
    biometricsEnabled: boolean;
    initialize: () => Promise<void>;
    setPin: (pin: string) => Promise<void>;
    removePin: () => Promise<void>;
    setBiometricsEnabled: (enabled: boolean) => Promise<void>;
    unlockWithPin: (pin: string) => boolean;
    unlockWithBiometrics: () => Promise<boolean>;
    lockApp: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    isLocked: false,
    appPin: null,
    biometricsEnabled: false,

    initialize: async () => {
        try {
            const credentials = await Keychain.getGenericPassword({ service: 'app_pin' });
            const biometricsStr = await AsyncStorage.getItem('biometrics_enabled');
            const biometricsEnabled = biometricsStr === 'true';

            if (credentials) {
                set({ appPin: credentials.password, biometricsEnabled, isLocked: true });
            } else {
                set({ appPin: null, biometricsEnabled: false, isLocked: false });
            }
        } catch (error) {
            console.error('Failed to init auth store', error);
        }
    },

    setPin: async (pin: string) => {
        await Keychain.setGenericPassword('user', pin, { service: 'app_pin' });
        set({ appPin: pin, isLocked: false });
    },

    removePin: async () => {
        await Keychain.resetGenericPassword({ service: 'app_pin' });
        await AsyncStorage.setItem('biometrics_enabled', 'false');
        set({ appPin: null, biometricsEnabled: false, isLocked: false });
    },

    setBiometricsEnabled: async (enabled: boolean) => {
        await AsyncStorage.setItem('biometrics_enabled', enabled ? 'true' : 'false');
        set({ biometricsEnabled: enabled });
    },

    unlockWithPin: (pin: string) => {
        const { appPin } = get();
        if (appPin === pin) {
            set({ isLocked: false });
            return true;
        }
        return false;
    },

    unlockWithBiometrics: async () => {
        try {
            const result = await Keychain.getGenericPassword({
                service: 'app_pin',
                authenticationPrompt: { title: 'Unlock Pocket Log' },
                accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
            });
            if (result) {
                set({ isLocked: false });
                return true;
            }
        } catch (error) {
            console.log('Biometric auth failed or canceled', error);
        }
        return false;
    },

    lockApp: () => {
        const { appPin } = get();
        if (appPin) {
            set({ isLocked: true });
        }
    }
}));
