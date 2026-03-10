# CLAUDE.md — Mai Little Mermaid

## Project Overview

**Mai Little Mermaid** is a static HTML/CSS/vanilla-JS e-commerce site for a handmade artisan jewelry brand based in Newport, Rhode Island. Products are crafted from reclaimed beach materials (sea glass, shells, driftwood, stones). There is no backend, no build system, and no npm/Node dependencies — this is a pure static site.

---

## Repository Structure

```
mai-little-mermaid/
├── public/                  ← canonical, production-ready files
│   ├── index.html           ← main landing page
│   ├── shop.html            ← full product shop listing
│   └── shop1.html           ← product detail page template
├── mai-little-mermaid.html  ← legacy root-level copy of index.html (not canonical)
├── mai-product-page.html    ← legacy root-level copy of shop1.html (not canonical)
├── mai-shop-v2.html         ← legacy/deprecated shop version (not canonical)
├── .gitignore
└── CLAUDE.md
```

### Canonical vs Legacy Files

**Always edit files inside `public/`** — these are the live site files.

The root-level HTML files (`mai-little-mermaid.html`, `mai-product-page.html`, `mai-shop-v2.html`) are legacy working copies from earlier development and should be treated as deprecated. Do not edit them unless explicitly asked.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 (semantic elements) |
| Styling | Vanilla CSS (embedded `<style>` blocks in each file) |
| Scripting | Vanilla JavaScript (inline `<script>` blocks at end of body) |
| Fonts | Google Fonts — Cormorant Garamond + Jost |
| Hosting | Static file hosting (previously Vercel, currently unspecified) |
| Build | None — no build step, no transpilation |

---

## Design System

All CSS is embedded directly in each HTML file. CSS custom properties define the brand palette.

### Color Tokens (defined in `:root`)

```css
--cream: #faf6f0;        /* page background */
--ink: #1a1410;          /* primary text */
--sand: #f0e8d8;         /* card/section backgrounds */
--sand-dark: #d9cdb8;    /* borders, dividers */
--driftwood: #8b7355;    /* muted text, secondary UI */
--ocean: #4a7c8e;        /* primary accent / CTA color */
--ocean-deep: #2d5a6b;   /* hover states for ocean */
--seafoam: #a8c5bc;      /* light accent */
--coral: #c4715a;        /* warm accent / highlights */
--gold: #b8943f;         /* premium accents, badges */
```

### Typography

- **Headings / editorial text** → `'Cormorant Garamond', serif`
  - Weights: 300, 400, 500; italic variants used extensively
  - Large display sizes (3–6rem), wide letter-spacing for luxury feel
- **Body / UI text** → `'Jost', sans-serif`
  - Weights: 300, 400, 500
  - Small sizes with `letter-spacing: 0.12em` and `text-transform: uppercase` for labels/nav

### Layout Conventions

- CSS Grid for section layouts; Flexbox for row-level alignment
- Fixed nav with `backdrop-filter: blur(12px)` and semi-transparent background
- `.reveal` class + `IntersectionObserver` for scroll-triggered fade-in animations
- Responsive via relative units (`rem`, `%`, `vw/vh`); no media query breakpoints currently defined (mobile-first is a future improvement area)

### Spacing / Sizing

- Section padding: typically `5rem 3rem` or `8rem 3rem`
- Max content width: `1200px` centered with `margin: 0 auto`
- Border-radius: `2px`–`4px` for cards; `0` for buttons (flat aesthetic)

---

## Page Structure

### `public/index.html` — Landing Page

