/**
 * SAML SSO Endpoint
 * Initiates SAML SSO flow
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ServiceId } from "@/lib/services/auth/service-registry";

/**
 * GET /api/auth/sso/saml
 * Initiate SAML SSO
 */
export async function GET(request: NextRequest) {
  try {
    const serviceId = request.nextUrl.searchParams.get("serviceId") || "mapable";
    const callbackUrl = request.nextUrl.searchParams.get("callback") || "/dashboard";

    // Use SAML service for comprehensive SAML SSO
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/sso/saml/route.ts:20',message:'importing SAML service',data:{serviceId,callbackUrl,hypothesis:'B'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const { initiateSAML } = await import("@/lib/services/auth/saml-service");
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/sso/saml/route.ts:22',message:'calling initiateSAML',data:{hasInitiateSAML:typeof initiateSAML==='function',hypothesis:'B'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const result = await initiateSAML(serviceId as ServiceId, callbackUrl);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/sso/saml/route.ts:25',message:'initiateSAML result',data:{success:result?.success,hasRedirectUrl:!!result?.redirectUrl,error:result?.error,hypothesis:'B'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (!result.success || !result.redirectUrl) {
      logger.error("SAML initiation failed", { serviceId, error: result.error });
      return NextResponse.json(
        { 
          error: result.error || "SAML SSO initiation failed",
          message: result.error?.includes("not configured") 
            ? "SAML is not configured. Please set SAML_ENTRY_POINT environment variable."
            : "Failed to initiate SAML SSO"
        },
        { status: result.error?.includes("not configured") ? 503 : 500 } // 503 Service Unavailable if not configured
      );
    }

    // Redirect to IdP SSO endpoint with SAMLRequest
    return NextResponse.redirect(result.redirectUrl);
  } catch (error) {
    logger.error("SAML SSO endpoint error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SSO failed" },
      { status: 500 }
    );
  }
}
