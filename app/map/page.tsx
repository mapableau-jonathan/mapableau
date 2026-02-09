"use client";

import dynamic from "next/dynamic";

/** Dynamic import avoids SSR crash (Leaflet/DOM). */
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
