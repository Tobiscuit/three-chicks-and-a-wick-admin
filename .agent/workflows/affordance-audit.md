---
description: Find UI elements that look interactive but aren't, or vice versa
---

# Affordance Audit

Identify and fix **false affordances** — elements that look clickable/interactive but don't do anything, or functional elements that don't LOOK interactive.

> **📁 Project Context:** Reference `.agent/project-context.json` for stack info.
> Run `/detect-stack` if missing or outdated.

---

## What is Affordance?

**Affordance** = visual cues that suggest how something is used.
- A button with a hover effect → "I can click this"
- An avatar with a ring/glow → "I can click this for profile"
- Plain text → "This is just info, not interactive"

**False affordances** confuse users and hurt trust.

---

## 0. Identify Suspects

Scan for elements that LOOK interactive:
- Avatars (especially with rings, glows, shadows)
- Badge-like elements
- Cards with hover effects
- Icons that could imply action
- Text that looks like links (underlined, colored)

For each, ask: **"What happens if the user clicks?"**

---

## 1. Decide: Remove or Implement?

| If... | Then... |
|-------|---------|
| It looks interactive but has no purpose | **Remove the affordance** (no glow, no hover) |
| It SHOULD be interactive but isn't | **Implement the action** |

### Common Actions to Implement:
- **Avatar → Dropdown**: Profile settings, Switch theme, Logout
- **Badge → Filter**: Click to filter by that status
- **Card → Navigate**: Click to view details
- **Icon → Tooltip**: At minimum, explain what it means

---

## 2. Research Patterns

```
Search: "user avatar dropdown menu shadcn 2025"
Search: "[component] click action admin panel"
Use context7: /websites/ui_shadcn topic: "dropdown menu avatar profile"
```

---

## 3. Present Proposal

```markdown
## 🔍 Affordance Audit: [ELEMENT]

### Current State
- **Element:** Description
- **Looks like:** What it visually suggests (clickable? interactive?)
- **Actually does:** Nothing / Something

### Options
1. **Remove affordance** — Make it look static (remove glow, hover, etc.)
2. **Add action** — Make it actually interactive

### Recommended Action
[Description of what to implement]

**Which option?**
```

---

## 4. Implement

If adding interactivity:
1. Wrap in appropriate interactive component (DropdownMenu, Button, Link)
2. Add proper focus/hover states
3. Ensure keyboard accessibility
4. Mobile: ensure touch target is 44px+

If removing affordance:
1. Remove hover effects, glows, shadows
2. Keep static styling
3. Consider adding `cursor-default` explicitly

---

## Example: Sidebar Avatar

**Current:** Avatar with ring-glow looks clickable → Does nothing
**Fix:** Wrap in DropdownMenu with:
- Theme toggle (Light/Dark)
- Settings link
- Logout button

---

## Example Prompts

> "/affordance-audit the sidebar user section. I can't click it — should I be able to?"

> "/affordance-audit the [COMPONENT]. What looks clickable but isn't?"
