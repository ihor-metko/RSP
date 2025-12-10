# ArenaOne

A booking platform for ArenaOne.

## Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS

## System Settings

Before starting any new feature or component, please review the [System Settings](./SYSTEM_SETTINGS.md) document which defines coding rules and conventions for this project.

Key rules:
- Use `im-*` prefix for all CSS classes
- Always use "Padel" (not "Paddle")
- Use CSS variables for colors (no hardcoding)
- Support both light and dark themes

## Future Backend

The architecture is designed to scale. The initial MVP uses Next.js for both frontend and backend. In the future, Go services will be introduced for scalable backend functionality.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
