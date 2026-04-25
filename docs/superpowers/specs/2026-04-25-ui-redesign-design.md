# ZARTSA UI Redesign — Full Design System Build

**Date**: 2026-04-25
**Status**: Approved
**Approach**: Full Design System Build — component library first, then restyle every page

---

## 1. Context

ZARTSA (Zanzibar Road Transport & Safety Authority) is a citizen services portal for checking bus fares, tracking buses, verifying documents, reporting lost items, reading transport news, and managing fines/complaints. The audience is mixed: citizens on phones and transport officials on desktops.

The current UI is a narrow (512px max-width) mobile-only layout with plain white cards, minimal styling, no desktop navigation, and several installed-but-unused libraries (CVA, Radix Slot, cn(), react-hook-form, zod, sonner, recharts).

---

## 2. Design Personality

**Bold & energetic** — like a consumer app (Bolt/Uber), not a government portal.

- Vibrant colors with gradients and depth
- Smooth micro-interactions (hover lift, press scale, focus rings)
- Strong typography hierarchy
- Cultural identity through green + gold palette

---

## 3. Theme & Design Tokens

### 3.1 Color Palette

**Primary (green):**
```
50: #ecfdf5    100: #d1fae5    200: #a7f3d0    300: #6ee7b7
400: #34d399   500: #10b981    600: #059669    (brand)
700: #047857   800: #065f46    900: #064e3b
```

**Accent (gold):**
```
50: #fffbeb    100: #fef3c7    200: #fde68a    300: #fcd34d
400: #fbbf24   500: #f59e0b    600: #d97706    (brand)
700: #b45309   800: #92400e    900: #78350f
```

**Neutral base: slate** (cooler, more modern than gray)
```
Surface: slate-50 (#f8fafc)
Text:    slate-900 (#0f172a)
Borders: slate-200, slate-300
Muted:   slate-500
```

**Semantic:**
```
Success: green-600    Error: red-600    Warning: amber-500    Info: blue-600
```

### 3.2 Typography

Font: Inter (already set)

```
Display: text-3xl font-bold   — page titles, hero
Heading: text-xl font-semibold — section headers
Subhead: text-base font-medium — card titles
Body:    text-sm               — labels, descriptions
Caption: text-xs               — badges, metadata
```

### 3.3 Spacing & Radius

```
Radius:
  rounded-lg    — cards, inputs
  rounded-xl    — modals, hero sections
  rounded-full  — badges, pills, avatars

Shadows:
  sm:  shadow-sm   — inputs, subtle elements
  md:  shadow-md   — cards (default)
  lg:  shadow-lg   — dropdowns, modals, hover states
  glow: green shadow — primary button hover
```

### 3.4 Animations

```
transition-all duration-200     — default hover/focus
transition-all duration-300     — expand/collapse
hover:scale-[1.02]              — interactive cards
active:scale-[0.98]            — buttons (press feel)
animate-pulse                  — live indicators
```

---

## 4. Component Library

All components go in `client/src/components/ui/`. Built on the already-installed `cn()` (clsx + tailwind-merge), `class-variance-authority`, and `@radix-ui/react-slot`.

### 4.1 Button

```
Variants: primary, gold, outline, ghost, danger
Sizes:    sm, md, lg
States:   loading (spinner + disabled), disabled (opacity-50)
Shape:    rounded-lg, active:scale-[0.98]
```

| Variant | Background | Text | Border | Use |
|---------|-----------|------|--------|-----|
| primary | green-600 | white | none | Main CTAs (Verify, Search, Save) |
| gold | amber-500 | white | none | Secondary emphasis, upgrade actions |
| outline | white | green-600 | green-600 | Alternative actions (Report Lost) |
| ghost | transparent | green-600 | none | Tertiary, nav links |
| danger | red-600 | white | none | Delete, destructive actions |

### 4.2 Card

```
Variants: default, interactive, gradient
Sizes:    compact (p-3), default (p-4), spacious (p-6)
Default:  white bg, shadow-md, rounded-xl, border slate-200
Interactive: adds hover:shadow-lg hover:scale-[1.02] cursor-pointer
Gradient: top 4px accent bar (green/gold/blue configurable)
```

### 4.3 PageHeader

```
Props:   title, subtitle?, backHref?, action?
Mobile:  back arrow (if backHref) + title + optional action, compact
Desktop: larger text, more spacing, centered or left-aligned
```

### 4.4 Badge

```
Variants: success, error, warning, info, neutral, gold
Shape:    rounded-full, px-2.5 py-0.5, text-xs font-semibold
```

| Variant | Background | Text |
|---------|-----------|------|
| success | green-100 | green-800 |
| error | red-100 | red-800 |
| warning | amber-100 | amber-800 |
| info | blue-100 | blue-800 |
| neutral | slate-100 | slate-800 |
| gold | yellow-100 | yellow-800 |

### 4.5 Input

```
Props:   label, error?, hint?, icon? (left icon slot)
States:  default (slate-200 border), focus (green-500 ring), error (red-500 border + message)
Shape:   rounded-lg, h-10 mobile, h-11 desktop
```

### 4.6 Select

```
Same visual language as Input
Chevron icon on right, green focus ring
```

### 4.7 NavBar (Responsive Shell)

**Mobile (default):**
- Sticky header: white bg, shadow-sm, green brand logo left, hamburger right
- Hamburger opens left slide-in drawer with backdrop blur
- Drawer top: user avatar + name (if authenticated) or login link
- Drawer body: nav links with lucide icons, green active indicator
- Drawer bottom: gold accent line, version/brand text

