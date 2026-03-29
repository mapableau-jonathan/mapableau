import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUserId } from "@/app/utils/provider-admin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Provider admin",
};

export default async function ProviderAdminHomePage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login?callbackUrl=/provider-admin");
  }

  const memberships = await prisma.providerUserRole.findMany({
    where: { userId },
    include: { provider: { select: { id: true, name: true } } },
    orderBy: { provider: { name: "asc" } },
  });

  if (memberships.length === 1) {
    redirect(`/provider-admin/${memberships[0].providerId}`);
  }

  if (memberships.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>No organisation access</CardTitle>
            <CardDescription>
              Your account is not linked to any provider in the directory yet.
              Ask an administrator to grant access, or use a seeded demo account
              after running{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                pnpm prisma db seed
              </code>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" size="default" asChild>
              <Link href="/">Home</Link>
            </Button>
            <Button variant="default" size="default" asChild>
              <Link href="/dashboard">Account</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-heading text-2xl font-bold">Provider admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose an organisation to manage.
      </p>
      <ul className="mt-6 space-y-3">
        {memberships.map((m) => (
          <li key={m.providerId}>
            <Link
              href={`/provider-admin/${m.providerId}`}
              className="block rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/30 hover:shadow-md"
            >
              <span className="font-semibold">{m.provider.name}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Role: {m.role}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
