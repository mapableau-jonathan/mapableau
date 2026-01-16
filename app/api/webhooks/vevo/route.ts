import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VerificationOrchestrator } from "@/lib/services/verification/orchestrator";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const signature = req.headers.get("x-signature") || req.headers.get("x-webhook-signature");

    // Verify webhook signature if configured
    const webhookSecret = process.env.VEVO_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(body))
        .digest("hex");

      if (signature !== expectedSignature) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const { requestId, status, workerId, visaStatus, visaExpiryDate } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: "Missing requestId" },
        { status: 400 }
      );
    }

    // Find verification record by provider request ID
    const verification = await prisma.verificationRecord.findFirst({
      where: {
        providerRequestId: requestId,
        verificationType: "VEVO",
      },
      include: {
        worker: true,
      },
    });

    if (!verification) {
      console.warn(`VEVO webhook: Verification not found for requestId: ${requestId}`);
      return NextResponse.json({ received: true });
    }

    // Map provider status to our status
    let verificationStatus: "VERIFIED" | "FAILED" | "EXPIRED" | "SUSPENDED" | "IN_PROGRESS" =
      "IN_PROGRESS";

    if (status === "verified" || visaStatus === "valid") {
      verificationStatus = "VERIFIED";
    } else if (status === "expired" || visaStatus === "expired") {
      verificationStatus = "EXPIRED";
    } else if (status === "invalid" || visaStatus === "invalid") {
      verificationStatus = "FAILED";
    } else if (status === "suspended" || visaStatus === "suspended") {
      verificationStatus = "SUSPENDED";
    }

    // Update verification record
    await prisma.verificationRecord.update({
      where: { id: verification.id },
      data: {
        status: verificationStatus,
        verifiedAt:
          verificationStatus === "VERIFIED" ? new Date() : verification.verifiedAt,
        expiresAt: visaExpiryDate ? new Date(visaExpiryDate) : verification.expiresAt,
        providerResponse: body as any,
        updatedAt: new Date(),
      },
    });

    // Update worker status
    const orchestrator = new VerificationOrchestrator();
    await orchestrator["updateWorkerStatus"](verification.workerId);

    // Create alert if status changed to expired or failed
    if (verificationStatus === "EXPIRED" || verificationStatus === "FAILED") {
      await prisma.verificationAlert.create({
        data: {
          workerId: verification.workerId,
          verificationRecordId: verification.id,
          alertType:
            verificationStatus === "EXPIRED" ? "VERIFICATION_EXPIRED" : "VERIFICATION_FAILED",
          message: `VEVO verification ${verificationStatus.toLowerCase()}`,
        },
      });
    }

    return NextResponse.json({ received: true, updated: true });
  } catch (error) {
    console.error("VEVO webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
