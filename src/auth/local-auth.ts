/**
 * Local authentication utilities using Web Crypto API (PBKDF2).
 * Works entirely in the browser — no server required.
 */

const ITERATIONS = 100_000;
const KEY_LENGTH = 256;
const HASH_ALGO = "SHA-256";

/**
 * Generate a random ID (nanoid-style, 21 chars).
 */
export function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 21);
}

/**
 * Hash a password using PBKDF2 with a random salt.
 */
export async function hashPassword(
  password: string
): Promise<{ hash: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt, (b) => b.toString(16).padStart(2, "0")).join(
    ""
  );

  const hash = await deriveKey(password, salt);
  return { hash, salt: saltHex };
}

/**
 * Verify a password against a stored hash + salt.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  const salt = hexToBytes(storedSalt);
  const hash = await deriveKey(password, salt);
  return hash === storedHash;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: HASH_ALGO,
    },
    keyMaterial,
    KEY_LENGTH
  );

  return Array.from(new Uint8Array(bits), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
