/**
 * Verification Services Exports
 */

export { TwilioSMSService } from "./twilio-sms";
export type {
  SMSVerificationRequest,
  SMSVerificationResult,
  VerifyCodeRequest,
  VerifyCodeResult,
} from "./twilio-sms";

export { TOTPService } from "./totp-service";
export type {
  TOTPSecret,
  TOTPVerificationResult,
  TOTPConfig,
} from "./totp-service";

export { WebAuthnService } from "./webauthn-service";
export type {
  WebAuthnCredential,
  WebAuthnRegistrationOptions,
  WebAuthnAuthenticationOptions,
} from "./webauthn-service";
