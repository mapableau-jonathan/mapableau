// import { PrismaClient, DayOfWeek } from "@prisma/client";

// const prisma = new PrismaClient();
const PASSWORD_HASH =
  "$2b$10$iLyIbD98gF/4Wnghy5CnY.m4JK0/bL8CLbc/pUtnQ/nXr4Wuep.8O";

// async function main() {
//   // Clean up existing data
//   await prisma.providerOutletWorker.deleteMany({});
//   await prisma.providerWorker.deleteMany({});
//   await prisma.providerOutletUserRole.deleteMany({});
//   await prisma.providerUserRole.deleteMany({});
//   await prisma.providerOutletServiceLocation.deleteMany({});
//   await prisma.providerServiceLocation.deleteMany({});
//   await prisma.providerOutletService.deleteMany({});
//   await prisma.providerService.deleteMany({});
//   await prisma.providerOutletBusinessHour.deleteMany({});
//   await prisma.providerBusinessHour.deleteMany({});
//   await prisma.providerOutlet.deleteMany({});
//   await prisma.provider.deleteMany({});
//   await prisma.workerAvailability.deleteMany({});
//   await prisma.workerSpecialisation.deleteMany({});
//   await prisma.language.deleteMany({});
//   await prisma.worker.deleteMany({});
//   await prisma.user.deleteMany({});
//   await prisma.address.deleteMany({});
//   await prisma.serviceDefinition.deleteMany({});

//   console.log("Database cleared ✅");

//   // Addresses
//   const address1 = await prisma.address.create({
//     data: {
//       street: "123 Main St",
//       suburb: "Melbourne Central",
//       city: "Melbourne",
//       state: "VIC",
//       postcode: "3000",
//       country: "Australia",
//     },
//   });

//   const address2 = await prisma.address.create({
//     data: {
//       street: "456 Second St",
//       suburb: "Sydney CBD",
//       city: "Sydney",
//       state: "NSW",
//       postcode: "2000",
//       country: "Australia",
//     },
//   });

//   // Users
//   const user1 = await prisma.user.create({
//     data: {
//       name: "Alice Smith",
//       email: "alice@example.com",
//       passwordHash: PASSWORD_HASH,
//     },
//   });

//   const user2 = await prisma.user.create({
//     data: {
//       name: "Bob Johnson",
//       email: "bob@example.com",
//       passwordHash: PASSWORD_HASH,
//     },
//   });

//   // Workers
//   const worker1 = await prisma.worker.create({
//     data: {
//       userId: user1.id,
//       bio: "Experienced physiotherapist",
//       qualifications: "BSc Physiotherapy",
//     },
//   });

//   const worker2 = await prisma.worker.create({
//     data: {
//       userId: user2.id,
//       bio: "Registered dietitian",
//       qualifications: "MSc Nutrition",
//     },
//   });

//   // Languages
//   const english = await prisma.language.create({ data: { name: "English" } });
//   const spanish = await prisma.language.create({ data: { name: "Spanish" } });

//   // Assign languages to workers
//   await prisma.worker.update({
//     where: { id: worker1.id },
//     data: { languages: { connect: [{ id: english.id }] } },
//   });

//   await prisma.worker.update({
//     where: { id: worker2.id },
//     data: { languages: { connect: [{ id: english.id }, { id: spanish.id }] } },
//   });

//   // Worker Specialisations
//   const physioSpec = await prisma.workerSpecialisation.create({
//     data: { name: "Physiotherapy" },
//   });
//   const dietSpec = await prisma.workerSpecialisation.create({
//     data: { name: "Dietitian" },
//   });

//   await prisma.worker.update({
//     where: { id: worker1.id },
//     data: { specialisations: { connect: { id: physioSpec.id } } },
//   });

//   await prisma.worker.update({
//     where: { id: worker2.id },
//     data: { specialisations: { connect: { id: dietSpec.id } } },
//   });

//   // Worker Availability
//   await prisma.workerAvailability.createMany({
//     data: [
//       {
//         workerId: worker1.id,
//         dayOfWeek: DayOfWeek.MONDAY,
//         startTime: "09:00",
//         endTime: "17:00",
//       },
//       {
//         workerId: worker1.id,
//         dayOfWeek: DayOfWeek.WEDNESDAY,
//         startTime: "10:00",
//         endTime: "16:00",
//       },
//       {
//         workerId: worker2.id,
//         dayOfWeek: DayOfWeek.TUESDAY,
//         startTime: "08:00",
//         endTime: "14:00",
//       },
//       {
//         workerId: worker2.id,
//         dayOfWeek: DayOfWeek.THURSDAY,
//         startTime: "12:00",
//         endTime: "18:00",
//       },
//     ],
//   });

//   // Service Definitions
//   const service1 = await prisma.serviceDefinition.create({
//     data: { name: "Physiotherapy Session" },
//   });
//   const service2 = await prisma.serviceDefinition.create({
//     data: { name: "Diet Consultation" },
//   });

//   // Provider Specialisations
//   const providerSpec1 = await prisma.providerSpecialisation.create({
//     data: { name: "Physiotherapy" },
//   });
//   const providerSpec2 = await prisma.providerSpecialisation.create({
//     data: { name: "Dietitian" },
//   });

