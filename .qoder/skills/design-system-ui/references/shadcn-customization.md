# Shadcn UI Customization Guide

Advanced theming and customization for Shadcn UI components.

## Understanding Shadcn Architecture

Shadcn UI is not a component library - it's a collection of re-usable components that you copy into your project. This means:

1. **Full ownership** - Components live in your codebase
2. **Complete customization** - Modify anything directly
3. **No version conflicts** - No external dependencies to manage
4. **Design system flexibility** - Adapt to any design system

## Theme Configuration

### components.json Structure

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

### Style Options

| Style | Description |
|-------|-------------|
| `new-york` | Smaller, refined components with shadows |
| `default` | Larger, flatter components |

## CSS Variables Setup

### Complete Theme Variables

```css
:root {
  /* Background colors */
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  
  /* Card surface */
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  
  /* Popover surface */
  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;
  
  /* Primary action color */
  --primary: 262 83% 58%;
  --primary-foreground: 0 0% 100%;
  
  /* Secondary action color */
  --secondary: 220 14% 96%;
  --secondary-foreground: 220 9% 46%;
  
  /* Muted elements */
  --muted: 220 14% 96%;
  --muted-foreground: 220 9% 46%;
  
  /* Accent elements */
  --accent: 220 14% 96%;
  --accent-foreground: 222 47% 11%;
  
  /* Destructive actions */
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  
  /* Borders and inputs */
  --border: 220 13% 91%;
  --input: 220 13% 91%;
  --ring: 262 83% 58%;
  
  /* Border radius */
  --radius: 0.5rem;
  
  /* Chart colors (optional) */
  --chart-1: 12 76% 61%;
  --chart-2: 173 58% 39%;
  --chart-3: 197 37% 24%;
  --chart-4: 43 74% 66%;
  --chart-5: 27 87% 67%;
}

.dark {
  --background: 222 47% 11%;
  --foreground: 0 0% 98%;
  
  --card: 222 47% 11%;
  --card-foreground: 0 0% 98%;
  
  --popover: 222 47% 11%;
  --popover-foreground: 0 0% 98%;
  
  --primary: 262 83% 68%;
  --primary-foreground: 222 47% 11%;
  
  --secondary: 217 33% 17%;
  --secondary-foreground: 0 0% 98%;
  
  --muted: 217 33% 17%;
  --muted-foreground: 215 20% 65%;
  
  --accent: 217 33% 17%;
  --accent-foreground: 0 0% 98%;
  
  --destructive: 0 62% 30%;
  --destructive-foreground: 0 0% 98%;
  
  --border: 217 33% 17%;
  --input: 217 33% 17%;
  --ring: 262 83% 58%;
}
```

## Component Customization Examples

### Button Variants

```tsx
// components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Custom variants
        gradient:
          "bg-linear-to-r from-primary to-accent text-white shadow-lg hover:opacity-90",
        glow:
          "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.7)]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### Card Enhancements

```tsx
// Enhanced card with hover effects
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      // Hover effects
      "transition-all duration-200",
      "hover:shadow-lg hover:-translate-y-0.5",
      // Border glow on hover
      "hover:border-primary/20",
      className
    )}
    {...props}
  />
));
```

### Input with Focus Effects

```tsx
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm",
          // Transitions
          "transition-all duration-200",
          // Focus states
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "focus-visible:border-primary",
          // Custom focus glow
          "focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]",
          // Placeholder styling
          "placeholder:text-muted-foreground",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
```

## Adding Custom Components

### Glassmorphism Card

```tsx
// components/ui/glass-card.tsx
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function GlassCard({ className, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl",
        "bg-white/10 dark:bg-white/5",
        "backdrop-blur-lg",
        "border border-white/20",
        "shadow-xl",
        className
      )}
      {...props}
    />
  );
}
```

### Gradient Border

```tsx
// components/ui/gradient-border.tsx
export function GradientBorder({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="relative p-[1px] rounded-lg bg-linear-to-r from-primary via-accent to-primary">
      <div
        className={cn(
          "bg-background rounded-lg",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
```

## Animation Patterns

### Micro-interactions

```tsx
// Hover scale effect
<button className="transition-transform hover:scale-105 active:scale-95">
  Click me
</button>

// Fade in on mount
<div className="animate-in fade-in duration-500">
  Content
</div>

// Slide up on mount
<div className="animate-in slide-in-from-bottom-4 duration-500">
  Content
</div>

// Staggered animation
{items.map((item, index) => (
  <div
    key={item.id}
    className="animate-in fade-in slide-in-from-bottom-4"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    {item.content}
  </div>
))}
```

### Loading States

```tsx
// Skeleton with shimmer
<div className="animate-pulse bg-muted rounded-md h-4 w-full" />

// Spinner
<div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
```

## Color Scheme Presets

### Tech/SaaS

```css
:root {
  --primary: 221 83% 53%;      /* Blue */
  --accent: 262 83% 58%;       /* Purple */
  --background: 0 0% 100%;
}
```

### E-commerce

```css
:root {
  --primary: 142 76% 36%;      /* Green */
  --accent: 38 92% 50%;        /* Orange */
  --background: 0 0% 100%;
}
```

### Creative/Portfolio

```css
:root {
  --primary: 340 82% 52%;      /* Pink */
  --accent: 262 83% 58%;       /* Purple */
  --background: 240 10% 4%;    /* Near black */
}
```

### Finance

```css
:root {
  --primary: 215 16% 47%;      /* Steel gray */
  --accent: 142 76% 36%;       /* Green */
  --background: 0 0% 100%;
}
```

## Best Practices

### 1. Consistent Spacing

Use Tailwind's spacing scale consistently:
- `gap-2` for tight groupings
- `gap-4` for related elements
- `gap-6` or `gap-8` for sections

### 2. Typography Hierarchy

```tsx
<h1 className="text-4xl font-bold tracking-tight">Main Title</h1>
<h2 className="text-2xl font-semibold">Section Title</h2>
<h3 className="text-xl font-medium">Subsection</h3>
<p className="text-base text-muted-foreground">Body text</p>
<span className="text-sm text-muted-foreground">Caption</span>
```

### 3. Interactive States

Always include:
- `:hover` - Visual feedback
- `:focus-visible` - Keyboard navigation
- `:active` - Press feedback
- `:disabled` - Unavailable state

### 4. Dark Mode Considerations

- Test all color combinations in both modes
- Ensure sufficient contrast (WCAG AA minimum)
- Adjust shadows (often need to be more subtle in dark mode)
- Consider using ring instead of shadow for focus states
