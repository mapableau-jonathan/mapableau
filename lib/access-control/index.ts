/**
 * Access Control Module
 * Exports all NDIS verification and certification guards
 */

export {
  checkWorkerNDISVerification,
  checkWorkerNDISVerificationByUserId,
  checkProviderRegistration,
  checkWorkerFullyVerified,
  requireNDISVerification,
  requireProviderRegistration,
  canAccessNDISFeatures,
  type NDISVerificationResult,
  type ProviderRegistrationResult,
} from "./ndis-guards";
