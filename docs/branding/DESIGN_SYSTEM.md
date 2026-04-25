# 🗺️ Pathfinder AI: Design System (Dark Forest)

**Vibe:** Deep, atlas-like, calm, editorial, tracking journeys through a dark forest.  
**Core Metaphor:** User = traveler, App = navigator, Workflow = route map, Archive = atlas, Completion = arrival.

## 1. Design Tokens (Colors)

We use a custom palette inspired by nocturnal navigation. These tokens are defined as CSS variables in `index.css`.

| Token | Hex | Use Case |
| :--- | :--- | :--- |
| **Forest Deep** | `#0a1a15` | Global Page Background. |
| **Forest Mid** | `#0d211b` | Secondary surfaces / Gradients. |
| **Forest Card** | `#0e221d` | Main Container Backgrounds. |
| **Emerald** | `#5c8c75` | Success states, timeline progress, grounding. |
| **Sage** | `#7ba091` | Nurture, Family, Soft logistics. |
| **Amber** | `#d47c3f` | Primary CTAs, active highlights, urgency markers. |
| **Sky** | `#5c8c9e` | Logic, Legal identity, Mental clarity. |
| **Coral** | `#c65d4a` | Critical errors, high-priority risks. |
| **Lavender** | `#7b6fa0` | AI Insights, suggestions, metadata markers. |
| **Gold** | `#c9a84c` | Career achievements, completed milestones. |
| **Paper** | `#f7f4ee` | Primary text for maximum readability. |
| **Fog** | `rgba(255,255,255,0.7)` | Secondary / helper text. |

## 2. Typography System
Pairing an authoritative Serif with a high-legibility Sans.

- **Display / Headings**: `Playfair Display` (Bold 700-900). "Editorial. Atlas-like."
- **Body / Interface**: `DM Sans` (300-500). Used for all interactive copy.
- **Metadata / Labels**: `JetBrains Mono` (Uppercase tracking). Precision markers.

## 3. Motion & Micro-interactions
The "feel" of the app should be magical, responsive, and organically guided.

- **Global Curves**: Always use `cubic-bezier(0.16, 1, 0.3, 1)` for a "snappy but smooth" spring feel.
- **Buttons**:
  - Hover: `translateY(-3px) scale(1.04)` with an Amber glow pulse.
  - Press: `scale(0.97)`.
- **Ceremony (Journey Completion)**:
  1. Cascade: Route map nodes flash **Gold** in a 100ms sequence.
  2. Transition: Connecting lines turn solid Gold (800ms).
  3. Celebration: `canvas-confetti` using the core palette.
  4. Finality: The Saved Plan card receives an animated "Passport Stamp."

## 4. Components & Layout
- **Glassmorphism**: Phase cards use `backdrop-filter: blur(20px)` and subtle borders (`rgba(255,255,255,0.15)`).
- **Navigation**: Sidebar expands on hover from 60px to 240px with a 250ms transition.
- **Inputs**: Focused fields use a "Breathe" animation (slow box-shadow pulse in Emerald).

---
_Reference `docs/branding/BRAND_GUIDE.md` for master asset locations._
