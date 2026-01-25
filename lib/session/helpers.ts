/**
 * Session Helper Functions
 * Wrapper functions for iron-session operations
 */

import { getIronSession } from "iron-session";
import { NextRequest, NextResponse } from "next/server";
import { SessionData, sessionOptions } from "./config";

/**
 * Get session from request
 */
export async function getSession(req: NextRequest, res?: NextResponse): Promise<SessionData> {
  // For Next.js Pages Router API routes
  if (req && typeof (req as any).cookies !== "undefined") {
    const session = await getIronSession<SessionData>(req as any, res as any, sessionOptions);
    return session || { isLoggedIn: false };
  }
  
  // Fallback for App Router
  return { isLoggedIn: false };
}

/**
 * Save session data
 */
export async function saveSession(
  req: NextRequest,
  res: NextResponse,
  data: SessionData
): Promise<void> {
  const session = await getIronSession<SessionData>(req as any, res as any, sessionOptions);
  Object.assign(session, data);
  await session.save();
}

/**
 * Destroy session
 */
export async function destroySession(req: NextRequest, res: NextResponse): Promise<void> {
  const session = await getIronSession<SessionData>(req as any, res as any, sessionOptions);
  session.destroy();
}
