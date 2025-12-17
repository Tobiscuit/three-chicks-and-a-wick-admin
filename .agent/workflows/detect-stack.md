---
description: Detect and save the project's tech stack for other workflows to reference
---

# Detect Project Stack

Scans the project and generates `.agent/project-context.json` — a single source of truth for all workflows.

---

## When to Run

- **First time:** When setting up workflows in a new project
- **After major changes:** New framework, new UI library, etc.
- **Explicitly:** `/detect-stack` to refresh

---

## 0. Scan Project Files

Check for these files and extract info:

### Package Manager & Dependencies
```
package.json → framework, ui lib, animation libs
pnpm-lock.yaml / package-lock.json / yarn.lock → exact versions
```

### Framework Detection
| File | Means |
|------|-------|
| `next.config.*` | Next.js |
| `vite.config.*` | Vite |
| `nuxt.config.*` | Nuxt |
| `angular.json` | Angular |
| `svelte.config.*` | SvelteKit |

### Styling Detection
| File | Means |
|------|-------|
| `tailwind.config.*` | Tailwind CSS (check version in package.json) |
| `postcss.config.*` | PostCSS |
| `components/ui/` | Shadcn UI (check for button.tsx, card.tsx, etc.) |
| `styled-components` in deps | Styled Components |
| `@emotion/*` in deps | Emotion |

### Language Detection
| File | Means |
|------|-------|
| `tsconfig.json` | TypeScript |
| `*.tsx` files | TypeScript + React |
| `*.jsx` files | JavaScript + React |

### Animation Detection
Check `package.json` dependencies for:
- `tailwindcss-motion`
- `tailwindcss-animate` or `tw-animate-css`
- `framer-motion`
- `@formkit/auto-animate`
- `gsap`

---

## 1. Generate Context File

Create `.agent/project-context.json`:

```json
{
  "name": "project-name-from-package.json",
  "framework": "next | vite | nuxt | angular | svelte | unknown",
  "frameworkVersion": "15.x",
  "language": "typescript | javascript",
  "styling": {
    "css": "tailwindcss@4.x | vanilla | scss | styled-components",
    "components": "shadcn-ui | radix | mui | chakra | none"
  },
  "animations": ["tailwindcss-motion", "framer-motion"],
  "fonts": ["Inter", "Geist"],
  "database": "firebase | supabase | prisma | none",
  "deployment": "vercel | aws | gcp | unknown",
  "detectedAt": "ISO timestamp",
  "lastUpdated": "ISO timestamp"
}
```

---

## 2. Validate

After generating, confirm:
- File exists at `.agent/project-context.json`
- JSON is valid
- Key fields are populated (not all "unknown")

If too many unknowns, ask user to clarify.

---

## 3. Notify User

Show a summary:
```
✅ Project context saved to .agent/project-context.json

Detected:
- Framework: Next.js 15.x
- Styling: Tailwind CSS 4.x + Shadcn UI
- Animations: tailwindcss-motion, tw-animate-css
- Language: TypeScript
```

---

## How to Update

Run `/detect-stack` again. It will:
1. Re-scan the project
2. Update `lastUpdated` timestamp
3. Preserve any manual overrides in a `"manual"` section (if present)

---

## Manual Overrides

If detection gets something wrong, add a `"manual"` section:

```json
{
  "framework": "next",
  "manual": {
    "fonts": ["Custom Font Not In Code"],
    "notes": "Using experimental feature X"
  }
}
```

The agent should merge `manual` values with detected values.

---

## Example Prompts

> "/detect-stack" — Scan and generate project context

> "/detect-stack --update" — Refresh existing context file
