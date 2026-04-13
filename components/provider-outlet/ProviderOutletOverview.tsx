import { Globe, Mail, Phone } from "lucide-react";

import type { ProviderOutlet } from "./types";

type ProviderOutletOverviewProps = {
  providerOutlet: ProviderOutlet;
};

export default function ProviderOutletOverview({
  providerOutlet,
}: ProviderOutletOverviewProps) {
  const hasContact =
    providerOutlet.phone ||
    providerOutlet.email ||
    providerOutlet.website ||
    providerOutlet.description;

  if (!hasContact && !providerOutlet.description) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg">Overview</h2>

      {providerOutlet.description && (
        <p className="text-muted-foreground leading-relaxed">
          {providerOutlet.description}
        </p>
      )}

      {(providerOutlet.phone ||
        providerOutlet.email ||
        providerOutlet.website) && (
        <div className="space-y-3">
          <h3 className="text-sm text-foreground">
            Contact &amp; business details
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            {providerOutlet.phone && (
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                <a
                  href={`tel:${providerOutlet.phone.replace(/\s/g, "")}`}
                  className="text-primary hover:underline"
                >
                  {providerOutlet.phone}
                </a>
              </div>
            )}
            {providerOutlet.email && (
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                <a
                  href={`mailto:${providerOutlet.email}`}
                  className="break-all text-primary hover:underline"
                >
                  {providerOutlet.email}
                </a>
              </div>
            )}
            {providerOutlet.website && (
              <div className="flex items-start gap-3">
                <Globe className="mt-0.5 h-4 w-4 shrink-0" />
                <a
                  href={
                    providerOutlet.website.startsWith("http")
                      ? providerOutlet.website
                      : `https://${providerOutlet.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-primary hover:underline"
                >
                  {providerOutlet.website}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