**Desktop (lg+):**
- Fixed left sidebar: w-64, slate-50 bg
- Top: green brand logo
- Nav links: lucide icons + labels, active link has green left-border + green-50 bg
- Content area: ml-64, max-w-5xl, centered

### 4.8 EmptyState

```
Props:   icon?, title, description, action? (Button)
Styling: centered, large muted icon, clean typography, optional action button
```

### 4.9 Toast (sonner integration)

```
Replace all alert() and inline red error boxes with sonner toasts
Themed: success (green), error (red), info (blue)
Position: bottom-right on desktop, bottom-center on mobile
```

### 4.10 Skeleton

```
Shimmer loading placeholders for cards, text blocks, images
animated pulse or shimmer gradient
```

---

## 5. Page Redesigns

### 5.1 Home Page

- Hero banner: gradient bg (green-600 to green-800) with white title + tagline, subtle wave SVG divider
- 3x3 module grid: Card(interactive, gradient) with lucide icons replacing emojis, green top bar, hover lift
- Footer: upgraded with more depth, gold accent

### 5.2 Fares Page

- PageHeader with title + subtitle
- Route type toggle: segmented control (green active, slate inactive)
- Search form: Card containing Select/Select + Button(primary)
- Results: Card(interactive, gradient) list with fare breakdown, total in gold Badge

### 5.3 Track Page

- PageHeader with green pulse "Live" indicator
- Map: Card(rounded-xl, shadow-lg), full width
- FilterPanel: Card with horizontal Select inputs on desktop
- BusStopList: accordion cards with green active state
- DelayAlert: Card with amber left-border, slide-in animation

### 5.4 Verify Page

- PageHeader with Shield icon
- Form Card: document type Select + SmartPlateInput
- Button(primary, lg) with loading spinner
- Result Card: large Badge, key-value rows with subtle slate-100 dividers

### 5.5 Lost & Found

- Search: Input with Search icon
- Action row: Report Lost (outline) + Report Found (primary) side-by-side
- Item list: Card(interactive) with Badge, date, description, photo thumbnail
- Item detail: Card(spacious) with photo, metadata, claim Button(primary)

### 5.6 News Page

- Category filter: horizontal scroll of Badge components, active = gold variant
- NewsCard: Card with gradient top-bar (color by category), image thumbnail, hover lift
- News detail: Card(spacious) with hero image area, Badge, formatted content
- News admin: Card form with Input/Select, publish toggle with eye icon

### 5.7 Auth Pages (Login/Register)

- Centered Card(spacious) with green gradient top bar
- ZARTSA logo centered
- Phone input + OTP: 6 individual digit boxes with focus animation and auto-advance
- Toggle between login/register as ghost link
- Errors via sonner toast, not inline red box

### 5.8 Profile & Notifications

- Profile: Card sections with PageHeader, inline edit toggle (Button ghost)
- DashboardTabs: pill-style tab bar with active green underline, count Badges
- Notifications: Card list with green dot indicator for unread
- Preferences: toggle switches with green active state
- Delete account: danger zone Card with red border

### 5.9 Placeholder Pages (Complaints, Fines, Tickets)

- EmptyState component with relevant lucide icon, "Coming soon" title, description

---

## 6. Responsive Breakpoints

```
Mobile (default, < 640px):
  Single column, max-w-lg, drawer navigation
  Cards stack vertically

sm (640px):
  Minor spacing increases, form fields slightly wider

md (768px):
  Two-column grids for cards (news, lost-found items)
  Side-by-side form layouts (fares departure + destination)
  Nav still hamburger/drawer

lg (1024px+):
  Sidebar navigation visible (fixed left, w-64)
  Content area: max-w-5xl centered
  Three-column card grids on home and news
  Track page: sidebar filters + full-width map
  Fares: two-column (form left, results right)
  Forms: labels left, inputs right (horizontal layout)
```

---

## 7. State & Data Flow Changes

No structural changes to data flow. Same API client, same providers.

**Replacements:**
- All `alert()` calls → sonner toast
- All inline red error boxes → sonner toast
- All "Loading..." text → Skeleton shimmer component
- Raw `useState` forms → react-hook-form + zod validation (already installed)
- Form error display → Input component's `error` prop with inline message

---

## 8. File Structure

```
client/src/components/ui/
  button.tsx
  card.tsx
  page-header.tsx
  badge.tsx
  input.tsx
  select.tsx
  empty-state.tsx
  skeleton.tsx
  toggle.tsx          (for notification preferences)
  otp-input.tsx       (6-digit auth input)

client/src/components/layout/
  header.tsx          (rewritten)
  sidebar.tsx         (new — desktop nav)
  mobile-drawer.tsx   (new — replaces MobileNav)
  footer.tsx          (upgraded)

client/src/app/globals.css    (expanded with CSS variables, keyframes)
client/tailwind.config.ts     (expanded palette, animations)
```

---

## 9. Implementation Order

1. Theme: Update `tailwind.config.ts` + `globals.css` with full palette, animations, CSS variables
2. UI Components: Build all `components/ui/` files (Button, Card, Badge, Input, Select, PageHeader, EmptyState, Skeleton, Toggle, OtpInput)
3. Layout Shell: Rewrite Header, build Sidebar + MobileDrawer, upgrade Footer
4. Root Layout: Add responsive sidebar logic, drawer state, Sonner Toaster provider
5. Home Page: Hero + grid redesign
6. Auth Pages: Card + OtpInput + toast integration
7. Main Pages: Fares, Track, Verify, Lost & Found, News — one at a time
8. Profile & Notifications: Card sections, tabs, toggles
9. Placeholder Pages: EmptyState component
10. Polish: Skeleton loading states, hover animations, toast theming