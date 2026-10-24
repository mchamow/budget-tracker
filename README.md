# 💰 Budget Tracker

[![Test and deploy](https://github.com/mchamow/budget-tracker/actions/workflows/deploy.yml/badge.svg)](https://github.com/mchamow/budget-tracker/actions/workflows/deploy.yml)

**Day 30 of [100 Days of React](https://github.com/mchamow?tab=repositories)**: Log income and expenses, set category budgets and see where the money goes.

**Live demo:** https://mchamow.github.io/budget-tracker/

## Features

- **Income and expenses**: amount, category, date and note for each entry; edit or delete any of them, with an undo after a delete. Amounts like `12,50` or `1,234.56` both work
- **Month by month**: step through months with the arrows, jump back with *This month*, or click a month in the chart
- **Summary tiles**: income, spending and net for the month, with the change from last month and how much of your income you kept
- **Where it went**: a donut of the month's spending by category, with a legend that lists each amount and share
- **Last 6 months**: hand-drawn SVG columns of spending stacked by category, with income drawn as a line across each one. Hover or focus a month for the full breakdown, or switch to a table
- **Category budgets**: a monthly limit per category, with a progress bar and an *almost there* / *over by* warning (icon and words, never color alone)
- **Search and filters**: search notes and category names, show only income or only expenses, or a single category
- **CSV export** of what the list is showing, named `budget-2026-10.csv`; notes that look like spreadsheet formulas are defused
- **Eight currencies**, each written its own way (`$1,234.56`, `1.234,56 €`, `¥1,235`…); switching rescales amounts between cents and whole yen
- **Keyboard**: <kbd>N</kbd> new entry · <kbd>←</kbd> <kbd>→</kbd> months · <kbd>T</kbd> this month · <kbd>/</kbd> search
- Everything is saved in `localStorage`; a first visit opens six months of sample data. *Clear all* (after confirming) starts from scratch
- Light and dark themes that follow the system (chart colors are picked for each, and checked for color-blind separation), and a phone layout

## How it works

- [`src/budget.ts`](src/budget.ts): totals, spending per category, the six-month series, budget status, filtering and CSV export
- [`src/chart.ts`](src/chart.ts): axis rounding, donut arcs, stacking and the column shape, all plain math
- [`src/MonthlyChart.tsx`](src/MonthlyChart.tsx) and [`src/CategoryDonut.tsx`](src/CategoryDonut.tsx): the two charts, as SVG with no chart library
- [`src/money.ts`](src/money.ts): reading typed amounts into whole cents, and `Intl` money formatting
- [`src/reducer.ts`](src/reducer.ts): every change as a reducer action; [`src/storage.ts`](src/storage.ts) loads saved data and drops anything malformed

## Tech

React 19 · TypeScript · Vite · Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (Base UI) · lucide icons · Vitest + Testing Library · deployed to GitHub Pages with GitHub Actions.

## Run locally

```bash
pnpm install
pnpm dev
pnpm test   # 70 unit and component tests (Vitest)
```
