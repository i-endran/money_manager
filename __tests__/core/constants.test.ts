import { CURRENCIES, THEME_OPTIONS } from '../../src/core/constants';
import { ThemeMode } from '../../src/core/constants';

describe('Core Constants', () => {
    describe('CURRENCIES', () => {
        it('should have unique currency codes', () => {
            const codes = CURRENCIES.map(c => c.code);
            const uniqueCodes = new Set(codes);
            expect(uniqueCodes.size).toBe(codes.length);
        });

        it('should have required properties (code, symbol, name)', () => {
            CURRENCIES.forEach(currency => {
                expect(currency).toHaveProperty('code');
                expect(currency).toHaveProperty('symbol');
                expect(currency).toHaveProperty('name');
                expect(typeof currency.code).toBe('string');
                expect(typeof currency.symbol).toBe('string');
                expect(typeof currency.name).toBe('string');
            });
        });
    });

    describe('THEME_OPTIONS', () => {
        it('should contain system, light, and dark modes', () => {
            const values = THEME_OPTIONS.map(t => t.value);
            expect(values).toContain(ThemeMode.SYSTEM);
            expect(values).toContain(ThemeMode.LIGHT);
            expect(values).toContain(ThemeMode.DARK);
        });

        it('should have value and label properties for UI pickers', () => {
            THEME_OPTIONS.forEach(option => {
                expect(option).toHaveProperty('value');
                expect(option).toHaveProperty('label');
                expect(typeof option.label).toBe('string');
            });
        });
    });
});
