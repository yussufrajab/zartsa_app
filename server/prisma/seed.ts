// server/prisma/seed.ts
import 'dotenv/config';
import { PrismaClient } from '../src/generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Helper: random item from array
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Helper: random date within last N days
const daysAgo = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const hoursAgo = (n: number): Date => {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
};

async function main() {
  console.log('Seeding database with Zanzibar data...');

  if (process.env.NODE_ENV === 'production') {
    console.log('Seed script is disabled in production. Exiting.');
    process.exit(0);
  }

  // Clean existing seed data before re-seeding (reverse dependency order)
  console.log('  Cleaning existing seed data...');
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.notificationPreference.deleteMany({});
  await prisma.savedRoute.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.lostItemReport.deleteMany({});
  await prisma.foundItemReport.deleteMany({});
  await prisma.fine.deleteMany({});
  await prisma.busLocation.deleteMany({});
  await prisma.announcement.deleteMany({});
  console.log('  Cleaned existing seed data');

  // =========================================================================
  // 1. USERS — Zanzibari names, local phone numbers
  // =========================================================================
  console.log('  Creating users...');

  const userData = [
    // Admin
    { phone: '0776690001', firstName: 'Amani', lastName: 'Kombo', email: 'amani.kombo@zartsa.go.tz', role: 'ADMIN' as const, nationalId: 'ZI-1985-00421', preferredLanguage: 'sw' as const },
    // Officers
    { phone: '0776690011', firstName: 'Fatma', lastName: 'Hamad', email: 'fatma.hamad@zartsa.go.tz', role: 'OFFICER' as const, nationalId: 'ZI-1990-01132', preferredLanguage: 'sw' as const },
    { phone: '0776690012', firstName: 'Said', lastName: 'Mbarouk', email: 'said.mbarouk@zartsa.go.tz', role: 'OFFICER' as const, nationalId: 'ZI-1988-00876', preferredLanguage: 'en' as const },
    // Operators
    { phone: '0776690021', firstName: 'Mwanaidi', lastName: 'Juma', email: 'mwanaidi@zanzibartransit.co.tz', role: 'OPERATOR' as const, nationalId: 'ZI-1978-00234', preferredLanguage: 'sw' as const },
    { phone: '0776690022', firstName: 'Abdullah', lastName: 'Machano', email: 'abdullah@zanzibarexpress.co.tz', role: 'OPERATOR' as const, nationalId: 'ZI-1975-00678', preferredLanguage: 'sw' as const },
    { phone: '0776690023', firstName: 'Khadija', lastName: 'Suleiman', email: 'khadija@stonetownbus.co.tz', role: 'OPERATOR' as const, nationalId: 'ZI-1982-00543', preferredLanguage: 'en' as const },
    // Drivers
    { phone: '0776690031', firstName: 'Yusuf', lastName: 'Mzee', role: 'DRIVER' as const, nationalId: 'ZI-1992-01456', preferredLanguage: 'sw' as const },
    { phone: '0776690032', firstName: 'Mbaraka', lastName: 'Faki', role: 'DRIVER' as const, nationalId: 'ZI-1994-01678', preferredLanguage: 'sw' as const },
    { phone: '0776690033', firstName: 'Hassan', lastName: 'Mwalimu', role: 'DRIVER' as const, nationalId: 'ZI-1991-01234', preferredLanguage: 'sw' as const },
    { phone: '0776690034', firstName: 'Riziki', lastName: 'Mchenga', role: 'DRIVER' as const, nationalId: 'ZI-1993-01987', preferredLanguage: 'sw' as const },
    { phone: '0776690035', firstName: 'Soud', lastName: 'Makame', role: 'DRIVER' as const, nationalId: 'ZI-1989-01098', preferredLanguage: 'sw' as const },
    // Citizens
    { phone: '0776690041', firstName: 'Zulikha', lastName: 'Aboud', email: 'zulikha.aboud@gmail.com', role: 'CITIZEN' as const, preferredLanguage: 'sw' as const },
    { phone: '0776690042', firstName: 'Mwanajuma', lastName: 'Khamis', email: 'mwanajuma.k@gmail.com', role: 'CITIZEN' as const, preferredLanguage: 'sw' as const },
    { phone: '0776690043', firstName: 'Bakari', lastName: 'Msafiri', email: 'bakari.msafiri@gmail.com', role: 'CITIZEN' as const, preferredLanguage: 'en' as const },
    { phone: '0776690044', firstName: 'Aisha', lastName: 'Shamte', email: 'aisha.shamte@gmail.com', role: 'CITIZEN' as const, nationalId: 'ZI-1996-02345', preferredLanguage: 'sw' as const },
    { phone: '0776690045', firstName: 'Hamad', lastName: 'Omar', role: 'CITIZEN' as const, preferredLanguage: 'sw' as const },
    { phone: '0776690046', firstName: 'Mwanahamis', lastName: 'Shehe', email: 'mwanahamis.s@gmail.com', role: 'CITIZEN' as const, preferredLanguage: 'sw' as const },
    { phone: '0776690047', firstName: 'Jabir', lastName: 'Kombo', email: 'jabir.kombo@gmail.com', role: 'CITIZEN' as const, nationalId: 'ZI-1999-02789', preferredLanguage: 'en' as const },
    { phone: '0776690048', firstName: 'Latifa', lastName: 'Msham', email: 'latifa.msham@gmail.com', role: 'CITIZEN' as const, preferredLanguage: 'sw' as const },
    { phone: '0776690049', firstName: 'Kheri', lastName: 'Pembe', role: 'CITIZEN' as const, preferredLanguage: 'sw' as const },
    { phone: '0776690050', firstName: 'Mwanaish', lastName: 'Haji', email: 'mwanaish.haji@gmail.com', role: 'CITIZEN' as const, preferredLanguage: 'sw' as const },
  ];

  const users: Record<string, string> = {}; // phone -> id mapping
  for (const u of userData) {
    const created = await prisma.user.upsert({
      where: { phone: u.phone },
      update: {},
      create: { ...u, isActive: true },
    });
    users[u.phone] = created.id;
  }
  console.log(`    Created ${userData.length} users`);

  // =========================================================================
  // 2. FARE TABLES — All daladala + shamba routes from shared constants
  // =========================================================================
  console.log('  Creating fare tables...');

  const fareData = [
    // Daladala — Stone Town departures
    { routeType: 'daladala', departure: 'Stone Town', destination: 'Fuoni', baseFare: 400, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    { routeType: 'daladala', departure: 'Stone Town', destination: 'Mwanakwerekwe', baseFare: 500, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    { routeType: 'daladala', departure: 'Stone Town', destination: 'Kiembe Samaki', baseFare: 400, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    { routeType: 'daladala', departure: 'Stone Town', destination: 'Mikunguni', baseFare: 400, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    { routeType: 'daladala', departure: 'Stone Town', destination: 'Chukwani', baseFare: 500, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    // Daladala — Malindi departures
    { routeType: 'daladala', departure: 'Malindi', destination: 'Fuoni', baseFare: 400, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    { routeType: 'daladala', departure: 'Malindi', destination: 'Mwanakwerekwe', baseFare: 500, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    { routeType: 'daladala', departure: 'Malindi', destination: 'Stone Town', baseFare: 300, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    // Daladala — Darajani departures
    { routeType: 'daladala', departure: 'Darajani', destination: 'Kiembe Samaki', baseFare: 400, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    { routeType: 'daladala', departure: 'Darajani', destination: 'Stone Town', baseFare: 300, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    { routeType: 'daladala', departure: 'Darajani', destination: 'Mikunguni', baseFare: 400, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    // Daladala — Kariakoo departures
    { routeType: 'daladala', departure: 'Kariakoo', destination: 'Mwanakwerekwe', baseFare: 500, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    { routeType: 'daladala', departure: 'Kariakoo', destination: 'Fuoni', baseFare: 400, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    // Daladala — Amaan departures
    { routeType: 'daladala', departure: 'Amaan', destination: 'Stone Town', baseFare: 500, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    { routeType: 'daladala', departure: 'Amaan', destination: 'Mwanakwerekwe', baseFare: 400, surcharge: 0, effectiveDate: new Date('2026-01-01') },
    // Shamba — Stone Town departures
    { routeType: 'shamba', departure: 'Stone Town', destination: 'Paje', baseFare: 2500, surcharge: 200, effectiveDate: new Date('2026-01-01') },
    { routeType: 'shamba', departure: 'Stone Town', destination: 'Jambiani', baseFare: 3000, surcharge: 200, effectiveDate: new Date('2026-01-01') },
    { routeType: 'shamba', departure: 'Stone Town', destination: 'Nungwi', baseFare: 3500, surcharge: 300, effectiveDate: new Date('2026-01-01') },
    { routeType: 'shamba', departure: 'Stone Town', destination: 'Kendwa', baseFare: 3500, surcharge: 300, effectiveDate: new Date('2026-01-01') },
    { routeType: 'shamba', departure: 'Stone Town', destination: 'Matemwe', baseFare: 3000, surcharge: 200, effectiveDate: new Date('2026-01-01') },
    { routeType: 'shamba', departure: 'Stone Town', destination: 'Michamvi', baseFare: 2800, surcharge: 200, effectiveDate: new Date('2026-01-01') },
    { routeType: 'shamba', departure: 'Stone Town', destination: 'Uroa', baseFare: 2500, surcharge: 200, effectiveDate: new Date('2026-01-01') },
    { routeType: 'shamba', departure: 'Stone Town', destination: 'Dongwe', baseFare: 2800, surcharge: 200, effectiveDate: new Date('2026-01-01') },
    { routeType: 'shamba', departure: 'Stone Town', destination: 'Bwejuu', baseFare: 3000, surcharge: 200, effectiveDate: new Date('2026-01-01') },
    // Shamba — Malindi departures
    { routeType: 'shamba', departure: 'Malindi', destination: 'Paje', baseFare: 2500, surcharge: 200, effectiveDate: new Date('2026-01-01') },
    { routeType: 'shamba', departure: 'Malindi', destination: 'Nungwi', baseFare: 3500, surcharge: 300, effectiveDate: new Date('2026-01-01') },
    { routeType: 'shamba', departure: 'Malindi', destination: 'Jambiani', baseFare: 3000, surcharge: 200, effectiveDate: new Date('2026-01-01') },
  ];

  for (const fare of fareData) {
    await prisma.fareTable.upsert({
      where: { routeType_departure_destination: { routeType: fare.routeType, departure: fare.departure, destination: fare.destination } },
      update: {},
      create: fare,
    });
  }
  console.log(`    Created ${fareData.length} fare entries`);

  // =========================================================================
  // 3. ANNOUNCEMENTS — Zanzibar transport news
  // =========================================================================
  console.log('  Creating announcements...');

  const announcementData = [
    {
      titleSw: 'Marekebisho ya Nauli - Januari 2026',
      titleEn: 'Fare Adjustment - January 2026',
      contentSw: 'Nauli mpya zimeanza kutumika tarehe 1 Januari 2026. Tafadhali angalia jedwali la nauli kwa maelezo zaidi. Mabadiliko haya yanahusu njia zote za daladala na shamba.',
      contentEn: 'New fares are effective from January 1, 2026. Please check the fare tables for details. These changes apply to all daladala and shamba routes.',
      category: 'FARE_ADJUSTMENT' as const,
      publishedAt: new Date('2026-01-01'),
      sourceAuthority: 'ZARTSA',
      isPublished: true,
    },
    {
      titleSw: 'Kufungwa kwa Barabara ya Kenyatta - Matengenezo',
      titleEn: 'Kenyatta Road Closure - Maintenance',
      contentSw: 'Barabara ya Kenyatta katika Mji Mkongwe itafungwa kwa magari tarehe 15 hadi 20 Aprili 2026 kwa ajili ya matengenezo ya miundombinu. Daladala zitatumia njia ya Mchangani.',
      contentEn: 'Kenyatta Road in Stone Town will be closed to vehicles from April 15-20, 2026 for infrastructure maintenance. Daladalas will use the Mchangani route.',
      category: 'ROAD_CLOSURE' as const,
      publishedAt: new Date('2026-04-10'),
      sourceAuthority: 'ZARTSA',
      isPublished: true,
    },
    {
      titleSw: 'Mabadiliko ya Ratiba ya Shamba - Nungwi',
      titleEn: 'Shamba Schedule Change - Nungwi',
      contentSw: 'Kuanzia tarehe 1 Machi 2026, basi la shamba la Nungwi litatoka saa 6:00 asubuhi badala ya saa 7:00. Hii ni kwa ajili ya kuwapa abiria muda wa kuwasili mapema kazini.',
      contentEn: 'Effective March 1, 2026, the Nungwi shamba bus will depart at 6:00 AM instead of 7:00 AM. This change gives commuters more time to arrive early at work.',
      category: 'SCHEDULE_CHANGE' as const,
      publishedAt: new Date('2026-02-25'),
      sourceAuthority: 'ZARTSA',
      isPublished: true,
    },
    {
      titleSw: 'Sheria Mpya ya Leseni ya Madereva',
      titleEn: 'New Driver Licensing Regulation',
      contentSw: 'Serikali ya Mapinduzi ya Zanzibar imeanza kuweka masharti mapya ya leseni ya madereva. Madereva wote wanatakiwa kuonyesha leseni halali wakati wa ukaguzi. Adhabu ya TZS 50,000 kwa wasio na leseni.',
      contentEn: 'The Revolutionary Government of Zanzibar has enforced new driver licensing requirements. All drivers must present a valid license during inspections. Penalty of TZS 50,000 for unlicensed drivers.',
      category: 'REGULATORY_UPDATE' as const,
      publishedAt: new Date('2026-03-15'),
      sourceAuthority: 'ZARTSA',
      isPublished: true,
    },
    {
      titleSw: 'Sikukuu ya Mapinduzi - Ratiba Maalum',
      titleEn: 'Revolution Day - Special Schedule',
      contentSw: 'Kwa ajili ya sherehe za Sikukuu ya Mapinduzi tarehe 12 Januari, daladala na shamba zitaendelea kufanya kazi lakini kwa ratiba iliyopunguzwa. Mabasi ya ziada yatawekwa kwenye njia ya Mji Mkongwe hadi Fuoni.',
      contentEn: 'For Revolution Day celebrations on January 12, daladalas and shamba buses will operate on a reduced schedule. Extra buses will be added on the Stone Town to Fuoni route.',
      category: 'GENERAL_NOTICE' as const,
      publishedAt: new Date('2026-01-10'),
      sourceAuthority: 'ZARTSA',
      isPublished: true,
    },
    {
      titleSw: 'Mabadiliko ya Njia ya Daladala - Kiembe Samaki',
      titleEn: 'Daladala Route Change - Kiembe Samaki',
      contentSw: 'Njia ya daladala ya Kiembe Samaki imebadilishwa kuanzia Mchanga Mdogo hadi Kijitoupele kwa sababu ya ujenzi wa barabara mpya. Mabadiliko haya ni ya kuda na yataisha baada ya miezi mitatu.',
      contentEn: 'The Kiembe Samaki daladala route has been changed from Mchanga Mdogo to Kijitoupele due to new road construction. This change is temporary and will end after three months.',
      category: 'ROAD_CLOSURE' as const,
      publishedAt: new Date('2026-04-01'),
      sourceAuthority: 'ZARTSA',
      isPublished: true,
    },
    {
      titleSw: 'Huduma Mpya ya Daladala ya Usiku',
      titleEn: 'New Night Daladala Service',
      contentSw: 'Kuanzia tarehe 1 Februari 2026, ZARTSA imeweka daladala za usiku kwenye njia ya Stone Town hadi Mwanakwerekwe. Mabasi yatafanya kazi kuanzia saa 8:00 usiku hadi saa 11:00 usiku.',
      contentEn: 'Starting February 1, 2026, ZARTSA has launched night daladalas on the Stone Town to Mwanakwerekwe route. Buses will operate from 8:00 PM to 11:00 PM.',
      category: 'SCHEDULE_CHANGE' as const,
      publishedAt: new Date('2026-01-28'),
      sourceAuthority: 'ZARTSA',
      isPublished: true,
    },
    {
      titleSw: 'Onyo la Hali ya Hewa - Mvua Kubwa',
      titleEn: 'Weather Advisory - Heavy Rain',
      contentSw: 'Ofisi ya Hali ya Hewa ya Zanzibar imetoa onyo la mvua kubwa kuanzia tarehe 20 hadi 25 Aprili 2026. Abiria wanashauriwa kuwa na subira maana daladala zinaweza kuchelewa.',
      contentEn: 'The Zanzibar Meteorological Office has issued a heavy rain advisory from April 20-25, 2026. Passengers are advised to be patient as daladalas may experience delays.',
      category: 'GENERAL_NOTICE' as const,
      publishedAt: new Date('2026-04-18'),
      sourceAuthority: 'Zanzibar Meteorological Office',
      isPublished: true,
    },
  ];

  await prisma.announcement.createMany({ data: announcementData, skipDuplicates: true });
  console.log(`    Created ${announcementData.length} announcements`);

  // =========================================================================
  // 4. BUS LOCATIONS — Live fleet tracking data
  // =========================================================================
  console.log('  Creating bus locations...');

  const busLocationData = [
    // Daladala fleet — Stone Town routes
    { vehiclePlate: 'TZA-231', operatorId: 'zanzibar-transit', route: 'Stone Town - Fuoni', serviceType: 'daladala', latitude: -6.1659, longitude: 39.1989, speed: 32, heading: 180, recordedAt: new Date() },
    { vehiclePlate: 'TZA-447', operatorId: 'zanzibar-transit', route: 'Stone Town - Mwanakwerekwe', serviceType: 'daladala', latitude: -6.1750, longitude: 39.2050, speed: 28, heading: 90, recordedAt: new Date() },
    { vehiclePlate: 'TZA-112', operatorId: 'zanzibar-transit', route: 'Stone Town - Kiembe Samaki', serviceType: 'daladala', latitude: -6.1700, longitude: 39.2100, speed: 20, heading: 45, recordedAt: new Date() },
    { vehiclePlate: 'TZA-335', operatorId: 'zanzibar-transit', route: 'Stone Town - Mikunguni', serviceType: 'daladala', latitude: -6.1680, longitude: 39.1950, speed: 25, heading: 270, recordedAt: new Date() },
    { vehiclePlate: 'TZA-556', operatorId: 'zanzibar-transit', route: 'Stone Town - Chukwani', serviceType: 'daladala', latitude: -6.1720, longitude: 39.2150, speed: 30, heading: 135, recordedAt: new Date() },
    // Daladala fleet — Malindi routes
    { vehiclePlate: 'TZA-223', operatorId: 'stone-town-bus', route: 'Malindi - Fuoni', serviceType: 'daladala', latitude: -6.1580, longitude: 39.1900, speed: 22, heading: 200, recordedAt: new Date() },
    { vehiclePlate: 'TZA-444', operatorId: 'stone-town-bus', route: 'Malindi - Stone Town', serviceType: 'daladala', latitude: -6.1600, longitude: 39.2000, speed: 18, heading: 350, recordedAt: new Date() },
    // Daladala fleet — Darajani routes
    { vehiclePlate: 'TZA-667', operatorId: 'zanzibar-transit', route: 'Darajani - Kiembe Samaki', serviceType: 'daladala', latitude: -6.1630, longitude: 39.1970, speed: 15, heading: 120, recordedAt: new Date() },
    // Shamba fleet — long distance
    { vehiclePlate: 'TZA-889', operatorId: 'zanzibar-express', route: 'Stone Town - Paje', serviceType: 'shamba', latitude: -6.1900, longitude: 39.3500, speed: 55, heading: 270, recordedAt: new Date() },
    { vehiclePlate: 'TZA-990', operatorId: 'zanzibar-express', route: 'Stone Town - Nungwi', serviceType: 'shamba', latitude: -5.9500, longitude: 39.2500, speed: 60, heading: 0, recordedAt: new Date() },
    { vehiclePlate: 'TZA-115', operatorId: 'zanzibar-express', route: 'Stone Town - Jambiani', serviceType: 'shamba', latitude: -6.2300, longitude: 39.5000, speed: 50, heading: 180, recordedAt: new Date() },
    { vehiclePlate: 'TZA-228', operatorId: 'zanzibar-express', route: 'Stone Town - Kendwa', serviceType: 'shamba', latitude: -5.9300, longitude: 39.2700, speed: 58, heading: 350, recordedAt: new Date() },
    { vehiclePlate: 'TZA-337', operatorId: 'zanzibar-express', route: 'Stone Town - Matemwe', serviceType: 'shamba', latitude: -5.8700, longitude: 39.3200, speed: 45, heading: 30, recordedAt: new Date() },
    { vehiclePlate: 'TZA-446', operatorId: 'zanzibar-express', route: 'Stone Town - Michamvi', serviceType: 'shamba', latitude: -6.2100, longitude: 39.4200, speed: 40, heading: 220, recordedAt: new Date() },
    // Stale locations (>5 min old — should appear as offline on map)
    { vehiclePlate: 'TZA-778', operatorId: 'zanzibar-transit', route: 'Stone Town - Uroa', serviceType: 'shamba', latitude: -6.2000, longitude: 39.3800, speed: 0, heading: 0, recordedAt: new Date(Date.now() - 10 * 60 * 1000) },
    { vehiclePlate: 'TZA-999', operatorId: 'zanzibar-transit', route: 'Malindi - Paje', serviceType: 'shamba', latitude: -6.1800, longitude: 39.3300, speed: 0, heading: 0, recordedAt: new Date(Date.now() - 15 * 60 * 1000) },
  ];

  for (const loc of busLocationData) {
    await prisma.busLocation.create({ data: loc });
  }
  console.log(`    Created ${busLocationData.length} bus locations`);

  // =========================================================================
  // 5. BOOKINGS — E-ticket purchases
  // =========================================================================
  console.log('  Creating bookings...');

  const citizenIds = Object.values(users).slice(7); // citizens only
  const bookingData = [
    { userId: users['0776690041'], departure: 'Stone Town', destination: 'Fuoni', travelDate: daysAgo(1), passengerCount: 1, seatNumbers: ['A1'], totalAmount: 400, paymentMethod: 'mpesa', status: 'USED' as const, vehiclePlate: 'TZA-231', operatorId: 'zanzibar-transit' },
    { userId: users['0776690042'], departure: 'Stone Town', destination: 'Nungwi', travelDate: daysAgo(0), passengerCount: 2, seatNumbers: ['B3', 'B4'], totalAmount: 7000, paymentMethod: 'mpesa', status: 'ACTIVE' as const, vehiclePlate: 'TZA-990', operatorId: 'zanzibar-express' },
    { userId: users['0776690043'], departure: 'Stone Town', destination: 'Paje', travelDate: daysAgo(3), passengerCount: 1, seatNumbers: ['C2'], totalAmount: 2700, paymentMethod: 'halopesa', status: 'USED' as const, vehiclePlate: 'TZA-889', operatorId: 'zanzibar-express' },
    { userId: users['0776690044'], departure: 'Malindi', destination: 'Stone Town', travelDate: daysAgo(2), passengerCount: 1, seatNumbers: ['A3'], totalAmount: 300, paymentMethod: 'mpesa', status: 'USED' as const, vehiclePlate: 'TZA-444', operatorId: 'stone-town-bus' },
    { userId: users['0776690045'], departure: 'Stone Town', destination: 'Jambiani', travelDate: daysAgo(0), passengerCount: 3, seatNumbers: ['D1', 'D2', 'D3'], totalAmount: 9600, paymentMethod: 'mpesa', status: 'ACTIVE' as const, vehiclePlate: 'TZA-115', operatorId: 'zanzibar-express' },
    { userId: users['0776690046'], departure: 'Stone Town', destination: 'Mwanakwerekwe', travelDate: daysAgo(5), passengerCount: 1, seatNumbers: ['A2'], totalAmount: 500, paymentMethod: 'halopesa', status: 'EXPIRED' as const, vehiclePlate: 'TZA-447', operatorId: 'zanzibar-transit' },
    { userId: users['0776690047'], departure: 'Stone Town', destination: 'Kendwa', travelDate: daysAgo(1), passengerCount: 2, seatNumbers: ['E1', 'E2'], totalAmount: 7600, paymentMethod: 'mpesa', status: 'USED' as const, vehiclePlate: 'TZA-228', operatorId: 'zanzibar-express' },
    { userId: users['0776690048'], departure: 'Darajani', destination: 'Mikunguni', travelDate: daysAgo(0), passengerCount: 1, seatNumbers: ['B1'], totalAmount: 400, paymentMethod: 'mpesa', status: 'ACTIVE' as const, vehiclePlate: 'TZA-667', operatorId: 'zanzibar-transit' },
    { userId: users['0776690049'], departure: 'Stone Town', destination: 'Bwejuu', travelDate: daysAgo(4), passengerCount: 1, seatNumbers: ['C4'], totalAmount: 3200, paymentMethod: 'halopesa', status: 'CANCELLED' as const, vehiclePlate: 'TZA-115', operatorId: 'zanzibar-express' },
    { userId: users['0776690050'], departure: 'Stone Town', destination: 'Michamvi', travelDate: daysAgo(0), passengerCount: 1, seatNumbers: ['F2'], totalAmount: 3000, paymentMethod: 'mpesa', status: 'ACTIVE' as const, vehiclePlate: 'TZA-446', operatorId: 'zanzibar-express' },
  ];

  for (const b of bookingData) {
    await prisma.booking.create({
      data: {
        ...b,
        seatNumbers: JSON.stringify(b.seatNumbers),
        currency: 'TZS',
        paymentRef: b.status === 'USED' || b.status === 'ACTIVE' ? `ZP${Date.now()}${Math.random().toString(36).slice(2, 6)}` : null,
        qrCode: b.status === 'ACTIVE' ? `QR-${b.departure.slice(0,3)}-${b.destination.slice(0,3)}-${Math.random().toString(36).slice(2, 8)}` : null,
      },
    });
  }
  console.log(`    Created ${bookingData.length} bookings`);

  // =========================================================================
  // 6. COMPLAINTS — Transport complaints from citizens
  // =========================================================================
  console.log('  Creating complaints...');

  const complaintData = [
    { userId: users['0776690041'], vehiclePlate: 'TZA-231', route: 'Stone Town - Fuoni', incidentDate: daysAgo(5), category: 'Overcharging', description: 'Dereva alinilipisha TZS 600 badala ya TZS 400 kwa njia ya Stone Town mpaka Fuoni. Nilimuuliza alisema nauli imebadilika lakini sikuona tangazo lolote.', status: 'RECEIVED' as const },
    { userId: users['0776690042'], vehiclePlate: 'TZA-990', route: 'Stone Town - Nungwi', incidentDate: daysAgo(3), category: 'Reckless Driving', description: 'Dereva alikuwa anaendesha kwa kasi sana karibu na Miji Mwembamba karibu na Mvuleni. Abiria wote walikuwa na wasiwasi.', status: 'UNDER_REVIEW' as const, assignedTo: users['0776690011'] },
    { userId: users['0776690043'], vehiclePlate: 'TZA-889', route: 'Stone Town - Paje', incidentDate: daysAgo(7), category: 'Rude Behavior', description: 'Kondakta alikuwa anapiga kelele na kutumia maneno makuu kwa abiria wakati abiria wakiondoka kwenye daladala huko Paje.', status: 'ESCALATED' as const, assignedTo: users['0776690012'] },
    { userId: users['0776690044'], vehiclePlate: 'TZA-447', route: 'Stone Town - Mwanakwerekwe', incidentDate: daysAgo(10), category: 'Overcrowding', description: 'Daladala ilikuwa na abiria wengi sana. Watu walikuwa wamesimama wakati gari likiwa linaenda. Hii ni hatari kwa usalama wetu.', status: 'RESOLVED' as const, resolution: 'Mwendeshaji amepata onyo rasmi na ameahidi kufuata sheria za usalama. Ufuatiliaji unaendelea.' },
    { userId: users['0776690045'], vehiclePlate: 'TZA-667', route: 'Darajani - Kiembe Samaki', incidentDate: daysAgo(12), category: 'No Change Given', description: 'Nilimpa TZS 1000 lakini kondakta hakurudisha TZS 600. Alisina change na akanambia nisubiri lakini hakurudi.', status: 'CLOSED' as const, resolution: 'Kampuni imerejesha TZS 600 kupitia M-Pesa. Dereva amepata adhabu ya TZS 5000.' },
    { userId: users['0776690046'], vehiclePlate: 'TZA-223', route: 'Malindi - Fuoni', incidentDate: daysAgo(2), category: 'Unsafe Vehicle', description: 'Mlango wa daladala ulikuwa haujafungwa vizuri na ukawa unafunguka wakati gari likiwa linaenda. Pia kiti cha nyuma kilikuwa kimevunjika.', status: 'RECEIVED' as const },
    { userId: users['0776690047'], vehiclePlate: 'TZA-115', route: 'Stone Town - Jambiani', incidentDate: daysAgo(1), category: 'Route Deviation', description: 'Basi la shamba liliacha njia ya kawaida na kutumia njia nyingine ndefu bila kutoa taarifa. Tukachelewa kwa zaidi ya nusu saa.', status: 'RECEIVED' as const },
    { userId: users['0776690048'], vehiclePlate: 'TZA-556', route: 'Stone Town - Chukwani', incidentDate: daysAgo(4), category: 'Harassment', description: 'Kondakta alifanya vitendo vya unyanyasaa kwa mwanamke mmoja abiria. Abiria wengine walipinga na dereva hakufanya chochote.', status: 'UNDER_REVIEW' as const, assignedTo: users['0776690011'] },
  ];

  for (const c of complaintData) {
    const refNum = `CMP-${new Date(c.incidentDate).getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
    await prisma.complaint.create({
      data: {
        ...c,
        referenceNumber: refNum,
        attachments: JSON.stringify([]),
        resolvedAt: c.status === 'RESOLVED' || c.status === 'CLOSED' ? daysAgo(1) : null,
      },
    });
  }
  console.log(`    Created ${complaintData.length} complaints`);

  // =========================================================================
  // 7. LOST ITEM REPORTS
  // =========================================================================
  console.log('  Creating lost item reports...');

  const lostItemData = [
    { userId: users['0776690041'], description: 'Mfuko wa ngozi wenye rangi ya kahawia, ndani kuna vitambulisho vya benki na pesa taslimu', category: 'Bags', route: 'Stone Town - Fuoni', travelDate: daysAgo(3), contactInfo: '0776690041', status: 'REPORTED' as const },
    { userId: users['0776690042'], description: 'Simu ya Samsung Galaxy A15 yenye kifuniko cha rangi ya bluu', category: 'Electronics', route: 'Stone Town - Nungwi', travelDate: daysAgo(1), contactInfo: '0776690042', status: 'MATCHED' as const },
    { userId: users['0776690043'], description: 'Mwanzo wa Quran tukufu wenye kifuniko cha kijani, uliachwa kwenye kiti cha basi', category: 'Books', route: 'Stone Town - Paje', travelDate: daysAgo(5), contactInfo: '0776690043', status: 'FOUND' as const },
    { userId: users['0776690044'], description: 'Funguo za nyumba tatu, moja ya chuma na mbili ya plastiki zenye rangi nyekundu', category: 'Keys', route: 'Malindi - Stone Town', travelDate: daysAgo(2), contactInfo: '0776690044', status: 'REPORTED' as const },
    { userId: users['0776690046'], description: 'Mviringo wa kioo wenye pete ya dhahabu, ulipotea chini ya kiti cha daladala', category: 'Jewelry', route: 'Stone Town - Mwanakwerekwe', travelDate: daysAgo(7), contactInfo: '0776690046', status: 'CLAIMED' as const },
    { userId: users['0776690049'], description: 'Mfuko mdogo wenye dawa za hospitali, muhimu kwa ajili ya ugonjwa wa kisukari', category: 'Medical', route: 'Stone Town - Bwejuu', travelDate: daysAgo(0), contactInfo: '0776690049', status: 'REPORTED' as const },
  ];

  for (const l of lostItemData) {
    await prisma.lostItemReport.create({ data: l });
  }
  console.log(`    Created ${lostItemData.length} lost item reports`);

  // =========================================================================
  // 8. FOUND ITEM REPORTS
  // =========================================================================
  console.log('  Creating found item reports...');

  const foundItemData = [
    { reportedBy: users['0776690031'], description: 'Simu ya Samsung Galaxy A15 yenye kifuniko cha bluu, ilipatikana chini ya kiti cha abiria', category: 'Electronics', busNumber: 'TZA-990', route: 'Stone Town - Nungwi', foundDate: daysAgo(1), status: 'FOUND' as const },
    { reportedBy: users['0776690032'], description: 'Mfuko wa ngozi wenye rangi kahawia, ndani kadi ya benki ya CRDB na leseni ya kuendesha', category: 'Bags', busNumber: 'TZA-231', route: 'Stone Town - Fuoni', foundDate: daysAgo(3), status: 'MATCHED' as const },
    { reportedBy: users['0776690033'], description: 'Mwanzo wa Quran tukufu wenye kifuniko cha kijani, ulipatikana kwenye rafi ya dirisha', category: 'Books', busNumber: 'TZA-889', route: 'Stone Town - Paje', foundDate: daysAgo(5), status: 'FOUND' as const },
    { reportedBy: users['0776690034'], description: 'Mviringo wa kioo wenye pete ya dhahabu, ulipatikana karibu na mlango wa daladala', category: 'Jewelry', busNumber: 'TZA-447', route: 'Stone Town - Mwanakwerekwe', foundDate: daysAgo(7), status: 'CLAIMED' as const, claimedBy: users['0776690046'] },
    { reportedBy: users['0776690035'], description: 'Mfunguo tatu, moja ya chuma na mbili za plastiki nyekundu, zilipatikana kwenye kiti cha mwisho', category: 'Keys', busNumber: 'TZA-444', route: 'Malindi - Stone Town', foundDate: daysAgo(2), status: 'FOUND' as const },
    { reportedBy: users['0776690031'], description: 'Mfuko mdogo wenye dawa za hospitali, ulipatikana chini ya kiti karibu na mlango', category: 'Medical', busNumber: 'TZA-115', route: 'Stone Town - Jambiani', foundDate: daysAgo(0), status: 'UNCLAIMED' as const },
  ];

  for (const f of foundItemData) {
    await prisma.foundItemReport.create({ data: f });
  }
  console.log(`    Created ${foundItemData.length} found item reports`);

  // =========================================================================
  // 9. FINES — Traffic violations
  // =========================================================================
  console.log('  Creating fines...');

  const fineData = [
    { drivingLicense: 'DL-ZNZ-2024-001234', vehiclePlate: 'TZA-231', offenseType: 'Speeding', offenseDate: daysAgo(5), location: 'Creek Road, Stone Town', penaltyAmount: 30000, controlNumber: 'CN-2026-001001', paymentStatus: 'PAID' as const, paidAt: daysAgo(4), paymentRef: 'MPESA-2Q3R4T' },
    { drivingLicense: 'DL-ZNZ-2023-005678', vehiclePlate: 'TZA-990', offenseType: 'Reckless Driving', offenseDate: daysAgo(3), location: 'Mvuleni Junction', penaltyAmount: 50000, controlNumber: 'CN-2026-001002', paymentStatus: 'OUTSTANDING' as const },
    { drivingLicense: 'DL-ZNZ-2024-009012', vehiclePlate: 'TZA-447', offenseType: 'Overloading', offenseDate: daysAgo(7), location: 'Mwanakwerekwe Stand', penaltyAmount: 25000, controlNumber: 'CN-2026-001003', paymentStatus: 'PAID' as const, paidAt: daysAgo(6), paymentRef: 'HALOPESA-7K8M9N' },
    { drivingLicense: 'DL-ZNZ-2022-003456', vehiclePlate: 'TZA-667', offenseType: 'No Valid License', offenseDate: daysAgo(2), location: 'Darajani Bus Stand', penaltyAmount: 50000, controlNumber: 'CN-2026-001004', paymentStatus: 'DISPUTED' as const },
    { drivingLicense: 'DL-ZNZ-2025-007890', vehiclePlate: 'TZA-115', offenseType: 'Route Deviation', offenseDate: daysAgo(1), location: 'Chwaka Junction', penaltyAmount: 20000, controlNumber: 'CN-2026-001005', paymentStatus: 'OUTSTANDING' as const },
    { vehiclePlate: 'TZA-223', offenseType: 'Unsafe Vehicle', offenseDate: daysAgo(4), location: 'Malindi Roundabout', penaltyAmount: 40000, controlNumber: 'CN-2026-001006', paymentStatus: 'OUTSTANDING' as const },
    { drivingLicense: 'DL-ZNZ-2024-002345', vehiclePlate: 'TZA-889', offenseType: 'Speeding', offenseDate: daysAgo(8), location: 'Paje Road, Near Charawe', penaltyAmount: 30000, controlNumber: 'CN-2026-001007', paymentStatus: 'WAIVED' as const },
    { drivingLicense: 'DL-ZNZ-2023-006789', vehiclePlate: 'TZA-556', offenseType: 'Running Red Light', offenseDate: daysAgo(6), location: 'Mchinikoli Intersection', penaltyAmount: 35000, controlNumber: 'CN-2026-001008', paymentStatus: 'OUTSTANDING' as const },
  ];

  for (const f of fineData) {
    await prisma.fine.create({ data: f });
  }
  console.log(`    Created ${fineData.length} fines`);

  // =========================================================================
  // 10. NOTIFICATIONS — For all users
  // =========================================================================
  console.log('  Creating notifications...');

  const notificationData = [
    // Welcome notifications
    ...Object.entries(users).filter(([phone]) => phone.startsWith('077669004')).map(([phone, id]) => ({
      userId: id, type: 'payment_confirmation', title: 'Karibu ZARTSA!', message: `Hongera! Akaunti yako ya ZARTSA imeundwa kwa mafanikio. Unaweza sasa kutumia huduma zote za usafiri za Zanzibar.`, channel: 'IN_APP' as const, isRead: false, sentAt: daysAgo(10),
    })),
    // Fine notifications
    { userId: users['0776690042'], type: 'new_fine', title: 'Faini Mpya Imetolewa', message: 'Faini ya TZS 50,000 kwa ajili ya uendeshaji mbaya imetolewa. Namba ya udhibiti: CN-2026-001002. Lipa ndani ya siku 14.', channel: 'IN_APP' as const, isRead: false, sentAt: daysAgo(3) },
    // Complaint updates
    { userId: users['0776690044'], type: 'complaint_status_update', title: 'Malalamiko Yako Yametatuliwa', message: 'Malalamiko yako kuhusu kutopewa change yametatuliwa. TZS 600 zimerudishwa kupitia M-Pesa.', channel: 'IN_APP' as const, isRead: true, sentAt: daysAgo(1) },
    // Lost item match
    { userId: users['0776690042'], type: 'lost_item_match', title: 'Kifaa Chako Kimepatikana!', message: 'Simu yako ya Samsung Galaxy A15 imepatikana kwenye basi la Nungwi. Tembelea ofisi yetu ya Stone Town kuichukua.', channel: 'IN_APP' as const, isRead: false, sentAt: daysAgo(1) },
    // Bus delay
    { userId: users['0776690041'], type: 'bus_delay', title: 'Kuchelewa kwa Daladala', message: 'Daladala ya Fuoni inachelewa dakika 15 kutokana na msongamano wa magari kwenye barabara ya Creek.', channel: 'IN_APP' as const, isRead: false, sentAt: hoursAgo(2) },
    // Route change
    { userId: users['0776690043'], type: 'route_change', title: 'Mabadiliko ya Njia', message: 'Njia ya daladala ya Kiembe Samaki imebadilika kwa muda kutoka Mchanga Mdogo hadi Kijitoupele.', channel: 'IN_APP' as const, isRead: false, sentAt: daysAgo(5) },
    // New announcement
    { userId: users['0776690045'], type: 'new_announcement', title: 'Tangazo Jipya', message: 'Sikukuu ya Mapinduzi - Daladala na shamba zitafanya kazi kwa ratiba iliyopunguzwa tarehe 12 Januari.', channel: 'IN_APP' as const, isRead: true, sentAt: daysAgo(8) },
    // Payment receipt
    { userId: users['0776690045'], type: 'payment_receipt', title: 'Risiti ya Malipo', message: 'Malipo ya TZS 9,600 kwa tiketi 3 za Jambiani yamekubaliwa. Namba ya risiti: ZP-2026-78901', channel: 'IN_APP' as const, isRead: false, sentAt: daysAgo(0) },
    // License expiry warnings
    { userId: users['0776690031'], type: 'license_expiry_30', title: 'Leseni Yako Inaisha Mwezi 1', message: 'Leseni yako ya kuendesha DL-ZNZ-2024-001234 inaisha ndani ya mwezi mmoja. Fanya upya kabla ya tarehe 25 Mei 2026.', channel: 'IN_APP' as const, isRead: false, sentAt: daysAgo(1) },
    { userId: users['0776690033'], type: 'license_expiry_7', title: 'Leseni Yako Inaisha Siku 7!', message: 'LESNI YAKO INAISHA! Leseni yako DL-ZNZ-2024-009012 inaisha ndani ya siku 7. Fanya upya sasa!', channel: 'IN_APP' as const, isRead: false, sentAt: hoursAgo(5) },
    // SMS notifications
    { userId: users['0776690042'], type: 'new_fine', title: 'Faini Mpya', message: 'Faini TZS 50,000 kwa uendeshaji mbaya. CN: CN-2026-001002', channel: 'SMS' as const, isRead: true, sentAt: daysAgo(3) },
    // Email notifications
    { userId: users['0776690047'], type: 'payment_receipt', title: 'Payment Receipt', message: 'Your payment of TZS 7,600 for 2 Kendwa tickets has been confirmed. Receipt: ZP-2026-45678', channel: 'EMAIL' as const, isRead: false, sentAt: daysAgo(1) },
  ];

  for (const n of notificationData) {
    await prisma.notification.create({ data: n });
  }
  console.log(`    Created ${notificationData.length} notifications`);

  // =========================================================================
  // 11. SAVED ROUTES — Citizens' favorite routes
  // =========================================================================
  console.log('  Creating saved routes...');

  const savedRouteData = [
    { userId: users['0776690041'], departure: 'Stone Town', destination: 'Fuoni', label: 'Njia ya Nyumbani' },
    { userId: users['0776690041'], departure: 'Stone Town', destination: 'Paje', label: 'Njia ya Paje Beach' },
    { userId: users['0776690042'], departure: 'Stone Town', destination: 'Nungwi', label: 'Njia ya Nungwi' },
    { userId: users['0776690042'], departure: 'Stone Town', destination: 'Fuoni', label: 'Kwenda Sokoni' },
    { userId: users['0776690043'], departure: 'Stone Town', destination: 'Paje', label: 'Weekend Trip' },
    { userId: users['0776690044'], departure: 'Malindi', destination: 'Stone Town', label: 'Kwenda Kazini' },
    { userId: users['0776690045'], departure: 'Stone Town', destination: 'Jambiani', label: 'Njia ya Jambiani' },
    { userId: users['0776690046'], departure: 'Stone Town', destination: 'Mwanakwerekwe', label: 'Soko la Mwanakwerekwe' },
    { userId: users['0776690047'], departure: 'Stone Town', destination: 'Kendwa', label: 'Kendwa Beach' },
    { userId: users['0776690047'], departure: 'Stone Town', destination: 'Michamvi', label: 'Michamvi Sunset' },
    { userId: users['0776690048'], departure: 'Darajani', destination: 'Mikunguni', label: 'Njia ya Mikunguni' },
    { userId: users['0776690050'], departure: 'Stone Town', destination: 'Matemwe', label: 'Matemwe Beach' },
  ];

  for (const s of savedRouteData) {
    await prisma.savedRoute.create({ data: s });
  }
  console.log(`    Created ${savedRouteData.length} saved routes`);

  // =========================================================================
  // 12. NOTIFICATION PREFERENCES
  // =========================================================================
  console.log('  Creating notification preferences...');

  const notifTypes = [
    'license_expiry_60', 'license_expiry_30', 'license_expiry_14', 'license_expiry_7',
    'payment_confirmation', 'payment_receipt', 'bus_delay', 'route_change',
    'new_fine', 'complaint_status_update', 'lost_item_match', 'new_announcement',
  ];

  // Create preferences for citizens and drivers
  const prefUserIds = [...Object.values(users).slice(4, 11), ...Object.values(users).slice(11)]; // drivers + citizens
  let prefCount = 0;
  for (const userId of prefUserIds) {
    for (const type of notifTypes) {
      // Drivers get license expiry alerts by default
      const isDriver = prefUserIds.indexOf(userId) < 7;
      await prisma.notificationPreference.upsert({
        where: { userId_type: { userId, type } },
        update: {},
        create: {
          userId,
          type,
          inApp: true,
          sms: type.startsWith('license_expiry') && isDriver ? true : ['new_fine', 'payment_confirmation'].includes(type),
          email: ['payment_receipt', 'license_expiry_14', 'license_expiry_7', 'new_fine'].includes(type),
        },
      });
      prefCount++;
    }
  }
  console.log(`    Created ${prefCount} notification preferences`);

  // =========================================================================
  // 13. AUDIT LOGS
  // =========================================================================
  console.log('  Creating audit logs...');

  const auditData = [
    { userId: users['0776690001'], action: 'CREATE', resource: 'announcement', details: 'Created fare adjustment announcement for January 2026', ipAddress: '192.168.1.100', createdAt: daysAgo(90) },
    { userId: users['0776690011'], action: 'UPDATE', resource: 'complaint', details: 'Updated complaint CMP-2026-001234 status to UNDER_REVIEW', ipAddress: '192.168.1.101', createdAt: daysAgo(5) },
    { userId: users['0776690012'], action: 'ESCALATE', resource: 'complaint', details: 'Escalated complaint about reckless driving on Stone Town - Paje route', ipAddress: '192.168.1.102', createdAt: daysAgo(3) },
    { userId: users['0776690011'], action: 'RESOLVE', resource: 'complaint', details: 'Resolved overloading complaint, operator warned', ipAddress: '192.168.1.101', createdAt: daysAgo(2) },
    { userId: users['0776690001'], action: 'CREATE', resource: 'fare_table', details: 'Added new shamba route fares for Stone Town - Kendwa', ipAddress: '192.168.1.100', createdAt: daysAgo(60) },
    { userId: users['0776690012'], action: 'CREATE', resource: 'fine', details: 'Issued speeding fine CN-2026-001001 for vehicle TZA-231', ipAddress: '192.168.1.102', createdAt: daysAgo(5) },
    { userId: users['0776690011'], action: 'UPDATE', resource: 'fine', details: 'Marked fine CN-2026-001003 as paid via HALOPESA', ipAddress: '192.168.1.101', createdAt: daysAgo(6) },
    { userId: users['0776690001'], action: 'UPDATE', resource: 'announcement', details: 'Published road closure notice for Kenyatta Road', ipAddress: '192.168.1.100', createdAt: daysAgo(15) },
    { userId: users['0776690041'], action: 'CREATE', resource: 'complaint', details: 'Filed overcharging complaint for Stone Town - Fuoni route', ipAddress: '10.0.0.55', createdAt: daysAgo(5) },
    { userId: users['0776690045'], action: 'CREATE', resource: 'booking', details: 'Booked 3 tickets for Stone Town - Jambiani', ipAddress: '10.0.0.60', createdAt: daysAgo(0) },
  ];

  for (const a of auditData) {
    await prisma.auditLog.create({ data: a });
  }
  console.log(`    Created ${auditData.length} audit logs`);

  // =========================================================================
  // Done
  // =========================================================================
  console.log('');
  console.log('========================================');
  console.log('  Seeding complete!');
  console.log('========================================');
  console.log('');
  console.log('  Users:          20 (1 admin, 2 officers, 3 operators, 5 drivers, 9 citizens)');
  console.log('  Fare Tables:    27 (15 daladala + 12 shamba routes)');
  console.log('  Announcements:  8');
  console.log('  Bus Locations: 16 (14 live + 2 stale)');
  console.log('  Bookings:       10');
  console.log('  Complaints:      8');
  console.log('  Lost Items:      6');
  console.log('  Found Items:     6');
  console.log('  Fines:           8');
  console.log('  Notifications:  ~22');
  console.log('  Saved Routes:   12');
  console.log('  Notif Prefs:    ~168');
  console.log('  Audit Logs:     10');
  console.log('');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());