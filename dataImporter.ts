// import fs from "fs";

// import { DayOfWeek } from "@prisma/client";
// import { config } from "dotenv";

// import { prisma } from "@/lib/prisma";

// config();

// type ProviderRecord = {
//   ABN: string;
//   Prov_N: string;
//   Head_Office: string;
//   Outletname: string;
//   Flag: string;
//   Active: number;
//   Phone: string;
//   Website: string;
//   Email: string;
//   Address: string;
//   State_cd: string;
//   Post_cd: number;
//   Latitude: number;
//   Longitude: number;
//   RegGroup: number[];
//   Post_cd_p: string;
//   opnhrs: string;
//   prfsn: string;
// };

// async function run() {
//   try {
//     const raw = fs.readFileSync("./data/provider-outlets.json", "utf-8");
//     const records: ProviderRecord[] = JSON.parse(raw);

//     console.log(`Importing ${records.length} provider records...`);

//     for (const record of records) {
//       // 1️⃣ Create or update Provider
//       const provider = await prisma.provider.upsert({
//         where: { abn: record.ABN },
//         update: {
//           name: record.Prov_N,
//           phone: record.Phone || null,
//           email: record.Email || null,
//           website: record.Website || null,
//           address: record.Address || null,
//           latitude: record.Latitude || null,
//           longitude: record.Longitude || null,
//           specialisations: record.prfsn
//             ? record.prfsn.split("|").map((s) => s.trim())
//             : [],
//         },
//         create: {
//           name: record.Prov_N,
//           abn: record.ABN,
//           phone: record.Phone || null,
//           email: record.Email || null,
//           website: record.Website || null,
//           address: record.Address || null,
//           latitude: record.Latitude || null,
//           longitude: record.Longitude || null,
//           specialisations: record.prfsn
//             ? record.prfsn.split("|").map((s) => s.trim())
//             : [],
//         },
//       });

//       // 3️⃣ Map opening hours
//       if (record.opnhrs) {
//         // Example: "Monday: 12AM-11PM,Tuesday: 12AM-11PM"
//         const dayEntries = record.opnhrs.split(",");
//         for (const dayEntry of dayEntries) {
//           const [dayRaw, timeRange] = dayEntry.split(":");
//           if (!dayRaw || !timeRange) continue;

//           const dayEnum = dayRaw.trim().toUpperCase() as DayOfWeek;
//           const [openTime, closeTime] = timeRange
//             .trim()
//             .split("-")
//             .map((t) => t.trim());

//           await prisma.businessHour.upsert({
//             where: {
//               providerId_dayOfWeek: {
//                 providerId: provider.id,
//                 dayOfWeek: dayEnum,
//               },
//             },
//             update: {
//               openTime,
//               closeTime,
//             },
//             create: {
//               providerId: provider.id,
//               dayOfWeek: dayEnum,
//               openTime,
//               closeTime,
//             },
//           });
//         }
//       }

//       console.log(`Imported provider: ${record.Prov_N}`);
//     }

//     console.log("All providers imported successfully!");
//   } catch (err) {
//     console.error("Error importing providers:", err);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// run();
