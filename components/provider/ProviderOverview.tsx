import { Globe, Mail, Phone } from "lucide-react";

import type { ProviderWithRelations } from "./types";

type ProviderOverviewProps = {
  provider: ProviderWithRelations;
};

export default function ProviderOverview({ provider }: ProviderOverviewProps) {
  const hasContact =
    provider.phone || provider.email || provider.website || provider.description;

  if (!hasContact && !provider.description) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg">Overview</h2>

      {provider.description && (
        <p className="text-muted-foreground leading-relaxed">
          {provider.description}
        </p>
      )}

      {(provider.phone || provider.email || provider.website) && (
        <div className="space-y-3">
          <h3 className="text-sm text-foreground">
            Contact &amp; business details
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            {provider.phone && (
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                <a
                  href={`tel:${provider.phone.replace(/\s/g, "")}`}
                  className="text-primary hover:underline"
                >
                  {provider.phone}
                </a>
              </div>
            )}
            {provider.email && (
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                <a
                  href={`mailto:${provider.email}`}
                  className="break-all text-primary hover:underline"
                >
                  {provider.email}
                </a>
              </div>
            )}
            {provider.website && (
              <div className="flex items-start gap-3">
                <Globe className="mt-0.5 h-4 w-4 shrink-0" />
                <a
                  href={
                    provider.website.startsWith("http")
                      ? provider.website
                      : `https://${provider.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-primary hover:underline"
                >
                  {provider.website}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
