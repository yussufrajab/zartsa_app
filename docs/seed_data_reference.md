# ZARTSA Seed Data Reference

> Zanzibar-themed test data for development and QA. All phone numbers follow Zanzibar format (10 digits, starting with 0). Names, streets, and cultural references are authentic Zanzibari.

---

## Authentication

ZARTSA uses **phone + OTP** authentication (no passwords). To log in:

1. `POST /api/auth/otp` with `{"phone": "<phone>"}` to request an OTP
2. `POST /api/auth/login` with `{"phone": "<phone>", "otp": "<code>"}` to get a JWT token

OTP is stored in Redis and printed to the server console in development mode.

---

## Users (21 total)

### Admin (1)

| Phone | Name | Email | National ID | Language |
|---|---|---|---|---|
| 0776690001 | Amani Kombo | amani.kombo@zartsa.go.tz | ZI-1985-00421 | sw |

### Officers (2)

| Phone | Name | Email | National ID | Language |
|---|---|---|---|---|
| 0776690011 | Fatma Hamad | fatma.hamad@zartsa.go.tz | ZI-1990-01132 | sw |
| 0776690012 | Said Mbarouk | said.mbarouk@zartsa.go.tz | ZI-1988-00876 | en |

### Operators (3)

| Phone | Name | Email | National ID | Language |
|---|---|---|---|---|
| 0776690021 | Mwanaidi Juma | mwanaidi@zanzibartransit.co.tz | ZI-1978-00234 | sw |
| 0776690022 | Abdullah Machano | abdullah@zanzibarexpress.co.tz | ZI-1975-00678 | sw |
| 0776690023 | Khadija Suleiman | khadija@stonetownbus.co.tz | ZI-1982-00543 | en |

### Drivers (5)

| Phone | Name | National ID | Language |
|---|---|---|---|
| 0776690031 | Yusuf Mzee | ZI-1992-01456 | sw |
| 0776690032 | Mbaraka Faki | ZI-1994-01678 | sw |
| 0776690033 | Hassan Mwalimu | ZI-1991-01234 | sw |
| 0776690034 | Riziki Mchenga | ZI-1993-01987 | sw |
| 0776690035 | Soud Makame | ZI-1989-01098 | sw |

### Citizens (10)

| Phone | Name | Email | National ID | Language |
|---|---|---|---|---|
| 0776690041 | Zulikha Aboud | zulikha.aboud@gmail.com | | sw |
| 0776690042 | Mwanajuma Khamis | mwanajuma.k@gmail.com | | sw |
| 0776690043 | Bakari Msafiri | bakari.msafiri@gmail.com | | en |
| 0776690044 | Aisha Shamte | aisha.shamte@gmail.com | ZI-1996-02345 | sw |
| 0776690045 | Hamad Omar | | | sw |
| 0776690046 | Mwanahamis Shehe | mwanahamis.s@gmail.com | | sw |
| 0776690047 | Jabir Kombo | jabir.kombo@gmail.com | ZI-1999-02789 | en |
| 0776690048 | Latifa Msham | latifa.msham@gmail.com | | sw |
| 0776690049 | Kheri Pembe | | | sw |
| 0776690050 | Mwanaish Haji | mwanaish.haji@gmail.com | | sw |

---

## Fare Tables (27 routes)

### Daladala Routes (15) - Short distance urban

| Departure | Destination | Base Fare (TZS) |
|---|---|---|
| Stone Town | Fuoni | 400 |
| Stone Town | Mwanakwerekwe | 500 |
| Stone Town | Kiembe Samaki | 400 |
| Stone Town | Mikunguni | 400 |
| Stone Town | Chukwani | 500 |
| Malindi | Fuoni | 400 |
| Malindi | Mwanakwerekwe | 500 |
| Malindi | Stone Town | 300 |
| Darajani | Kiembe Samaki | 400 |
| Darajani | Stone Town | 300 |
| Darajani | Mikunguni | 400 |
| Kariakoo | Mwanakwerekwe | 500 |
| Kariakoo | Fuoni | 400 |
| Amaan | Stone Town | 500 |
| Amaan | Mwanakwerekwe | 400 |

### Shamba Routes (12) - Long distance inter-town

