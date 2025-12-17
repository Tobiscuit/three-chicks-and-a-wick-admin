# SynchronizedEditor Data Flow Analysis

## Current Issue
Manual Editor is empty while AI Rewriter shows content. This indicates a synchronization problem between the form's `field.value` and the `SynchronizedEditor`'s internal `content` state.

## Data Flow Diagram

```mermaid
graph TD
    subgraph "Image Studio → Product Form Flow"
        A[Image Studio generates AI content] --> B[draftToken passed to ProductForm]
        B --> C[ProductForm useEffect loads AI data]
        C --> D[resolveAiGeneratedProductAction returns body_html]
        D --> E[formatHtmlForEditing converts to HTML]
        E --> F[setValue('description', formattedContent)]
    end

    subgraph "ProductForm → SynchronizedEditor"
        F --> G[field.value gets updated]
        G --> H["SynchronizedEditor receives initialContent={field.value || ''}"]
        H --> I["SynchronizedEditor useState(initialContent)"]
        I --> J[Manual Editor displays content]
        I --> K[AI Rewriter displays content]
    end

    subgraph "Current Problem"
        L[Manual Editor: EMPTY] 
        M[AI Rewriter: HAS CONTENT]
        N[Debug shows: content state is empty]
    end

    subgraph "Expected Flow"
        O[Manual Editor: HAS CONTENT]
        P[AI Rewriter: HAS CONTENT] 
        Q[Debug shows: content state has AI content]
    end

    H --> L
    H --> M
    H --> O
    H --> P

    style L fill:#ffcccc
    style M fill:#ccffcc
    style N fill:#ffcccc
    style O fill:#ccffcc
    style P fill:#ccffcc
    style Q fill:#ccffcc
```

## Root Cause Analysis

### Hypothesis 1: Timing Issue
- `SynchronizedEditor` mounts with `initialContent=""`
- `useState(initialContent)` sets `content` to empty string
- `isInitialized.current` becomes `true`
- Later, `field.value` updates with AI content
- `initialContent` prop changes, but the component doesn't update because:
  - `hasUnsavedChanges` might be `true` (from RichTextEditor onChange)
  - Or the `initialContent !== content` check fails

### Hypothesis 2: RichTextEditor onChange Trigger
- `RichTextEditor` might be triggering `onChange` with empty string on mount
- This sets `hasUnsavedChanges` to `true`
- Prevents the `initialContent` update effect from running

### Hypothesis 3: Form Field Value Issue
- `field.value` might not be updating correctly
- `setValue('description', ...)` might not trigger re-render
- `form.watch('description')` might not be working as expected

## Debug Strategy

1. **Add logging to trace the exact sequence:**
   - When `SynchronizedEditor` receives `initialContent`
   - When `content` state changes
   - When `hasUnsavedChanges` changes
   - When AI data loads in ProductForm

2. **Check the specific values:**
   - What is `field.value` when SynchronizedEditor mounts?
   - What is `initialContent` when SynchronizedEditor mounts?
   - What is `content` state after initialization?
   - What is `hasUnsavedChanges` after RichTextEditor mounts?

3. **Verify the update conditions:**
   - Is `isInitialized.current` true when AI content loads?
   - Is `hasUnsavedChanges` false when AI content loads?
   - Is `initialContent !== content` true when AI content loads?

## Expected Log Output

```
[ProductForm] AI Prefill useEffect: { token: "abc123", isEditMode: false, hasFetchedAiData: false, currentDescription: "..." }
[ProductForm] AI Data received: { title: "...", body_html: "...", formattedDescription: "..." }
[SynchronizedEditor] Render: { initialContent: "", content: "", contentLength: 0, isInitialized: false, hasUnsavedChanges: false }
[SynchronizedEditor] Mount effect: { isInitialized: false, initialContent: "", initialContentLength: 0 }
[SynchronizedEditor] Setting initial content: ""
[SynchronizedEditor] Render: { initialContent: "", content: "", contentLength: 0, isInitialized: true, hasUnsavedChanges: false }
[SynchronizedEditor] InitialContent change effect: { isInitialized: true, initialContent: "AI content...", currentContent: "", hasUnsavedChanges: false, willUpdate: true }
[SynchronizedEditor] Updating content from initialContent change: "AI content..."
[SynchronizedEditor] Render: { initialContent: "AI content...", content: "AI content...", contentLength: 500, isInitialized: true, hasUnsavedChanges: false }
```

## Fix Strategy

Based on the logs, we'll identify which condition is failing and fix it:

1. **If `hasUnsavedChanges` is true unexpectedly:** Fix RichTextEditor onChange
2. **If `initialContent` is not changing:** Fix form field value propagation  
3. **If update condition fails:** Adjust the condition logic
4. **If timing issue:** Add proper dependency management
