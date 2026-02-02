// app/api/auth/[...nextauth]/route.ts
// Force Node.js runtime (required for argon2 native module when dynamically imported)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// #region agent log
fetch('http://127.0.0.1:7244/ingest/510e022a-f6c2-4922-b4b2-86241c2b89fa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:1',message:'NextAuth route loading',data:{hasArgon2Import:false,usesConfigFile:true},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
// #endregion

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/nextauth-config";

// Re-export authOptions for backward compatibility
export { authOptions };

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
