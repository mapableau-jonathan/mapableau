import { createHmac, randomBytes } from "node:crypto";

const SECRET = process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET ?? "";
const SEPARATOR = ".";

export type ClaimTokenPayload = {
  claimedProviderId: string;
  email: string;
  exp: number;
};

/** Sign a claim token for email verification. */
export function signClaimToken(payload: Omit<ClaimTokenPayload, "exp">): string {
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days
  const full: ClaimTokenPayload = { ...payload, exp };
  const encoded = Buffer.from(JSON.stringify(full), "utf8").toString("base64url");
  const sig = createHmac("sha256", SECRET).update(encoded).digest("base64url");
  return `${encoded}${SEPARATOR}${sig}`;
}

/** Verify and decode a claim token. Returns payload or null if invalid. */
export function verifyClaimToken(token: string): ClaimTokenPayload | null {
  if (!SECRET) return null;
  const idx = token.lastIndexOf(SEPARATOR);
  if (idx === -1) return null;
  const encoded = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = createHmac("sha256", SECRET).update(encoded).digest("base64url");
  if (sig !== expected) return null;
  try {
    const raw = Buffer.from(encoded, "base64url").toString("utf8");
    const payload = JSON.parse(raw) as ClaimTokenPayload;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Generate a random token for verification (e.g. stored on ClaimedProvider). */
export function generateVerificationToken(): string {
  return randomBytes(32).toString("hex");
}
