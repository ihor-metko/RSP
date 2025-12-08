# Padel Club MVP

A booking MVP for the Padel Club.

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

2. Set up environment variables:

```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

3. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development Features

### Mock Data for Admin Pages

For development and QA purposes, you can enable mock data to view full UI states without backend dependencies:

1. Add to your `.env.local`:
   ```
   NEXT_PUBLIC_USE_MOCKS=true
   ```

2. Restart the dev server

3. Navigate to any admin detail page (organizations, clubs, users) to see mock data

See [src/mocks/README.md](./src/mocks/README.md) for complete documentation.

**Note**: Mocks are automatically disabled in production builds and never run in production.
