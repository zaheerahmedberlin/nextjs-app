# Preisgucken – Vue → Next.js Migration

## Project Structure

```
nextjs-app/
├── app/
│   ├── layout.jsx       ← HTML shell (replaces index.html)
│   ├── page.jsx         ← Main page / "/" route (replaces App.vue)
│   └── globals.css      ← Global styles (from App.vue's <style> block)
├── components/
│   ├── Navbar.jsx
│   ├── HeroSection.jsx
│   ├── Sidebar.jsx
│   ├── ProductGrid.jsx
│   ├── Pagination.jsx
│   ├── LastSeen.jsx
│   ├── LowestPriceSection.jsx
│   ├── OffersSection.jsx
│   └── Footer.jsx
├── package.json
└── next.config.js
```

## Getting Started

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## ⚠️ Static Files

Copy your static files from your Vue project's `/public` folder into Next.js's `/public` folder:

- `public/products.json`
- `public/offers.json`
- `public/categories.txt`
- `public/preis-gucken-logo.png`
- `public/no-data.svg`

Next.js serves everything in `/public` at the root path, just like Vue CLI does.

---

## Key Vue → Next.js Concepts

| Vue                        | Next.js / React                          |
|----------------------------|------------------------------------------|
| `data()`                   | `useState()`                             |
| `computed:`                | `useMemo()`                              |
| `mounted()`                | `useEffect(() => {}, [])`               |
| `beforeUnmount()`          | `return () => {}` inside useEffect       |
| `v-for`                    | `.map()` in JSX                          |
| `v-if` / `v-show`          | `{condition && <Component />}`           |
| `v-model`                  | `value={x}` + `onChange={(e) => set(e)}` |
| `:class="{ foo: cond }"`   | `className={cond ? 'foo' : ''}`          |
| `@click="fn(arg)"`         | `onClick={() => fn(arg)}`                |
| `{{ value }}`              | `{value}` in JSX                         |
| `<template>` block         | `return (...)` in JSX                    |
| `this.$forceUpdate()`      | Update state with `setState()`           |
| Single-file component      | Separate `.jsx` files                    |
