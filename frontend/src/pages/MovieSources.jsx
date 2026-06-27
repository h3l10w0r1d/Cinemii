import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search, ShieldCheck, AlertTriangle, Film, Server, Users,
  CheckCircle2, Power, Trash2, Loader2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { api } from "../core/backend";
import { searchMulti, imgUrl } from "../core/tmdb";

// =============================================================================
// Movie Sources CMS (admin).
//
// Magnets are NEVER typed here. The backend PROPOSES WebTorrent sources for a
// TMDB id; the admin reviews them, picks one, confirms rights, and saves. The
// public player only ever plays sources that were saved AND rights-confirmed
// AND active here.
// =============================================================================

const fmtSize = (b) =>
  !b ? "—" : b > 1073741824 ? `${(b / 1073741824).toFixed(2)} GB` : `${(b / 1048576).toFixed(0)} MB`;

const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent";

export function MovieSources() {
  const { user, loggedIn } = useAuth();
  const { toast } = useToast();
  const isAdmin = loggedIn && user?.is_admin;

  // Saved sources
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  // Movie selection (TMDB)
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [movie, setMovie] = useState(null); // { id, title, poster_path }

  // Proposals
  const [proposals, setProposals] = useState(null); // null=not requested, []=none
  const [provider, setProvider] = useState("");
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [selected, setSelected] = useState(null); // chosen proposal object

  // Rights confirmation
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [rightsNote, setRightsNote] = useState("");
  const [rightsHolder, setRightsHolder] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .adminListMovieSources()
      .then(setSaved)
      .catch((e) => toast(e.message || "Failed to load movie sources", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6">
        <ShieldCheck className="text-accent" size={36} />
        <h1 className="text-2xl font-black text-white">Admin access required</h1>
        <p className="text-muted max-w-md">
          Movie Sources is only available to admin accounts.
        </p>
        <Link to="/" className="gradient-accent text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition mt-2">
          Back to Home
        </Link>
      </div>
    );
  }

  const resetSelection = () => {
    setProposals(null);
    setProvider("");
    setSelected(null);
    setRightsConfirmed(false);
    setRightsNote("");
    setRightsHolder("");
    setLicenseType("");
    setExpiresAt("");
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
    setMovie({ id: String(m.id), title: m.title || m.name || "", poster_path: m.poster_path || "" });
    setResults([]);
    setQ("");
    resetSelection();
  };

  const requestProposals = async () => {
    if (!movie?.id) return;
    setLoadingProposals(true);
    setProposals(null);
    setSelected(null);
    try {
      const data = await api.adminMovieSourceProposals(movie.id);
      setProposals(data.proposals || []);
      setProvider(data.provider || "");
      if (!data.proposals?.length) toast("No sources proposed for this movie.", "info");
    } catch (err) {
      toast(err.message || "Proposal request failed", "error");
      setProposals([]);
    } finally {
      setLoadingProposals(false);
    }
  };

  const save = async () => {
    if (!movie?.id || !selected) {
      toast("Pick a movie and a proposed source first.", "error");
      return;
    }
    if (!rightsConfirmed) {
      toast("Confirm Cinemii has the rights before saving.", "error");
      return;
    }
    setSaving(true);
    try {
      await api.adminCreateMovieSource({
        tmdb_id: movie.id,
        title: movie.title || null,
        poster_path: movie.poster_path || null,
        source_type: selected.source_type,
        magnet_uri: selected.magnet_uri,
        source_provider: selected.source_provider || null,
        info_hash: selected.info_hash || null,
        quality: selected.quality || null,
        language: selected.language || null,
        file_size: selected.file_size ?? null,
        seeders: selected.seeders ?? null,
        peers: selected.peers ?? null,
        rights_confirmed: true,
        rights_note: rightsNote || null,
        rights_holder: rightsHolder || null,
        license_type: licenseType || selected.license_hint || null,
        rights_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        is_active: true,
      });
      toast("Saved & approved — this movie can now stream.", "success");
      setMovie(null);
      resetSelection();
      load();
    } catch (err) {
      toast(err.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row) => {
    try {
      if (row.is_active) {
        await api.adminDeactivateMovieSource(row.id);
        toast("Deactivated — public playback blocked.", "success");
      } else {
        await api.adminUpdateMovieSource(row.id, { is_active: true });
        toast("Activated.", "success");
      }
      load();
    } catch (err) {
      toast(err.message || "Update failed", "error");
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete the source for "${row.title || row.tmdb_id}"?`)) return;
    try {
      await api.adminDeleteMovieSource(row.id);
      toast("Deleted.", "success");
      load();
    } catch (err) {
      toast(err.message || "Delete failed", "error");
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 max-w-5xl mx-auto px-4 sm:px-6">
      <header className="mb-5">
        <h1 className="text-3xl font-black text-white flex items-center gap-2">
          <Film className="text-accent" size={26} /> Movie Sources
        </h1>
        <p className="text-muted mt-1 text-sm">
          Select movies Cinemii has the right to stream. Sources are proposed by the backend — you don't paste magnets.
        </p>
      </header>

      {/* Legal warning */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 mb-8">
        <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />
        <p className="text-amber-100/90 text-sm">
          Only approve sources for movies Cinemii has the legal right to stream. Public playback is blocked
          unless rights are confirmed and the source is active.
        </p>
      </div>

      {/* Step 1 — pick a movie */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-6">
        <h2 className="text-lg font-bold text-white mb-3">1 · Select a movie</h2>
        {!movie ? (
          <div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch(e)}
                  placeholder="Search a movie by title…"
                  className={inputCls + " pl-9"}
                />
              </div>
              <button type="button" onClick={runSearch} disabled={searching} className="px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition disabled:opacity-50">
                {searching ? "…" : "Search"}
              </button>
            </div>
            {results.length > 0 && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {results.map((m) => (
                  <button key={m.id} type="button" onClick={() => pickMovie(m)} className="text-left rounded-lg border border-white/10 hover:border-accent overflow-hidden transition">
                    {m.poster_path ? (
                      <img src={imgUrl(m.poster_path, "w185")} alt="" className="w-full aspect-[2/3] object-cover" />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-white/5" />
                    )}
                    <span className="block px-2 py-1 text-[11px] text-white truncate">
                      {m.title} {m.release_date ? `(${m.release_date.slice(0, 4)})` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {movie.poster_path ? (
              <img src={imgUrl(movie.poster_path, "w92")} alt="" className="w-12 rounded object-cover" />
            ) : (
              <div className="w-12 h-16 rounded bg-white/5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">{movie.title || "(untitled)"}</p>
              <p className="text-muted text-xs">TMDB {movie.id}</p>
            </div>
            <button type="button" onClick={() => { setMovie(null); resetSelection(); }} className="text-xs text-muted hover:text-white">
              Change
            </button>
          </div>
        )}
      </section>

      {/* Step 2 — backend proposals */}
      {movie && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">2 · Proposed sources</h2>
            <button type="button" onClick={requestProposals} disabled={loadingProposals} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition disabled:opacity-50 inline-flex items-center gap-2">
              {loadingProposals ? <Loader2 size={15} className="animate-spin" /> : <Server size={15} />}
              {loadingProposals ? "Requesting…" : "Request proposals from backend"}
            </button>
          </div>

          {proposals === null ? (
            <p className="text-muted text-sm">Ask the backend which WebTorrent sources are available for this movie.</p>
          ) : proposals.length === 0 ? (
            <p className="text-muted text-sm">No sources proposed for this movie.</p>
          ) : (
            <div className="space-y-2">
              {provider && <p className="text-[11px] text-muted">Provider: <span className="text-gray-300">{provider}</span></p>}
              {proposals.map((p, i) => {
                const picked = selected === p;
                return (
                  <button
                    type="button"
                    key={p.info_hash || i}
                    onClick={() => setSelected(p)}
                    className={`w-full text-left rounded-xl border p-3 transition ${
                      picked ? "border-accent bg-accent/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm truncate">{p.title || "WebTorrent source"}</span>
                      {p.is_test && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/90 text-black text-[9px] font-bold uppercase">Test</span>
                      )}
                      {picked && <CheckCircle2 size={15} className="text-accent ml-auto shrink-0" />}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                      {p.quality && <span className="text-gray-300">{p.quality}</span>}
                      {p.language && <span>lang: {p.language}</span>}
                      <span>{fmtSize(p.file_size)}</span>
                      <span className="inline-flex items-center gap-1"><Users size={11} /> {p.seeders ?? "?"}S / {p.peers ?? "?"}P</span>
                      <span>via {p.source_provider}</span>
                    </div>
                    {p.license_hint && <p className="mt-1 text-[11px] text-emerald-300/80">{p.license_hint}</p>}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Step 3 — confirm rights & save */}
      {movie && selected && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-8">
          <h2 className="text-lg font-bold text-white mb-3">3 · Confirm rights &amp; approve</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">Rights holder</label>
              <input value={rightsHolder} onChange={(e) => setRightsHolder(e.target.value)} className={inputCls} placeholder="e.g. Blender Foundation" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">License type</label>
              <input value={licenseType} onChange={(e) => setLicenseType(e.target.value)} className={inputCls} placeholder="Owned / CC-BY / Distributor…" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted mb-1">Rights note / proof</label>
              <input value={rightsNote} onChange={(e) => setRightsNote(e.target.value)} className={inputCls} placeholder="Link to the agreement, or a note on why this is cleared" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Rights expiration (optional)</label>
              <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={inputCls} />
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm text-white mt-4">
            <input type="checkbox" checked={rightsConfirmed} onChange={(e) => setRightsConfirmed(e.target.checked)} className="accent-accent mt-0.5" />
            <span>I confirm Cinemii has the legal right to stream this movie from the selected source.</span>
          </label>

          <div className="mt-5">
            <button type="button" onClick={save} disabled={saving || !rightsConfirmed} className="gradient-accent text-white font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition disabled:opacity-50 inline-flex items-center gap-2">
              <CheckCircle2 size={16} /> {saving ? "Saving…" : "Approve & save source"}
            </button>
          </div>
        </section>
      )}

      {/* Saved sources */}
      <h2 className="text-lg font-bold text-white mb-3">Saved movie sources ({saved.length})</h2>
      {loading ? (
        <div className="py-10 flex justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : saved.length === 0 ? (
        <p className="text-muted text-sm py-6">No movie sources yet. Select a movie above to start.</p>
      ) : (
        <div className="space-y-2">
          {saved.map((row) => {
            const expired = row.expires_at && new Date(row.expires_at) < new Date();
            const live = row.is_active && row.rights_confirmed && !expired;
            return (
              <div key={row.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                {row.poster_path ? (
                  <img src={imgUrl(row.poster_path, "w92")} alt="" className="w-10 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-15 rounded bg-white/5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">
                    {row.title || "(untitled)"} <span className="text-muted font-normal">· TMDB {row.tmdb_id}</span>
                  </p>
                  <p className="text-[12px] text-muted truncate">
                    {row.quality ? `${row.quality} · ` : ""}{fmtSize(row.file_size)}
                    {row.source_provider ? ` · via ${row.source_provider}` : ""}
                    {row.expires_at ? ` · expires ${String(row.expires_at).slice(0, 10)}` : ""}
                  </p>
                  <p className="text-[11px] mt-0.5">
                    {live ? (
                      <span className="text-emerald-400">● Live — streamable</span>
                    ) : (
                      <span className="text-red-400">
                        ● Blocked{!row.rights_confirmed ? " · rights not confirmed" : ""}{!row.is_active ? " · inactive" : ""}{expired ? " · expired" : ""}
                      </span>
                    )}
                  </p>
                </div>
                <button onClick={() => toggleActive(row)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition" title={row.is_active ? "Deactivate" : "Activate"} aria-label="Toggle active">
                  <Power size={14} className={row.is_active ? "text-emerald-400" : ""} />
                </button>
                <button onClick={() => remove(row)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-600 text-white flex items-center justify-center transition" title="Delete" aria-label="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
