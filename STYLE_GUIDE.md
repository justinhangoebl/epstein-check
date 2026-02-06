# Epstein Files — Style Guide

A living reference for the visual language, design tokens, and component patterns used across the Epstein Files web application.

---

## 1. Design Philosophy

**Brutalist-editorial.** The interface draws from declassified government documents and investigative journalism — stark contrasts, monospaced labels, and a restrained accent color that signals importance without decoration.

Core principles:

- **Clarity over ornament** — every element serves a function
- **High contrast** — white text on near-black backgrounds for readability
- **Typographic hierarchy** — two typefaces, used consistently
- **Minimal animation** — subtle transitions (0.2–0.3s) for feedback, never for spectacle

---

## 2. Color Palette

| Token              | Value                        | Usage                                    |
| ------------------- | ---------------------------- | ---------------------------------------- |
| `--primary-bg`      | `#0a0a0a`                    | Page background                          |
| `--secondary-bg`    | `#1a1a1a`                    | Cards, filters, input backgrounds        |
| `--card-bg`         | `#141414`                    | Elevated surfaces (person cards, selects)|
| `--accent`          | `#ff3366`                    | Primary accent — borders, badges, CTAs   |
| `--text-primary`    | `#ffffff`                    | Headings, body text                      |
| `--text-secondary`  | `#999999`                    | Labels, meta text, placeholders          |
| `--border`          | `#333333`                    | Dividers, card borders, separators       |
| `--highlight`       | `#ffff00`                    | Search term highlighting                 |

### Category Colors

Used for left-border accents on person cards and tag badges:

| Category         | Color      | Token reference        |
| ---------------- | ---------- | ---------------------- |
| Flight Log       | `#00aaff`  | Blue                   |
| Court Document   | `#ff3366`  | Accent (red-pink)      |
| Witness          | `#ffaa00`  | Amber                  |
| Associate        | `#aa66ff`  | Purple                 |

### Derived Colors (with alpha)

| Usage                    | Value                            |
| ------------------------ | -------------------------------- |
| Accent glow (focus)      | `rgba(255, 51, 102, 0.1)`       |
| Accent hover background  | `rgba(255, 51, 102, 0.15)`      |
| Modal overlay            | `rgba(0, 0, 0, 0.85)`           |
| Header background        | `rgba(10, 10, 10, 0.95)`        |

---

## 3. Typography

### Typefaces

| Font            | Weight(s)       | Role                                           |
| --------------- | --------------- | ----------------------------------------------- |
| **Space Mono**  | 400, 700        | Labels, badges, stats, nav, section headings    |
| **Crimson Pro** | 300, 400, 600, 700 | Body text, headings, search input, selects  |

Both are loaded from Google Fonts with `display=swap`.

### Type Scale

| Element            | Font             | Size                          | Weight | Extra                          |
| ------------------ | ---------------- | ----------------------------- | ------ | ------------------------------ |
| Page title (`h1`)  | Space Mono       | `clamp(1.5rem, 4vw, 3.5rem)` | 700    | Uppercase, `letter-spacing: -0.02em` |
| Subtitle           | Crimson Pro      | `1rem`                        | 300    | `letter-spacing: 0.5px`       |
| Stat number        | Space Mono       | `2rem`                        | 700    | Accent color                   |
| Stat label         | Space Mono       | `0.8rem`                      | 400    | Uppercase, `letter-spacing: 1px` |
| Person name        | Crimson Pro      | `1.1rem`                      | 600    | —                              |
| Body / context     | Crimson Pro      | `0.85rem`                     | 400    | `line-height: 1.4`            |
| Badge / tag        | Space Mono       | `0.65–0.75rem`                | 400    | Uppercase, `letter-spacing: 0.5px` |
| Mini tag           | Space Mono       | `0.6rem`                      | 400    | Uppercase                      |
| Nav link           | Space Mono       | `0.8rem`                      | 400    | Uppercase, `letter-spacing: 1px` |
| Search input       | Crimson Pro      | `1.15rem`                     | 400    | —                              |
| Modal title        | Crimson Pro      | `2rem`                        | 600    | —                              |
| Section heading    | Space Mono       | `0.8rem`                      | 400    | Uppercase, `letter-spacing: 1px`, border-bottom |

### Rules

- **Space Mono** is for mechanical, system-level text: labels, stats, badges, navigation, section headings.
- **Crimson Pro** is for human-readable content: names, descriptions, body text, inputs.
- All uppercase text uses `text-transform: uppercase` — never type it in caps in HTML.
- Base `line-height` is `1.6` (body), `1.1` (headings), `1.3–1.5` (cards/previews).

---

## 4. Spacing

