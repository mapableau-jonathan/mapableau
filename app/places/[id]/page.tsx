"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ExternalLink, ArrowLeft, Flag } from "lucide-react";

interface PlaceDetail {
  id: string;
  name: string;
  description: string | null;
  category: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
  imageUrls: string[];
  openingHours: unknown;
  amenities: string[];
  accessibility: unknown;
  priceRange: string | null;
  acceptsNDIS: boolean;
  ndisProviderNumber: string | null;
  tags: string[];
  keywords: string[];
  verified: boolean;
  verifiedAt: string | null;
  communityScore: number | null;
  accessibilityConfidence: number | null;
  verificationTier: string | null;
  verificationMethod: string | null;
  evidenceRefs: string[] | null;
  isSponsored: boolean;
  sponsorshipTier: string | null;
  sponsorshipStartAt: string | null;
  sponsorshipEndAt: string | null;
  disclosureText: string | null;
}

export default function PlaceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [place, setPlace] = useState<PlaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/places/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Place not found" : "Failed to load");
        return res.json();
      })
      .then((data) => {
        setPlace(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setPlace(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Loading venue...</p>
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">{error ?? "Place not found"}</p>
        <Link
          href="/accessibility-map"
          className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to map
        </Link>
      </div>
    );
  }

  const tierLabel =
    place.sponsorshipTier === "ACCESSIBILITY_LEADER"
      ? "Accessibility Leader"
      : place.sponsorshipTier === "FEATURED_ACCESSIBLE_VENUE"
        ? "Featured Accessible Venue"
        : place.sponsorshipTier === "COMMUNITY_SUPPORTER"
          ? "Community Supporter"
          : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link
        href="/accessibility-map"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to map
      </Link>

      <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-6">
          <div className="flex items-start gap-4">
            {place.logoUrl && (
              <img
                src={place.logoUrl}
                alt=""
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-heading font-bold mb-1">
                {place.name}
              </h1>
              <p className="text-sm text-muted-foreground capitalize">
                {place.category.replace(/_/g, " ").toLowerCase()}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {place.verified && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified
                  </span>
                )}
                {place.isSponsored && tierLabel && (
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    Sponsored · {tierLabel}
                  </span>
                )}
                {place.acceptsNDIS && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded">
                    NDIS
                  </span>
                )}
              </div>
            </div>
          </div>

          {place.description && (
            <p className="mt-4 text-muted-foreground">{place.description}</p>
          )}

          <section className="mt-6 pt-6 border-t border-border" aria-labelledby="address-heading">
            <h2 id="address-heading" className="text-sm font-semibold mb-2">
              Address
            </h2>
            <p className="text-sm">
              {place.address}, {place.city} {place.state} {place.postcode},{" "}
              {place.country}
            </p>
            {place.website && (
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary mt-2 hover:underline"
              >
                Website <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {place.phone && (
              <p className="text-sm mt-1">
                <a href={`tel:${place.phone}`} className="hover:underline">
                  {place.phone}
                </a>
              </p>
            )}
          </section>

          {/* Verification disclosure */}
          <section className="mt-6 pt-6 border-t border-border" aria-labelledby="verification-heading">
            <h2 id="verification-heading" className="text-sm font-semibold mb-2">
              Accessibility verification
            </h2>
            {place.verificationTier ? (
              <p className="text-sm text-muted-foreground">
                Verified {place.verificationMethod?.replace(/_/g, " ").toLowerCase() ?? "accessibility"} ·{" "}
                {place.verificationTier} tier
                {place.verifiedAt && (
                  <> · {new Date(place.verifiedAt).toLocaleDateString()}</>
                )}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No formal verification on file.
              </p>
            )}
            {place.evidenceRefs && place.evidenceRefs.length > 0 && (
              <ul className="mt-2 space-y-1">
                {place.evidenceRefs.map((url, i) => (
                  <li key={i}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Accessibility evidence <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Sponsorship disclosure */}
          {place.isSponsored && (
            <section className="mt-6 pt-6 border-t border-border" aria-labelledby="sponsorship-heading">
              <h2 id="sponsorship-heading" className="text-sm font-semibold mb-2">
                Sponsorship
              </h2>
              <p className="text-sm text-muted-foreground">
                This venue is a sponsored {tierLabel ?? "listing"}.
                {place.sponsorshipStartAt && (
                  <> Active from {new Date(place.sponsorshipStartAt).toLocaleDateString()}</>
                )}
                {place.sponsorshipEndAt && (
                  <> until {new Date(place.sponsorshipEndAt).toLocaleDateString()}</>
                )}
                . Sponsored placement is gated by accessibility verification and never overrides your filters.
              </p>
              {place.disclosureText && (
                <p className="mt-2 text-sm text-muted-foreground" role="region" aria-label="Why am I seeing this?">
                  <strong>Why am I seeing this?</strong> {place.disclosureText}
                </p>
              )}
            </section>
          )}

          {place.amenities && place.amenities.length > 0 && (
            <section className="mt-6 pt-6 border-t border-border" aria-labelledby="amenities-heading">
              <h2 id="amenities-heading" className="text-sm font-semibold mb-2">
                Amenities
              </h2>
              <ul className="flex flex-wrap gap-2">
                {place.amenities.map((a) => (
                  <li
                    key={a}
                    className="text-xs bg-muted px-2 py-1 rounded capitalize"
                  >
                    {a.replace(/_/g, " ")}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-6 pt-6 border-t border-border">
            <Link
              href={`/feedback?subject=Venue report: ${place.name}&type=accessibility`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Flag className="h-4 w-4" />
              Report inaccurate accessibility or misleading sponsorship
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
