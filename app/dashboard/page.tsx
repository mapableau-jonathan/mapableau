import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  console.log("Session:", session);

  if (!session) redirect("/login");

  return <div>Welcome {session.user?.email}</div>;
}