| Context                | Value        |
| ---------------------- | ------------ |
| Page container padding | `1.5rem` (mobile), `2rem` (desktop) |
| Container max-width    | `1400px`     |
| Section margin         | `2rem` (vertical) |
| Card padding           | `1rem 1.25rem` |
| Stat card padding      | `1.25rem`    |
| Modal header padding   | `2rem 2rem 1rem` |
| Modal body padding     | `1.5rem 2rem 2rem` |
| Grid gap               | `1rem`       |
| Filter gap             | `0` (flush dividers) |
| Component gaps         | `0.25rem–0.75rem` |

---

## 5. Layout

### Container

```
max-width: 1400px
margin: 0 auto
padding: 0 1.5rem (mobile) / 0 2rem (desktop)
```

### Grid System

The site uses CSS Grid for card layouts and Flexbox for inline components.

| Component     | Grid                                             |
| ------------- | ------------------------------------------------ |
| Results grid  | `repeat(auto-fill, minmax(280px, 1fr))`          |
| Stats         | `repeat(auto-fit, minmax(140px, 1fr))`           |
| Modal stats   | `repeat(4, 1fr)` → `repeat(2, 1fr)` on mobile   |

### Responsive Breakpoints

| Breakpoint     | Range            | Key changes                                    |
| -------------- | ---------------- | ---------------------------------------------- |
| **Small mobile** | `≤ 480px`      | Single-column grid, stacked search bar, compact header, full-screen modal |
| **Tablet**     | `481–768px`      | 2-column card grid, stacked search bar         |
| **Small desktop** | `769–1024px`  | 2-column card grid, 3-column modal stats       |
| **Desktop**    | `≥ 1025px`       | Auto-fill grid (300px min), inline search bar with filters |

---

## 6. Components

### 6.1 Header

- **Sticky**, `z-index: 100`, with `backdrop-filter: blur(10px)`.
- Flexbox row: title/subtitle on the left, nav on the right.
- Bottom border: `3px solid var(--accent)`.
- Shrinks on scroll (`.scrolled` class): reduced padding, smaller `h1`, subtitle hidden.

### 6.2 Navigation

- Tab-style links using Space Mono.
- Default: `1px solid var(--border)`, secondary text color.
- Hover: border turns accent, text turns primary.
- Active: `background: var(--accent)`, `border-color: var(--accent)`, white text.

### 6.3 Search Bar

Unified container (`.search-box-wrapper`) combining input + filter selects:

- Outer wrapper: `background: var(--secondary-bg)`, `border: 2px solid var(--border)`.
- `:focus-within` triggers accent border + glow.
- Input fills remaining space (`flex: 1`).
- Filters sit flush to the right, separated by `1px solid var(--border)`.
- On mobile/tablet, the bar stacks vertically (filters below input).

### 6.4 Stat Cards

- Background: `var(--secondary-bg)`.
- Left border: `3px solid var(--accent)`.
- Number in Space Mono, accent color.
- Label in Space Mono, uppercase, secondary color.

### 6.5 Person Cards

- Background: `var(--card-bg)`, `1px solid var(--border)`.
- Hover: accent border, slight `translateY(-2px)`, accent box-shadow.
- Left accent bar animates in on hover (`scaleY(0) → scaleY(1)`).
- Category color determines left bar color.
- Fade-in animation with staggered delay (`0.03s × index`).
- Footer separated by `border-top: 1px solid var(--border)`.

### 6.6 Modal

- Full-viewport overlay: `rgba(0, 0, 0, 0.85)` with `backdrop-filter: blur(5px)`.
- Content panel: `background: var(--primary-bg)`, `border: 2px solid var(--accent)`.
- Entrance animation: `translateY(20px) scale(0.95) → translateY(0) scale(1)`.
- Close button: top-right, `2rem` font size, accent color on hover.
- Header/body separated by `border-bottom: 1px solid var(--border)`.
- On mobile (≤480px): full-width, full-height, no side borders.

### 6.7 Badges & Tags

| Type            | Background                    | Border            | Text Color    |
| --------------- | ----------------------------- | ------------------ | ------------- |
| Category badge  | `var(--accent)`               | —                  | White         |
| Mentions badge  | `var(--secondary-bg)`         | `var(--accent)`    | Accent        |
| Date badge      | `var(--secondary-bg)`         | `var(--border)`    | Secondary     |
| Document tag    | `rgba(0, 170, 255, 0.15)`    | `#00aaff`          | `#00aaff`     |
| Location tag    | `rgba(170, 102, 255, 0.15)`  | `#aa66ff`          | `#aa66ff`     |
| Association tag | `rgba(255, 170, 0, 0.15)`    | `#ffaa00`          | `#ffaa00`     |
| Mini tag        | `var(--secondary-bg)`         | —                  | Secondary     |

All badges use Space Mono, uppercase, `0.65–0.75rem`.

