// src/utils/plate.ts

/**
 * Normalizes any Kenyan number plate string to standard uppercase with single space.
 * Examples:
 * - "kda123a"  -> "KDA 123A"
 * - "kda-123a" -> "KDA 123A"
 * - " KDA  123A " -> "KDA 123A"
 */
export const normalizeKenyanPlate = (plate: string): string => {
    if (!plate) return plate;

    // 1. Convert to uppercase and strip dashes/extra spaces
    const cleaned = plate.toUpperCase().replace(/[\s\-]/g, '');

    // 2. Standard Kenyan plates have 7 characters: 3 letters, 3 digits, 1 letter (e.g. KDA123A)
    if (/^[A-Z]{3}\d{3}[A-Z]$/.test(cleaned)) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    }

    return cleaned;
};

/**
 * Validates if a plate matches the official Kenyan NTSA format:
 * Exactly 3 uppercase letters starting with 'K', followed by a space,
 * 3 digits, and 1 letter (e.g. "KDA 123A", "KCA 001B").
 */
export const isValidKenyanPlate = (plate: string): boolean => {
    const normalized = normalizeKenyanPlate(plate);
    return /^K[A-Z]{2}\s\d{3}[A-Z]$/.test(normalized);
};

/**
 * Privacy Shield (Loophole #2 Defense):
 * Masks plate numbers for public passports to prevent car cloning & tracking.
 * Example: "KDA 450P" -> "KD* ***P"
 */
export const maskPlateNumber = (plate: string): string => {
    const normalized = normalizeKenyanPlate(plate);
    if (!isValidKenyanPlate(normalized)) return '*** ****';

    // "KDA 450P" -> "KD* ***P"
    const prefix = normalized.slice(0, 2); // "KD"
    const suffix = normalized.slice(-1);   // "P"
    return `${prefix}* ***${suffix}`;
};

/**
 * Masks Chassis/VIN numbers to show only the last 4 characters.
 * Example: "ZRE142-9012345" -> "...2345"
 */
export const maskChassisNumber = (chassis?: string): string => {
    if (!chassis || chassis.length < 4) return '...****';
    return `...${chassis.slice(-4)}`;
};
