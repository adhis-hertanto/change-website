# Change Research & Strategy website

Static HTML, CSS and JavaScript build of the Change website, converted from the design canvas. No build step and no dependencies: open `index.html`, or serve the folder with any static host (GitHub Pages, Netlify, and so on).

To preview locally:

```
python3 -m http.server 8000
```

then open http://localhost:8000.

## Pages

| File | Page | Source board |
| --- | --- | --- |
| `index.html` | Home | Home / Dark hero, plus the Home scroll prototype |
| `what-we-do.html` | What We Do | What We Do / Dark hero |
| `clients.html` | Our Clients | Clients / Dark hero, plus Filter open |
| `experiences.html` | Experiences (list) | Experiences / Dark header |
| `experience-sats.html` | Experience article (template) | Experiences / Article (child) |

The contact drawer (Contact / Drawer open) is included on every page and opens from [Get in touch].

## Structure

```
css/change.css            Design system: tokens, type roles, components
css/<page>.css            Page styles, exported from each board
css/contact-drawer.css    Contact drawer and form
css/site.css              Live-site layer: viewport heights, sticky sections, drawer, page transition
js/site.js                Shared: nav menu, contact drawer and form, reveals, page transition
js/home.js                Hero and Who We Are scroll sequence, pillar stack, sector drum, logo card, Insights carousel
js/what-we-do.js          Insights category chips
js/clients.js             Client filter bar and panels
js/experience-article.js  Article anchor list and share buttons
assets/                   Brand marks, client logos, pillar icons, images
```

Each page is one responsive document; the 1440 and 390 boards are the same markup at two widths.

## Responsiveness

The site scales with the viewport instead of stepping through breakpoints.

- Every size, gap and type size is written as `calc(N * var(--px))`, where `N` is the pixel value on the design board. `--px` (defined at the top of `css/change.css`) is exactly 1px when the viewport matches the board and grows or shrinks with the viewport everywhere else.
- Side margins do not scale. They stay at the board values (64px on desktop, 20px on mobile, plus the few sections with their own margin), and `--px` is measured from the content width between them.
- There is one layout switch, at 768px. From 768px up the 1440 desktop board is used; below it the 390 mobile board is used.
- The desktop board stops growing at 1920px wide and centres on larger screens.
- Small type has a readable floor, written as `max(floor, calc(N * var(--px)))`, so body copy and labels do not shrink below roughly 14px and 12px. Form fields stay at 16px or larger.
- A value that differs between the two boards is written once as `calc(D * var(--px-d) + M * var(--px-m))`: `D` on desktop, `M` on mobile.

When adding styles, use the board value with `var(--px)` rather than a plain `px` value. Keep plain `px` only for side margins and hairlines.

## Still to supply

Copy in [square brackets] is a placeholder carried over from the design and needs real content. Also open:

- Sector and country for each client. The Clients filter reads `data-sector` and `data-country` on each tile (see `js/clients.js`); both are empty for now, and the Country list is not defined yet.
- Contact form backend. The form validates and then opens the visitor's mail app (see `sendForm()` in `js/site.js`).
- Link targets that have no page yet: Who We Are "Learn More", Experience rows other than SATS, client tiles, Insights items, LinkedIn, Privacy Policy and Terms of Use. These point to `#`.
- Hero 3D logo video. The hero cross-fades five stills as a stand-in.
- Insights and article copy and images are drafted samples.
