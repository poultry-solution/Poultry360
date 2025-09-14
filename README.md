```
Poultry360/
│
├─ apps/
│   ├─ farmer-frontend/    # nextjs app → app.com
│   ├─ doctor-frontend/    # nextjs app → doctor.app.com
│   └─ admin-frontend/     # nextjs app → admin.app.com
│
├─ backend/                # your existing API (NestJS/Express/Prisma)
│
├─ packages/
│   ├─ ui/                 # shared React UI components (buttons, modals, forms)
│   ├─ shared-types/       # TS types, zod schemas, enums
│   ├─ api-client/         # axios/fetch wrappers, hooks for consuming backend
│   └─ utils/              # helpers (date, number formatting, etc.)
│
├─ pnpm-workspace.yaml
└─ package.json
```
