import { prisma } from "../../prisma";

export interface CreateTrainingRecordData {
  workerId: string;
  trainingType: string;
  trainingName: string;
  provider?: string;
  completedAt: Date;
  expiryDate?: Date;
  certificateNumber?: string;
  competencyLevel?: string;
  notes?: string;
}

export interface UpdateTrainingRecordData {
  trainingType?: string;
  trainingName?: string;
  provider?: string;
  completedAt?: Date;
  expiryDate?: Date;
  certificateNumber?: string;
  competencyLevel?: string;
  notes?: string;
}

export class TrainingService {
  /**
   * Create a new training record
   */
  async createTrainingRecord(data: CreateTrainingRecordData) {
    const record = await prisma.trainingRecord.create({
      data: {
        workerId: data.workerId,
        trainingType: data.trainingType,
        trainingName: data.trainingName,
        provider: data.provider,
        completedAt: data.completedAt,
        expiryDate: data.expiryDate,
        certificateNumber: data.certificateNumber,
        competencyLevel: data.competencyLevel,
        notes: data.notes,
      },
      include: {
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

    return record;
  }

  /**
   * Get training record by ID
   */
  async getTrainingRecord(recordId: string) {
    const record = await prisma.trainingRecord.findUnique({
      where: { id: recordId },
      include: {
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

    return record;
  }

  /**
   * Get all training records for a worker
   */
  async getWorkerTrainingRecords(workerId: string) {
    const records = await prisma.trainingRecord.findMany({
      where: { workerId },
      orderBy: {
        completedAt: "desc",
      },
    });

    return records;
  }

  /**
   * Get all training records with filters
   */
  async getTrainingRecords(filters?: {
    workerId?: string;
    trainingType?: string;
    competencyLevel?: string;
  }) {
    const where: any = {};

    if (filters?.workerId) {
      where.workerId = filters.workerId;
    }

    if (filters?.trainingType) {
      where.trainingType = filters.trainingType;
    }

    if (filters?.competencyLevel) {
      where.competencyLevel = filters.competencyLevel;
    }

    const records = await prisma.trainingRecord.findMany({
      where,
      include: {
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
        completedAt: "desc",
      },
    });

    return records;
  }

  /**
   * Update training record
   */
  async updateTrainingRecord(
    recordId: string,
    data: UpdateTrainingRecordData
  ) {
    const record = await prisma.trainingRecord.update({
      where: { id: recordId },
      data,
    });

    return record;
  }

  /**
   * Get training records expiring soon
   */
  async getExpiringTrainingRecords(days: number = 90) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const records = await prisma.trainingRecord.findMany({
      where: {
        expiryDate: {
          lte: futureDate,
          gte: new Date(), // Not already expired
        },
      },
      include: {
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
        expiryDate: "asc",
      },
    });

    return records;
  }

  /**
   * Get training matrix (training by worker and type)
   */
  async getTrainingMatrix() {
    const records = await prisma.trainingRecord.findMany({
      include: {
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

    // Group by worker and training type
    const matrix: Record<
      string,
      Record<string, { record: any; expired: boolean }>
    > = {};

    records.forEach((record) => {
      const workerId = record.workerId;
      const trainingType = record.trainingType;

      if (!matrix[workerId]) {
        matrix[workerId] = {};
      }

      const expired =
        record.expiryDate !== null && record.expiryDate < new Date();

      matrix[workerId][trainingType] = {
        record,
        expired,
      };
    });

    return matrix;
  }

  /**
   * Validate competency
   */
  async validateCompetency(workerId: string, trainingType: string): Promise<{
    valid: boolean;
    record?: any;
    expired?: boolean;
    message?: string;
  }> {
    const record = await prisma.trainingRecord.findFirst({
      where: {
        workerId,
        trainingType,
      },
      orderBy: {
        completedAt: "desc",
      },
    });

    if (!record) {
      return {
        valid: false,
        message: "No training record found",
      };
    }

    if (record.expiryDate && record.expiryDate < new Date()) {
      return {
        valid: false,
        record,
        expired: true,
        message: "Training has expired",
      };
    }

    return {
      valid: true,
      record,
      expired: false,
    };
  }
}
