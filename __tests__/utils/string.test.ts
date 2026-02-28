import { splitEmoji } from '../../src/core/utils/string';

describe('splitEmoji', () => {
    it('splits emoji prefix from text correctly', () => {
        expect(splitEmoji('🍕 Food')).toEqual({ emoji: '🍕', text: 'Food' });
        expect(splitEmoji('🍔 Burger')).toEqual({ emoji: '🍔', text: 'Burger' });
    });

    it('uses default emoji when no prefix is found', () => {
        expect(splitEmoji('Groceries')).toEqual({ emoji: '💰', text: 'Groceries' });
        expect(splitEmoji('Rent', '🏠')).toEqual({ emoji: '🏠', text: 'Rent' });
    });

    it('handles empty or null strings', () => {
        expect(splitEmoji('', '💰')).toEqual({ emoji: '💰', text: '' });
        expect(splitEmoji(null as any, '💰')).toEqual({ emoji: '💰', text: '' });
    });

    it('handles strings with only emoji', () => {
        expect(splitEmoji('🎉')).toEqual({ emoji: '🎉', text: '' });
    });

    it('handles compound emoji sequences (like flags)', () => {
        // Flag emoji are often two regional indicator symbols
        expect(splitEmoji('🇮🇳 India')).toEqual({ emoji: '🇮🇳', text: 'India' });
    });
});
