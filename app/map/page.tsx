"use client";

import dynamic from "next/dynamic";

// todo: what does this do?
// "5️⃣ Dynamically import the map (avoid SSR crash)"
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
});

export default function Page() {
  return (
    <main>
      <h1>My Map</h1>
      <Map />
    </main>
  );
}
