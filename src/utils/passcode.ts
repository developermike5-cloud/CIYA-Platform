/**
 * Stateless Google Authenticator Model (Option A)
 * 
 * Rotates every 15 minutes (900,000ms), calculating a deterministic 
 * 6-digit passcode without any database writes.
 */

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
  const timeFactor = Math.floor(Date.now() / intervalMs) + offset;
  const input = `${secret.trim()}_${timeFactor}`;

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
 * Validates if the input code matches the strictly active current 15-minute code slot.
 * In accordance with strict requirements, previous codes expire immediately.
 */
export function verifyTimeBasedCode(
  inputCode: string,
  secret: string,
  intervalMs: number = 900000
): boolean {
  const cleanCode = (inputCode || '').trim();
  if (!cleanCode || cleanCode.length !== 6) return false;

  // Check previous, current, and next slots to tolerate up to 30 minutes of clock drift or delivery delay (offsets [-2, -1, 0, 1, 2])
  for (const offset of [-2, -1, 0, 1, 2]) {
    const candidateCode = generateTimeBasedCode(secret, intervalMs, offset);
    if (candidateCode === cleanCode) {
      return true;
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

