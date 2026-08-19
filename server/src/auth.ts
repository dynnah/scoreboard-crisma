import { timingSafeEqual } from "crypto";

// Proteção por senha (HTTP Basic Auth) só entra em ação se AUTH_PASSWORD
// estiver definida no ambiente (ex: no deploy). Localmente, sem essa
// variável, o app continua 100% sem senha — como no uso offline do evento.
const AUTH_USER = process.env.AUTH_USER || "crisma";
const AUTH_PASSWORD = process.env.AUTH_PASSWORD;

export const authEnabled = Boolean(AUTH_PASSWORD);

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function isAuthorized(authHeader: string | undefined): boolean {
  if (!AUTH_PASSWORD) return true;
  if (!authHeader?.startsWith("Basic ")) return false;

  const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return false;

  const user = decoded.slice(0, separatorIndex);
  const pass = decoded.slice(separatorIndex + 1);
  return safeCompare(user, AUTH_USER) && safeCompare(pass, AUTH_PASSWORD);
}
