// PBKDF2-HMAC-SHA256 600.000 iterasi via Web Crypto (PRD 7.2, FR-12).
import { constantTimeEqual } from "./internal.ts";

const ITERATIONS = 600_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const out = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function deriveBits(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const bits = await deriveBits(password, salt, ITERATIONS);
  return `pbkdf2_sha256$${ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;
  const salt = base64ToBytes(parts[2] as string);
  const expected = parts[3] as string;
  const bits = await deriveBits(password, salt, iterations);
  return constantTimeEqual(bytesToBase64(bits), expected);
}

const TEMP_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// Password sementara 12 karakter kriptografis (PRD 7.8.2).
export function generateTempPassword(length = 12): string {
  const max = 256 - (256 % TEMP_ALPHABET.length);
  let out = "";
  while (out.length < length) {
    const random = crypto.getRandomValues(new Uint8Array(1));
    if ((random[0] as number) >= max) continue;
    out += TEMP_ALPHABET[(random[0] as number) % TEMP_ALPHABET.length];
  }
  return out;
}
