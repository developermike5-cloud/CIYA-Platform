/**
 * Stateless Google Authenticator Model (Option A)
 * 
 * Rotates every 15 minutes (900,000ms), calculating a deterministic 
 * 6-digit passcode without any database writes.
 */

export const DEFAULT_ADVANCED_PASSCODE_SECRET = 'CIYA_ADVANCED_PASSCODE_SECRET_2026';

/**
 * Deterministically generates a 6-digit code for a given secret and time slot.
 * @param secret Shared passcode secret phrase
 * @param intervalMs Time interval in milliseconds (default is 15 minutes)
 * @param offset Number of intervals to offset (positive or negative)
 */
export function generateTimeBasedCode(
  secret: string,
  intervalMs: number = 900000,
  offset: number = 0
): string {
  const cleanSecret = (secret || DEFAULT_ADVANCED_PASSCODE_SECRET).trim();
  const timeFactor = Math.floor(Date.now() / intervalMs) + offset;
  const input = `${cleanSecret}_${timeFactor}`;

  // 1. FNV-1a 32-bit Hash
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  // 2. MurmurHash3 32-bit Finalizer Mix for avalanche effect
  // This ensures a 1-bit difference in input produces completely scrambled, non-sequential outputs.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;

  // Generate exactly a positive 6-digit number between 100000 and 999999
  const codeNum = Math.abs(hash | 0) % 900000 + 100000;
  return codeNum.toString();
}

/**
 * Validates if the input code matches the active time slots, or direct administrative secret / access code.
 */
export function verifyTimeBasedCode(
  inputCode: string,
  secret: string,
  intervalMs: number = 900000
): boolean {
  const cleanCode = (inputCode || '').trim();
  if (!cleanCode) return false;

  const targetSecret = (secret || DEFAULT_ADVANCED_PASSCODE_SECRET).trim();

  // 1. Direct match with configured secret or master access keys (case-insensitive)
  if (cleanCode.toLowerCase() === targetSecret.toLowerCase()) {
    return true;
  }
  if (cleanCode.toLowerCase() === DEFAULT_ADVANCED_PASSCODE_SECRET.toLowerCase()) {
    return true;
  }
  if (cleanCode.toUpperCase() === 'CIYA2026' || cleanCode.toUpperCase() === 'ADVANCED2026') {
    return true;
  }

  // 2. Numeric 6-digit rolling code check across clock drift window [-8 .. 8] (~2 hours buffer)
  const normalizedDigits = cleanCode.replace(/\s+/g, '');
  if (/^\d{6}$/.test(normalizedDigits)) {
    const offsets = [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6, -7, 7, -8, 8];
    
    // Check with the configured secret
    for (const offset of offsets) {
      const candidateCode = generateTimeBasedCode(targetSecret, intervalMs, offset);
      if (candidateCode === normalizedDigits) {
        return true;
      }
    }

    // Also check with default secret if targetSecret was customized but user generated code with default
    if (targetSecret !== DEFAULT_ADVANCED_PASSCODE_SECRET) {
      for (const offset of offsets) {
        const candidateCode = generateTimeBasedCode(DEFAULT_ADVANCED_PASSCODE_SECRET, intervalMs, offset);
        if (candidateCode === normalizedDigits) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Calculates the remaining time (in seconds) until the active passcode rotates.
 */
export function getPasscodeSecondsLeft(intervalMs: number = 900000): number {
  const nextRotationTime = (Math.floor(Date.now() / intervalMs) + 1) * intervalMs;
  return Math.max(0, Math.floor((nextRotationTime - Date.now()) / 1000));
}

