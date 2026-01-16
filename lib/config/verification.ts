import type { VerificationConfig } from "../services/verification/types";

export const verificationConfig: VerificationConfig = {
  identityProvider:
    (process.env.IDENTITY_PROVIDER as "chandler" | "privy") || "chandler",
  vevoProvider:
    (process.env.VEVO_PROVIDER as "vsure" | "checkworkrights") || "vsure",
  enableWWCC: process.env.ENABLE_WWCC !== "false",
  enableNDIS: process.env.ENABLE_NDIS !== "false",
  enableFirstAid: process.env.ENABLE_FIRST_AID !== "false",
};

export const providerConfig = {
  chandler: {
    apiKey: process.env.CHANDLER_VERIFY_API_KEY || "",
    apiUrl: process.env.CHANDLER_VERIFY_API_URL || "https://api.chandlerverify.com.au",
  },
  privy: {
    apiKey: process.env.PRIVY_API_KEY || "",
    apiUrl: process.env.PRIVY_API_URL || "https://api.privy.com.au",
  },
  vsure: {
    apiKey: process.env.VSURE_API_KEY || "",
    apiUrl: process.env.VSURE_API_URL || "https://api.vsure.com.au",
  },
  checkworkrights: {
    apiKey: process.env.CHECKWORKRIGHTS_API_KEY || "",
    apiUrl:
      process.env.CHECKWORKRIGHTS_API_URL ||
      "https://api.checkworkrights.com.au",
  },
  oho: {
    apiKey: process.env.OHO_API_KEY || "",
    apiUrl: process.env.OHO_API_URL || "https://api.weareoho.com",
  },
  ndis: {
    username: process.env.NDIS_PORTAL_USERNAME || "",
    password: process.env.NDIS_PORTAL_PASSWORD || "",
    employerId: process.env.NDIS_EMPLOYER_ID || "",
    portalUrl: process.env.NDIS_PORTAL_URL || "https://portal.ndiscommission.gov.au",
  },
  usi: {
    apiKey: process.env.USI_API_KEY || "",
    apiUrl: process.env.USI_API_URL || "https://api.usi.gov.au",
  },
};
