---
description: Research and apply bleeding-edge CSS/Tailwind/UX patterns to any component
---

# Bleeding-Edge Component Audit

Use this workflow to modernize any component with the latest patterns from Tailwind, Shadcn, and CSS.
**Bias towards highest effort / maximum polish** — this is about bleeding edge, not shipping fast.

---

## 1. Analyze Current Implementation
- View the target component file(s)
- Note current styling approach (Tailwind classes, animations, responsive behavior)
- Identify all interactive elements, cards, badges, lists, buttons

---

## 2. Research Bleeding-Edge Patterns

### Tailwind v4
```
Use context7 with: /websites/tailwindcss
Topics:
- "container queries @container"
- "safe-area viewport dvh svh"
- "touch scroll overscroll"
- "motion prefers-reduced-motion"
- "hover shadow transition"
- "v4 new features"
```

### Shadcn UI
```
Use context7 with: /websites/ui_shadcn
Topics:
- "[component] skeleton loading"
- "[component] animation hover"
- "badge spinner status indicator"
- "hover card tooltip"
- "drawer dialog responsive"
```

### tailwindcss-motion
```
Use context7 with: /rombohq/tailwindcss-motion
Topics:
- "motion-preset-fade"
- "motion-preset-slide"
- "staggered animation delay"
```

### Web Search (beta/canary features)
```
Search: "[component] shadcn tailwind v4 2024 bleeding edge animated"
Search: "modern [component] UX pattern framer motion 2024"
```

---

## 3. Present Proposal (REQUIRED)

**Always present findings in this format before implementing:**

```markdown
## 🔍 Bleeding-Edge Audit: [COMPONENT NAME]

### Current Elements Analyzed
- List each UI element found

---

### 🚀 Bleeding-Edge Improvements Found

| Element | Current | Bleeding-Edge Upgrade |
|---------|---------|----------------------|
| Element 1 | Current state | ✨ Proposed upgrade with emoji |
| Element 2 | Current state | 🔄 Proposed upgrade |
| ... | ... | ... |

---

### 📦 Dependencies to Add
- List any new packages needed

---

### Priority Recommendations

**High Impact, Low Effort:**
1. ✅ Item
2. ✅ Item

**Medium Effort:**
3. 🔄 Item

**Higher Effort (optional):**
4. 💫 Item

**Which should I implement?**
```

---

## 4. Implement Changes (after approval)

Apply in this order:
1. Install dependencies if needed
2. Add CSS imports to globals.css
3. Update component with new patterns:
   - Animation classes (motion-preset-*, staggered delays)
   - Hover effects (shadow, scale, translate)
   - Accessibility (motion-reduce variants)
   - Mobile touch feedback (active states)
4. Pass index props for staggered animations

---

## 5. Verify
- Type-check: `npx tsc --noEmit`
- Test desktop and mobile
- Verify animations play correctly
- Check accessibility (reduced motion)
- Commit and push

---

## Key Dependencies for Bleeding-Edge

| Package | Purpose |
|---------|---------|
| `tw-animate-css` | Tailwind v4 compatible animations |
| `tailwindcss-motion` | Advanced animation presets |
| `vaul` | Mobile drawer with swipe gestures |
| `framer-motion` | Complex orchestrated animations (optional) |

---

## Example Usage Prompts

**Full audit:**
> "Apply /bleeding-edge-audit to [COMPONENT]. Research latest Tailwind v4, Shadcn, and UX patterns via context7. Include beta features. Implement all recommendations."

**Scoped audit:**
> "Apply /bleeding-edge-audit to the [SPECIFIC ELEMENT] in [COMPONENT]. Focus on [animation/mobile/accessibility]."

**Maximum effort:**
> "Apply /bleeding-edge-audit to [COMPONENT]. Always choose highest effort options. I want maximum polish."