1. **`<nav>`** — Fixed top bar; logo (Cormorant Garamond, `letter-spacing: 0.15em`), nav links, cart indicator
2. **Hero** — Full-height split layout; editorial headline + product imagery placeholder
3. **Marquee bar** — CSS-animated scrolling text (`@keyframes marquee`)
4. **Collection grid** — 3-column product cards; each card has image, title, material tag, price, "Add to cart" button
5. **About section** — Founder story with sidebar badge ("43 pieces crafted")
6. **Process section** — 4-step process (Beach Walk → Select → Craft → Ship)
7. **Instagram section** — 5-tile mosaic linking to `@mai.little.mermaid`
8. **Contact form** — Email form for custom orders
9. **`<footer>`** — Nav links, copyright `© 2025 Mai Little Mermaid`

### `public/shop.html` — Shop Listing

Full product catalog page with the same nav/footer. Products displayed in a grid.

### `public/shop1.html` — Product Detail

Individual product page template. Contains product image, description, material details, price, and add-to-cart area.

---

## JavaScript Patterns

JavaScript is minimal and inline. Two patterns appear consistently at the bottom of HTML files:

```js
// Scroll reveal — fade in elements with class .reveal
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
reveals.forEach(r => observer.observe(r));

// Nav shadow on scroll
const nav = document.querySelector('nav');
window.addEventListener('scroll', () => {
  nav.style.boxShadow = window.scrollY > 50 ? '0 2px 20px rgba(0,0,0,0.08)' : 'none';
});
```

When adding new sections that should animate in, add class `reveal` to the element; the existing script handles the rest.

---

## Product Catalogue

Current products (prices in EUR):

| Product | Price |
|---|---|
| Sea Glass Charm Necklace | €38 |
| Shell Drop Earrings | €28 |
| Beaded Stone Bracelet | €32 |
| Driftwood Wall Art | €65 |
| Gold Layered Sea Charm | €55 |
| Aqua Glass Studs | €24 |

---

## Development Workflow

### Making Changes

1. Edit files directly in `public/` — no build step required
2. Preview by opening HTML files in a browser or using a local static server:
   ```sh
   # Python (if available)
   python3 -m http.server 8080 --directory public
   # or any static file server
   npx serve public
   ```
3. Test across viewport sizes (the site currently lacks responsive breakpoints — this is known)

### Git Conventions

- Commit messages are short and imperative: `Update index.html`, `Rename shop.html to public/shop.html`
- No squash or rebase conventions observed — straightforward linear history
- Feature branches use the `claude/` prefix when created by AI assistants

### No Linting / Formatting Tools

There is no ESLint, Prettier, Stylelint, or any other automated code quality tool. Keep formatting consistent with the existing style (2-space indentation in CSS, double-quoted HTML attributes).

---

## Key Conventions for AI Assistants

1. **Edit `public/` only** — never the root-level legacy HTML files unless explicitly asked
2. **Keep all CSS inline** — do not introduce external stylesheets or CSS-in-JS
3. **Keep all JS inline** — do not add npm packages, bundlers, or external scripts beyond Google Fonts
4. **Use existing CSS variables** — never introduce hard-coded hex values when a token already exists
5. **Match the brand voice** — copy should be warm, poetic, ocean-themed; avoid corporate/generic language
6. **EUR pricing** — prices are displayed in euros (€); do not switch currency format
7. **Preserve the `.reveal` animation pattern** — add `class="reveal"` to new sections for scroll-in animations
8. **No framework introductions** — do not suggest or add React, Vue, Tailwind, Bootstrap, or similar
9. **Image placeholders** — images are currently placeholders (no real asset pipeline); use descriptive alt text and placeholder `background-color` values from the design system
10. **Accessibility** — maintain semantic HTML (`<nav>`, `<main>`, `<section>`, `<footer>`, `<article>`), descriptive `alt` attributes, and sufficient color contrast

---

## Known Issues / Future Work

- No responsive/mobile CSS breakpoints — the site is desktop-first currently
- No actual e-commerce backend or cart functionality (UI only)
- No real product images (placeholders in use)
- Root-level legacy HTML files are duplicates and should eventually be removed
- No analytics, SEO meta tags, or Open Graph tags beyond the basic `<title>`
