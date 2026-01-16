import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VerificationOrchestrator } from "@/lib/services/verification/orchestrator";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const signature = req.headers.get("x-signature") || req.headers.get("x-webhook-signature");

    // Verify webhook signature if configured
    const webhookSecret = process.env.OHO_WEBHOOK_SECRET;
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

    const { request_id, status, verified, barred, expiry_date, state, card_number } = body;

    if (!request_id) {
      return NextResponse.json(
        { error: "Missing request_id" },
        { status: 400 }
      );
    }

    // Find verification record by provider request ID
    const verification = await prisma.verificationRecord.findFirst({
      where: {
        providerRequestId: request_id,
        verificationType: "WWCC",
      },
      include: {
        worker: true,
      },
    });

    if (!verification) {
      console.warn(`Oho webhook: Verification not found for request_id: ${request_id}`);
      return NextResponse.json({ received: true });
    }

    // Map Oho status to our status
    let verificationStatus: "VERIFIED" | "FAILED" | "EXPIRED" | "SUSPENDED" | "IN_PROGRESS" =
      "IN_PROGRESS";

    if (verified === true || status === "cleared") {
      verificationStatus = "VERIFIED";
    } else if (barred === true || status === "barred") {
      verificationStatus = "FAILED";
    } else if (status === "expired") {
      verificationStatus = "EXPIRED";
    } else if (status === "suspended") {
      verificationStatus = "SUSPENDED";
    }

    // Update verification record
    await prisma.verificationRecord.update({
      where: { id: verification.id },
      data: {
        status: verificationStatus,
        verifiedAt:
          verificationStatus === "VERIFIED" ? new Date() : verification.verifiedAt,
        expiresAt: expiry_date ? new Date(expiry_date) : verification.expiresAt,
        providerResponse: body as any,
        metadata: {
          state,
          cardNumber: card_number,
          status,
        } as any,
        updatedAt: new Date(),
      },
    });

    // Update worker status
    const orchestrator = new VerificationOrchestrator();
    await orchestrator["updateWorkerStatus"](verification.workerId);

    // Create alert if status changed
    if (
      verification.status !== verificationStatus &&
      (verificationStatus === "EXPIRED" ||
        verificationStatus === "FAILED" ||
        verificationStatus === "SUSPENDED")
    ) {
      await prisma.verificationAlert.create({
        data: {
          workerId: verification.workerId,
          verificationRecordId: verification.id,
          alertType:
            verificationStatus === "EXPIRED"
              ? "VERIFICATION_EXPIRED"
              : verificationStatus === "FAILED"
              ? "VERIFICATION_FAILED"
              : "STATUS_CHANGED",
          message: `WWCC verification ${verificationStatus.toLowerCase()}`,
        },
      });
    }

    return NextResponse.json({ received: true, updated: true });
  } catch (error) {
    console.error("Oho webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
