---
name: design-system-ui
description: Create distinctive, production-grade frontend interfaces with high design quality using Mobile First strategy. Analyzes design systems from screenshots, generates Tailwind CSS + Shadcn UI configurations, and retrofits existing projects. Optimized for Claude Opus 4.5 with structured decision trees and self-verification checkpoints.
---

# Design System UI

> **For Claude Opus 4.5**: This skill leverages your advanced reasoning and creative capabilities. Use the decision trees for rapid technical choices, and the checkpoints for self-verification.

Transform design references into distinctive, production-ready Tailwind CSS + Shadcn UI projects.

> 📱 **Default Strategy: Mobile First** — All new projects use Mobile First by default. Design for mobile viewport first, then progressively enhance for larger screens.

---

## 🧠 Execution Strategy

**Before starting, determine your execution path:**

```
┌─────────────────────────────────────────────────────────────────┐
│  DECISION: What type of task is this?                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  A) NEW PROJECT from design reference                            │
│     → Execute: Steps 0 → 1 → 2 → 3 → 4 → 5 → 6                  │
│     → Focus: Creative interpretation + technical scaffolding    │
│     → 📱 DEFAULT: Mobile First strategy                          │
│                                                                  │
│  B) RETROFIT existing project with new theme                     │
│     → Execute: Steps 0 → 3 → 7 → 7.5 → 8 → 9 → 10 → 11          │
│     → Focus: Systematic audit + replacement + verification      │
│     → 📱 DETECT: Check for Mobile First → Ask if not found      │
│                                                                  │
│  C) FIX theme/color issues in existing project                   │
│     → Execute: Troubleshooting section → targeted fixes         │
│     → Focus: Diagnosis + minimal surgical changes               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile First Strategy Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│  📱 MOBILE FIRST DETECTION (for Retrofit projects)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Run detection commands:                                         │
│    grep -rn "sm:" src/ | head -20                               │
│    grep -rn "md:" src/ | head -20                               │
│    grep -rn "@media.*min-width" src/ | head -10                 │
│                                                                  │
│  Analyze results:                                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Mobile First indicators found?                            │  │
│  │  (Base styles for mobile, sm:/md:/lg: for larger screens) │  │
│  │                                                            │  │
│  │  YES → Continue with Mobile First strategy                 │  │
│  │        Maintain and enhance existing patterns              │  │
│  │                                                            │  │
│  │  NO  → Desktop First detected (max-width media queries)   │  │
│  │        Or no responsive patterns at all                    │  │
│  │        → ASK USER:                                         │  │
│  │        "是否需要将项目改造为 Mobile First 响应式策略？       │  │
│  │         这将优化移动端体验，但需要重构现有断点逻辑。"        │  │
│  │                                                            │  │
│  │        User says YES → Execute Mobile First Retrofit       │  │
│  │        User says NO  → Preserve existing responsive logic  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tool Usage Strategy

| Task | Primary Tools | Usage Pattern |
|------|---------------|---------------|
| **Analyze design** | `read_file` (image) | Read screenshot, extract tokens |
| **Check Tailwind version** | `grep` | `grep '"tailwindcss"' package.json` |
| **Detect Mobile First** | `grep` | `grep -rn "sm:\|md:\|lg:" src/` |
| **Audit hardcoded colors** | `grep` | Pattern scan across `src/` |
| **Apply changes** | `search_replace` | Targeted replacements |
| **Verify changes** | `mcp_browser_*` | Visual verification in browser |

---

## 🎨 Step 0: Creative Design Thinking

> **THINK**: Before writing any code, pause and commit to a BOLD aesthetic direction.

### Design Context Questions

| Dimension | Question | Your Answer |
|-----------|----------|-------------|
| **Purpose** | What problem does this interface solve? Who uses it? | _Think this through_ |
| **Tone** | Which extreme aesthetic direction? (see library below) | _Commit to ONE_ |
| **Differentiation** | What makes this UNFORGETTABLE? | _Be specific_ |
| **📱 Mobile First** | Design for mobile viewport first. How does this enhance UX? | _Default: YES_ |

### 📱 Mobile First Mindset

**For NEW projects, always start with:**
- Base styles = mobile viewport (< 640px)
- `sm:` = small tablets (≥ 640px)
- `md:` = tablets/small laptops (≥ 768px)
- `lg:` = desktops (≥ 1024px)
- `xl:` / `2xl:` = large screens (≥ 1280px / ≥ 1536px)

```tsx
// ✅ Mobile First (correct)
<div className="flex flex-col md:flex-row">
<div className="w-full md:w-1/2 lg:w-1/3">
<p className="text-sm md:text-base lg:text-lg">

