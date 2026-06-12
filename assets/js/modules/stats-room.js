export function getStatsRoomData() {

    const favorites =
        JSON.parse(localStorage.getItem("favorites")) || [];

    const continueWatching =
        JSON.parse(localStorage.getItem("cinemii_continue_watching")) || [];

    const xp =
        Number(localStorage.getItem("cinemii_xp")) || 0;

    const watched =
        continueWatching.length;

    const totalHours =
        Math.max(watched * 2, 0);

    const rank =
        xp >= 1000
            ? "CINEMII Legend"
            : xp >= 500
                ? "Cinematic Soul"
                : xp >= 100
                    ? "Movie Explorer"
                    : "New Viewer";

    return {
        watched,
        favorites: favorites.length,
        totalHours,
        rank,
        nightOwl: watched > 3 ? "72%" : "18%",
        profilePower: Math.min(100, xp / 10)
    };
}