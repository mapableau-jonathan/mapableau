import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) redirect("/login");

  const providerMemberships = await prisma.providerUserRole.findMany({
    where: { userId: session.user.id },
    include: { provider: { select: { id: true, name: true } } },
    orderBy: { provider: { name: "asc" } },
  });

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-10">
      <div>
        <h1 className="font-heading text-2xl font-bold">Welcome</h1>
        <p className="text-muted-foreground">{session.user.email}</p>
      </div>
      {providerMemberships.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="font-semibold">Provider organisations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your directory listing and team profiles.
          </p>
          <ul className="mt-3 space-y-2">
            {providerMemberships.map((m) => (
              <li key={m.providerId}>
                <Link
                  href={`/provider-admin/${m.providerId}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {m.provider.name}
                </Link>
                <span className="ml-2 text-xs text-muted-foreground">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
          {providerMemberships.length > 1 && (
            <Link
              href="/provider-admin"
              className="mt-3 inline-block text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              All organisations →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