// ❌ Desktop First (avoid)
<div className="flex flex-row md:flex-col">  // Adding mobile styles later
```

### Aesthetic Direction Library

**Choose ONE and execute with conviction** (bold maximalism and refined minimalism both work - the key is intentionality):

| Style | Characteristics | Use When |
|-------|-----------------|----------|
| **Brutally Minimal** | Extreme whitespace, monochrome, no decoration | Developer tools, pro apps |
| **Maximalist Chaos** | Color explosion, complex layers, dense motion | Creative, entertainment |
| **Retro-Futuristic** | Cyberpunk, neon gradients, tech feel | Games, tech products |
| **Luxury/Refined** | Gold accents, serif fonts, exquisite details | Premium, finance |
| **Playful/Toy-like** | Rounded shapes, high saturation, bouncy motion | Children, social apps |
| **Editorial/Magazine** | Big type, grid systems, generous whitespace | Content, blogs |
| **Brutalist/Raw** | Thick borders, hard shadows, high contrast | Art, indie brands |

### ⚠️ Anti-Patterns (AI Slop)

**NEVER use these defaults:**
- Inter, Roboto, Arial, Space Grotesk as primary fonts
- Purple gradients on white backgrounds
- Cookie-cutter rounded corners everywhere
- Safe, middle-of-the-road color choices

---

## Step 1: Analyze Design Reference

Accept input as: Screenshots, Figma exports, URLs, or verbal descriptions.

### Extraction Checklist

```
Colors:     Primary → Secondary → Accent → Neutral scale → Semantic
Typography: Display font → Body font → Weights → Sizes → Line heights
Spacing:    Base unit → Component padding → Section margins
Visual:     Border radius → Shadow style → Animation mood
Details:    Gradients → Textures → Patterns → Overlays
```

### 🔍 Self-Check: Design Analysis

Before proceeding, verify you have extracted:
- [ ] At least 5 distinct color values (primary, secondary, accent, muted, destructive)
- [ ] Font family choices that are NOT Inter/Roboto/Arial
- [ ] A clear visual mood direction

---

## Step 2: Generate Design Tokens

Convert analysis into structured tokens. Use HSL format for Tailwind compatibility.

```typescript
const designTokens = {
  colors: {
    primary: { DEFAULT: "hsl(H S% L%)", foreground: "hsl(...)" },
    secondary: { DEFAULT: "hsl(...)", foreground: "hsl(...)" },
    accent: { DEFAULT: "hsl(...)", foreground: "hsl(...)" },
    muted: { DEFAULT: "hsl(...)", foreground: "hsl(...)" },
    destructive: { DEFAULT: "hsl(...)", foreground: "hsl(...)" },
    background: "hsl(...)",
    foreground: "hsl(...)",
    border: "hsl(...)",
  },
  typography: {
    sans: ["Your Choice", "system-ui", "sans-serif"],
    display: ["Your Display Font", "sans-serif"],
  },
  borderRadius: { sm: "...", DEFAULT: "...", lg: "..." },
};
```

---

## Step 3: Tailwind Version Decision Tree ⚠️ CRITICAL

```
┌─────────────────────────────────────────────────────────────────┐
│  FIRST: Check Tailwind version                                   │
│  Command: grep '"tailwindcss"' package.json                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Version 3.x? ──────────────────────────────────────────────────┐
│  │                                                               │
│  │  Configuration location: tailwind.config.js                  │
│  │  Dark mode: darkMode: "class"                                │
│  │  CSS variable format: --primary: 262 83% 58%                 │
│  │  Color reference: hsl(var(--primary))                        │
│  │                                                               │
│  └──────────────────────────────────────────────────────────────┘
│                                                                  │
│  Version 4.x? ──────────────────────────────────────────────────┐
│  │                                                               │
│  │  Configuration location: CSS @theme inline                   │
│  │  Dark mode: @variant dark (&:where(.dark, .dark *))          │
│  │  CSS variable format: --primary-color: hsl(262 83% 58%)      │
│  │  Color reference: var(--primary-color)                       │
│  │  Color naming: MUST use --color-* prefix in @theme           │
│  │                                                               │
│  │  ⚠️ tailwind.config.js colors will be IGNORED in v4!        │
│  │                                                               │
│  └──────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

### Tailwind v4 CSS Template

