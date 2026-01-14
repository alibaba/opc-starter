# Tailwind CSS v4 Syntax Reference

Essential syntax changes for Tailwind CSS v4 compatibility.

## Gradient Syntax

### Old v3 Syntax (Deprecated)

```html
<!-- ❌ Don't use -->
<div class="bg-gradient-to-r from-purple-500 to-pink-500"></div>
```

### New v4 Syntax (Required)

```html
<!-- ✅ Use this -->
<div class="bg-linear-to-r from-purple-500 to-pink-500"></div>
```

### Full Gradient Mapping

| v3 (Deprecated) | v4 (Use This) |
|-----------------|---------------|
| `bg-gradient-to-t` | `bg-linear-to-t` |
| `bg-gradient-to-tr` | `bg-linear-to-tr` |
| `bg-gradient-to-r` | `bg-linear-to-r` |
| `bg-gradient-to-br` | `bg-linear-to-br` |
| `bg-gradient-to-b` | `bg-linear-to-b` |
| `bg-gradient-to-bl` | `bg-linear-to-bl` |
| `bg-gradient-to-l` | `bg-linear-to-l` |
| `bg-gradient-to-tl` | `bg-linear-to-tl` |

### Additional Gradient Types in v4

```html
<!-- Radial gradients -->
<div class="bg-radial from-purple-500 to-pink-500"></div>

<!-- Conic gradients -->
<div class="bg-conic from-purple-500 via-pink-500 to-orange-500"></div>
```

## Opacity Syntax

### Old v3 Syntax (Deprecated)

```html
<!-- ❌ Don't use -->
<div class="bg-black bg-opacity-50"></div>
<div class="text-white text-opacity-75"></div>
<div class="border-gray-500 border-opacity-50"></div>
```

### New v4 Syntax (Required)

```html
<!-- ✅ Use this -->
<div class="bg-black/50"></div>
<div class="text-white/75"></div>
<div class="border-gray-500/50"></div>
```

### Full Opacity Mapping

| v3 (Deprecated) | v4 (Use This) |
|-----------------|---------------|
| `bg-opacity-*` | `bg-color/opacity` |
| `text-opacity-*` | `text-color/opacity` |
| `border-opacity-*` | `border-color/opacity` |
| `ring-opacity-*` | `ring-color/opacity` |
| `divide-opacity-*` | `divide-color/opacity` |
| `placeholder-opacity-*` | `placeholder:text-color/opacity` |

### Common Opacity Values

```html
<!-- Background opacities -->
<div class="bg-white/0"></div>      <!-- 0% -->
<div class="bg-white/5"></div>      <!-- 5% -->
<div class="bg-white/10"></div>     <!-- 10% -->
<div class="bg-white/20"></div>     <!-- 20% -->
<div class="bg-white/25"></div>     <!-- 25% -->
<div class="bg-white/30"></div>     <!-- 30% -->
<div class="bg-white/40"></div>     <!-- 40% -->
<div class="bg-white/50"></div>     <!-- 50% -->
<div class="bg-white/60"></div>     <!-- 60% -->
<div class="bg-white/70"></div>     <!-- 70% -->
<div class="bg-white/75"></div>     <!-- 75% -->
<div class="bg-white/80"></div>     <!-- 80% -->
<div class="bg-white/90"></div>     <!-- 90% -->
<div class="bg-white/95"></div>     <!-- 95% -->
<div class="bg-white/100"></div>    <!-- 100% -->

<!-- Arbitrary values -->
<div class="bg-white/[0.33]"></div> <!-- 33% -->
```

## CSS Import Syntax

### Old v3 Syntax

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### New v4 Syntax

```css
@import "tailwindcss";
```

Or with layers:

```css
@import "tailwindcss/theme" layer(theme);
@import "tailwindcss/preflight" layer(base);
@import "tailwindcss/utilities" layer(utilities);
```

## Configuration Changes

### Config File (v4 uses CSS-first approach)

```css
/* globals.css */
@import "tailwindcss";

@theme {
  --color-primary: oklch(65% 0.25 260);
  --color-secondary: oklch(70% 0.15 200);
  
  --font-sans: "Plus Jakarta Sans", system-ui, sans-serif;
  --font-display: "Clash Display", system-ui, sans-serif;
  
  --radius-lg: 0.75rem;
  --radius-md: 0.5rem;
  --radius-sm: 0.25rem;
}
```

### Optional tailwind.config.js

Still supported for complex configurations:

```javascript
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Custom extensions
    },
  },
  plugins: [],
};
```

## Color Syntax

### OKLCH Colors (Recommended in v4)

```css
@theme {
  /* OKLCH provides better perceptual uniformity */
  --color-primary: oklch(65% 0.25 260);
  
  /* Still works: HSL */
  --color-secondary: hsl(220 80% 60%);
  
  /* Still works: Hex */
  --color-accent: #ff6b6b;
}
```

### HSL in CSS Variables (Shadcn Pattern)

```css
:root {
  /* Store without hsl() wrapper for flexibility */
  --primary: 262 83% 58%;
  --primary-foreground: 0 0% 100%;
}

/* Use with hsl() in Tailwind config */
.example {
  background: hsl(var(--primary));
}
```

## Container Queries (New in v4)

```html
<!-- Define container -->
<div class="@container">
  <!-- Use container-based breakpoints -->
  <div class="@sm:flex @md:grid @lg:hidden">
    Content adapts to container, not viewport
  </div>
</div>
```

## Logical Properties

```html
<!-- Inline (horizontal in LTR) -->
<div class="ps-4 pe-4">Padding start/end</div>
<div class="ms-4 me-4">Margin start/end</div>

<!-- Block (vertical) -->
<div class="pbs-4 pbe-4">Padding block start/end</div>
```

## Modern Pseudo-Selectors

```html
<!-- has() selector -->
<div class="has-[input:focus]:ring-2">
  <input />
</div>

<!-- :not() selector -->
<div class="not-first:mt-4">
  Margin top except first
</div>
```

## Variable Fonts

```css
@theme {
  --font-display: "Inter Variable", sans-serif;
}
```

```html
<!-- Font weight with variable fonts -->
<h1 class="font-display font-[450]">Variable weight</h1>
```

## Migration Checklist

When generating new code:

- [ ] Use `bg-linear-to-*` instead of `bg-gradient-to-*`
- [ ] Use `color/opacity` instead of `*-opacity-*` classes
- [ ] Use `@import "tailwindcss"` in CSS
- [ ] Consider OKLCH for color definitions
- [ ] Use CSS-first `@theme` when possible
- [ ] Leverage new features: container queries, has(), etc.
