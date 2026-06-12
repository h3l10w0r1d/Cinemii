export function addXP(amount = 50) {
    let xp = Number(localStorage.getItem("cinemii_xp")) || 8920;
    xp += amount;
    localStorage.setItem("cinemii_xp", xp);
    return xp;
}

export function getXP() {
    return Number(localStorage.getItem("cinemii_xp")) || 8920;
}

export function getLevel() {
    return 27;
}

export function getRank() {
    return "CINEMII Legend";
}

export function getAchievements() {
    return [
        "🎬 Movie Master",
        "🔥 Top Viewer",
        "🚀 CINEMII Legend"
    ];
}