# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OSRS Optimal Training — a React web application built with Vite. Currently in early development (scaffolded from the Vite + React template).

## Commands

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — Production build (outputs to `dist/`)
- `npm run lint` — ESLint across all JS/JSX files
- `npm run preview` — Serve the production build locally

## Tech Stack

- **React 19** with JSX (no TypeScript)
- **Vite 8** (beta) for bundling and dev server
- **ESLint 9** with flat config format (`eslint.config.js`)
- ES modules throughout (`"type": "module"` in package.json)

## Architecture

Single-page React app. Entry point is `src/main.jsx` which renders `<App />` into `index.html`. Styles use plain CSS files (no CSS-in-JS or preprocessor) with CSS custom properties for theming.

# Additional Instructions

- ~/.claude/CLAUDE.md
