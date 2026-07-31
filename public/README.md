# `public/` — static files served as-is

## Purpose

Anything in this directory is served from the site root, byte for byte, with no
processing. `public/injective-mark.svg` is reachable at `/injective-mark.svg`.

## When to put a file here

Use `public/` when a file must be fetched by URL rather than imported:

- images referenced from CSS or from a plain `<img src="/…">`
- `robots.txt`, `sitemap.xml`, `manifest.json`
- files a third party needs to fetch from a fixed path (domain-verification
  files, well-known endpoints)

## When NOT to put a file here

Prefer importing an asset from `app/` or `components/` when you can. Imported
assets get a content hash in their filename, which lets them be cached forever
and busted automatically when they change. Files in `public/` keep their name,
so a stale copy can linger in a CDN or a browser cache after you update it.

## Two things worth knowing

**There is no access control here.** Everything in `public/` is world-readable
the moment you deploy. Never put an API key, a keystore, a `.env` file or
anything private in this directory — it is one URL away from being public.

**The favicon is not here.** In the Next.js App Router the browser-tab icon
comes from `app/icon.svg`; the filename itself is the configuration. There is no
`<link rel="icon">` anywhere in this project.

## Contents

| File | Purpose |
| --- | --- |
| `injective-mark.svg` | A neutral hexagonal placeholder mark. Deliberately not the official Injective logo — replace it with your own. |
