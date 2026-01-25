/**
 * Public Worker Directory Tests
 * Ensures sensitive data is never exposed
 */

import { describe, it, expect } from "@jest/globals";

describe("Public Worker Directory", () => {
  it("should only return verified workers", async () => {
    const response = await fetch("/api/workers/public");
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.workers).toBeDefined();
    
    // All workers should be verified
    data.workers.forEach((worker: any) => {
      expect(worker.status).toBe("VERIFIED");
    });
  });

  it("should not expose sensitive verification evidence", async () => {
    const response = await fetch("/api/workers/public");
    const data = await response.json();

    expect(response.status).toBe(200);
    
    // Check that sensitive fields are not present
    data.workers.forEach((worker: any) => {
      // User should not have email
      expect(worker.user.email).toBeUndefined();
      
      // Verifications should not have sensitive data
      worker.verifications.forEach((verification: any) => {
        expect(verification.providerResponse).toBeUndefined();
        expect(verification.metadata).toBeUndefined();
        expect(verification.errorMessage).toBeUndefined();
        expect(verification.documents).toBeUndefined();
      });
    });
  });

  it("should not expose document URLs", async () => {
    const response = await fetch("/api/workers/public");
    const data = await response.json();

    expect(response.status).toBe(200);
    
    // No document references should be in response
    const responseString = JSON.stringify(data);
    expect(responseString).not.toContain("/uploads/");
    expect(responseString).not.toContain("fileUrl");
  });
});
