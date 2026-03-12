# Class Scheduler Frontend

This is a lightweight React application bootstrapped with [Vite](https://vitejs.dev/).
It provides a minimal UI to log in to the backend, create or load a schedule, and display the
course calendar. Everything is wired to the backend running at `http://localhost:8080` via a
proxy defined in `vite.config.ts`.

## Getting Started

1. **Install dependencies**
   ```bash
   cd ClassFrontend
   npm install
   ```

2. **Run the backend** (see `ClassBackend` project instructions). The frontend assumes the
authorization and schedule APIs are available at `http://localhost:8080/api/v1`.

3. **Start development server**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 in your browser.

4. **Usage**
   - Use the on‑screen form to **log in** or, if you don’t yet have an account, switch to the **Register** tab and fill in the required fields. The app will automatically log you in after a successful registration.
   - Once authenticated, create a new schedule or enter an existing schedule ID and click
     "Load".
   - The calendar view will list your courses by day and show any conflicts.

## Modifying the UI

The application is intentionally simple:

- `src/App.tsx` contains the main logic and forms for authentication and schedule management.
- `src/components/Calendar.tsx` renders the schedule; change it to alter the layout or
  styling (e.g. convert to a grid, plug‑in a calendar library, etc.).
- API helpers are in `src/services/`; modify or extend them for other endpoints.
- TypeScript types are declared in `src/types/index.ts`.

Feel free to drop in Tailwind or another styling solution if you want more polish.

---

This front end is the starting point for your project. Since it talks directly to the
existing backend endpoints, you can expand it as needed.