import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parse JSON from a fetch Response. Avoids "Unexpected end of JSON input"
 * when the response body is empty or not JSON.
 */
export async function parseResponseJson<T = unknown>(
  res: Response
): Promise<T | null> {
  const text = await res.text();
  if (!text || !text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
