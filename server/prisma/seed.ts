// server/prisma/seed.ts
import { PrismaClient } from '../src/generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create admin user
  await prisma.user.upsert({
    where: { phone: '+255777000000' },
    update: {},
    create: {
      phone: '+255777000000',
      firstName: 'Admin',
      lastName: 'ZARTSA',
      role: 'ADMIN',
      preferredLanguage: 'sw',
      isActive: true,
    },
  });

  // Create sample fare tables
  const fares = [
    { routeType: 'daladala', departure: 'Stone Town', destination: 'Fuoni', baseFare: 400, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    { routeType: 'daladala', departure: 'Stone Town', destination: 'Mwanakwerekwe', baseFare: 500, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    { routeType: 'daladala', departure: 'Stone Town', destination: 'Kiembe Samaki', baseFare: 400, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    { routeType: 'shamba', departure: 'Stone Town', destination: 'Paje', baseFare: 2500, surcharge: 200, effectiveDate: new Date('2026-01-01') },
    { routeType: 'shamba', departure: 'Stone Town', destination: 'Jambiani', baseFare: 3000, surcharge: 200, effectiveDate: new Date('2026-01-01') },
    { routeType: 'shamba', departure: 'Stone Town', destination: 'Nungwi', baseFare: 3500, surcharge: 300, effectiveDate: new Date('2026-01-01') },
  ];

  for (const fare of fares) {
    await prisma.fareTable.upsert({
      where: { routeType_departure_destination: { routeType: fare.routeType, departure: fare.departure, destination: fare.destination } },
      update: {},
      create: fare,
    });
  }

  // Create sample announcements
  await prisma.announcement.createMany({
    data: [
      {
        titleSw: 'Marekebisho ya Nauli - Januari 2026',
        titleEn: 'Fare Adjustment - January 2026',
        contentSw: 'Nauli mpya zimeanza kutumika tarehe 1 Januari 2026. Tafadhali angalia jedwali la nauli.',
        contentEn: 'New fares are effective from January 1, 2026. Please check the fare tables.',
        category: 'FARE_ADJUSTMENT',
        publishedAt: new Date('2026-01-01'),
        sourceAuthority: 'ZARTSA',
        isPublished: true,
      },
    ],
    skipDuplicates: true,
  });

  // Create sample bus locations for fleet tracking
  const busLocations = [
    { vehiclePlate: 'T123ABC', operatorId: 'zartsa-transit', route: 'Stone Town - Fuoni', serviceType: 'daladala', latitude: -6.1659, longitude: 39.1989, speed: 35, heading: 180, recordedAt: new Date() },
    { vehiclePlate: 'T456DEF', operatorId: 'zartsa-transit', route: 'Stone Town - Mwanakwerekwe', serviceType: 'daladala', latitude: -6.175, longitude: 39.205, speed: 28, heading: 90, recordedAt: new Date() },
    { vehiclePlate: 'T789GHI', operatorId: 'zanzibar-express', route: 'Stone Town - Paje', serviceType: 'shamba', latitude: -6.19, longitude: 39.35, speed: 55, heading: 270, recordedAt: new Date() },
    { vehiclePlate: 'T321JKL', operatorId: 'zanzibar-express', route: 'Stone Town - Nungwi', serviceType: 'shamba', latitude: -5.95, longitude: 39.25, speed: 60, heading: 0, recordedAt: new Date() },
    { vehiclePlate: 'T654MNO', operatorId: 'zartsa-transit', route: 'Stone Town - Kiembe Samaki', serviceType: 'daladala', latitude: -6.17, longitude: 39.21, speed: 20, heading: 45, recordedAt: new Date() },
    // Stale data (>5 min old)
    { vehiclePlate: 'T987PQR', operatorId: 'zartsa-transit', route: 'Stone Town - Jambiani', serviceType: 'shamba', latitude: -6.23, longitude: 39.5, speed: 0, heading: 0, recordedAt: new Date(Date.now() - 10 * 60 * 1000) },
  ];

  for (const loc of busLocations) {
    await prisma.busLocation.create({ data: loc });
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());