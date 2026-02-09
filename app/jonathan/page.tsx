import { FlaskConical, LayoutDashboard, LogIn, Search, Users } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildPath } from "@/lib/router";

export default async function JonathanIndexPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <section className="text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Jonathan
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Find NDIS providers, view provider profiles, and manage your
          participant profile.
        </p>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        <Card variant="interactive" className="overflow-hidden">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
                <Search className="h-5 w-5" />
              </span>
              <CardTitle className="text-lg">Provider finder</CardTitle>
            </div>
            <CardDescription>
              Browse and search NDIS providers near you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="default" size="default" className="w-full">
              <Link href={buildPath("providerFinder", {})}>Browse providers</Link>
            </Button>
          </CardContent>
        </Card>

        {session?.user ? (
          <Card variant="interactive" className="overflow-hidden">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
                  <LayoutDashboard className="h-5 w-5" />
                </span>
                <CardTitle className="text-lg">Dashboard</CardTitle>
              </div>
              <CardDescription>
                Your participant profile and claimed providers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" size="default" className="w-full">
                <Link href="/jonathan/dashboard">Go to dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card variant="outlined" className="overflow-hidden">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden>
                  <LogIn className="h-5 w-5" />
                </span>
                <CardTitle className="text-lg">Sign in</CardTitle>
              </div>
              <CardDescription>
                Sign in to manage your participant profile and claimed
                providers.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button asChild variant="default" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/register">Register</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card variant="interactive" className="overflow-hidden sm:col-span-2">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary" aria-hidden>
                <FlaskConical className="h-5 w-5" />
              </span>
              <CardTitle className="text-lg">Participant emulation</CardTitle>
            </div>
            <CardDescription>
              Simulate a participant for demos or testing. Pre-fills the Provider Finder.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="default" className="w-full sm:w-auto">
              <Link href={buildPath("jonathanEmulate", {})}>
                <Users className="mr-2 h-4 w-4" />
                Open emulation
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
