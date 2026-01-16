import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { VerificationOrchestrator } from "@/lib/services/verification/orchestrator";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const onboardSchema = z.object({
  role: z.string().optional(),
  employerId: z.string().optional(),
  identity: z.object({
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string(),
    documentType: z.enum(["drivers_licence", "passport"]),
    documentNumber: z.string(),
    state: z.string().optional(),
    expiryDate: z.string().optional(),
  }),
  vevo: z.object({
    passportNumber: z.string(),
    dateOfBirth: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    visaGrantNumber: z.string().optional(),
    transactionReferenceNumber: z.string().optional(),
  }).optional(),
  wwcc: z.object({
    wwccNumber: z.string(),
    state: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string(),
    expiryDate: z.string().optional(),
  }).optional(),
  ndis: z.object({
    screeningId: z.string().optional(),
    applicationId: z.string().optional(),
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string(),
    employerId: z.string(),
  }).optional(),
  firstAid: z.object({
    certificateNumber: z.string().optional(),
    rtoNumber: z.string().optional(),
    unitCode: z.string().optional(),
    issueDate: z.string().optional(),
    expiryDate: z.string().optional(),
    usiNumber: z.string().optional(),
  }).optional(),
  documents: z.array(z.object({
    type: z.string(),
    fileUrl: z.string(),
    metadata: z.record(z.unknown()).optional(),
  })).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = onboardSchema.parse(body);

    // Check if worker already exists
    let worker = await prisma.worker.findUnique({
      where: { userId: session.user.id },
    });

    if (!worker) {
      // Create worker record
      worker = await prisma.worker.create({
        data: {
          userId: session.user.id,
          role: validated.role,
          employerId: validated.employerId,
          status: "PENDING_ONBOARDING",
          onboardingStatus: "IN_PROGRESS",
        },
      });
    } else {
      // Update existing worker
      worker = await prisma.worker.update({
        where: { id: worker.id },
        data: {
          role: validated.role,
          employerId: validated.employerId,
          onboardingStatus: "IN_PROGRESS",
        },
      });
    }

    // Initiate verifications
    const orchestrator = new VerificationOrchestrator();
    const results = await orchestrator.initiateAllVerifications(
      worker.id,
      {
        identity: validated.identity,
        vevo: validated.vevo,
        wwcc: validated.wwcc,
        ndis: validated.ndis,
        firstAid: validated.firstAid,
      },
      validated.documents
    );

    return NextResponse.json({
      success: true,
      workerId: worker.id,
      verifications: results,
      onboardingStatus: worker.onboardingStatus,
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to onboard worker" },
      { status: 500 }
    );
  }
}
