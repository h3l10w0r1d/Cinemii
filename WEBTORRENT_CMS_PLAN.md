# Cinemii WebTorrent / CMS Implementation Plan (movie-only)

**Status:** implemented in this branch. This document is the corrected plan
*and* a map of what was built.

## The correction that drove this revision

> The magnet URI must **NOT** be supplied or built by the client/frontend.
> The backend **proposes** WebTorrent sources; admins only **select + confirm
> rights**. The public frontend never receives unapproved options and never
> decides rights.

Previously the CMS let an admin paste a `source_url` (magnet) by hand. That seam
is now closed for WebTorrent: magnets originate from a backend **proposal
service**, are reviewed in an admin-only UI, and are persisted only after an
explicit rights confirmation. The public player asks the backend for a source
and receives one **only** when every rights gate passes.

## Architecture decision: extend, don't fork

The repo already ships a rights-gating CMS backed by the **`LicensedTitle`**
table (`/api/admin/catalog`, public gate `/api/stream/source/{id}`). Rather than
introduce a parallel `MovieSource` table (two sources of truth to keep in sync),
the spec's "Movie Sources" surface is built **on top of `LicensedTitle`**:

- The spec's `MovieSource` fields are added as columns on `LicensedTitle`
  (`source_provider`, `info_hash`, `file_size`, `seeders`, `peers` — the rest
  already existed: `quality`, `language`, `rights_confirmed`, `expires_at`,
  `license_ref` = rights note, etc.).
- The spec's endpoints (`/api/admin/movie-sources*`, `/api/stream/movie/{id}`)
  exist as **movie-scoped** routes over the same table.
- Field-name mapping (spec → column): `rights_note` → `license_ref`,
  `rights_expires_at` → `expires_at`, `magnet_uri` → `source_url`.

## End-to-end flow

```
Admin → /admin/movie-sources
  1. Search + select a movie (TMDB id)
  2. "Request proposals from backend"
       GET /api/admin/movie-sources/proposals?tmdb_id=...   (admin-only)
       → backend service returns proposed WebTorrent sources
  3. Review options (quality / provider / language / size / seeders·peers)
  4. Select ONE proposal
  5. Confirm rights: rights_confirmed + note + holder + license + optional expiry
  6. POST /api/admin/movie-sources   → persisted to LicensedTitle (movie)

Public player → CinemaPlayer
  GET /api/stream/movie/{tmdb_id}   (always 200)
    available:true  → { source_type:"webtorrent", magnet_uri, quality, language }
    available:false → { available:false, message:"...not available..." }
  Source returned ONLY when:
    media_type=movie AND source_type=webtorrent AND is_active
    AND rights_confirmed AND (expires_at is null OR in the future)
```

The frontend holds **no** magnets, **no** TMDB→source map (except a dev-only CC
test entry, stripped from production builds), and makes **no** rights decisions.

## Files changed / added

### Backend
| File | Change |
|------|--------|
| `backend/models.py` | `LicensedTitle` gains `source_provider`, `info_hash`, `file_size`, `seeders`, `peers`. |
| `backend/database.py` | `ensure_user_columns()` migrates the 5 new columns in place (SQLite + Postgres). |
| `backend/services/__init__.py` | New service package. |
| `backend/services/movie_sources.py` | **Proposal service.** Pluggable providers; default `dev-test` returns one legal CC source (Sintel). `info_hash_from_magnet()`. Legal contract documented. |
| `backend/schemas.py` | `ProposedSourceOut`, `MovieSourceProposalsOut`, `MovieSourceCreateIn`, `MovieSourceUpdateIn`; `MovieStreamOut` gains `available`/`message`; `LicensedTitleOut` gains provenance fields. |
| `backend/routers/movie_sources.py` | **New router.** Admin proposals + CRUD + deactivate; public `/api/stream/movie/{id}` gate. |
| `backend/main.py` | Registers `movie_sources.admin_router` + `movie_sources.public_router`. |

### Frontend
| File | Change |
|------|--------|
| `frontend/src/core/backend.js` | `getMovieStream`, `adminMovieSourceProposals`, `adminListMovieSources`, `adminGetMovieSource`, `adminCreateMovieSource`, `adminUpdateMovieSource`, `adminDeactivateMovieSource`, `adminDeleteMovieSource`. |
| `frontend/src/pages/MovieSources.jsx` | **New CMS page** — search → request proposals → review → select → confirm rights → save; saved-sources list with activate/deactivate/delete; legal warning banner. |
| `frontend/src/App.jsx` | Route `/admin/movie-sources`. |
| `frontend/src/pages/Admin.jsx` | Cross-link to Movie Sources. |
| `frontend/src/components/player/CinemaPlayer.jsx` | Calls `GET /api/stream/movie/{id}`; maps `available`+`webtorrent`→`WebTorrentPlayer`; spec unavailable message. |
| `frontend/src/components/player/WebTorrentPlayer.jsx` | Unchanged — already meets the spec (accepts `magnetUri`/`title`/`onClose`, picks playable file, progress/peers, destroys client on unmount, error handling). |

