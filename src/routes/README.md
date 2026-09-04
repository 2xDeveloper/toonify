# Routing

This folder is the file-based route tree for TanStack Router. The Vite plugin
watches it and regenerates `src/routeTree.gen.ts` — never edit that file by hand.

Conventions:

- `__root.tsx` is the shell every route renders inside. It owns the `<html>`
  document, `<HeadContent />`, the Google Fonts links, `<Outlet />` and
  `<Scripts />`.
- `index.tsx` maps to `/`.
- `about.tsx` would map to `/about`; `about.index.tsx` and `about.$id.tsx`
  nest underneath it.
- A leading `_` makes a pathless layout route (`_app.tsx`).
- A leading `-` excludes a file from routing, which is handy for colocating
  route-only helpers.

Every route file exports a route created with `createFileRoute("<path>")`. The
path argument is filled in automatically by the plugin, so copy/pasting a route
file and renaming it is safe.