//   // Providers
//   const provider1 = await prisma.provider.create({
//     data: {
//       name: "Wellness Clinic Melbourne",
//       addressId: address1.id,
//       email: "contact@wellnessmelb.com",
//       phone: "03 1234 5678",
//       abn: "12345678901",
//       businessType: "Company",
//       specialisations: { connect: [{ id: providerSpec1.id }] },
//     },
//   });

//   const provider2 = await prisma.provider.create({
//     data: {
//       name: "Sydney Health Center",
//       addressId: address2.id,
//       email: "info@sydneyhealth.com",
//       phone: "02 9876 5432",
//       abn: "10987654321",
//       businessType: "Sole trader",
//       specialisations: { connect: [{ id: providerSpec2.id }] },
//     },
//   });

//   // Provider Outlets
//   const outlet1 = await prisma.providerOutlet.create({
//     data: {
//       name: "Melbourne Branch",
//       addressId: address1.id,
//       providerId: provider1.id,
//     },
//   });

//   const outlet2 = await prisma.providerOutlet.create({
//     data: {
//       name: "Sydney Branch",
//       addressId: address2.id,
//       providerId: provider2.id,
//     },
//   });

//   // Provider Services
//   await prisma.providerService.create({
//     data: { providerId: provider1.id, serviceDefinitionId: service1.id },
//   });

//   await prisma.providerService.create({
//     data: { providerId: provider2.id, serviceDefinitionId: service2.id },
//   });

//   // Provider Outlet Services
//   await prisma.providerOutletService.create({
//     data: { providerOutletId: outlet1.id, serviceDefinitionId: service1.id },
//   });

//   await prisma.providerOutletService.create({
//     data: { providerOutletId: outlet2.id, serviceDefinitionId: service2.id },
//   });

//   // Provider Business Hours
//   await prisma.providerBusinessHour.createMany({
//     data: [
//       {
//         providerId: provider1.id,
//         dayOfWeek: DayOfWeek.MONDAY,
//         openTime: "09:00",
//         closeTime: "17:00",
//       },
//       {
//         providerId: provider2.id,
//         dayOfWeek: DayOfWeek.TUESDAY,
//         openTime: "08:00",
//         closeTime: "16:00",
//       },
//     ],
//   });

//   // Provider Outlet Business Hours
//   await prisma.providerOutletBusinessHour.createMany({
//     data: [
//       {
//         providerOutletId: outlet1.id,
//         dayOfWeek: DayOfWeek.MONDAY,
//         openTime: "09:00",
//         closeTime: "17:00",
//       },
//       {
//         providerOutletId: outlet2.id,
//         dayOfWeek: DayOfWeek.TUESDAY,
//         openTime: "08:00",
//         closeTime: "16:00",
//       },
//     ],
//   });

//   // ProviderWorker assignments
//   await prisma.providerWorker.create({
//     data: { providerId: provider1.id, workerId: worker1.id },
//   });

//   await prisma.providerWorker.create({
//     data: { providerId: provider2.id, workerId: worker2.id },
//   });

//   // ProviderOutletWorker assignments
//   await prisma.providerOutletWorker.create({
//     data: { providerOutletId: outlet1.id, workerId: worker1.id },
//   });

//   await prisma.providerOutletWorker.create({
//     data: { providerOutletId: outlet2.id, workerId: worker2.id },
//   });

//   // Provider User Roles
//   await prisma.providerUserRole.create({
//     data: { userId: user1.id, providerId: provider1.id, role: "ADMIN" },
//   });

//   await prisma.providerUserRole.create({
//     data: { userId: user2.id, providerId: provider2.id, role: "MANAGER" },
//   });

//   // Provider Outlet User Roles
//   await prisma.providerOutletUserRole.create({
//     data: { userId: user1.id, providerOutletId: outlet1.id, role: "ADMIN" },
//   });

//   await prisma.providerOutletUserRole.create({
//     data: { userId: user2.id, providerOutletId: outlet2.id, role: "MANAGER" },
//   });

//   // ProviderServiceLocation
//   await prisma.providerServiceLocation.create({
//     data: { providerId: provider1.id, addressId: address1.id },
//   });

//   await prisma.providerServiceLocation.create({
//     data: { providerId: provider2.id, addressId: address2.id },
//   });

//   // ProviderOutletServiceLocation
//   await prisma.providerOutletServiceLocation.create({
//     data: { providerOutletId: outlet1.id, addressId: address1.id },
//   });

//   await prisma.providerOutletServiceLocation.create({
//     data: { providerOutletId: outlet2.id, addressId: address2.id },
//   });

//   // Sessions (dummy)
//   await prisma.session.create({
//     data: {
//       userId: user1.id,
//       sessionToken: "session-token-1",
//       expires: new Date(Date.now() + 1000 * 60 * 60),
//     },
//   });

//   await prisma.session.create({
//     data: {
//       userId: user2.id,
//       sessionToken: "session-token-2",
//       expires: new Date(Date.now() + 1000 * 60 * 60),
//     },
//   });

//   console.log("Database fully seeded ✅");
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
