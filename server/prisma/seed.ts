// server/prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

  console.log('Seeding complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());