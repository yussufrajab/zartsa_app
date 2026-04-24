# Software Requirements Specification (SRS)
## ZARTSA Citizen Services Web Application
### Zanzibar Road Transport and Safety Authority

---

**Document Reference:** ZARTSA-APP-SRS-001  
**Version:** 1.0  
**Status:** Draft  
**Date:** April 2026  
**Prepared by:** ZARTSA ICT Department  
**Reviewed by:** ZARTSA Management  

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Architecture and Integration](#3-system-architecture-and-integration)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [External Interface Requirements](#6-external-interface-requirements)
7. [Data Requirements](#7-data-requirements)
8. [Security Requirements](#8-security-requirements)
9. [Constraints and Assumptions](#9-constraints-and-assumptions)
10. [Appendices](#10-appendices)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the complete functional and non-functional requirements for the **ZARTSA Citizen Services Web Application** (referred to herein as "ZARTSA App"). The document is intended for use by developers, system architects, testers, project managers, and stakeholders at the Zanzibar Road Transport and Safety Authority (ZARTSA).

## TECHNOLOGIES

### frontend :

 React + Next.js SSR, fast load on slow networks

Tailwind CSS Responsive mobile-first UI

Leaflet.js Live map + GPS tracking

i18n Swahili / English

**Frontend — React + Next.js** Next.js is the strongest choice here because it supports Server-Side Rendering (SSR), which dramatically improves first-load time on 3G connections common in Zanzibar. React's component model also makes it easy to build reusable pieces like the seat map, live map, and complaint form. Tailwind CSS keeps the UI responsive with minimal overhead. For the live map, Leaflet.js with OpenStreetMap tiles is ideal — it's free, open-source, and works without a paid Google Maps contract.

### Backend API:

Node.js + Express REST API layer lightweight, fast

Socket.IO Real-time bus location updates

JWT + OAuth2 Secure auth session tokens

Bull (Queue) Notifications, SMS, emails

**Backend — Node.js + Express** Node.js handles concurrent connections very efficiently, which matters for real-time features like bus tracking and notifications. The same JavaScript language is shared with the frontend, which reduces the skill gap for the development team. Socket.IO is added specifically for the real-time WebSocket channel needed by the live GPS map. Bull handles the background job queue for sending SMS, email, and push notifications asynchronously without blocking API responses.

### Data layer:

PostgreSQL Users, bookings, complaints, fines

Redis Sessions, fare cache, queues

Object Storage MinIO / S3 Photos, PDFs

Prisma ORM / migrations

**Data layer — PostgreSQL + Redis** PostgreSQL is the right primary database for structured, relational data like bookings, complaints, fines, and user accounts — it's battle-tested, free, and handles complex queries well. Redis is added as a fast in-memory cache for fare tables, user sessions, and real-time data that doesn't need to hit the database on every request. MinIO (or an S3-compatible service) handles file storage for complaint attachments and ticket PDFs, and is important for Tanzania data residency compliance since you can self-host it.

### Infrastructure:

this project shall never use docker at all

Nginx Reverse proxy, SSL termination

management script (.sh)  for start, stop, restart all service -  no docker at all

### External integrations (REST APIs):

ZIMS API

SMS Gateway

Fleet GPS API

QR / PDF

**Language — TypeScript over JavaScript** Across both frontend and backend, TypeScript is strongly recommended. It catches errors at compile time, makes the codebase easier to maintain long-term, and is especially valuable when multiple developers are working across complex integrations like ZIMS, payment APIs, and GPS feeds.





### 1.2 Scope

The ZARTSA App is a public-facing web application designed to bridge ZARTSA's back-office systems with citizens and transport operators in Zanzibar. It provides digital self-service capabilities including fare transparency, license verification, real-time bus tracking, e-ticketing, lost & found management, complaint submission, news, traffic fine management, and digital user profiles.

The application integrates with the existing **ZIMS (Zartsa Integrated Management System) Application Portal**, which hosts the following operational modules:

- ZODLAP – Driving License management
- Driving License Renewal
- Foreign Driving License Permits
- Government Driving Permit
- Vehicle Visitor Permit
- Temporary Permits
- Route Application
- Vehicle Inspection
- Driver/Conductor Badge Registration

The ZARTSA App does **not** replicate these ZIMS modules but instead surfaces relevant data from them (such as license validity, fine records, and vehicle information) to citizens through a clean, accessible interface.

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|------|------------|
| ZARTSA | Zanzibar Road Transport and Safety Authority |
| ZIMS | Zartsa Integrated Management System |
| ZODLAP | Zanzibar Online Driving License Application Portal |
| Daladala | Intra-city (urban) minibus/bus service in Zanzibar |
| Shamba | Inter-city (rural/long-distance) bus service in Zanzibar |
| ETA | Estimated Time of Arrival |
| QR Code | Quick Response code used for digital ticket validation |
| GPS | Global Positioning System |
| MNO | Mobile Network Operator (e.g., Zantel, Vodacom Tanzania) |
| API | Application Programming Interface |
| SRS | Software Requirements Specification |
| UI/UX | User Interface / User Experience |
| OTP | One-Time Password |
| SLA | Service Level Agreement |
| GDPR-equivalent | Zanzibar/Tanzania data protection regulations |

### 1.4 References

- ZARTSA Citizen Services App – Salient Features Document (v1.0)

- ZIMS Application Portal Module Descriptions

- Zanzibar Transport Regulations

  

### 1.5 Overview

Section 2 provides a high-level system description. Section 3 outlines the system architecture and integration points with ZIMS. Sections 4 and 5 detail functional and non-functional requirements. Sections 6 through 10 address interfaces, data, security, constraints, and appendices.

---

## 2. Overall Description

### 2.1 Product Perspective

The ZARTSA App is a new web application that operates as a **citizen-facing layer** on top of ZARTSA's existing ZIMS back-office infrastructure. It does not replace ZIMS but consumes its data through secure APIs to present relevant information to the public. The app also introduces new citizen-specific capabilities such as bus tracking, e-ticketing, lost & found, and complaint management.

```
┌─────────────────────────────────────────────────────┐
│                 ZARTSA App (Public Web)              │
│  (Smart Fare | Verification | Tracking | Ticketing) │
└──────────────────────────┬──────────────────────────┘
                           │  Secure API (REST/HTTPS)
┌──────────────────────────▼──────────────────────────┐
│             ZIMS Application Portal                  │
│  ZODLAP | Renewals | Permits | Inspection | Badges  │
└─────────────────────────────────────────────────────┘
```

### 2.2 Product Functions

The ZARTSA App delivers ten core functional modules:

1. Smart Fare Displayer
2. License & Document Verification Portal
3. Real-Time Fleet Tracking (Live Map)
4. E-Ticketing & Booking System
5. Lost & Found
6. Complaint & Feedback System
7. News & Announcements Module
8. Traffic Fines & Offense Viewing
9. Notifications & Alerts
10. Digital User Profile & History

### 2.3 User Classes and Characteristics

| User Class | Description | Technical Proficiency |
|------------|-------------|----------------------|
| **General Citizen** | Daily commuters using Daladala/Shamba buses | Low to medium |
| **Transport Operator** | Bus company owners, fleet managers | Medium |
| **Driver/Conductor** | Registered ZARTSA drivers and conductors | Low to medium |
| **ZARTSA Officer** | Internal staff managing complaints, fines, announcements | Medium to high |
| **ZARTSA Administrator** | System admins with full backend access | High |

### 2.4 Operating Environment

- **Platform:** Responsive web application (desktop, tablet, smartphone browsers)
- **Frontend:** Modern web browsers (Chrome, Firefox, Safari, Edge – latest 2 major versions)
- **Backend:** on-premise server infrastructure (Linux-based)
- **Connectivity:** Functions fully online; partial offline capability (cached fare tables, cached user profile) for low-connectivity areas
- **Language:** Kiswahili (primary) and English (secondary); all UI text must support both languages

### 2.5 Design and Implementation Constraints

- Must integrate with existing ZIMS APIs; ZIMS is the system of record for all licenses, permits, fines, and vehicle data
- Payment : Control Number generated by the app will be payable via bank, Mobile Money (Mixx by YAS, Vodacom M-Pesa, Airtel Money)
- All personal data must be stored within Tanzania/Zanzibar data residency boundaries
- Application must be accessible at speeds as low as 3G mobile networks

### 2.6 Assumptions and Dependencies

- ZIMS and other systems exposes stable, documented REST APIs for license verification, fine records, and vehicle data
- GPS tracking hardware is installed on registered fleet vehicles and transmits location data to a central fleet management server (only for government own buses)
- ZARTSA provides official, authoritative fare data for all routes

---

## 3. System Architecture and Integration

### 3.1 Integration with ZIMS Modules and other systems

The ZARTSA App integrates with ZIMS modules via secure APIs. The following table maps ZARTSA App features to their corresponding ZIMS data sources:

| ZARTSA App Feature | ZIMS Module(s) Used | Data Consumed |
|--------------------|---------------------|---------------|
| License Verification | ZODLAP, Govt Permit | License status, expiry date, holder name |
| Traffic Fine Management | Fine & Penalty App | Offense records, fine amounts, payment status |
| Notifications (license expiry) | ZODLAP, Route Application, Vehicle Inspection | Expiry dates, renewal deadlines |
| Driver/Conductor Badge Lookup | Driver/Conductor Badge | Badge validity, registration status |
| Vehicle Permit Verification | Temporary Permits, Vehicle Visitor Permit | Permit validity, associated vehicle |
| Route Information (for ticketing) | Route Application | Approved routes, operators |

### 3.2 New Systems Required

The following new systems are required to support ZARTSA App features not covered by ZIMS:

| New System | Purpose |
|------------|---------|
| Fleet GPS Tracking Server | Aggregates real-time GPS data from buses |
| E-Ticketing & Booking Engine | Manages seats, bookings, QR ticket issuance |
| Lost & Found Registry | Stores and searches lost item reports |
| Complaint Management System | Receives, routes, and tracks citizen complaints |
| Notification Service | Manages push, SMS, and email alerts |
| CMS (Content Management) | Manages news and announcements |

---

## 4. Functional Requirements

### 4.1 Module FR-01: Smart Fare Displayer

**FR-01.1** The system shall display official, ZARTSA-approved fare tables for all active Shamba (inter-city) and Daladala (intra-city) routes.

**FR-01.2** The system shall allow users to search for fares by selecting or entering a departure point and destination.

**FR-01.3** The system shall calculate and display the estimated total travel cost for a specified journey, including any applicable surcharges.

**FR-01.4** Fare data shall be sourced directly from ZARTSA's official tariff database (.md files) and updated within 24 hours of any officially approved fare adjustment (via .md files).

**FR-01.5** The system shall display the effective date of the current fare schedule.

**FR-01.6** Fare tables shall be viewable without user authentication.

**FR-01.7** The system shall display fares in Tanzanian Shillings (TZS).

---

### 4.2 Module FR-02: License & Document Verification Portal

**FR-02.1** The system shall allow any user to verify the authenticity of the following ZARTSA-issued documents by entering their reference number:
- Driving Licenses (ZODLAP)
- Road Licenses
- Commercial Vehicle Licenses
- Foreign Driving License Permits
- Government Driving Permits
- Vehicle Visitor Permits
- Temporary Permits
- Driver/Conductor Badges

**FR-02.2** The system shall display the following information for a verified document:
- Document type
- Holder name (partial/masked for privacy)
- Issue date and expiry date
- Current status: Valid, Expired, Suspended, or Invalid

**FR-02.3** The system shall flag documents that are expired, suspended, or not found in ZIMS.

**FR-02.4** The system shall return a verification result within 5 seconds of submission.

**FR-02.5** The Smart Plate Number Input component shall:
- Auto-format vehicle registration numbers to the ZARTSA standard (e.g., `z 123 abc` → `Z123ABC`) in real time
- Validate the plate structure before submission
- Display a clear error message for invalid formats

**FR-02.6** Verification shall be available without user authentication. However, the number of verifications per IP address shall be rate-limited to prevent abuse (maximum 50 per hour per IP).

---

### 4.3 Module FR-03: Real-Time Fleet Tracking (Live Map)

**FR-03.1** The system shall display an interactive map showing the real-time GPS location of all active, registered buses across all ZARTSA-approved routes.

**FR-03.2** The map shall update bus positions at intervals not exceeding 30 seconds.

**FR-03.3** The system shall display the Estimated Time of Arrival (ETA) for each bus at each upcoming stop on its route.

**FR-03.4** Users shall be able to filter the map view by route, operator, or bus service type (Daladala / Shamba).

**FR-03.5** The system shall issue real-time alerts to users tracking a specific bus if that bus is delayed beyond a configurable threshold (default: 30 minutes) or has deviated from its authorized route.

**FR-03.6** The system shall display a bus stop directory with names, coordinates, and served routes.

**FR-03.7** If GPS data for a vehicle is lost or stale (older than 5 minutes), the bus marker shall be visually distinguished (e.g., greyed out) and labeled as "Last known location."

**FR-03.8** The live map shall be accessible without user authentication.

---

### 4.4 Module FR-04: E-Ticketing & Booking System

**FR-04.1 Route Search**
The system shall provide a smart search interface allowing users to find available trips by specifying:
- Departure point
- Destination
- Travel date
- Number of passengers

**FR-04.2 Seat Selection**
The system shall display a visual seat map for selected trips, showing:
- Available seats (selectable)
- Occupied/reserved seats (not selectable)
- Seat type preferences (window / aisle)

The seat map shall update in real time to reflect concurrent bookings.

**FR-04.3 Secure Checkout**
The system shall support the following payment methods:
- Mobile Money: Zantel, Vodacom M-Pesa, Airtel Money
- Debit/Credit Card (Visa, Mastercard)
- Bank Transfer

The checkout process shall implement PCI-DSS-compliant payment handling. Users shall not need to store payment credentials unless they opt in.

**FR-04.4 Digital Ticket Issuance**
Upon successful payment, the system shall:
- Generate a unique, QR-coded digital ticket
- Send the ticket to the user via SMS and/or email and/or in-app
- Allow the ticket to be downloaded as a PDF
- Enable mobile scanning of the QR code at boarding points

**FR-04.5 Booking Management**
Authenticated users shall be able to:
- View all current and past bookings
- Cancel a booking (subject to ZARTSA cancellation policy)
- Request a refund for eligible cancellations

**FR-04.6** The system shall send a booking confirmation notification immediately after successful payment.

**FR-04.7** The system shall enforce seat availability locks during the checkout process to prevent double-booking (minimum lock duration: 10 minutes).

---

### 4.5 Module FR-05: Lost & Found

**FR-05.1** Transport operators and conductors (authenticated) shall be able to log found items by specifying:
- Item description
- Bus number/vehicle plate
- Route
- Date and approximate time found
- Optional photo upload

**FR-05.2** Citizens (authenticated ) shall be able to search the lost items registry using:
- Route or route number
- Date of travel
- Item keywords

**FR-05.3** Citizens shall be able to submit a lost item report specifying:
- Item description
- Route and date of travel
- Contact details

**FR-05.4** The system shall attempt to automatically match newly logged found items against open lost item reports and notify the potential owner if a match is found.

**FR-05.5** Found items not claimed within 30 days shall be automatically marked as "Unclaimed" and removed from the public-facing search results.

**FR-05.6** The system shall provide a ZARTSA officer interface to review, approve, and manage the lost & found registry.

---

### 4.6 Module FR-06: Commuter Complaint & Feedback System

**FR-06.1** The system shall allow citizens to submit complaints or feedback reports covering the following categories:
- Reckless or dangerous driving
- Overcharging or fare disputes
- Harassment or unprofessional conduct
- Poor vehicle condition or safety violations
- Route cutting or unauthorized route deviations
- Operating without a valid license

**FR-06.2** Complaint submission shall require the following minimum information:
- Vehicle plate number (validated against ZARTSA format)
- Route or route name
- Incident date and time
- Category of complaint
- Description (free text, maximum 1000 characters)

**FR-06.3** The complainant may optionally attach supporting evidence (photos or video, maximum 3 files, 10 MB each).

**FR-06.4** The system shall assign a unique complaint reference number upon submission and communicate it to the complainant.

**FR-06.5** The complainant shall be able to track the status of their complaint using the reference number. Statuses shall include: Received, Under Review, Escalated, Resolved, and Closed.

**FR-06.6** ZARTSA officers shall be able to receive, assign, respond to, and close complaints through an officer portal.

**FR-06.7** The system shall generate a complaint summary report exportable by ZARTSA officers in CSV or PDF format.

**FR-06.8** Citizens may submit complaints without an account; however, an email or phone number must be provided for status tracking.

---

### 4.7 Module FR-07: News & Announcements Module

**FR-07.1** The system shall display a news and announcements section accessible to all users without authentication.

**FR-07.2** ZARTSA staff (with appropriate permissions) shall be able to publish, edit, schedule, and unpublish announcements through a CMS interface.

**FR-07.3** Announcements shall be categorized as:
- Fare Adjustments
- Road Closures & Route Diversions
- Holiday & Seasonal Schedule Changes
- Regulatory Updates & Policy Notices
- General Notices

**FR-07.4** The system shall display the publication date and source authority for each announcement.

**FR-07.5** The system shall send push notifications and/or SMS alerts to opted-in users when a new announcement in their preferred category is published.

**FR-07.6** The announcements feed shall support both Kiswahili and English content; each announcement may be published in one or both languages.

---

### 4.8 Module FR-08: Traffic Fines & Offense Management

**FR-08.1** Authenticated drivers and transport operators shall be able to view their recorded traffic offenses and applicable fines by querying via:
- Driving License number
- Vehicle plate number

**FR-08.2** The system shall display for each offense:
- Offense type and description
- Date and location of offense
- Applicable penalty amount (TZS)
- Payment status: Outstanding, Paid, Disputed, Waived

**FR-08.3** Users shall be able to pay outstanding fines securely online using the same payment methods defined in FR-04.3.

**FR-08.4** Upon successful fine payment, the system shall:
- Issue a payment receipt with a unique transaction reference
- Update the fine status to "Paid" in ZIMS in real time (or within 1 hour via batch sync)
- Send a payment confirmation notification to the user

**FR-08.5** The system shall send push notifications to users when a new offense is recorded against their license or vehicle plate number.

**FR-08.6** Users shall be able to dispute a fine by submitting a written dispute through the system; ZARTSA officers shall review disputes via the officer portal.

**FR-08.7** The system shall auto-generate control numbers for approved fine payments and display them with a one-tap copy function.

---

### 4.9 Module FR-09: Notifications & Alerts

**FR-09.1** The system shall support the following notification channels:
- In-app push notifications
- SMS (via MNO integration)
- Email

**FR-09.2** The following notification types shall be supported:

| Notification Type | Trigger | Target User |
|-------------------|---------|-------------|
| Driving License expiry reminder | 60, 30, 14, and 7 days before expiry | License holder |
| Road License expiry reminder | 60, 30, 14, and 7 days before expiry | Operator |
| Commercial License renewal reminder | 60, 30, 14, and 7 days before expiry | Operator |
| Payment confirmation | Successful payment transaction | Payer |
| Payment receipt | Fine or ticket payment | Payer |
| Bus delay alert | Bus delayed beyond threshold | Passengers tracking that bus |
| Route change alert | Route deviation detected | Passengers tracking that bus |
| New fine recorded | Offense logged in ZIMS | License/vehicle owner |
| Complaint status update | Complaint status changes | Complainant |
| Lost item match | Found item matches lost report | Reporter |
| New announcement | Announcement published in subscribed category | Opted-in users |

**FR-09.3** Users shall be able to manage notification preferences from their profile, including enabling/disabling specific notification types and preferred channels.

**FR-09.4** All notification delivery attempts shall be logged with timestamp and delivery status.

---

### 4.10 Module FR-10: Digital User Profile & History

**FR-10.1** Citizens shall be able to register an account using a mobile phone number (verified via OTP) or email address.

**FR-10.2** The authenticated user profile shall include:
- Full name
- Phone number and email address
- National ID or passport number (optional, for enhanced verification)
- Preferred language (Kiswahili / English)
- Notification preferences
- Saved/frequent routes

**FR-10.3** The profile dashboard shall display:
- Full booking history with downloadable receipts
- License verification request history
- Complaint submission history and statuses
- Fine payment history and receipts
- Saved routes for quick re-booking

**FR-10.4** Users shall be able to save up to 10 frequently used routes for one-tap re-booking.

**FR-10.5** Users shall be able to update their personal details and change their password/PIN at any time.

**FR-10.6** Users shall be able to permanently delete their account and associated personal data in compliance with applicable data protection regulations.

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

| Requirement | Target |
|-------------|--------|
| Page load time (3G network) | ≤ 5 seconds for primary views |
| License verification API response | ≤ 5 seconds |
| Map position refresh latency | ≤ 30 seconds |
| Ticket generation after payment | ≤ 10 seconds |
| Fine payment status update in ZIMS | ≤ 1 hour (batch) or real-time |
| System uptime | ≥ 99.5% (monthly) |
| Concurrent users supported | Minimum 5,000 |

### 5.2 Reliability and Availability

**NFR-02.1** The system shall achieve a minimum uptime of 99.5% per calendar month, excluding scheduled maintenance windows.

**NFR-02.2** Scheduled maintenance windows shall be communicated to users at least 48 hours in advance via the announcements module.

**NFR-02.3** In the event of ZIMS API unavailability, the ZARTSA App shall display appropriate degraded-mode messages and continue to serve cached data (fare tables, news) where possible.

**NFR-02.4** The system shall implement automated health monitoring and alerting for all critical services.

### 5.3 Usability Requirements

**NFR-03.1** The application shall be fully responsive and functional on screens from 320px (small smartphones) to 1920px (desktop monitors).

**NFR-03.2** The UI shall comply with WCAG 2.1 Level AA accessibility standards.

**NFR-03.3** All user-facing text shall be available in both Kiswahili and English, with Kiswahili as the default language.

**NFR-03.4** The interface shall be designed for users with low digital literacy; all key actions shall be completable within 3 taps/clicks from the home screen.

**NFR-03.5** Error messages shall be clearly written in plain language, explaining what went wrong and how to correct it.

### 5.4 Scalability Requirements

**NFR-04.1** The system architecture shall be horizontally scalable to accommodate up to 50,000 concurrent users without degradation in performance.

**NFR-04.2** The database design shall support growth of at least 5 years of transaction, booking, complaint, and fine records without requiring schema redesign.

### 5.5 Maintainability Requirements

**NFR-05.1** All API integrations with ZIMS shall use versioned endpoints to allow independent updates.

**NFR-05.2** The codebase shall follow documented coding standards with inline documentation coverage of at least 80%.

**NFR-05.3** The system shall maintain a full audit log of all administrative actions, payment transactions, and complaint resolutions.

---

## 6. External Interface Requirements

### 6.1 User Interface Requirements

- The application shall use a consistent design system aligned with ZARTSA's brand identity (colors, fonts, logo)
- All forms shall implement real-time input validation with clear error indicators
- The Smart Plate Number Input shall auto-format to ZARTSA standard (`Z123ABC`) as described in FR-02.5
- QR code display for digital tickets shall be optimized for scanning in varied lighting conditions

### 6.2 Hardware Interfaces

- The real-time fleet tracking module depends on GPS tracking devices installed in registered vehicles; these must transmit location data to a central fleet server via GPRS/4G
- No other proprietary hardware interfaces are required

### 6.3 Software Interfaces

| External System | Integration Type | Purpose |
|-----------------|-----------------|---------|
| ZIMS Application Portal | REST API (HTTPS) | License data, fine records, permit data, vehicle records |
| Fleet GPS Tracking Server | REST API / WebSocket | Real-time vehicle location |
| Mobile Money APIs (Zantel, Vodacom, Airtel) | REST API | Payment processing |
| Payment Card Gateway | REST API (PCI-DSS) | Debit/credit card payments |
| SMS Gateway / MNO | REST API | OTP delivery, SMS notifications |
| Email Service Provider | SMTP / REST API | Email notifications and receipts |
| Map Provider (e.g., OpenStreetMap / Google Maps) | SDK / API | Interactive map rendering |

### 6.4 Communication Interfaces

- All client-server communication shall use HTTPS (TLS 1.2 or higher)
- All internal API communications shall use JWT or OAuth 2.0 authentication
- WebSocket connections shall be used for real-time map updates

---

## 7. Data Requirements

### 7.1 Data Entities

| Entity | Source | Notes |
|--------|--------|-------|
| User Account | ZARTSA App DB | Citizens and operators |
| Booking / Ticket | ZARTSA App DB | E-ticketing records |
| Fare Table | ZIMS / ZARTSA Admin | Official tariff data |
| License / Permit Record | ZIMS | Read-only via API |
| Fine / Offense Record | ZIMS / Fine & Penalty App | Payments written back to ZIMS |
| Complaint Report | ZARTSA App DB | Managed in app |
| Lost & Found Items | ZARTSA App DB | Managed in app |
| Bus Location | Fleet GPS Server | Real-time, short retention |
| Announcement / News | ZARTSA App CMS | Managed by ZARTSA staff |
| Notification Log | ZARTSA App DB | Delivery tracking |

### 7.2 Data Retention

| Data Type | Retention Period |
|-----------|-----------------|
| Booking and ticket records | 5 years |
| Payment transaction records | 7 years (financial regulation) |
| Complaint records | 5 years |
| Audit logs | 3 years |
| Bus GPS historical data | 90 days |
| User account data | Duration of account + 1 year post-deletion |

### 7.3 Data Backup

- Full database backups shall be performed daily
- Incremental backups shall be performed every 6 hours
- Backups shall be stored in a geographically separate location
- Recovery Time Objective (RTO): ≤ 4 hours
- Recovery Point Objective (RPO): ≤ 6 hours

---

## 8. Security Requirements

**SEC-01** All user passwords shall be hashed using a modern, salted hashing algorithm (e.g., bcrypt, Argon2). Plaintext passwords shall never be stored or logged.

**SEC-02** User sessions shall expire after 30 minutes of inactivity. Session tokens shall be invalidated on logout.

**SEC-03** All sensitive API endpoints shall require authentication via JWT tokens with appropriate role-based access controls (RBAC).

**SEC-04** The license verification and fine inquiry endpoints shall implement rate limiting to prevent automated scraping (maximum 50 requests per hour per IP for unauthenticated access).

**SEC-05** Payment processing shall comply with PCI-DSS standards. Card data shall never be stored on ZARTSA App servers; all card transactions shall be tokenized via the payment gateway.

**SEC-06** All uploaded files (complaint attachments, lost & found photos) shall be scanned for malware before storage.

**SEC-07** The system shall log all authentication events (login, logout, failed attempts) with IP address and timestamp.

**SEC-08** Three or more consecutive failed login attempts shall trigger a temporary account lock and notify the account owner.

**SEC-09** The application shall be protected against OWASP Top 10 vulnerabilities, including SQL injection, XSS, CSRF, and insecure direct object references.

**SEC-10** Personal data shall be stored only within Tanzania/Zanzibar in compliance with applicable data residency requirements.

---

## 9. Constraints and Assumptions

### 9.1 Constraints

- The ZARTSA App is a **read-only consumer** of ZIMS license and permit data; all creation, renewal, and modification of licenses and permits continues to occur within ZIMS
- The application must function on 3G mobile networks common in Zanzibar; heavy media use must be optimized accordingly
- All payment integrations must be approved by the Bank of Tanzania
- The development and deployment timeline is constrained by ZARTSA's ICT budget cycle

### 9.2 Assumptions

- ZIMS will expose stable, versioned, and documented REST APIs for all required data
- Fleet vehicles will be equipped with working GPS tracking hardware prior to the launch of FR-03
- ZARTSA will assign a dedicated content officer to manage the news/announcements module
- Official fare tariff data will be provided by ZARTSA in a structured, machine-readable format
- Mobile Money API documentation and sandbox access will be provided by respective MNOs during development

---

## 10. Appendices

### Appendix A: Booking Flow Diagram

```
User Initiates Booking
        │
        ▼
[FR-04.1] Route Search
(Departure, Destination, Date, Passengers)
        │
        ▼
Trip Results Displayed
        │
        ▼
[FR-04.2] Seat Selection
(Visual seat map, window/aisle)
        │
        ▼
[FR-04.3] Secure Checkout
(Mobile Money / Card / Bank Transfer)
        │
     ┌──┴──┐
     │     │
   Success Failure
     │     │
     ▼     ▼
[FR-04.4]  Error
QR Ticket  Message
Issued
     │
     ▼
Notification sent
(SMS / Email / In-app)
```

### Appendix B: Complaint Lifecycle

```
Citizen Submits Complaint (FR-06.1)
        │
        ▼
     [RECEIVED]
Reference number assigned, notification sent
        │
        ▼
     [UNDER REVIEW]
ZARTSA officer assigned
        │
     ┌──┴──────────┐
     │             │
[ESCALATED]    [RESOLVED]
Higher authority  Officer response
     │             │
     └──────┬──────┘
            ▼
         [CLOSED]
Complainant notified
```

### Appendix C: User Roles and Permissions Matrix

| Feature | Citizen (Unauth) | Citizen (Auth) | Operator | Driver | ZARTSA Officer | Admin |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|
| View Fare Tables | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Verify Documents | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View Live Map | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Book Tickets | — | ✓ | ✓ | — | — | — |
| Log Found Items | — | — | ✓ | ✓ | ✓ | ✓ |
| Search Lost & Found | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Submit Complaints | ✓ | ✓ | ✓ | ✓ | — | — |
| Manage Complaints | — | — | — | — | ✓ | ✓ |
| View Own Fines | — | ✓ | ✓ | ✓ | — | — |
| Pay Fines | — | ✓ | ✓ | ✓ | — | — |
| Publish Announcements | — | — | — | — | ✓ | ✓ |
| Admin Panel Access | — | — | — | — | — | ✓ |



### Appendix D: Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | April 2026 | ZARTSA ICT | Initial draft |

---

