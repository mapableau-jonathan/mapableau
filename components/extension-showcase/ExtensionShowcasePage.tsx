import Footer from "@/components/footer";
import { Badge } from "@/components/ui/badge";

import { ShowcasePanel } from "./ShowcasePanel";

type ShowcaseGroup = {
  eyebrow: string;
  title: string;
  subtitle: string;
  left: Omit<React.ComponentProps<typeof ShowcasePanel>, "priority">;
  right: Omit<React.ComponentProps<typeof ShowcasePanel>, "priority">;
};

const groups: ShowcaseGroup[] = [
  {
    eyebrow: "Moves",
    title: "Hydrotherapy and Rehabilitation",
    subtitle:
      "Improve mobility and wellbeing with hydrotherapy and rehabilitation services.",
    left: {
      audienceLabel: "Participant",
      title: "Hydrotherapy",
      description:
        "Find hydrotherapy and rehabilitation services and book a session.",
      imageSrc: "/showcase/moves-participant.png",
      imageAlt: "Moves participant experience mockup",
    },
    right: {
      audienceLabel: "Participant",
      title: "Rehabilitation",
      description: "Find rehabilitation services and book a session.",
      imageSrc: "/showcase/moves-admin.png",
      imageAlt: "Moves admin experience mockup",
    },
  },
  {
    eyebrow: "Foods",
    title: "Physiotherapy, Gym and Fitness",
    subtitle:
      "Improve mobility and wellbeing with physiotherapy, gym and fitness services.",
    left: {
      audienceLabel: "Participant",
      title: "Physiotherapy",
      description:
        "Find physiotherapy, gym and fitness services and book a session.",
      imageSrc: "/showcase/foods-participant.png",
      imageAlt: "Foods participant experience mockup",
    },
    right: {
      audienceLabel: "Admin Side",
      title: "Kitchen dashboard",
      description: "Handle orders, deliveries, and fulfillment status.",
      imageSrc: "/showcase/foods-admin.png",
      imageAlt: "Foods admin experience mockup",
    },
  },
];

export default function ExtensionShowcasePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="py-14 sm:py-18">
        <section className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="outline"
              className="mb-4 border-primary/20 bg-primary/5 px-3 py-1.5 text-primary"
            >
              Product Showcase
            </Badge>
            <h1 className="text-3xl font-heading font-bold leading-tight sm:text-4xl md:text-5xl">
              Extending to <span className="text-primary">Moves</span> and{" "}
              <span className="text-secondary">Foods</span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              A side-by-side look at the participant experience and the
              worker/provider/admin tools that power delivery.
            </p>
          </div>
        </section>

        <section className="container mx-auto mt-12 space-y-10 px-4 sm:mt-14">
          <div>
            <h2 className="text-2xl font-bold">Book Services</h2>
            <p className="text-muted-foreground">
              Browse and book services directly with integrated NDIS billing.
            </p>
          </div>
          {groups.map((group) => (
            <div key={group.eyebrow} className="space-y-5">
              <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-secondary/20 bg-secondary/5 text-secondary"
                    >
                      {group.eyebrow}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {group.subtitle}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl">{group.title}</h2>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <ShowcasePanel {...group.left} priority />
                <ShowcasePanel {...group.right} />
              </div>
            </div>
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
}
