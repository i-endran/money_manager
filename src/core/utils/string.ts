/**
 * Extract leading emoji from a string like "🍕 Food" → { emoji: "🍕", text: "Food" }
 * If no emoji is found, returns a default emoji and the original text.
 */
export function splitEmoji(name: string, defaultEmoji: string = '💰'): { emoji: string; text: string } {
    if (!name) return { emoji: defaultEmoji, text: '' };

    // Match emoji at the start (handles flags, variation selectors, and presentation)
    const emojiRegex = /^([\u{1F1E6}-\u{1F1FF}]{2}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u;
    const match = name.match(emojiRegex);

    if (match) {
        return {
            emoji: match[0],
            text: name.slice(match[0].length).trim(),
        };
    }

    return { emoji: defaultEmoji, text: name.trim() };
}
