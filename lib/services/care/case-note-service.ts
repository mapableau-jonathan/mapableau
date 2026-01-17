import { prisma } from "../../prisma";
import type { CareNoteType } from "@prisma/client";

export interface CreateCareNoteData {
  carePlanId: string;
  workerId: string;
  noteType: CareNoteType;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCareNoteData {
  content?: string;
  metadata?: Record<string, unknown>;
}

export class CaseNoteService {
  /**
   * Create a new case note
   */
  async createCareNote(data: CreateCareNoteData) {
    const note = await prisma.careNote.create({
      data: {
        carePlanId: data.carePlanId,
        workerId: data.workerId,
        noteType: data.noteType,
        content: data.content,
        metadata: data.metadata as any,
      },
      include: {
        carePlan: {
          include: {
            participant: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        worker: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return note;
  }

  /**
   * Get case note by ID
   */
  async getCareNote(noteId: string) {
    const note = await prisma.careNote.findUnique({
      where: { id: noteId },
      include: {
        carePlan: {
          include: {
            participant: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        worker: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return note;
  }

  /**
   * Get all case notes with filters
   */
  async getCareNotes(filters?: {
    carePlanId?: string;
    workerId?: string;
    noteType?: CareNoteType;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters?.carePlanId) {
      where.carePlanId = filters.carePlanId;
    }

    if (filters?.workerId) {
      where.workerId = filters.workerId;
    }

    if (filters?.noteType) {
      where.noteType = filters.noteType;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const notes = await prisma.careNote.findMany({
      where,
      include: {
        carePlan: {
          include: {
            participant: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        worker: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return notes;
  }

  /**
   * Update case note
   */
  async updateCareNote(noteId: string, data: UpdateCareNoteData) {
    const note = await prisma.careNote.update({
      where: { id: noteId },
      data: {
        content: data.content,
        metadata: data.metadata as any,
      },
    });

    return note;
  }

  /**
   * Delete case note
   */
  async deleteCareNote(noteId: string) {
    await prisma.careNote.delete({
      where: { id: noteId },
    });
  }

  /**
   * Get notes for export (for NDIS reporting)
   */
  async getNotesForExport(filters: {
    carePlanId?: string;
    startDate: Date;
    endDate: Date;
  }) {
    const notes = await this.getCareNotes({
      carePlanId: filters.carePlanId,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    // Format for export
    return notes.map((note) => ({
      id: note.id,
      date: note.createdAt,
      type: note.noteType,
      content: note.content,
      worker: note.worker.user.name || note.worker.user.email,
      participant: note.carePlan.participant.name || note.carePlan.participant.email,
      metadata: note.metadata,
    }));
  }
}
