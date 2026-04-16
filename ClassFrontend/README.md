# Class Scheduler Frontend

This is a simple vanilla JavaScript/HTML frontend served via [Vite](https://vitejs.dev/).
It provides a minimal UI to log in to the backend, create or load a schedule, and display the
course calendar. The code deliberately avoids React and TypeScript so it stays easy to read and
modify; you can migrate back to React later if desired.

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

- `src/main.js` contains the full front‑end logic: authentication forms, schedule controls, and calendar rendering.
- API helpers live in `src/services.js`; edit these if you need to call additional backend endpoints.

Since the code is plain JavaScript, you can inspect and tweak the DOM directly or replace pieces with a framework when you're ready.

---

This front end is the starting point for your project. Since it talks directly to the
existing backend endpoints, you can expand it as needed.