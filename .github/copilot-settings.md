Copilot Settings — Padel Club

This file contains the authoritative project-level rules that GitHub Copilot (or any code generator used in this repo) must follow when working with membership and admin authorization logic. Write code in TypeScript for Next.js and Prisma and always prefer server-side, centralized, reusable solutions.

Core rule (must follow)

Always use the universal role-based access control mechanism implemented in the repo. Do not introduce ad-hoc role checks. The canonical helper is requireRole (or similarly named central helper). All membership/authorization checks must be performed on the server and must reuse this helper.

If a new helper is required, extend the existing helper in place — do not create multiple copies across files.