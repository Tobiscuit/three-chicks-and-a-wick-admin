---
description: Research and apply bleeding-edge CSS/Tailwind/UX patterns to any component
---

# Bleeding-Edge Component Audit

Holistic modernization with the latest patterns from Tailwind, Shadcn, and UX best practices.
**Bias towards highest effort / maximum polish** — this is about bleeding edge, not shipping fast.

---

## 0. Understand Context First (CRITICAL)

Before touching code, answer:
1. **What is this component trying to accomplish?**
2. **Who uses it?** (admin, customer, developer)
3. **What's the ideal emotional response?** (trust, speed, delight, clarity)
4. **Where does this fit in the user journey?**

**Example contexts:**
- Admin panel → prioritize **clarity, density, efficiency** (Inter, Geist, mono for data)
- Customer-facing → prioritize **warmth, brand, delight** (softer fonts, more whitespace)
- Data dashboard → prioritize **scannability, hierarchy** (tabular nums, tight spacing)

---

## 1. Analyze Current Implementation

- View the target component file(s)
- Note current:
  - **Typography** (font family, sizes, weights, line heights)
  - **Spacing** (padding, margins, gaps)
  - **Colors** (semantic usage, contrast)
  - **Hierarchy** (visual weight, what draws eye first)
  - **Animations** (current vs possible)
  - **Mobile responsiveness**

---

## 2. Research Bleeding-Edge Patterns

### Typography & Fonts
```
Use context7 with: /websites/tailwindcss
Topics:
- "font-family font-sans font-mono"
- "text-size tracking leading"
- "tabular-nums font-feature"

Web search:
- "best font for admin panel 2024"
- "modern dashboard typography tailwind"
```

### Spacing & Layout
```
Use context7 with: /websites/tailwindcss
Topics:
- "gap space-y space-x"
- "container queries @container"
- "grid auto-fit minmax"
```

### Shadcn Components
```
Use context7 with: /websites/ui_shadcn
Topics:
- "[component] responsive layout"
- "card skeleton hover"
- "badge spinner status"
```

### Animations
```
Use context7 with: /rombohq/tailwindcss-motion
Topics:
- "motion-preset-fade"
- "motion-preset-slide"
- "staggered delay"
```

### UX Patterns (Web Search)
```
Search: "[component type] UX best practices 2024"
Search: "[use case] UI pattern modern"
Search: "information hierarchy [context]"
```

---

## 3. Present Proposal (REQUIRED)

**Always present findings in this format before implementing:**

```markdown
## 🔍 Bleeding-Edge Audit: [COMPONENT NAME]

### Context Understanding
- **Purpose:** What this component does
- **User:** Who uses it  
- **Goal:** Desired user feeling/outcome
- **Current State:** Brief assessment

---

### 🚀 Improvements Found

#### Typography & Hierarchy
| Element | Current | Upgrade |
|---------|---------|---------|
| ... | ... | ... |

#### Spacing & Layout  
| Element | Current | Upgrade |
|---------|---------|---------|
| ... | ... | ... |

#### Animation & Interaction
| Element | Current | Upgrade |
|---------|---------|---------|
| ... | ... | ... |

#### UX & Information Design
| Element | Current | Upgrade |
|---------|---------|---------|
| ... | ... | ... |

---

### 📦 Dependencies
- List any new packages

### Recommendations
1. High priority items
2. Medium priority items
3. Optional polish items

**Which should I implement?**
```

---

## 4. Implement Changes (after approval)

Order of implementation:
1. **Typography first** (fonts, sizes, weights)
2. **Spacing second** (padding, gaps, margins)
3. **Colors/hierarchy third** (contrast, visual weight)
4. **Animation last** (motion, transitions)

Always include:
- `motion-reduce:` variants for accessibility
- Responsive breakpoints
- Touch targets on mobile (min 44px)

---

## 5. Verify
- Type-check: `npx tsc --noEmit`
- Visual check on desktop AND mobile
- Check reduced motion behavior
- Commit and push

---

## Typography Reference for Context

| Context | Recommended Fonts | Why |
|---------|------------------|-----|
| Admin Panel | Inter, Geist, SF Pro | Clean, dense, legible |
| Dashboard | Inter + Mono for data | Tabular nums, scannable |
| E-commerce | System UI, Outfit | Warm, approachable |
| Documentation | JetBrains Mono, Fira | Code readability |

---

## Example Prompts

**Full holistic audit:**
> "/bleeding-edge-audit the [COMPONENT]. Consider typography for [admin/customer/data] context, spacing, hierarchy, and animation. Implement all."

**Typography focused:**
> "/bleeding-edge-audit [COMPONENT] typography. What's the best font for an admin panel? Apply modern type scale."

**UX focused:**
> "/bleeding-edge-audit [COMPONENT] UX. What is this trying to accomplish? How should it be presented for best clarity?"