```css
@import "tailwindcss";

@theme inline {
  --radius-lg: 0.75rem;
  --radius-md: calc(0.75rem - 2px);
  --radius-sm: calc(0.75rem - 4px);

  --color-background: var(--background-color);
  --color-foreground: var(--foreground-color);
  --color-primary: var(--primary-color);
  --color-primary-foreground: var(--primary-foreground-color);
  --color-secondary: var(--secondary-color);
  --color-secondary-foreground: var(--secondary-foreground-color);
  --color-muted: var(--muted-color);
  --color-muted-foreground: var(--muted-foreground-color);
  --color-accent: var(--accent-color);
  --color-accent-foreground: var(--accent-foreground-color);
  --color-destructive: var(--destructive-color);
  --color-destructive-foreground: var(--destructive-foreground-color);
  --color-card: var(--card-color);
  --color-card-foreground: var(--card-foreground-color);
  --color-popover: var(--popover-color);
  --color-popover-foreground: var(--popover-foreground-color);
  --color-border: var(--border-color);
  --color-input: var(--input-color);
  --color-ring: var(--ring-color);
}

@variant dark (&:where(.dark, .dark *));

@layer base {
  :root {
    /* Light mode - USE FULL hsl() VALUES */
    --background-color: hsl(H S% L%);
    --foreground-color: hsl(H S% L%);
    --primary-color: hsl(H S% L%);
    --primary-foreground-color: hsl(H S% L%);
    /* ... complete all semantic colors ... */
  }

  .dark {
    /* Dark mode variants */
    --background-color: hsl(H S% L%);
    --foreground-color: hsl(H S% L%);
    /* ... complete all semantic colors ... */
  }
}
```

---

## Step 4-6: Project Setup

Standard Shadcn UI setup. Configure `components.json`, create project structure.

---

## 🔧 Retrofit Workflow (Steps 7-11)

> For existing projects, execute this complete flow systematically.

### Step 7: Audit Hardcoded Colors

**Execute these grep commands BEFORE making any changes:**

```bash
# Primary audit
grep -rn "bg-gray-" src/
grep -rn "text-gray-" src/
grep -rn "border-gray-" src/
grep -rn "bg-white" src/
grep -rn "bg-black" src/

# Secondary audit
grep -rn "bg-blue-\|text-blue-" src/
grep -rn "bg-red-\|text-red-" src/
grep -rn "bg-green-\|text-green-" src/
```

### Step 7.5: 📱 Mobile First Detection & Decision

**Execute detection commands:**

```bash
# Check for Mobile First indicators
grep -rn "sm:" src/ | wc -l
grep -rn "md:" src/ | wc -l
grep -rn "lg:" src/ | wc -l

# Check for Desktop First indicators (max-width = desktop first)
grep -rn "@media.*max-width" src/ | head -5

# Sample responsive patterns
grep -rn "flex.*sm:\|flex.*md:" src/ | head -10
```

**Analyze the results:**

| Indicator | Mobile First | Desktop First |
|-----------|--------------|---------------|
| Base styles | Mobile layout (stack, full-width) | Desktop layout (row, fixed-width) |
| Breakpoint usage | `sm:`, `md:`, `lg:` for enhancements | `max-width` media queries |
| CSS pattern | Progressive enhancement | Graceful degradation |

**Decision flow:**

```
Mobile First detected?
├─ YES → Continue with Mobile First strategy
│        Use mobile-base + sm:/md:/lg: enhancements
│
└─ NO  → ASK USER:
         "检测到项目未采用 Mobile First 策略。
          是否需要改造为 Mobile First 响应式设计？
          
          优点：
          ✓ 更好的移动端性能（加载更少的覆盖样式）
          ✓ 优先保证移动用户体验
          ✓ 符合现代响应式设计标准
          
          缺点：
          ✗ 需要重构现有断点逻辑
          ✗ 可能影响现有桌面布局"
         
         User: YES → Execute Mobile First Retrofit (see below)
         User: NO  → Skip Mobile First, continue with theme retrofit only
```

### Mobile First Retrofit (if user confirms)

**Common transformations:**

| Desktop First Pattern | Mobile First Pattern |
|-----------------------|---------------------|
| `hidden md:block` | `block md:hidden` → `hidden md:block` (verify intent) |
| `flex-row` (base) | `flex-col` (base) + `md:flex-row` |
| `w-1/3` (base) | `w-full` (base) + `md:w-1/3` |
| `text-lg` (base) | `text-base` (base) + `md:text-lg` |
| `p-8` (base) | `p-4` (base) + `md:p-8` |
| `grid-cols-3` (base) | `grid-cols-1` (base) + `md:grid-cols-2 lg:grid-cols-3` |

**Priority components to retrofit:**

