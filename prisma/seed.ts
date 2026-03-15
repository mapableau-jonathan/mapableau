import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PASSWORD_HASH = "$2b$10$iLyIbD98gF/4Wnghy5CnY.m4JK0/bL8CLbc/pUtnQ/nXr4Wuep.8O";

const dummyUsers = [
  { name: "Alice Smith", email: "alice@example.com" },
  { name: "Bob Jones", email: "bob@example.com" },
  { name: "Carol Williams", email: "carol@example.com" },
];

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

const dummyProviders = [
  {
    name: "Sunrise Care Services",
    abn: "12 345 678 901",
    businessType: "Company",
    rating: 4.7,
    reviewCount: 23,
    description:
      "Quality disability support and NDIS services across Melbourne. We specialise in supported independent living and community participation.",
    email: "hello@sunrisecare.com.au",
    phone: "03 9123 4567",
    website: "https://sunrisecare.com.au",
    ndisRegistered: true,
    ndisNumber: "4050000001",
    serviceAreas: ["Melbourne Metro", "Inner Melbourne", "South Eastern Suburbs"],
    specialisations: ["Autism", "Supported Independent Living", "Young People"],
    services: [
      {
        name: "Supported Independent Living",
        description: "Help to live independently in your own home or shared accommodation.",
      },
      {
        name: "Community Participation",
        description: "Support to join in community, social and recreational activities.",
      },
      {
        name: "Plan Management",
        description: "Assistance to manage your NDIS plan and pay for supports.",
      },
    ],
    locations: [
      { address: "123 Collins St", city: "Melbourne", state: "VIC", postcode: "3000", country: "Australia" },
      { address: "45 Chapel St", city: "Prahran", state: "VIC", postcode: "3181", country: "Australia" },
    ],
  },
  {
    name: "Blue Mountains Support Co",
    abn: "98 765 432 109",
    businessType: "Company",
    rating: 4.9,
    reviewCount: 8,
    description:
      "Local NDIS provider offering therapeutic supports, assistive technology, and capacity building in the Blue Mountains region.",
    email: "info@bluemountainssupport.com.au",
    phone: "02 4782 1000",
    website: "https://bluemountainssupport.com.au",
    ndisRegistered: true,
    ndisNumber: "4050000002",
    serviceAreas: ["Blue Mountains", "Penrith", "Hawkesbury"],
    specialisations: ["Assistive Technology", "Therapeutic Supports", "Capacity Building"],
    services: [
      {
        name: "Therapeutic Supports",
        description: "Allied health services including physio, OT and speech therapy.",
      },
      {
        name: "Assistive Technology",
        description: "Equipment and technology to support daily living and independence.",
      },
      {
        name: "Capacity Building",
        description: "Programs to develop skills and achieve your goals.",
      },
    ],
    locations: [
      { address: "78 Katoomba St", city: "Katoomba", state: "NSW", postcode: "2780", country: "Australia" },
    ],
  },
  {
    name: "Coastal Disability Services",
    abn: "11 222 333 444",
    businessType: "Company",
    rating: 4.3,
    reviewCount: 15,
    description:
      "Supporting participants across the Gold Coast and northern NSW. Specialists in daily living, transport, and social support.",
    email: "contact@coastaldisability.com.au",
    phone: "07 5555 1234",
    website: "https://coastaldisability.com.au",
    ndisRegistered: true,
    ndisNumber: "4050000003",
    serviceAreas: ["Gold Coast", "Northern NSW", "Tweed Heads"],
    specialisations: ["Daily Living", "Transport", "Community Participation"],
    services: [
      {
        name: "Daily Living Support",
        description: "Help with everyday tasks at home and in the community.",
      },
      {
        name: "Transport",
        description: "Travel support to appointments, activities and community access.",
      },
      {
        name: "Social & Community Participation",
        description: "Support to participate in social, recreational and community life.",
      },
    ],
    locations: [
      { address: "200 Surf Parade", city: "Broadbeach", state: "QLD", postcode: "4218", country: "Australia" },
      { address: "15 Pacific Hwy", city: "Tweed Heads", state: "NSW", postcode: "2485", country: "Australia" },
    ],
  },
  {
    name: "Adelaide Allied Health",
    abn: "55 666 777 888",
    businessType: "Company",
    rating: 4.8,
    reviewCount: 31,
    description:
      "Multidisciplinary team providing physiotherapy, occupational therapy, and speech pathology to NDIS participants.",
    email: "admin@adelaideallied.com.au",
    phone: "08 8123 4567",
    ndisRegistered: true,
    ndisNumber: "4050000004",
    serviceAreas: ["Adelaide Metro", "Adelaide Hills"],
    specialisations: ["Physiotherapy", "Occupational Therapy", "Speech Pathology"],
    services: [
      {
        name: "Physiotherapy",
        description: "Movement, mobility and physical function assessment and therapy.",
      },
      {
        name: "Occupational Therapy",
        description: "Support with daily activities, equipment and home modifications.",
      },
      {
        name: "Speech Pathology",
        description: "Communication, swallowing and mealtime support.",
      },
    ],
    locations: [
      { address: "100 North Terrace", city: "Adelaide", state: "SA", postcode: "5000", country: "Australia" },
    ],
  },
  {
    name: "Perth Community Care",
    abn: "99 000 111 222",
    businessType: "Sole trader",
    rating: 4.5,
    reviewCount: 5,
    description:
      "Person-centred support for people with disability. We focus on building skills and fostering independence.",
    email: "hello@perthcommunitycare.com.au",
    phone: "08 9456 7890",
    ndisRegistered: false,
    serviceAreas: ["Perth Metro", "Fremantle", "Joondalup"],
    specialisations: ["Community Access", "Respite", "In-Home Support"],
    services: [
      {
        name: "Community Access",
        description: "Support to access and participate in your local community.",
      },
      {
        name: "In-Home Support",
        description: "Assistance with daily tasks and personal care at home.",
      },
      {
        name: "Respite",
        description: "Short-term care to give carers a break.",
      },
    ],
    locations: [
      { address: "50 Murray St", city: "Perth", state: "WA", postcode: "6000", country: "Australia" },
    ],
  },
];

