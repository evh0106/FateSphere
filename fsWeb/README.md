# FATE SPHERE WEB APP
Web frontend program for the `lt645` backend and future services.

## Specifications
- React + TypeScript + Vite
- CLI-equivalent menu flow from `lt645/src/main.py`

## Features
- Reproduces the `lt645` CLI menu (`1, 2, 3, 4, 5, 6, 9, 0`) in the web UI.
- Provides input forms and output panels for each menu screen.
- Uses API calls to execute backend actions where file or crawler access is required.

## Quick Start

1. Install dependencies

```powershell
npm install
```

2. Configure API base URL

```powershell
copy .env.example .env
```

Set `VITE_API_BASE_URL` in `.env` if your backend runs on another host/port.

3. Run development server

```powershell
npm run dev
```

4. Build production bundle

```powershell
npm run build
```

## Expected Backend API Contract
The frontend expects the following endpoints:

- `POST /api/lt645/convert` -> `{ "converted": number }`
- `POST /api/lt645/crawl` -> `{ "crawled": number }`
- `POST /api/lt645/crawl-range` body `{ "startRound": number, "endRound": number }` -> `{ "crawled": number }`
- `GET /api/lt645/results?limit=10` -> `{ "rows": ResultRow[] }`
- `GET /api/lt645/results?startRound=1&endRound=100` -> `{ "rows": ResultRow[] }`
- `GET /api/lt645/excluded` -> `{ "rows": ExcludedCombination[] }`
- `POST /api/lt645/excluded` body `{ "numbers": number[] }` -> `ExcludedCombination`
- `DELETE /api/lt645/excluded/{id}` -> `204 No Content`
- `POST /api/lt645/generate` body `{ "count": number }` -> `{ "combinations": number[][] }`

### ResultRow shape

```ts
type ResultRow = {
	round: number;
	draw_date?: string;
	n1: number;
	n2: number;
	n3: number;
	n4: number;
	n5: number;
	n6: number;
	bonus: number;
};
```