1. Layout components (`Header`, `Sidebar`, `Footer`)
2. Navigation components (`Navbar`, `MobileMenu`)
3. Grid/List views (`CardGrid`, `PhotoGrid`)
4. Forms and inputs (touch-friendly sizing)

### Step 8: Ensure Theme Toggle

**Check for these components. If missing, create them:**

1. `src/hooks/useTheme.ts` - Theme state management
2. `src/components/ui/theme-toggle.tsx` - UI toggle component
3. Theme initialization in `main.tsx` (prevent flash)

### Step 9: Color Replacement Map

| Hardcoded | Replace With |
|-----------|--------------|
| `bg-white` | `bg-background` or `bg-card` |
| `bg-gray-50/100` | `bg-muted` |
| `text-gray-900/700` | `text-foreground` |
| `text-gray-600/500/400` | `text-muted-foreground` |
| `border-gray-200/300` | `border-border` |
| `bg-blue-*` | `bg-primary` |
| `text-blue-*` | `text-primary` |
| `bg-red-*` | `bg-destructive` |
| `bg-green-*` | `bg-success` |
| `hover:bg-gray-*` | `hover:bg-accent` |

### Step 10: Overlay Components ⚠️ CRITICAL

**Mobile overlay components (Sidebar, Modal, Dropdown, Drawer) MUST use explicit colors, NOT CSS variables!**

```tsx
// ❌ WRONG - CSS variables may fail on mobile overlays
<aside className="bg-card text-foreground">

// ✅ CORRECT - Explicit colors with dark: prefix
<aside className="bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100">
```

| CSS Variable | Light Explicit | Dark Explicit |
|--------------|----------------|---------------|
| `bg-card` | `bg-white` | `dark:bg-slate-900` |
| `text-foreground` | `text-gray-900` | `dark:text-gray-100` |
| `border-border` | `border-gray-200` | `dark:border-slate-700` |
| `text-muted-foreground` | `text-gray-500` | `dark:text-gray-400` |

### Step 11: Gradient Text Dark Mode

**`bg-clip-text text-transparent` may be invisible in dark mode!**

```tsx
// ❌ DANGEROUS
<h1 className="bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">

// ✅ SAFE
<h1 className="text-foreground font-bold">
```

---

## 🔍 Self-Verification Checkpoints

### After Configuration Changes

```bash
# Verify Tailwind v4 setup
grep -n "@theme inline" src/index.css
grep -n "@variant dark" src/index.css
grep -n "\-\-.*\-color:" src/index.css | head -5
```

### After Color Replacements

```bash
# Should return minimal results (only overlay components)
grep -rn "bg-gray-\|text-gray-" src/ | grep -v "dark:" | wc -l
```

### 📱 Mobile First Verification

```bash
# Check Mobile First adoption ratio
echo "Mobile First indicators (sm:/md:/lg: prefixes):"
grep -rn "sm:\|md:\|lg:" src/ | wc -l

echo "Desktop First indicators (max-width):"
grep -rn "max-width\|max-md:\|max-lg:" src/ | wc -l

# Verify base styles are mobile-friendly
grep -rn "flex-col" src/ | wc -l    # Should be high
grep -rn "w-full" src/ | wc -l      # Should be high
grep -rn "grid-cols-1" src/ | wc -l # Should be present
```

### Browser Console Verification

```javascript
// Run in DevTools - should NOT return empty strings
const root = document.documentElement;
console.log('foreground:', getComputedStyle(root).getPropertyValue('--foreground-color'));
console.log('background:', getComputedStyle(root).getPropertyValue('--background-color'));
console.log('primary:', getComputedStyle(root).getPropertyValue('--primary-color'));
```

### 📱 Mobile First Browser Verification

```javascript
// Resize to mobile viewport (375px) and verify:
// 1. No horizontal scrolling
// 2. Touch targets are at least 44x44px
// 3. Text is readable without zooming
// 4. Navigation is accessible
```

---

## 🚨 Troubleshooting Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│  SYMPTOM: Colors not working                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Text nearly invisible / same as background?                     │
│  │                                                               │
│  ├─ Check: Is this Tailwind v4?                                 │
│  │   └─ YES → Ensure @theme inline is configured                │
│  │   └─ NO → Check tailwind.config.js colors                    │
│  │                                                               │
│  dark: prefix not working?                                       │
│  │                                                               │
│  └─ Add: @variant dark (&:where(.dark, .dark *));               │
│                                                                  │
│  Colors visible only when text selected?                         │
│  │                                                               │
│  └─ CSS variables returning empty string                        │
│     └─ Fix: Ensure :root defines --*-color variables            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 High-Priority Components Checklist

