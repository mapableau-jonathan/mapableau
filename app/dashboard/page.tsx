import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { buildPath, redirect } from "@/lib/router";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("login", {});

  const [incomplete, claimedProviders] = await Promise.all([
    prisma.claimedProvider.findFirst({
      where: {
        userId: session.user.id,
        onboardingStatus: { in: ["not_started", "in_progress"] },
      },
    }),
    prisma.claimedProvider.findMany({
      where: { userId: session.user.id },
      select: { slug: true, name: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  if (incomplete) redirect("onboarding", {});

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <div className="page-inner">
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-heading font-bold tracking-tight sm:text-3xl text-foreground">
              Dashboard
            </h1>
            <p className="mt-1 text-muted-foreground">
              Welcome{session.user?.name ? `, ${session.user.name}` : ""}
            </p>
          </div>

          <section aria-labelledby="provider-profiles-heading">
            <h2 id="provider-profiles-heading" className="mb-3 text-lg font-semibold text-foreground">
              Provider profiles
            </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card variant="interactive" className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Provider finder</CardTitle>
              <CardDescription>
                Browse and search NDIS providers. View profiles and claim your
                listing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="default" size="default" className="w-full">
                <Link href={buildPath("providerFinder", {})}>
                  Browse providers
                </Link>
              </Button>
            </CardContent>
          </Card>
          {claimedProviders.length > 0 ? (
            <Card variant="outlined" className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">My provider profiles</CardTitle>
                <CardDescription>
                  {claimedProviders.length} claimed profile
                  {claimedProviders.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {claimedProviders.slice(0, 3).map((p: { slug: string; name: string }) => (
                  <Button key={p.slug} asChild variant="outline" size="sm" className="w-full justify-start">
                    <Link href={buildPath("claimedProfile", { slug: p.slug })}>
                      {p.name}
                    </Link>
                  </Button>
                ))}
                {claimedProviders.length > 3 && (
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={buildPath("jonathanDashboard", {})}>
                      View all ({claimedProviders.length})
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card variant="outlined" className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">Claim a provider listing</CardTitle>
                <CardDescription>
                  Find your business in the Provider finder and claim it to edit
                  your public profile.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="default" className="w-full">
                  <Link href={buildPath("providerFinder", {})}>
                    Go to Provider finder
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
        </div>
      </div>
    </div>
  );
}