| Departure | Destination | Base Fare (TZS) | Surcharge (TZS) |
|---|---|---|---|
| Stone Town | Paje | 2,500 | 200 |
| Stone Town | Jambiani | 3,000 | 200 |
| Stone Town | Nungwi | 3,500 | 300 |
| Stone Town | Kendwa | 3,500 | 300 |
| Stone Town | Matemwe | 3,000 | 200 |
| Stone Town | Michamvi | 2,800 | 200 |
| Stone Town | Uroa | 2,500 | 200 |
| Stone Town | Dongwe | 2,800 | 200 |
| Stone Town | Bwejuu | 3,000 | 200 |
| Malindi | Paje | 2,500 | 200 |
| Malindi | Nungwi | 3,500 | 300 |
| Malindi | Jambiani | 3,000 | 200 |

**Test with:** `GET /api/fares/` or `GET /api/fares/search?routeType=daladala&departure=Stone%20Town&destination=Fuoni`

---

## Announcements (8)

All announcements are bilingual (Swahili/English) and published.

| Title (English) | Category | Published |
|---|---|---|
| Fare Adjustment - January 2026 | FARE_ADJUSTMENT | 2026-01-01 |
| Revolution Day - Special Schedule | GENERAL_NOTICE | 2026-01-10 |
| New Night Daladala Service | SCHEDULE_CHANGE | 2026-01-28 |
| Shamba Schedule Change - Nungwi | SCHEDULE_CHANGE | 2026-02-25 |
| New Driver Licensing Regulation | REGULATORY_UPDATE | 2026-03-15 |
| Daladala Route Change - Kiembe Samaki | ROAD_CLOSURE | 2026-04-01 |
| Kenyatta Road Closure - Maintenance | ROAD_CLOSURE | 2026-04-10 |
| Weather Advisory - Heavy Rain | GENERAL_NOTICE | 2026-04-18 |

**Test with:** `GET /api/news/`

---

## Bus Locations (16 vehicles)

### Live Fleet (14)

| Plate | Route | Type | Operator |
|---|---|---|---|
| TZA-112 | Stone Town - Kiembe Samaki | daladala | zanzibar-transit |
| TZA-223 | Malindi - Fuoni | daladala | stone-town-bus |
| TZA-231 | Stone Town - Fuoni | daladala | zanzibar-transit |
| TZA-335 | Stone Town - Mikunguni | daladala | zanzibar-transit |
| TZA-444 | Malindi - Stone Town | daladala | stone-town-bus |
| TZA-447 | Stone Town - Mwanakwerekwe | daladala | zanzibar-transit |
| TZA-556 | Stone Town - Chukwani | daladala | zanzibar-transit |
| TZA-667 | Darajani - Kiembe Samaki | daladala | zanzibar-transit |
| TZA-115 | Stone Town - Jambiani | shamba | zanzibar-express |
| TZA-228 | Stone Town - Kendwa | shamba | zanzibar-express |
| TZA-337 | Stone Town - Matemwe | shamba | zanzibar-express |
| TZA-446 | Stone Town - Michamvi | shamba | zanzibar-express |
| TZA-889 | Stone Town - Paje | shamba | zanzibar-express |
| TZA-990 | Stone Town - Nungwi | shamba | zanzibar-express |

### Stale/Offline (2) - recordedAt > 5 minutes ago

| Plate | Route | Type | Operator |
|---|---|---|---|
| TZA-778 | Stone Town - Uroa | shamba | zanzibar-transit |
| TZA-999 | Malindi - Paje | shamba | zanzibar-transit |

**Test with:** `GET /api/tracking/buses`

---

## Bookings / E-Tickets (10)

| Passenger | Route | Amount (TZS) | Method | Status |
|---|---|---|---|---|
| Zulikha Aboud | Stone Town - Fuoni | 400 | mpesa | USED |
| Mwanajuma Khamis | Stone Town - Nungwi | 7,000 | mpesa | ACTIVE |
| Bakari Msafiri | Stone Town - Paje | 2,700 | halopesa | USED |
| Aisha Shamte | Malindi - Stone Town | 300 | mpesa | USED |
| Hamad Omar | Stone Town - Jambiani | 9,600 | mpesa | ACTIVE |
| Mwanahamis Shehe | Stone Town - Mwanakwerekwe | 500 | halopesa | EXPIRED |
| Jabir Kombo | Stone Town - Kendwa | 7,600 | mpesa | USED |
| Latifa Msham | Darajani - Mikunguni | 400 | mpesa | ACTIVE |
| Kheri Pembe | Stone Town - Bwejuu | 3,200 | halopesa | CANCELLED |
| Mwanaish Haji | Stone Town - Michamvi | 3,000 | mpesa | ACTIVE |