async function main() {
  console.log("Seeding dummy users...");
  const users: Record<string, { id: string }> = {};
  for (const u of dummyUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      create: {
        name: u.name,
        email: u.email,
        passwordHash: PASSWORD_HASH,
      },
      update: { passwordHash: PASSWORD_HASH },
    });
    users[u.email] = { id: user.id };
    console.log(`  Created/updated: ${user.email} (${user.id})`);
  }

  console.log("Seeding dummy providers...");
  const providers: Record<string, { id: string }> = {};
  for (const p of dummyProviders) {
    const existing = await prisma.provider.findFirst({
      where: { name: p.name },
    });
    let provider;
    if (existing) {
      provider = existing;
      console.log(`  Found existing: ${provider.name} (${provider.id})`);
    } else {
      const { services, locations, ...providerData } = p;
      provider = await prisma.provider.create({
        data: {
          ...providerData,
          services: {
            create: services.map((s) =>
              typeof s === "string" ? { name: s } : s,
            ),
          },
          locations: {
            create: locations,
          },
          businessHours: {
            create: DAYS.map((dayOfWeek) => ({
              dayOfWeek,
              openTime: dayOfWeek === "SUNDAY" ? "10:00" : "09:00",
              closeTime: dayOfWeek === "SUNDAY" ? "16:00" : "17:00",
            })),
          },
        },
      });
      console.log(`  Created: ${provider.name} (${provider.id})`);
    }
    providers[p.name] = { id: provider.id };
  }

  console.log("Seeding workers...");
  const workers: Record<string, { id: string }> = {};
  const workerUsers = [
    { email: "alice@example.com", bio: "Experienced support worker specialising in SIL and community participation.", qualifications: "Cert III Individual Support, First Aid" },
    { email: "bob@example.com", bio: "Therapeutic supports and assistive technology specialist.", qualifications: "OT degree, NDIS orientation" },
  ];
  for (const w of workerUsers) {
    const userId = users[w.email]?.id;
    if (!userId) continue;
    let worker = await prisma.worker.findUnique({ where: { userId } });
    if (!worker) {
      worker = await prisma.worker.create({
        data: {
          userId,
          bio: w.bio,
          qualifications: w.qualifications,
        },
      });
      console.log(`  Created worker for ${w.email} (${worker.id})`);
    } else {
      console.log(`  Found existing worker for ${w.email}`);
    }
    workers[w.email] = { id: worker.id };
  }

  console.log("Seeding languages...");
  const langNames = ["English", "Auslan", "Mandarin"];
  const languages: Record<string, { id: string }> = {};
  for (const name of langNames) {
    const existing = await prisma.language.findFirst({ where: { name } });
    if (existing) languages[name] = { id: existing.id };
    else {
      const lang = await prisma.language.create({ data: { name } });
      languages[name] = { id: lang.id };
    }
  }

  console.log("Seeding specialisations...");
  const specNames = ["Autism", "Complex Behaviour", "Mental Health", "Young People"];
  const specialisations: Record<string, { id: string }> = {};
  for (const name of specNames) {
    const existing = await prisma.specialisation.findFirst({ where: { name } });
    if (existing) specialisations[name] = { id: existing.id };
    else {
      const spec = await prisma.specialisation.create({ data: { name } });
      specialisations[name] = { id: spec.id };
    }
  }

  console.log("Connecting workers to languages and specialisations...");
  const aliceWorker = workers["alice@example.com"];
  const bobWorker = workers["bob@example.com"];
  if (aliceWorker) {
    const langIds = [languages["English"], languages["Auslan"]].filter(Boolean).map((l) => ({ id: l!.id }));
    const specIds = [specialisations["Autism"], specialisations["Young People"]].filter(Boolean).map((s) => ({ id: s!.id }));
    if (langIds.length || specIds.length) {
      await prisma.worker.update({
        where: { id: aliceWorker.id },
        data: {
          ...(langIds.length && { languages: { connect: langIds } }),
          ...(specIds.length && { specialisations: { connect: specIds } }),
        },
      }).catch(() => {});
    }
  }
  if (bobWorker) {
    const langIds = [languages["English"]].filter(Boolean).map((l) => ({ id: l!.id }));
    const specIds = [specialisations["Complex Behaviour"], specialisations["Mental Health"]].filter(Boolean).map((s) => ({ id: s!.id }));
    if (langIds.length || specIds.length) {
      await prisma.worker.update({
        where: { id: bobWorker.id },
        data: {
          ...(langIds.length && { languages: { connect: langIds } }),
          ...(specIds.length && { specialisations: { connect: specIds } }),
        },
      }).catch(() => {});
    }
  }

  console.log("Seeding worker availability...");
  for (const w of workerUsers) {
    const workerId = workers[w.email]?.id;
    if (!workerId) continue;
    const existing = await prisma.workerAvailability.findFirst({ where: { workerId } });
    if (!existing) {
      await prisma.workerAvailability.createMany({
        data: DAYS.filter((d) => d !== "SUNDAY").map((dayOfWeek) => ({
          workerId,
          dayOfWeek,
          startTime: "09:00",
          endTime: "17:00",
        })),
      });
      console.log(`  Created availability for ${w.email}`);
    }
  }

  console.log("Seeding WorkerProvider links...");
  const workerProviderLinks = [
    { workerEmail: "alice@example.com", providerName: "Sunrise Care Services" },
    { workerEmail: "bob@example.com", providerName: "Blue Mountains Support Co" },
    { workerEmail: "alice@example.com", providerName: "Coastal Disability Services" },
  ];
  for (const link of workerProviderLinks) {
    const workerId = workers[link.workerEmail]?.id;
    const providerId = providers[link.providerName]?.id;
    if (!workerId || !providerId) continue;
    await prisma.workerProvider.upsert({
      where: {
        workerId_providerId: { workerId, providerId },
      },
      create: { workerId, providerId, startDate: new Date() },
      update: {},
    });
  }
  console.log(`  Created ${workerProviderLinks.length} worker-provider links`);

  console.log("Seeding ProviderUserRole...");
  const providerUserRoles = [
    { userEmail: "alice@example.com", providerName: "Sunrise Care Services", role: "ADMIN" as const },
    { userEmail: "bob@example.com", providerName: "Blue Mountains Support Co", role: "MANAGER" as const },
    { userEmail: "carol@example.com", providerName: "Coastal Disability Services", role: "STAFF" as const },
  ];
  for (const pur of providerUserRoles) {
    const userId = users[pur.userEmail]?.id;
    const providerId = providers[pur.providerName]?.id;
    if (!userId || !providerId) continue;
    await prisma.providerUserRole.upsert({
      where: {
        userId_providerId: { userId, providerId },
      },
      create: { userId, providerId, role: pur.role },
      update: { role: pur.role },
    });
  }
  console.log(`  Created ${providerUserRoles.length} provider user roles`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
