/**
 * ABN (Australian Business Number) helpers and ABR Lookup integration.
 * ABR: https://abr.business.gov.au/ | JSON: https://abr.business.gov.au/json/
 */

const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19] as const;

/**
 * Strip non-digits and return 11-character ABN string, or empty if not 9 or 11 digits.
 */
export function normalizeAbn(abn: string): string {
  const digits = (abn ?? "").replace(/\D/g, "");
  if (digits.length === 9) return `00${digits}`;
  if (digits.length === 11) return digits;
  return "";
}

/**
 * Validate ABN using the official modulus 89 checksum.
 * See: https://abr.business.gov.au/Help/AbnFormat
 */
export function isValidAbnFormat(abn: string): boolean {
  const n = normalizeAbn(abn);
  if (n.length !== 11) return false;
  const first = parseInt(n[0] ?? "0", 10) - 1;
  let sum = first * ABN_WEIGHTS[0];
  for (let i = 1; i < 11; i++) {
    sum += parseInt(n[i] ?? "0", 10) * ABN_WEIGHTS[i];
  }
  return sum % 89 === 0;
}

/** Response from our /api/abr/lookup (success). */
export type AbrLookupSuccess = {
  success: true;
  abn: string;
  entityName: string | null;
  state: string | null;
  postcode: string | null;
  isActive: boolean;
};

/** Response from our /api/abr/lookup (failure). */
export type AbrLookupFailure = {
  success: false;
  message: string;
};

export type AbrLookupResult = AbrLookupSuccess | AbrLookupFailure;

/** ABR JSON response (AbnDetails.aspx) – minimal shape we use. */
type AbrJsonBusinessEntity = {
  EntityName?: string;
  LegalName?: { GivenName?: string; OtherGivenName?: string; FamilyName?: string } | { OrganisationName?: string };
  State?: string;
  Postcode?: string;
  BusinessName?: { IsCurrent?: string; OrganisationName?: string }[] | { OrganisationName?: string };
  MainName?: { OrganisationName?: string };
  EntityStatus?: { EntityStatusCode?: string };
};

type AbrJsonResponse = {
  Message?: string;
  BusinessEntity?: AbrJsonBusinessEntity;
  Abn?: { IdentifierValue?: string; IsCurrentIndicator?: string };
};

const ABR_JSON_BASE = "https://abr.business.gov.au/json/AbnDetails.aspx";

/**
 * Call ABR Lookup JSON API (server-side only).
 * Requires ABR_GUID in env (register at https://abr.business.gov.au/Tools/WebServices).
 * Returns normalized result or throws on network/parse errors.
 */
export async function lookupAbn(
  abn: string,
  guid: string,
): Promise<AbrLookupResult> {
  const n = normalizeAbn(abn);
  if (n.length !== 11) {
    return { success: false, message: "ABN must be 9 or 11 digits." };
  }
  if (!isValidAbnFormat(n)) {
    return { success: false, message: "ABN format is invalid (checksum)." };
  }
  if (!guid || guid === "myguid") {
    return {
      success: false,
      message: "ABR Lookup is not configured (missing ABR_GUID).",
    };
  }

  const url = `${ABR_JSON_BASE}?abn=${encodeURIComponent(n)}&guid=${encodeURIComponent(guid)}&callback=callback`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  const text = await res.text();
  if (!res.ok) {
    return {
      success: false,
      message: `ABR request failed: ${res.status}`,
    };
  }

  // ABR returns JSONP: callback({ ... })
  let json: AbrJsonResponse;
  try {
    const raw = text.trim();
    const start = raw.indexOf("(");
    const end = raw.lastIndexOf(")");
    if (start === -1 || end <= start) {
      return { success: false, message: "Invalid ABR response format." };
    }
    json = JSON.parse(raw.slice(start + 1, end)) as AbrJsonResponse;
  } catch {
    return { success: false, message: "Could not parse ABR response." };
  }

  if (json.Message && json.Message !== "Record found") {
    return {
      success: false,
      message: json.Message === "No record found" ? "ABN not found." : json.Message,
    };
  }

  const entity = json.BusinessEntity;
  const businessNames = Array.isArray(entity?.BusinessName)
    ? entity.BusinessName
    : entity?.BusinessName
      ? [entity.BusinessName]
      : [];
  const mainName =
    entity?.MainName?.OrganisationName ??
    businessNames.find((b) => (b as { OrganisationName?: string; IsCurrent?: string }).IsCurrent === "Y")?.OrganisationName ??
    businessNames[0]?.OrganisationName;
  const legalName = entity?.LegalName;
  const legalNameStr =
    legalName && typeof legalName === "object" && "OrganisationName" in legalName
      ? (legalName as { OrganisationName?: string }).OrganisationName
      : legalName && typeof legalName === "object" && "FamilyName" in legalName
        ? [
            (legalName as { GivenName?: string; OtherGivenName?: string; FamilyName?: string }).GivenName,
            (legalName as { GivenName?: string; OtherGivenName?: string; FamilyName?: string }).OtherGivenName,
            (legalName as { GivenName?: string; OtherGivenName?: string; FamilyName?: string }).FamilyName,
          ]
            .filter(Boolean)
            .join(" ")
        : undefined;
  const entityName =
    typeof mainName === "string"
      ? mainName
      : typeof legalNameStr === "string"
        ? legalNameStr
        : entity?.EntityName ?? null;
  const state =
    typeof entity?.State === "string" ? entity.State : null;
  const postcode =
    typeof entity?.Postcode === "string" ? entity.Postcode : null;
  const isActive =
    (entity?.EntityStatus?.EntityStatusCode ?? "").toUpperCase() === "ACTIVE";

  return {
    success: true,
    abn: n,
    entityName: entityName ?? null,
    state,
    postcode,
    isActive,
  };
}
