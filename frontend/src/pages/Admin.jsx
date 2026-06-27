import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Trash2, Pencil, Plus, ShieldCheck, X, Film, ExternalLink } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { api } from "../core/backend";
import { searchMulti, imgUrl } from "../core/tmdb";

const SOURCE_TYPES = ["webtorrent", "mp4", "hls", "file"];

const EMPTY = {
  id: null,
  tmdb_id: "",
  title: "",
  poster_path: "",
  source_type: "webtorrent",
  source_url: "",
  license_type: "",
  rights_holder: "",
  license_ref: "",
  expires_at: "",
  is_active: true,
};

const SOURCE_HINT = {
  webtorrent: "A magnet: URI. Use ONLY for content you own / public-domain / Creative-Commons.",
  mp4: "An https URL to an .mp4 on your own storage/CDN.",
  hls: "An https URL to an .m3u8 playlist on your own storage/CDN.",
  file: "A filename you've placed in backend/media/ (served by the backend).",
};

export function Admin() {
  const { user, loggedIn } = useAuth();
  const { toast } = useToast();

  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [sources, setSources] = useState({ media: [], bucket: { configured: false, items: [], error: null } });

  // Internet Archive search (public-domain / CC films)
  const [iaQ, setIaQ] = useState("");
  const [iaResults, setIaResults] = useState([]);
  const [iaSearching, setIaSearching] = useState(false);
  const [iaItem, setIaItem] = useState(null); // { identifier, title, details_url, license_url, files }
  const [iaLoadingFiles, setIaLoadingFiles] = useState(false);

  const isAdmin = loggedIn && user?.is_admin;

  const load = useCallback(() => {
    setLoading(true);
    api
      .adminListCatalog()
      .then(setCatalog)
      .catch((e) => toast(e.message || "Failed to load catalog", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  // Auto-list playable sources you control (server media + your cloud bucket).
  useEffect(() => {
    if (isAdmin) api.adminListSources().then(setSources).catch(() => {});
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6">
        <ShieldCheck className="text-accent" size={36} />
        <h1 className="text-2xl font-black text-white">Admin access required</h1>
        <p className="text-muted max-w-md">
          The licensing CMS is only available to admin accounts. Sign in with an admin account to manage which titles are cleared to stream.
        </p>
        <Link to="/" className="gradient-accent text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition mt-2">
          Back to Home
        </Link>
      </div>
    );
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const resetForm = () => setForm(EMPTY);

  // Fill the source fields from a picked library item (server file or bucket object).
  const pickSource = (s) => {
    setForm((f) => ({ ...f, source_type: s.source_type, source_url: s.source_url }));
    if (s.ephemeral) {
      toast("Temporary preview URL — set CINEMII_S3_PUBLIC_BASE_URL for a permanent link", "info");
    }
  };

  const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(0)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

  const iaSearch = async (e) => {
    e?.preventDefault();
    if (!iaQ.trim()) return;
    setIaSearching(true);
    setIaItem(null);
    try {
      setIaResults(await api.adminArchiveSearch(iaQ.trim()));
    } catch (err) {
      toast(err.message || "Archive search failed", "error");
    } finally {
      setIaSearching(false);
    }
  };

  const iaOpen = async (item) => {
    setIaLoadingFiles(true);
    setIaItem({ ...item, files: [] });
    try {
      setIaItem(await api.adminArchiveFiles(item.identifier));
    } catch (err) {
      toast(err.message || "Could not load files", "error");
      setIaItem(null);
    } finally {
      setIaLoadingFiles(false);
    }
  };

  // Map a (reported, unverified) archive.org license URL to a short label.
  const ccLabel = (url) => {
    if (!url) return "";
    if (/zero|publicdomain|\/mark/i.test(url)) return "Public Domain (reported)";
    const m = url.match(/licenses\/([a-z-]+)/i);
    return m ? `CC ${m[1].toUpperCase()} (reported)` : "Licensed (reported)";
  };

  // Pick a playable file from an Archive item: fill the source + license provenance.
  // The license is the item's REPORTED tag (unverified) — admin must confirm.
  const iaPick = (file, item) => {
    setForm((f) => ({
      ...f,
      source_type: file.source_type,
      source_url: file.source_url,
      license_type: f.license_type || ccLabel(item.license_url),
      rights_holder: f.rights_holder || "Internet Archive",
      license_ref: item.details_url || f.license_ref,
      title: f.title || item.title || "",
    }));
    toast("Source filled — VERIFY this item is genuinely public-domain/licensed before publishing", "info");
  };

  const runSearch = async (e) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setSearching(true);
    try {
      const data = await searchMulti(q.trim());
      setResults((data.results || []).filter((r) => r.media_type === "movie").slice(0, 8));
    } catch (err) {
      toast(err.message || "Search failed", "error");
    } finally {
      setSearching(false);
    }
  };

  const pickMovie = (m) => {
    set("tmdb_id", String(m.id));
    set("title", m.title || m.name || "");
    set("poster_path", m.poster_path || "");
    setResults([]);
    setQ("");
  };

  const edit = (row) => {
    setForm({
      ...EMPTY,
      ...row,
      tmdb_id: String(row.tmdb_id),
      expires_at: row.expires_at ? String(row.expires_at).slice(0, 16) : "",
      license_type: row.license_type || "",
      rights_holder: row.rights_holder || "",
      license_ref: row.license_ref || "",
      poster_path: row.poster_path || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (row) => {
    if (!window.confirm(`Remove "${row.title || row.tmdb_id}" from the licensed catalog?`)) return;
    try {
      await api.adminDeleteCatalog(row.id);
      toast("Removed", "success");
      if (form.id === row.id) resetForm();
      load();
    } catch (e) {
      toast(e.message || "Delete failed", "error");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.tmdb_id || !form.source_url.trim()) {
      toast("TMDB id and source URL are required", "error");
      return;
    }
    const payload = {
      media_type: "movie",
      tmdb_id: String(form.tmdb_id),
      title: form.title || null,
      poster_path: form.poster_path || null,
      source_type: form.source_type,
      source_url: form.source_url.trim(),
      license_type: form.license_type || null,
      rights_holder: form.rights_holder || null,
      license_ref: form.license_ref || null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
    };
    setSaving(true);
    try {
      if (form.id) {
        await api.adminUpdateCatalog(form.id, payload);
        toast("Updated", "success");
      } else {
        await api.adminCreateCatalog(payload);
        toast("Added to licensed catalog", "success");
      }
      resetForm();
      load();
    } catch (err) {
      toast(err.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent";

  return (
    <div className="min-h-screen pt-24 pb-20 max-w-5xl mx-auto px-4 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-black text-white flex items-center gap-2">
          <ShieldCheck className="text-accent" size={26} /> Licensing CMS
        </h1>
        <p className="text-muted mt-1 text-sm">
          The allowlist of titles you're cleared to stream. Only titles listed here (active &amp; unexpired) will play.
        </p>
        <Link to="/admin/movie-sources" className="inline-flex items-center gap-1.5 mt-3 text-sm text-accent hover:underline">
          <Film size={14} /> Movie Sources — backend-proposed WebTorrent sources
        </Link>
      </header>

      {/* Form */}
      <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{form.id ? "Edit title" : "Add a licensed title"}</h2>
          {form.id && (
            <button type="button" onClick={resetForm} className="text-xs text-muted hover:text-white flex items-center gap-1">
              <X size={13} /> Cancel edit
            </button>
          )}
        </div>

        {/* TMDB search */}
        {!form.id && (
          <div className="mb-4">
            <label className="block text-xs text-muted mb-1">Find the movie on TMDB</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch(e)}
                  placeholder="Search title…"
                  className={inputCls + " pl-9"}
                />
              </div>
              <button type="button" onClick={runSearch} disabled={searching} className="px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition disabled:opacity-50">
                {searching ? "…" : "Search"}
              </button>
            </div>
            {results.length > 0 && (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {results.map((m) => (
                  <button key={m.id} type="button" onClick={() => pickMovie(m)} className="text-left rounded-lg border border-white/10 hover:border-accent overflow-hidden transition">
                    {m.poster_path ? (
                      <img src={imgUrl(m.poster_path, "w185")} alt="" className="w-full aspect-[2/3] object-cover" />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-white/5" />
                    )}
                    <span className="block px-2 py-1 text-[11px] text-white truncate">{m.title} {m.release_date ? `(${m.release_date.slice(0, 4)})` : ""}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted mb-1">TMDB ID *</label>
            <input value={form.tmdb_id} onChange={(e) => set("tmdb_id", e.target.value)} className={inputCls} placeholder="e.g. 45745" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Title</label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Delivery type</label>
            <select value={form.source_type} onChange={(e) => set("source_type", e.target.value)} className={inputCls}>
              {SOURCE_TYPES.map((t) => (
                <option key={t} value={t} className="bg-black">{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">License type</label>
            <input value={form.license_type} onChange={(e) => set("license_type", e.target.value)} className={inputCls} placeholder="Owned / CC-BY / Distributor…" />
          </div>

          {/* Pick from your own libraries (no manual URL typing) */}
          <div className="sm:col-span-2">
            <label className="block text-xs text-muted mb-1">Pick from your library — sources you control</label>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted mb-1.5">Server media (backend/media/)</p>
                {sources.media.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {sources.media.map((m) => (
                      <button
                        type="button"
                        key={m.source_url}
                        onClick={() => pickSource(m)}
                        className={`px-2.5 py-1 rounded-md border text-xs transition ${
                          form.source_url === m.source_url
                            ? "bg-accent/20 border-accent text-white"
                            : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                        }`}
                        title={`${m.name} · ${fmtSize(m.size)}`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted">No video files in backend/media/.</p>
                )}
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted mb-1.5">Cloud storage (your bucket)</p>
                {!sources.bucket.configured ? (
                  <p className="text-[11px] text-muted">Not configured — set the <code>CINEMII_S3_*</code> env vars to list your bucket.</p>
                ) : sources.bucket.error ? (
                  <p className="text-[11px] text-red-400">{sources.bucket.error}</p>
                ) : sources.bucket.items.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {sources.bucket.items.map((o) => (
                      <button
                        type="button"
                        key={o.key}
                        onClick={() => pickSource(o)}
                        className={`px-2.5 py-1 rounded-md border text-xs transition ${
                          form.source_url === o.source_url
                            ? "bg-accent/20 border-accent text-white"
                            : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                        }`}
                        title={`${o.key} · ${fmtSize(o.size)}`}
                      >
                        {o.key}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted">Bucket is empty.</p>
                )}
              </div>
            </div>
          </div>

          {/* Search Internet Archive — public-domain / CC films */}
          <div className="sm:col-span-2">
            <label className="block text-xs text-muted mb-1 flex items-center gap-1.5">
              <Film size={13} /> Search Internet Archive (public-domain / Creative-Commons films)
            </label>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="flex gap-2">
                <input
                  value={iaQ}
                  onChange={(e) => setIaQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && iaSearch(e)}
                  placeholder="Search archive.org movies…"
                  className={inputCls}
                />
                <button type="button" onClick={iaSearch} disabled={iaSearching} className="px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition disabled:opacity-50">
                  {iaSearching ? "…" : "Search"}
                </button>
              </div>

              {iaResults.length > 0 && !iaItem && (
                <div className="mt-2 space-y-1">
                  {iaResults.map((r) => (
                    <button type="button" key={r.identifier} onClick={() => iaOpen(r)} className="w-full text-left px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs text-white transition flex items-center justify-between gap-2">
                      <span className="truncate">{r.title} {r.year ? <span className="text-muted">({r.year})</span> : null}</span>
                      <span className="text-[10px] text-muted shrink-0">{ccLabel(r.license_url) || "license?"}</span>
                    </button>
                  ))}
                </div>
              )}

              {iaItem && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-white font-semibold truncate">{iaItem.title}</p>
                    <button type="button" onClick={() => setIaItem(null)} className="text-[11px] text-muted hover:text-white flex items-center gap-1">
                      <X size={12} /> back
                    </button>
                  </div>
                  {iaLoadingFiles ? (
                    <p className="text-[11px] text-muted">Loading files…</p>
                  ) : iaItem.files?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {iaItem.files.map((f) => (
                        <button
                          type="button"
                          key={f.source_url}
                          onClick={() => iaPick(f, iaItem)}
                          className={`px-2.5 py-1 rounded-md border text-xs transition ${
                            form.source_url === f.source_url ? "bg-accent/20 border-accent text-white" : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                          }`}
                          title={`${f.name} · ${fmtSize(f.size)}`}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted">No browser-playable video files in this item.</p>
                  )}
                  <a href={iaItem.details_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline mt-2">
                    <ExternalLink size={11} /> Verify rights on archive.org
                  </a>
                </div>
              )}
              <p className="text-[11px] text-muted mt-2">
                Internet Archive hosts public-domain &amp; CC films. Confirm each item's license before publishing — not everything there is free to redistribute.
              </p>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-muted mb-1">Source URL *</label>
            <input value={form.source_url} onChange={(e) => set("source_url", e.target.value)} className={inputCls} placeholder={form.source_type === "webtorrent" ? "magnet:?xt=…" : "https://…"} />
            <p className="text-[11px] text-muted mt-1">{SOURCE_HINT[form.source_type]} — or pick from your library / Archive above.</p>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Rights holder</label>
            <input value={form.rights_holder} onChange={(e) => set("rights_holder", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">License expires (optional)</label>
            <input type="datetime-local" value={form.expires_at} onChange={(e) => set("expires_at", e.target.value)} className={inputCls} />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-muted mb-1">License reference / proof (note or URL)</label>
            <input value={form.license_ref} onChange={(e) => set("license_ref", e.target.value)} className={inputCls} placeholder="Link to the agreement, or a note on why this is cleared" />
          </div>

          <label className="flex items-center gap-2 text-sm text-white">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="accent-accent" />
            Active (playable)
          </label>
        </div>

        <div className="mt-5">
          <button type="submit" disabled={saving} className="gradient-accent text-white font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition disabled:opacity-50 inline-flex items-center gap-2">
            <Plus size={16} /> {saving ? "Saving…" : form.id ? "Save changes" : "Add to catalog"}
          </button>
        </div>
      </form>

      {/* List */}
      <h2 className="text-lg font-bold text-white mb-3">Licensed catalog ({catalog.length})</h2>
      {loading ? (
        <div className="py-10 flex justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : catalog.length === 0 ? (
        <p className="text-muted text-sm py-6">No licensed titles yet. Add one above.</p>
      ) : (
        <div className="space-y-2">
          {catalog.map((row) => (
            <div key={row.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              {row.poster_path ? (
                <img src={imgUrl(row.poster_path, "w92")} alt="" className="w-10 h-15 rounded object-cover shrink-0" />
              ) : (
                <div className="w-10 h-15 rounded bg-white/5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">
                  {row.title || "(untitled)"} <span className="text-muted font-normal">· TMDB {row.tmdb_id}</span>
                </p>
                <p className="text-[12px] text-muted truncate">
                  <span className="text-gray-300">{row.source_type}</span>
                  {row.license_type ? ` · ${row.license_type}` : ""}
                  {row.rights_holder ? ` · ${row.rights_holder}` : ""}
                  {row.expires_at ? ` · expires ${String(row.expires_at).slice(0, 10)}` : ""}
                  {row.is_active ? "" : " · INACTIVE"}
                </p>
              </div>
              <button onClick={() => edit(row)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition" title="Edit" aria-label="Edit">
                <Pencil size={14} />
              </button>
              <button onClick={() => remove(row)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-600 text-white flex items-center justify-center transition" title="Remove" aria-label="Remove">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