**Test with:** `GET /api/tickets/search?departure=Stone%20Town&destination=Nungwi&date=2026-04-25`

---

## Complaints (8)

### Complaint Reference Numbers (for tracking)

| Reference | Category | Status | Assigned To |
|---|---|---|---|
| CMP-2026-98936 | Route Deviation | RECEIVED | |
| CMP-2026-43561 | Unsafe Vehicle | RECEIVED | |
| CMP-2026-27153 | Overcharging | RECEIVED | |
| CMP-2026-71691 | Harassment | UNDER_REVIEW | Fatma Hamad |
| CMP-2026-13955 | Reckless Driving | UNDER_REVIEW | Fatma Hamad |
| CMP-2026-83577 | Rude Behavior | ESCALATED | Said Mbarouk |
| CMP-2026-43733 | Overcrowding | RESOLVED | |
| CMP-2026-45430 | No Change Given | CLOSED | |

**Test with:** `GET /api/complaints/track/CMP-2026-27153` (public, no auth needed)

---

## Lost Item Reports (6)

| Reporter | Description | Category | Route | Status |
|---|---|---|---|---|
| Zulikha Aboud | Leather bag, brown, bank cards & cash | Bags | Stone Town - Fuoni | REPORTED |
| Mwanajuma Khamis | Samsung Galaxy A15, blue case | Electronics | Stone Town - Nungwi | MATCHED |
| Bakari Msafiri | Quran with green cover | Books | Stone Town - Paje | FOUND |
| Aisha Shamte | Three keys, one metal two red plastic | Keys | Malindi - Stone Town | REPORTED |
| Mwanahamis Shehe | Gold ring with glass stone | Jewelry | Stone Town - Mwanakwerekwe | CLAIMED |
| Kheri Pembe | Medicine bag for diabetes | Medical | Stone Town - Bwejuu | REPORTED |

## Found Item Reports (6)

| Reporter | Description | Category | Bus | Route | Status |
|---|---|---|---|---|---|
| Yusuf Mzee | Samsung Galaxy A15, blue case | Electronics | TZA-990 | Stone Town - Nungwi | FOUND |
| Mbaraka Faki | Leather bag, CRDB bank card & license | Bags | TZA-231 | Stone Town - Fuoni | MATCHED |
| Hassan Mwalimu | Quran with green cover, window shelf | Books | TZA-889 | Stone Town - Paje | FOUND |
| Riziki Mchenga | Gold ring with glass stone | Jewelry | TZA-447 | Stone Town - Mwanakwerekwe | CLAIMED |
| Soud Makame | Three keys, one metal two red plastic | Keys | TZA-444 | Malindi - Stone Town | FOUND |
| Yusuf Mzee | Medicine bag, under seat near door | Medical | TZA-115 | Stone Town - Jambiani | UNCLAIMED |

**Test with:** `GET /api/lost-found/found`

---

## Fines (8)

| Control Number | Offense | Vehicle | Amount (TZS) | Status |
|---|---|---|---|---|
| CN-2026-001001 | Speeding | TZA-231 | 30,000 | PAID |
| CN-2026-001002 | Reckless Driving | TZA-990 | 50,000 | OUTSTANDING |
| CN-2026-001003 | Overloading | TZA-447 | 25,000 | PAID |
| CN-2026-001004 | No Valid License | TZA-667 | 50,000 | DISPUTED |
| CN-2026-001005 | Route Deviation | TZA-115 | 20,000 | OUTSTANDING |
| CN-2026-001006 | Unsafe Vehicle | TZA-223 | 40,000 | OUTSTANDING |
| CN-2026-001007 | Speeding | TZA-889 | 30,000 | WAIVED |
| CN-2026-001008 | Running Red Light | TZA-556 | 35,000 | OUTSTANDING |

