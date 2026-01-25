/**
 * Worker Verification Store (In-Memory)
 * 
 * NOTE: This is a temporary in-memory implementation.
 * Phase 2 will migrate to database-backed storage using VerificationRecord model.
 * 
 * @deprecated This service is being phased out in favor of database-backed verification.
 * Use VerificationRecord model and VerificationOrchestrator instead.
 */

interface WorkerVerification {
  workerId: string;
  verifiedBy: string;
  verifiedAt: Date;
  notes?: string;
  status: "pending" | "approved" | "rejected";
}

/**
 * In-memory store for worker verification status
 * Will be replaced with database in Phase 2
 */
const verificationStore = new Map<string, WorkerVerification>();

export class WorkerVerificationStore {
  /**
   * Get verification status for a worker
   */
  static getVerification(workerId: string): WorkerVerification | null {
    return verificationStore.get(workerId) || null;
  }

  /**
   * Create or update verification
   */
  static setVerification(verification: WorkerVerification): void {
    verificationStore.set(verification.workerId, verification);
  }

  /**
   * Get all pending verifications
   */
  static getPendingVerifications(): WorkerVerification[] {
    return Array.from(verificationStore.values()).filter(
      (v) => v.status === "pending"
    );
  }

  /**
   * Get all verifications by admin
   */
  static getVerificationsByAdmin(adminId: string): WorkerVerification[] {
    return Array.from(verificationStore.values()).filter(
      (v) => v.verifiedBy === adminId
    );
  }

  /**
   * Delete verification
   */
  static deleteVerification(workerId: string): boolean {
    return verificationStore.delete(workerId);
  }

  /**
   * Get all verifications
   */
  static getAllVerifications(): WorkerVerification[] {
    return Array.from(verificationStore.values());
  }
}