## Admin endpoints (all require admin)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/movie-sources` | List saved/approved movie sources. |
| GET | `/api/admin/movie-sources/{id}` | Read one saved source. |
| GET | `/api/admin/movie-sources/proposals?tmdb_id=` | **Backend proposes** WebTorrent options. Admin-only. |
| POST | `/api/admin/movie-sources` | Save an admin-selected proposed source + rights. |
| PUT | `/api/admin/movie-sources/{id}` | Update active/rights/quality/notes/expiry. |
| PATCH | `/api/admin/movie-sources/{id}/deactivate` | Deactivate. |
| DELETE | `/api/admin/movie-sources/{id}` | Remove. |

**Save guards:** `source_type` must be `webtorrent`; `magnet_uri` must be a
`magnet:` URI; `info_hash` is re-derived server-side from the magnet (a
client-sent hash never overrides it).

## Public endpoint

`GET /api/stream/movie/{tmdb_id}` — always HTTP 200. Returns the magnet only when
all five gates pass; otherwise `{ available:false, message }` with no magnet.

## The proposal service (the important new seam)

`backend/services/movie_sources.py` is the *only* place magnets enter the system.

- **Pluggable** via `CINEMII_MOVIE_SOURCE_PROVIDER` (default `dev-test`).
- **`dev-test`** returns exactly one legal Creative-Commons source — Blender's
  *Sintel* (CC-BY 3.0, the canonical WebTorrent demo with an HTTPS web seed so it
  plays with zero peers). It is clearly flagged `is_test: true`.
- **Legal contract (in the module docstring):** any real provider must propose
  only sources the operator may lawfully stream (public-domain / CC / owned /
  licensed). A provider that proxies a public torrent indexer for arbitrary
  commercial movies is a piracy tool and must not be added. Proposing ≠
  clearance — an admin still confirms rights, and the public gate still enforces
  `rights_confirmed + is_active + non-expired`.

## Local testing notes

**Backend** (from `backend/`, venv active):
```bash
# Imports + app load
python -c "import main; print(len(main.app.routes), 'routes')"
```
Automated end-to-end check (temp DB; verifies every gate). First signup becomes
admin in dev (no `CINEMII_ADMIN_EMAILS` set → user id=1 is admin):
```bash
DATABASE_URL="sqlite:///./_e2e.db" CINEMII_SECRET=test python - <<'PY'
from fastapi.testclient import TestClient; import main, os
c = TestClient(main.app)
tok = c.post('/api/auth/signup', json={'name':'A','email':'a@b.com','password':'password123'}).json()['access_token']
H = {'Authorization': f'Bearer {tok}'}
assert c.get('/api/stream/movie/1618945').json()['available'] is False
p = c.get('/api/admin/movie-sources/proposals?tmdb_id=1618945', headers=H).json()['proposals'][0]
sid = c.post('/api/admin/movie-sources', json={'tmdb_id':'1618945','title':'T','source_type':p['source_type'],
    'magnet_uri':p['magnet_uri'],'rights_confirmed':False,'is_active':True}, headers=H).json()['id']
assert c.get('/api/stream/movie/1618945').json()['available'] is False   # rights unconfirmed
c.put(f'/api/admin/movie-sources/{sid}', json={'rights_confirmed':True}, headers=H)
assert c.get('/api/stream/movie/1618945').json()['available'] is True     # live
os.remove('./_e2e.db'); print('OK')
PY
```
Verified results: unavailable before approval → blocked while rights unconfirmed
→ live after confirmation → blocked after deactivate → non-admin gets 403 on
proposals.

**Frontend:**
```bash
cd frontend && npm run build      # passes; emits MovieSources chunk
```
In the running dev server, `/admin/movie-sources` renders (admin-guarded). Sign
in as an admin to exercise: search a movie → request proposals → pick the Sintel
test source → confirm rights → save → play it from the movie page. Playing TMDB
`45745` (Sintel) in dev also still works via the dev fallback.

**Test-content rule:** the proposal service ships only the one CC test source. Do
**not** add magnets for copyrighted commercial movies anywhere (service, dev map,
or by hand) — that turns the system into a piracy tool regardless of flags.

## TODO — strict legal-rights workflow before public release

- [ ] **Replace the `dev-test` provider** with a real, rights-aware provider (or
      keep proposals limited to owned / licensed / verified public-domain
      catalogs). Never proxy an open torrent indexer for arbitrary titles.
- [ ] **Two-person / audited approval:** record who proposed vs. who confirmed
      rights; require a non-empty rights note + holder before `rights_confirmed`
      can be set true.
- [ ] **Audit log:** persist who served/approved what and when (admin actions +
      public source grants).
- [ ] **Expiry enforcement job:** proactively flag/deactivate near-expiry rights;
      the gate already refuses expired rows at read time.
- [ ] **Rights-note required at the API** (not just the UI) when
      `rights_confirmed=true`.
- [ ] **Strip the dev CC map** (`frontend/src/core/playerSources.js`
      `DEV_WEBTORRENT_SOURCES`) from production builds (already `import.meta.env.DEV`
      gated — confirm tree-shaking removes it).
- [ ] **Rate-limit / lock down** the admin proposal endpoint (already admin-only;
      add throttling + logging).
- [ ] **Legal review** of the proposal provider and the catalog before launch.
- [ ] **Optional:** retire manual `webtorrent` entry from the legacy
      `/api/admin/catalog` form so magnets can *only* arrive via proposals.
- [ ] **TV support** (seasons/episodes) — out of scope for now (movie-only).
```