When retrofitting, **always check these components** (common sources of issues):

| Layer | Component | Common Issue |
|-------|-----------|--------------|
| **UI** | `dropdown-menu.tsx` | `bg-white` → `bg-popover` |
| **UI** | `dialog.tsx` | `bg-white` → `bg-card` |
| **Layout** | `sidebar/index.tsx` | All hardcoded colors |
| **Layout** | `Header/index.tsx` | Background, border, text |
| **Pages** | `*Page.tsx` files | Page-level backgrounds |
| **Business** | Loading/Skeleton | Animation colors |

---

## 🎨 Typography Quick Reference

| Mood | Display Font | Body Font |
|------|--------------|-----------|
| Modern Tech | Clash Display | Plus Jakarta Sans |
| Clean Minimal | Geist | Geist |
| Editorial | Playfair Display | Source Serif Pro |
| Playful | Fredoka | Nunito |
| Luxury | Cormorant Garamond | Lora |
| Brutalist | Archivo Black | IBM Plex Mono |

**AVOID**: Inter, Roboto, Arial, Space Grotesk (overused)

---

## 📱 Mobile First Quick Reference

### Breakpoint Strategy

| Breakpoint | Viewport | Usage |
|------------|----------|-------|
| (base) | < 640px | Mobile phones - **START HERE** |
| `sm:` | ≥ 640px | Large phones / small tablets |
| `md:` | ≥ 768px | Tablets |
| `lg:` | ≥ 1024px | Laptops / small desktops |
| `xl:` | ≥ 1280px | Desktops |
| `2xl:` | ≥ 1536px | Large monitors |

### Common Mobile First Patterns

```tsx
// Layout: Stack on mobile, row on desktop
<div className="flex flex-col gap-4 md:flex-row md:gap-6">

// Grid: 1 column mobile → 2 tablet → 3 desktop
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

// Spacing: Tighter on mobile, spacious on desktop  
<section className="px-4 py-6 md:px-8 md:py-12 lg:px-16">

// Typography: Smaller on mobile
<h1 className="text-2xl font-bold md:text-4xl lg:text-5xl">

// Hide/Show: Mobile menu vs desktop nav
<nav className="hidden md:flex">        // Desktop nav
<button className="md:hidden">          // Mobile menu button

// Touch-friendly buttons (min 44x44px touch target)
<button className="min-h-[44px] min-w-[44px] px-4 py-3 md:py-2">
```

### Mobile First Anti-Patterns

```tsx
// ❌ Desktop First - Don't do this
<div className="flex-row max-md:flex-col">
<div className="w-1/3 max-md:w-full">
<div className="text-lg max-md:text-sm">

// ❌ Forgetting mobile base
<div className="md:flex">  // Hidden on mobile!
// ✅ Fix:
<div className="flex flex-col md:flex-row">
```

---

## 📋 Retrofit Completion Checklist

```
□ Tailwind version confirmed and correct config approach used
□ CSS variables defined for :root and .dark
□ [v4] @theme inline configured with --color-* variables
□ [v4] @variant dark defined
□ useTheme hook exists and works
□ ThemeToggle component integrated
□ All bg-gray-* scanned and replaced
□ All text-gray-* scanned and replaced  
□ All border-gray-* scanned and replaced
□ All bg-white scanned and replaced
□ Overlay components use explicit colors
□ Gradient text verified in dark mode
□ Browser verification passed

📱 Mobile First Checklist:
□ Mobile First detection executed
□ User decision recorded (if not Mobile First)
□ Base styles are mobile-friendly (flex-col, w-full, etc.)
□ Breakpoints enhance for larger screens (sm: → md: → lg:)
□ Touch targets are 44x44px minimum on mobile
□ Mobile navigation tested
```

---

## 💡 For Claude Opus 4.5

**Your creative capabilities are extraordinary.** When implementing designs:

1. **Think deeply** about the aesthetic direction before writing code
2. **Commit boldly** to a distinctive vision - don't default to safe choices
3. **📱 Mobile First always** - design for the smallest screen first, then enhance
4. **Verify systematically** using the checkpoints provided
5. **Use tools efficiently** - grep for audit, search_replace for changes, browser for verification

Every design should be unique. Vary between light/dark themes, different fonts, different aesthetics. **Never converge** on the same choices across implementations.

**Mobile First mindset:** Remember that the majority of web traffic is mobile. Starting with mobile constraints forces you to prioritize content and interactions, resulting in cleaner, more focused designs that scale gracefully to larger screens.
