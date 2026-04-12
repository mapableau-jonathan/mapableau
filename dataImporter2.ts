import fs from "fs";

import { DayOfWeek } from "@prisma/client";
import { config } from "dotenv";

// import { prisma } from "@/lib/prisma";

config();

type ProviderRecord = {
  ABN: string;
  Prov_N: string;
  Head_Office: string;
  Outletname: string;
  Phone: string;
  Website: string;
  Email: string;
  Address: string;
  State_cd: string;
  Post_cd: number;
  Latitude: number;
  Longitude: number;
  opnhrs: string;
  prfsn: string;
};

type ProviderJSON = {
  date: string;
  data: ProviderRecord[];
};

function parseSpecialisations(prfsn: string): string[] {
  if (!prfsn) return [];
  return prfsn
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseHours(opnhrs: string) {
  if (!opnhrs) return [];

  return opnhrs
    .split(",")
    .map((entry) => {
      const [dayRaw, timeRange] = entry.split(":");
      if (!dayRaw || !timeRange) return null;

      const key = dayRaw.trim().toUpperCase() as keyof typeof DayOfWeek;
      const dayOfWeek = DayOfWeek[key];

      const [openTime, closeTime] = timeRange
        .trim()
        .split("-")
        .map((t) => t.trim());

      return { dayOfWeek, openTime, closeTime };
    })
    .filter(Boolean);
}

async function run() {
  try {
    const raw = fs.readFileSync("./public/data/provider-outlets.json", "utf-8");
    const data: ProviderJSON = JSON.parse(raw);
    const records = data.data;

    console.log(`Importing ${records.length} records...`);

    // 🧠 Group by ABN
    const grouped = new Map<string, ProviderRecord[]>();

    for (const r of records) {
      if (!grouped.has(r.ABN)) grouped.set(r.ABN, []);
      grouped.get(r.ABN)!.push(r);
    }

    console.log(`Found ${grouped.size} unique providers`);

    for (const [abn, rows] of grouped.entries()) {
      const base = rows[0];

      // 🧱 Create Provider
      // const provider = await prisma.provider.upsert({
      //   where: { abn },
      //   update: {
      //     name: base.Prov_N,
      //     phone: base.Phone || null,
      //     email: base.Email || null,
      //     website: base.Website || null,
      //     address: base.Address || null,
      //     latitude: base.Latitude || null,
      //     longitude: base.Longitude || null,
      //     specialisations: parseSpecialisations(base.prfsn),
      //   },
      //   create: {
      //     name: base.Prov_N,
      //     abn,
      //     phone: base.Phone || null,
      //     email: base.Email || null,
      //     website: base.Website || null,
      //     address: base.Address || null,
      //     latitude: base.Latitude || null,
      //     longitude: base.Longitude || null,
      //     specialisations: parseSpecialisations(base.prfsn),
      //   },
      // });

      // 📍 Create outlets
      for (const r of rows) {
        const outletName =
          r.Outletname?.trim() || r.Head_Office || "Main Outlet";

        // prevent duplicate outlet
        // const existingOutlet = await prisma.providerOutletLocation.findFirst({
        //   where: {
        //     providerId: provider.id,
        //     address: r.Address,
        //   },
        // });

        // if (existingOutlet) continue;

        // const outlet = await prisma.providerOutletLocation.create({
        //   data: {
        //     providerId: provider.id,
        //     name: outletName,
        //     address: r.Address || null,
        //     phone: r.Phone || null,
        //     email: r.Email || null,
        //     website: r.Website || null,
        //     latitude: r.Latitude || null,
        //     longitude: r.Longitude || null,
        //     abn: r.ABN,
        //     specialisations: parseSpecialisations(r.prfsn),
        //   },
        // });

        // // 🏢 ServiceLocation (physical address record)
        // await prisma.serviceLocation.create({
        //   data: {
        //     address: r.Address,
        //     city: r.Head_Office || null,
        //     state: r.State_cd || null,
        //     postcode: r.Post_cd?.toString() || null,
        //     country: "Australia",
        //     providerOutletLocationId: outlet.id,
        //   },
        // });

        // // 🕒 Business hours (per outlet)
        // const hours = parseHours(r.opnhrs);

        // for (const h of hours) {
        //   if (!h) continue;

        //   await prisma.businessHour.upsert({
        //     where: {
        //       providerOutletLocationId_dayOfWeek: {
        //         providerOutletLocationId: outlet.id,
        //         dayOfWeek: h.dayOfWeek,
        //       },
        //     },
        //     update: {
        //       openTime: h.openTime,
        //       closeTime: h.closeTime,
        //     },
        //     create: {
        //       providerOutletLocationId: outlet.id,
        //       dayOfWeek: h.dayOfWeek,
        //       openTime: h.openTime,
        //       closeTime: h.closeTime,
        //     },
        //   });
        // }

        console.log(`  ↳ Outlet created: ${outletName}`);
      }

      console.log(`✅ Provider imported: ${base.Prov_N}`);
    }

    console.log("🎉 Import complete!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    // await prisma.$disconnect();
  }
}

run();
