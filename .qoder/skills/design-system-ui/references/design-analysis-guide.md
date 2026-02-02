# Design Analysis Guide

Comprehensive guide for extracting design tokens from visual references.

## Color Extraction Process

### Step 1: Identify the Color Hierarchy

When analyzing a design screenshot, identify colors in this order:

1. **Primary Color** - The most prominent brand color
   - Usually appears in CTAs, links, and key interactive elements
   - Should have good contrast ratios

2. **Secondary Color** - Supporting brand color
   - Often used for less prominent actions
   - May be a desaturated version of primary

3. **Accent Color** - Highlight color
   - Used sparingly for emphasis
   - Often complementary or contrasting to primary

4. **Neutral Palette** - Grays and background colors
   - Extract at least 5-7 shades from lightest to darkest
   - Pay attention to warm vs cool undertones

5. **Semantic Colors** - Success, warning, error states
   - If not visible, derive from primary color family

### Step 2: Convert to HSL Format

Shadcn UI uses HSL format for maximum flexibility:

```
H (Hue): 0-360 degrees
S (Saturation): 0-100%
L (Lightness): 0-100%
```

Benefits of HSL:
- Easy to create color variations (adjust L for tints/shades)
- Consistent saturation across palette
- Dark mode: invert L values while keeping H and S

### Step 3: Create Color Scale

For each primary color, generate a scale:

```css
--primary-50: H S 97%;   /* Lightest */
--primary-100: H S 94%;
--primary-200: H S 86%;
--primary-300: H S 76%;
--primary-400: H S 66%;
--primary-500: H S 56%;  /* Base */
--primary-600: H S 46%;
--primary-700: H S 36%;
--primary-800: H S 26%;
--primary-900: H S 16%;  /* Darkest */
```

## Typography Analysis

### Identifying Font Families

Look for clues in the design:

1. **Headings** - Often use display/decorative fonts
   - Check for variable weight usage
   - Note if condensed or extended variants are used

2. **Body Text** - Prioritize readability
   - Usually 16-18px base size
   - Line height 1.5-1.75 for body

3. **UI Elements** - Buttons, labels, captions
   - May use different weight than body
   - Often slightly smaller (14px)

### Common Font Characteristics to Match

| Characteristic | Options |
|----------------|---------|
| **x-height** | Low (traditional) / High (modern) |
| **Stroke contrast** | Low (geometric) / High (humanist) |
| **Letter spacing** | Tight / Normal / Loose |
| **Weight range** | Limited (2-3) / Variable (many) |

### Font Pairing Suggestions

**Rule of Thumb**: Pair contrasting fonts (serif + sans) or related fonts (same family/foundry)

| Design Mood | Heading | Body |
|-------------|---------|------|
| Tech Startup | Clash Display | Plus Jakarta Sans |
| SaaS Product | Geist | Geist Mono |
| Editorial | Playfair Display | Source Serif Pro |
| E-commerce | DM Serif Display | DM Sans |
| Finance | Libre Franklin | Libre Franklin |

## Spacing System Analysis

### Identifying Base Unit

Most designs use a base unit (commonly 4px or 8px):

```
4px base: 4, 8, 12, 16, 20, 24, 32, 48, 64...
8px base: 8, 16, 24, 32, 48, 64, 96, 128...
```

### Component Spacing Patterns

Analyze these elements:
- **Button padding**: vertical / horizontal ratio (usually 1:2 or 1:3)
- **Card padding**: internal spacing
- **Section margins**: vertical spacing between sections
- **Gap values**: space between flex/grid items

## Border Radius Analysis

### Style Categories

| Pattern | Values | Design Mood |
|---------|--------|-------------|
| Sharp | 0-2px | Technical, precise |
| Subtle | 4-8px | Clean, professional |
| Rounded | 12-16px | Friendly, approachable |
| Pill | 9999px | Playful, modern |
| Mixed | Varies by component | Dynamic, interesting |

### Component-Specific Radius

```css
/* Small elements (badges, tags) */
--radius-sm: 4px;

/* Medium elements (inputs, buttons) */
--radius-md: 8px;

/* Large elements (cards, dialogs) */
--radius-lg: 12px;

/* Full round (avatars, pills) */
--radius-full: 9999px;
```

## Shadow Analysis

### Depth Levels

```css
/* Elevation 1: Subtle lift */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);

/* Elevation 2: Cards, dropdowns */
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

/* Elevation 3: Modals, popovers */
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

/* Elevation 4: Floating elements */
--shadow-xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
```

### Modern Shadow Trends

1. **Soft Shadows** - Multiple layers, low opacity
2. **Colored Shadows** - Tinted with primary color
3. **Hard Shadows** - Offset, no blur (neo-brutalism)

## Animation Characteristics

### Timing Functions

| Feel | Easing | CSS Value |
|------|--------|-----------|
| Snappy | Ease-out | cubic-bezier(0, 0, 0.2, 1) |
| Smooth | Ease-in-out | cubic-bezier(0.4, 0, 0.2, 1) |
| Bouncy | Spring | cubic-bezier(0.34, 1.56, 0.64, 1) |
| Gentle | Ease | cubic-bezier(0.25, 0.1, 0.25, 1) |

### Duration Guidelines

```css
/* Micro-interactions */
--duration-fast: 150ms;

/* Standard transitions */
--duration-normal: 200ms;

/* Complex animations */
--duration-slow: 300ms;

/* Page transitions */
--duration-slower: 500ms;
```

## Dark Mode Considerations

### Color Transformation Rules

1. **Background**: Invert but not to pure black (use gray-900)
2. **Text**: Reduce contrast slightly (gray-100 instead of white)
3. **Borders**: Often more visible in dark mode
4. **Shadows**: May need to be more pronounced or colored
5. **Primary Colors**: May need higher luminance for accessibility

### Dark Mode Pattern

```css
:root {
  --background: 0 0% 100%;      /* White */
  --foreground: 222 47% 11%;    /* Near black */
}

.dark {
  --background: 222 47% 11%;    /* Near black */
  --foreground: 0 0% 98%;       /* Off white */
}
```

## Checklist Summary

Before generating configuration:

- [ ] Primary color identified and converted to HSL
- [ ] Full neutral palette extracted (5+ shades)
- [ ] Font families identified for heading/body
- [ ] Base spacing unit determined
- [ ] Border radius pattern categorized
- [ ] Shadow style identified
- [ ] Animation feel characterized
- [ ] Dark mode colors derived
