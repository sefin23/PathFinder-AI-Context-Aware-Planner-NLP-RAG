# Pathfinder AI: Design System (Dark Forest)

**Vibe:** Deep, atlas-like, calm, editorial, tracking journeys through a dark forest.  
**Core Metaphor:** User = traveler, App = navigator, Workflow = route map, Archive = atlas, Completion = arrival.

## 1. Design Tokens (Colors)

- **Forest Deep (Background):** `#0D1A15`
- **Forest Mid (Gradient ends/Alt):** `#1A2F26`
- **Forest Card (Card bg):** `#1E3529`
- **Forest Card 2 (Alt bg):** `#243D30`
- **Earth (Surface/cards):** `#2D4A3E`
- **Sage (Success/Progress/Active):** `#5C8C75`
- **Fog (Secondary text):** `#B8CFC7`
- **Amber (CTAs/Active/Warnings):** `#D47C3F`
- **Amber Light (Accents):** `#F0A96B`
- **Coral (Errors/Overdue/High Priority):** `#C65D4A`
- **Lavender (AI suggestions/Analytics):** `#7B6FA0`
- **Gold (Completed milestones/Ceremony):** `#C9A84C`

**Text Colors:**

- **On-Dark (Primary Text):** `rgba(255, 255, 255, 0.85)`
- **Muted (Secondary/Helper):** `rgba(255, 255, 255, 0.38)`

**Borders & Shadows:**

- **Border Subtle:** `rgba(255, 255, 255, 0.08)`
- **Shadow Soft:** `0 2px 16px rgba(0,0,0,0.3)`
- **Shadow Lift:** `0 8px 40px rgba(0,0,0,0.45)`
- **Shadow Glow Focus:** `0 0 0 4px rgba(92,140,117,0.25)`

**Border Radius:**

- **Small (r-sm):** `6px`
- **Medium (r-md):** `14px`
- **Large (r-lg):** `24px`
- **Pill (r-pill):** `999px`

## 2. Typography System

- **Display / Headings:** `Playfair Display` (Bold 700-900, sometimes italicized). Used for page titles, card headers, and large stat numbers. "Editorial. Atlas-like."
- **Body / Interface:** `DM Sans` (Light to Medium, 300-500). Used for descriptions, buttons, and UI copy.
- **Metadata / Labels:** `JetBrains Mono` (Uppercase tracking for tags or standard for dates/badges). Usually colored in Sage or Amber.

## 3. Layout Architecture

Unlike standard dashboards, all pages share the dark forest background (`linear-gradient(135deg, Forest Deep, Forest Mid)`) and strictly avoid pure white or bright surfaces.

### Sidebar Navigation

- **Collapsed State:** 60px wide, vertically centered icons.
- **Expanded State (Hover):** 240px wide, expands with a 250ms smooth transition.
- **Active State:** Amber 3px left border, 100% white opacity.
- **Inactive State:** 30% white opacity.
- Contains user profile and plan tier at the bottom.

## 4. Components & States

- **Buttons:**
  - Hover: `translateY(-3px) scale(1.03)` with a spring overshoot. Amber shadow deepens (`0 6px 20px rgba(212,124,63,.45)`).
  - Active/Press: `scale(0.97)`.
- **Task Checkbox:**
  - **Spring Bounce:** On click, scale to `1.15`, background becomes Sage, checkmark appears, text gets strikethrough. Transition `cubic-bezier(.34, 1.56, .64, 1)`.
- **Document Chips (3 states):**
  - **Pending:** Mist border neutral, transparent background.
  - **Collected:** Sage border + 10% sage tint.
  - **Missing/Risk:** Amber border + slow pulse animation.
- **Priority Badges:**
  - `HIGH`: Coral text & left-border, 20% coral background.
  - `MED`: Amber text & left-border, 20% amber background.
  - `LOW`: Sage text & left-border, 20% sage background.
  - `AI-RANKED`: Lavender text & left-border, 20% lavender background.
- **AI Suggestion Badge:**
  - ✨ icon in the top-right corner.
  - 2px Lavender left border for any AI-inferred task.
- **Toast Notifications (Sonner equivalent):**
  - Stacked top-right, slide in from right (`300ms`).
  - Left border colored by type: Sage (Success), Coral (Error), Amber (Warning), Lavender (AI Info).

## 5. View-Specific Designs

### Page 1: New Journey

- 3-column layout: Sidebar, Main space, Right panel (195px width, darker background `rgba(0,0,0,.2)`).
- **Input Textarea:** "Breathe" animation (`box-shadow` pulse in Sage) when focused or waiting.
- **Generation sequence:** Shows a scanning layer, a skeleton shimmer (1.5s infinite running background slide), and staggered sequential appearance of workflow cards, tied with a `stroke-dashoffset` connecting line drawing downwards.
- **Right Panel tracking:** Mini map showing the user's progress through the app states itself with pulsing (Amber) active dots.

### Page 2: Saved Plans

- Glassmorphism cards (`background: rgba(255,255,255,.06)`, `backdrop-filter: blur(10px)`).
- **Hover effect:** Card softly tilts (3D perspective `rotateY(1.5deg) rotateX(-1.5deg)`) and lifts (`translateY(-3px)`).
- Completed roadmap tasks get an overlay "passport stamp". Stamps tilt / spring rotate differently on hover.
- Vertical timeline with nodes: Gold for completed, Amber + pulse for active ongoing, Sage for templates.
- **Empty state:** Floating SVG illustration (`translateY 0 to -8px` over 3s infinite loop).

### Page 3: Insights

- Analytics dashboard. Number counts animate from 0 up to their value (odometer effect).
- Bar charts grow from the bottom up on intersection load (`IntersectionObserver`).
- Lavender is the primary color used for highlighting insights and bottleneck metadata.

## 6. Motion & Micro-interactions

- **Global Feel:** Magical, organically guided, responsive. Always use spring/cubic-bezier curves for human-feeling pops.
- **Timing:** Often staggered (e.g., 80ms to 120ms delays between list items) to feel like AI is "thinking and typing."
- **Ceremony (Journey Completion Sequence):**
  1. Route map nodes flash gold in a cascade (100ms stagger).
  2. SVG connecting line transitions to solid gold (800ms).
  3. `canvas-confetti` effect triggers using the app's palette (Earth, Amber, Gold, Sage).
  4. Celebration banner slides up (Using _Playfair Display italic_).
  5. Saved Plans card finalizes with an animated passport stamp (Scale 1 → 0.8 → 1 over 400ms).

---

_Generated based on Dark Forest structural UI direction. Use these rules and token references when translating into CSS/Tailwind utility classes later._
