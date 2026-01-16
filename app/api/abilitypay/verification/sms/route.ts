/**
 * SMS Verification API
 * POST /api/abilitypay/verification/sms/send - Send SMS verification code
 * POST /api/abilitypay/verification/sms/verify - Verify SMS code
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { TwilioSMSService } from "@/lib/services/verification";
import { z } from "zod";

const smsService = new TwilioSMSService({
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  fromNumber: process.env.TWILIO_PHONE_NUMBER,
  verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
});

const sendSMSSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  purpose: z.enum(["payment", "login", "verification", "other"]).optional(),
});

const verifySMSSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  code: z.string().regex(/^\d{6}$/, "Verification code must be 6 digits"),
  verificationId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "send";

    if (action === "send") {
      const body = await request.json();
      const data = sendSMSSchema.parse(body);

      const result = await smsService.sendVerificationCode({
        phoneNumber: data.phoneNumber,
        userId: session.user.id,
        purpose: data.purpose || "verification",
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to send verification code" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        verificationId: result.verificationId,
        expiresAt: result.expiresAt,
        message: "Verification code sent successfully",
      });
    }

    if (action === "verify") {
      const body = await request.json();
      const data = verifySMSSchema.parse(body);

      const result = await smsService.verifyCode({
        phoneNumber: data.phoneNumber,
        code: data.code,
        verificationId: data.verificationId,
      });

      if (!result.valid) {
        return NextResponse.json(
          { error: result.error || "Invalid verification code" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        verified: true,
        verifiedAt: result.verifiedAt,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to process SMS verification" },
      { status: 500 }
    );
  }
}
