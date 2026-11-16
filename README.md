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

## Still to supply

Copy in [square brackets] is a placeholder carried over from the design and needs real content. Also open:

- Sector and country for each client. The Clients filter reads `data-sector` and `data-country` on each tile (see `js/clients.js`); both are empty for now, and the Country list is not defined yet.
- Contact form backend. The form validates and then opens the visitor's mail app (see `sendForm()` in `js/site.js`).
- Link targets that have no page yet: Who We Are "Learn More", Experience rows other than SATS, client tiles, Insights items, LinkedIn, Privacy Policy and Terms of Use. These point to `#`.
- Hero 3D logo video. The hero cross-fades five stills as a stand-in.
- Insights and article copy and images are drafted samples.
