# ADR-001: Product Description Editing Strategy & HTML Preservation
**Date:** 2025-11-20
**Status:** Accepted
**Context:** Three Chicks and a Wick Admin Panel / Product Management

## 1. The Problem
The application relies on an AI pipeline (Image Studio) to generate rich, complex HTML product descriptions containing specific classes (e.g., `.scent-profile`, `.vibe-description`) and structural elements (unordered lists, bold tags).

When these products were opened in the Admin Panel's "Edit Product" form, the Tiptap-based Rich Text Editor would:
1.  Parse the HTML using a strict default schema.
2.  Strip out "unknown" attributes (like `class`) and "invalid" nesting (according to its rules).
3.  **Silently corrupt the data** upon initialization.
4.  Save this "sanitized" (broken) HTML back to Shopify when the user saved *any* change (even unrelated fields like Inventory).

This resulted in "jumbled" text and loss of the premium formatting required for the Storefront.

## 2. The Decision
We have decided to implement a **Client-Side Adapter with Permissive Schema** pattern.

### The Solution Implemented
1.  **Permissive Schema**: We configured the Tiptap editor to explicitly allow and preserve `class` and `style` attributes on all major nodes (Paragraphs, Headings, Lists).
2.  **Source View Adapter**: We added a "Raw HTML" view (`< >` toggle) that bypasses the visual editor's parsing logic entirely, allowing the user to see and edit the source of truth.
3.  **Sanitization Bypass**: We effectively told the client-side editor to "trust" the HTML coming from Shopify, rather than enforcing its own strict rules.

## 3. Alternatives Considered

### Option A: Rule-Based Architecture (The "Pure" Approach)
*   **Concept**: Instead of storing raw HTML, we would store **Structured Data** (e.g., JSON Metafields: `{ "scent": "...", "vibe": "..." }`).
*   **Mechanism**: A "Generator" (Rule Engine) would take this data and strictly *generate* the HTML based on a template.
*   **Pros**: 
    *   Guaranteed consistency. 
    *   Impossible to "break" formatting (because the user never touches HTML).
    *   Decoupled content from presentation.
*   **Cons**:
    *   **High Effort**: Requires migrating all existing products to Metafields.
    *   **Rigid**: Harder to add "one-off" creative flourishes that the AI might generate.
    *   **Breaking Change**: Requires updates to the Storefront to read the new data structure (or a complex "dual-write" sync).

### Option B: External Persistence
*   **Concept**: Store the "Master" HTML in an external database (Firebase/DynamoDB) and only sync a "render-friendly" version to Shopify.
*   **Cons**: Overkill. Introduces synchronization issues and a second source of truth.

## 4. Architect's Commentary (The "Why")

Is this solution **Technical Debt**? 
*   **Yes, strictly speaking.** We are relying on a client-side configuration to preserve data integrity. If a future developer replaces Tiptap with Quill or Slate and forgets to configure the schema, the bug returns. We are treating the symptom (the editor stripping tags) rather than the root cause (storing presentation mixed with content).

**However, it is the *Right* Technical Debt for now.**
*   **Pragmatism**: The "Rule-Based" approach (Option A) would have turned a "fix the bug" task into a multi-week "platform migration" project.
*   **Risk**: Touching the data structure of live products carries a high risk of breaking the Storefront. Our chosen solution has **Zero Risk** to the Storefront because it maintains the existing data contract (HTML in the Description field).
*   **Velocity**: We unlocked the "Production Ticket" feature immediately by parsing the HTML, rather than waiting for a data migration.

**Future Recommendation:**
As the product catalog grows, we should transition to **Option A (Rule-Based/Structured Data)**. 
1.  We should eventually move "Scent", "Vibe", and "Vessel" into dedicated Metafields.
2.  The Admin Panel should edit those fields directly.
3.  The Storefront should render them using its own components, removing the need for "HTML Blobs" entirely.

But for today, the **Client-Side Adapter** is the robust, effective shield we need.

---
*Documented by Antigravity (AI Architect)*
