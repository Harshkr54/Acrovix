/**
 * Generates uppercase initials for a user's display name.
 * 
 * Rules:
 * - First character of first name + first character of last name for multi-word names ("Vineet Roy" -> "VR", "John Michael Doe" -> "JD")
 * - First two characters for single-word names ("Vineet" -> "VI", "John" -> "JO")
 * - Single letter names ("V" -> "V")
 * - Whitespace trimming and multiple space handling
 * - Fallback to "U" for empty/null/invalid input
 */
export const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'U';
    const trimmed = name.trim();
    if (!trimmed) return 'U';

    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
        return trimmed.length === 1 ? trimmed.toUpperCase() : trimmed.slice(0, 2).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};