**Driving Licenses referenced:** DL-ZNZ-2024-001234, DL-ZNZ-2023-005678, DL-ZNZ-2024-009012, DL-ZNZ-2022-003456, DL-ZNZ-2025-007890, DL-ZNZ-2024-002345, DL-ZNZ-2023-006789

**Test with:** `GET /api/fines/?drivingLicense=DL-ZNZ-2024-001234` (auth required)

---

## Notifications (20)

| Type | Channel | Count |
|---|---|---|
| Welcome (Karibu ZARTSA) | IN_APP | 9 |
| new_fine | IN_APP | 1 |
| complaint_status_update | IN_APP | 1 |
| lost_item_match | IN_APP | 1 |
| bus_delay | IN_APP | 1 |
| route_change | IN_APP | 1 |
| new_announcement | IN_APP | 1 |
| payment_receipt | IN_APP | 2 |
| license_expiry_30 | IN_APP | 1 |
| license_expiry_7 | IN_APP | 1 |
| new_fine | SMS | 1 |
| payment_receipt | EMAIL | 1 |

---

## Saved Routes (12)

| Citizen | Departure | Destination | Label |
|---|---|---|---|
| Zulikha Aboud | Stone Town | Fuoni | Njia ya Nyumbani |
| Zulikha Aboud | Stone Town | Paje | Njia ya Paje Beach |
| Mwanajuma Khamis | Stone Town | Nungwi | Njia ya Nungwi |
| Mwanajuma Khamis | Stone Town | Fuoni | Kwenda Sokoni |
| Bakari Msafiri | Stone Town | Paje | Weekend Trip |
| Aisha Shamte | Malindi | Stone Town | Kwenda Kazini |
| Hamad Omar | Stone Town | Jambiani | Njia ya Jambiani |
| Mwanahamis Shehe | Stone Town | Mwanakwerekwe | Soko la Mwanakwerekwe |
| Jabir Kombo | Stone Town | Kendwa | Kendwa Beach |
| Jabir Kombo | Stone Town | Michamvi | Michamvi Sunset |
| Latifa Msham | Darajani | Mikunguni | Njia ya Mikunguni |
| Mwanaish Haji | Stone Town | Matemwe | Matemwe Beach |

---

## Quick Test Scenarios

### 1. Browse fares as guest
```
GET /api/fares/?routeType=daladala
GET /api/fares/search?routeType=shamba&departure=Stone%20Town&destination=Nungwi
```

### 2. Track a complaint (no auth)
```
GET /api/complaints/track/CMP-2026-27153
```

### 3. View live bus map (no auth)
```
GET /api/tracking/buses
```

### 4. Read announcements (no auth)
```
GET /api/news/
GET /api/news/?category=SCHEDULE_CHANGE
```

### 5. Search found items (no auth)
```
GET /api/lost-found/found
GET /api/lost-found/found?category=Electronics
```

### 6. Login as citizen
```
POST /api/auth/otp  {"phone": "0776690041"}
POST /api/auth/login  {"phone": "0776690041", "otp": "<from-console>"}
```

### 7. Login as officer
```
POST /api/auth/otp  {"phone": "0776690011"}
POST /api/auth/login  {"phone": "0776690011", "otp": "<from-console>"}
```

### 8. Login as admin
```
POST /api/auth/otp  {"phone": "0776690001"}
POST /api/auth/login  {"phone": "0776690001", "otp": "<from-console>"}
```

### 9. Verify a driving license (no auth)
```
POST /api/verify/license  {"number": "DL-ZNZ-2024-001234"}
```

### 10. Search tickets (no auth)
```
GET /api/tickets/search?departure=Stone%20Town&destination=Nungwi&date=2026-04-25
```

---

## Reseeding the Database

```bash
# Truncate all tables
PGPASSWORD=postgres psql -U postgres -h localhost -d zardb -c "
TRUNCATE TABLE audit_logs, notification_preferences, saved_routes, notifications, fines, found_item_reports, lost_item_reports, complaints, bookings, bus_locations, announcements, fare_tables, users CASCADE;
"

# Run seed
cd /home/nextjstest/zartsa
npm run db:seed
```

Or use the manage script:
```bash
./manage.sh db-seed
```

Note: Users and fare tables use `upsert`, so re-running the seed without truncating will not duplicate those. Other tables will create duplicates if not truncated first.