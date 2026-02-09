import { Building2, UserCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { ParticipantProfileCard } from "@/components/participant-profile";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { buildPath } from "@/lib/router";

export default async function JonathanDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [participantProfile, claimedProviders] = await Promise.all([
    prisma.participantProfile.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.claimedProvider.findMany({
      where: { userId: session.user.id },
      select: { slug: true, name: true },
    }),
  ]);

  const profileData = participantProfile
    ? {
        id: participantProfile.id,
        slug: participantProfile.slug,
        displayName: participantProfile.displayName,
        visibility: participantProfile.visibility as "private" | "public",
        accessibilityNeeds: participantProfile.accessibilityNeeds,
        preferredCategories: participantProfile.preferredCategories,
        suburb: participantProfile.suburb,
        state: participantProfile.state,
        postcode: participantProfile.postcode,
        savedProviderIds: participantProfile.savedProviderIds,
      }
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Welcome{session.user?.name ? `, ${session.user.name}` : ""}
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <UserCircle className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          My participant profile
        </h2>
        {profileData ? (
          <ParticipantProfileCard profile={profileData} />
        ) : (
          <Card variant="outlined">
            <CardHeader>
              <CardTitle className="text-lg">No participant profile yet</CardTitle>
              <CardDescription>
                Create a profile to share your support categories and
                preferences with providers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="default" size="default">
                <Link href="/jonathan/participant">Create participant profile</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Building2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          My claimed providers
        </h2>
        {claimedProviders.length > 0 ? (
          <ul className="space-y-2">
            {claimedProviders.map((p) => (
              <li key={p.slug}>
                <Link
                  href={buildPath("claimedProfile", { slug: p.slug })}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-primary hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Building2 className="h-4 w-4 shrink-0" aria-hidden />
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Card variant="outlined">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                You haven&apos;t claimed any provider profiles yet. Find a
                provider in the Provider finder and claim your listing.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href={buildPath("providerFinder", {})}>Go to Provider finder</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
