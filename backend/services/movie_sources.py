"""Backend WebTorrent source PROPOSAL service (movie-only).

This is the single place that decides which WebTorrent sources are *proposed*
to an admin for a given movie. The frontend/client never supplies or builds a
magnet URI — it only ever receives proposals from here (admin-only) and, once an
admin confirms rights, the chosen proposal is persisted as a LicensedTitle row.

Design:
  * propose(tmdb_id) -> list[ProposedSource]   (the admin-only proposal feed)
  * A provider is pluggable via CINEMII_MOVIE_SOURCE_PROVIDER. The default
    "dev-test" provider returns exactly ONE legal Creative-Commons test source
    (Blender's "Sintel", CC-BY 3.0) so the end-to-end flow can be exercised
    without touching copyrighted content.

LEGAL CONTRACT for any real provider added here:
  * It MUST only ever propose sources the operator has the right to stream
    (public-domain / Creative-Commons / owned / licensed). A provider that
    proxies a public torrent indexer for arbitrary commercial movies is a
    piracy tool and MUST NOT be added.
  * Proposing a source is NOT clearance. An admin must still confirm rights in
    the CMS before the source is saved/activated, and the public gate enforces
    rights_confirmed + is_active + non-expired before anything plays.
"""

from __future__ import annotations

import os
import re
from dataclasses import asdict, dataclass
from typing import List, Optional
from urllib.parse import parse_qs, urlsplit

# --- Proposed-source value object -------------------------------------------


@dataclass
class ProposedSource:
    """A single WebTorrent source proposed for a movie. Display + save payload.

    Note: this object is NEVER returned to the public/player API. It is only
    served to admins via GET /api/admin/movie-sources/proposals.
    """

    source_type: str          # always "webtorrent" here
    magnet_uri: str
    source_provider: str      # which provider proposed it
    info_hash: Optional[str] = None
    title: Optional[str] = None
    quality: Optional[str] = None
    file_size: Optional[int] = None   # bytes
    language: Optional[str] = None
    seeders: Optional[int] = None
    peers: Optional[int] = None
    # A human hint about why this is (claimed to be) legal. The admin still
    # verifies and confirms rights before saving.
    license_hint: Optional[str] = None
    # True for the built-in Creative-Commons test source; surfaced in the UI so
    # nobody mistakes the demo torrent for real licensed content.
    is_test: bool = False

    def to_dict(self) -> dict:
        return asdict(self)


# --- Helpers ----------------------------------------------------------------

_BTIH_RE = re.compile(r"urn:btih:([0-9a-zA-Z]+)")


def info_hash_from_magnet(magnet_uri: str) -> Optional[str]:
    """Extract the lowercased hex/base32 infohash from a magnet URI."""
    if not magnet_uri:
        return None
    # Try the structured query first, then a permissive regex fallback.
    try:
        qs = parse_qs(urlsplit(magnet_uri).query)
        for xt in qs.get("xt", []):
            m = _BTIH_RE.search(xt)
            if m:
                return m.group(1).lower()
    except ValueError:
        pass
    m = _BTIH_RE.search(magnet_uri)
    return m.group(1).lower() if m else None


# --- Providers --------------------------------------------------------------

# Blender Foundation — "Sintel" (2010), CC-BY 3.0. The canonical WebTorrent demo
# torrent; legal to distribute. Includes an HTTPS web seed (ws=) so it plays in
# the browser even with zero live peers — ideal for exercising the pipeline.
_SINTEL_MAGNET = (
    "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10"
    "&dn=Sintel"
    "&tr=udp%3A%2F%2Fexplodie.org%3A6969"
    "&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337"
    "&tr=wss%3A%2F%2Ftracker.btorrent.xyz"
    "&tr=wss%3A%2F%2Ftracker.openwebtorrent.com"
    "&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F"
    "&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent"
)


def _dev_test_provider(tmdb_id: str) -> List[ProposedSource]:
    """Return one legal CC test source for ANY movie, for pipeline testing.

    This deliberately ignores tmdb_id and always proposes Sintel so the
    end-to-end flow (propose → review → confirm rights → save → play) can be
    demonstrated without copyrighted torrents. Replace with a real, rights-aware
    provider before release (see module docstring + ROADMAP).
    """
    magnet = _SINTEL_MAGNET
    return [
        ProposedSource(
            source_type="webtorrent",
            magnet_uri=magnet,
            source_provider="dev-test",
            info_hash=info_hash_from_magnet(magnet),
            title="Sintel (CC-BY 3.0 test source)",
            quality="1080p",
            file_size=129_241_752,
            language="en",
            seeders=None,
            peers=None,
            license_hint="Creative Commons CC-BY 3.0 — Blender Foundation",
            is_test=True,
        )
    ]


# Registry of providers. Add real, rights-filtered providers here keyed by name.
_PROVIDERS = {
    "dev-test": _dev_test_provider,
}


def active_provider_name() -> str:
    return os.environ.get("CINEMII_MOVIE_SOURCE_PROVIDER", "dev-test").strip() or "dev-test"


def propose_movie_sources(tmdb_id: str) -> List[ProposedSource]:
    """Return proposed WebTorrent sources for a movie (admin-only feed).

    Always returns a list (possibly empty). Never raises for an unknown movie —
    an empty list simply means "no source proposed".
    """
    provider = _PROVIDERS.get(active_provider_name(), _dev_test_provider)
    return provider(str(tmdb_id))
