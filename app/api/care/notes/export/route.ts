import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { CaseNoteService } from "@/lib/services/care/case-note-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const carePlanId = searchParams.get("carePlanId") || undefined;
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : new Date();

    const service = new CaseNoteService();
    const notes = await service.getNotesForExport({
      carePlanId,
      startDate,
      endDate,
    });

    // Generate PDF content (simplified - in production, use a PDF library like pdfkit or puppeteer)
    const pdfContent = generatePDFContent(notes);

    return new NextResponse(pdfContent, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="case-notes-${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error exporting case notes:", error);
    return NextResponse.json(
      { error: "Failed to export case notes" },
      { status: 500 }
    );
  }
}

function generatePDFContent(notes: any[]): string {
  // Simplified PDF generation - in production, use a proper PDF library
  // This is a placeholder that returns a text representation
  let content = "Case Notes Export\n";
  content += "==================\n\n";

  notes.forEach((note, index) => {
    content += `Note ${index + 1}\n`;
    content += `Date: ${new Date(note.date).toLocaleString()}\n`;
    content += `Type: ${note.type}\n`;
    content += `Worker: ${note.worker}\n`;
    content += `Participant: ${note.participant}\n`;
    content += `Content:\n${note.content}\n`;
    content += "\n---\n\n";
  });

  // In production, convert this to actual PDF using a library
  // For now, return as text/plain
  return content;
}
