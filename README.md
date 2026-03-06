# Act JSON Proofreader (Next.js)

This is a small Next.js app to load Act JSON files from the `doc/` folder and add **per-section remarks** in a proofreader UI.

## Local dev

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Saving remarks (Vercel Blob)

On Vercel, the app persists remarks to **Vercel Blob**.

- **Load**
  - Base Act is read from `doc/<ACT>.json` via `GET /api/doc/[actFile]`
  - Remarks are read from Blob via `GET /api/remarks/[actFile]`
- **Save**
  - Remarks are written to Blob via `POST /api/remarks/[actFile]`

Blob object key format:

- `remarks/<ACT>.json.remarks.json`

### Required environment variables

On Vercel, add the **Vercel Blob** integration (it will provide `BLOB_READ_WRITE_TOKEN` automatically).

Optional:

- `ADMIN_KEY`: if set, `POST /api/remarks/*` requires header `x-admin-key: <ADMIN_KEY>`