### 6.8 Buttons

| Button            | Style                                                 |
| ----------------- | ----------------------------------------------------- |
| View Details      | Ghost — no background/border, accent text, uppercase Space Mono |
| Suggestion        | Outlined — `var(--secondary-bg)` bg, `var(--border)` border |
| Nav link          | Outlined — matches header border style                |

Hover states use `background: rgba(255, 51, 102, 0.15)` or border-color transition.

### 6.9 Footer

- `border-top: 3px solid var(--accent)` — mirrors header.
- Centered text, secondary color.
- Max-width matches container (`1400px`).
- Links in accent color, `opacity: 0.7` on hover.
- `.disclaimer` and `.last-updated` use `0.85rem` font size.

---

## 7. Animations & Transitions

| Effect              | Property          | Duration | Easing     |
| ------------------- | ----------------- | -------- | ---------- |
| Border/color change | `border-color`    | `0.2–0.3s` | `ease`  |
| Card hover lift     | `transform`       | `0.2s`   | `ease`     |
| Card accent bar     | `transform`       | `0.2s`   | `ease`     |
| Fade in (cards)     | `opacity, transform` | `0.4s` | `ease`   |
| Modal entrance      | `opacity, transform` | `0.3s` | `ease`   |
| Header shrink       | `padding, font-size` | `0.3s` | `ease`   |
| Spinner             | `transform`       | `1s`     | `linear`   |

### Keyframes

- **`fadeIn`** — `opacity: 0, translateY(20px)` → `opacity: 1, translateY(0)`
- **`spin`** — `rotate(0)` → `rotate(360deg)`

### Rules

- Never exceed `0.4s` for UI transitions.
- Use `transform` and `opacity` for GPU-accelerated animations.
- Stagger card animations with inline `animation-delay` (`index × 0.03s`).
- Spinners use `linear` easing; everything else uses `ease`.

---

## 8. Borders & Dividers

| Pattern                    | Value                              |
| -------------------------- | ---------------------------------- |
| Page-level divider         | `3px solid var(--accent)`          |
| Card border                | `1px solid var(--border)`          |
| Section left accent        | `3px solid var(--accent)`          |
| Internal divider           | `1px solid var(--border)`          |
| Focus ring                 | `0 0 0 3px rgba(255, 51, 102, 0.1)` |
| Border radius              | `0` everywhere (sharp corners)     |

Sharp corners are intentional — they reinforce the brutalist/document aesthetic.

---

## 9. Shadows

Shadows are used sparingly:

| Context           | Value                                    |
| ----------------- | ---------------------------------------- |
| Card hover        | `0 4px 20px rgba(255, 51, 102, 0.15)`   |
| Focus glow        | `0 0 0 3px rgba(255, 51, 102, 0.1)`     |

No drop shadows on static elements. The dark background provides natural depth.

---

## 10. Iconography

- **Search icon**: Unicode `⌕` (U+2315), positioned absolutely in the input.
- **Close button**: HTML entity `×` (`&times;`), 2rem, styled as text button.
- **Arrow**: Text `→` in "View Documents →" buttons.

No icon library is used. Keep all icons as text/unicode for zero-dependency rendering.

---

## 11. Accessibility

- **Focus states**: All interactive elements receive visible `:focus` outlines via `border-color` or `box-shadow`.
- **Contrast ratios**: `#ffffff` on `#0a0a0a` = 19.3:1 (AAA). `#999999` on `#0a0a0a` = 6.3:1 (AA).
- **Touch targets**: Buttons and nav links have minimum `0.5rem` padding on all sides.
- **Keyboard**: Modal traps focus, `Escape` closes, `Cmd/Ctrl+K` focuses search.
- **ARIA**: Modal uses `role="dialog"`, cards use `role="button"` with `tabindex="0"`.
- **Reduced motion**: Consider adding `@media (prefers-reduced-motion: reduce)` to disable `fadeIn` and card hover transforms.

---

## 12. Do / Don't

| ✅ Do                                    | ❌ Don't                                  |
| ---------------------------------------- | ----------------------------------------- |
| Use CSS custom properties for all colors | Hardcode hex values in components         |
| Use Space Mono for labels/system UI      | Use Space Mono for body text              |
| Use Crimson Pro for readable content     | Use Crimson Pro for badges/labels         |
| Keep border-radius at `0`               | Add rounded corners                       |
| Use `var(--accent)` for emphasis         | Introduce new accent colors               |
| Animate with `transform` and `opacity`  | Animate `width`, `height`, or `margin`    |
| Keep inline styles in CSS classes        | Use `style=""` attributes in HTML         |
| Add `rel="noopener noreferrer"` to external links | Leave external links without `rel` |
| Use semantic HTML (`header`, `main`, `footer`) | Use generic `div` for page structure |
