# RealDoor frontend

The renter-facing React 18 + Vite application for RealDoor.

Read the [project README](../README.md) for full setup and the [user guide](../docs/USER_GUIDE.md) for the complete renter journey.

## Run locally

Start the FastAPI backend on port 8000 first, then:

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173`.

The API client defaults to `http://<browser-host>:8000/api`. Set `VITE_API_URL` to override it.

## Commands

```powershell
npm.cmd run dev      # local Vite server
npm.cmd run test     # Vitest component tests
npm.cmd run lint     # ESLint
npm.cmd run build    # production bundle
npm.cmd run preview  # preview the bundle
```

## Structure

- `src/api`: API and streaming-chat clients.
- `src/components/layout`: navigation and assistant shell.
- `src/components/ui`: reusable accessible UI primitives.
- `src/pages`: renter journey and supporting screens.
- `src/routeConfig.js`: shared route and assistant metadata.
- `src/index.css`: tokens, responsive layout, and component styles.

Do not store renter documents or extracted values in browser persistence. Preserve keyboard access, visible focus, responsive behavior from 320px, safety language, and renter-controlled packet actions.
