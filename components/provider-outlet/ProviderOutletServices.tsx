import {
  Accessibility,
  Activity,
  BedDouble,
  Briefcase,
  Car,
  Circle,
  FileText,
  GraduationCap,
  Home,
  MapPin,
  MessageCircle,
  Users,
} from "lucide-react";

import type { ProviderOutlet } from "./types";

const SERVICE_NAME_TO_ICON: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  "Supported Independent Living": Home,
  "Community Participation": Users,
  "Plan Management": FileText,
  "Therapeutic Supports": Activity,
  "Assistive Technology": Accessibility,
  "Capacity Building": GraduationCap,
  "Daily Living Support": Home,
  Transport: Car,
  "Social & Community Participation": Users,
  Physiotherapy: Activity,
  "Occupational Therapy": Briefcase,
  "Speech Pathology": MessageCircle,
  "Community Access": MapPin,
  "In-Home Support": Home,
  Respite: BedDouble,
};

function getServiceIcon(serviceName: string) {
  return SERVICE_NAME_TO_ICON[serviceName] ?? Circle;
}

type ProviderOutletServicesProps = {
  providerOutlet: ProviderOutlet;
};

export default function ProviderOutletServices({
  providerOutlet,
}: ProviderOutletServicesProps) {
  if (providerOutlet.services.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg">Services</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {providerOutlet.services.map((service) => {
          const Icon = getServiceIcon(service.name);
          return (
            <li key={service.id} className="flex gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-foreground">{service.name}</p>
                {service.description && (
                  <p className="text-sm text-muted-foreground">
                    {service.description}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
