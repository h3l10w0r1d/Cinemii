const moods = {
    default: "Default",
    horror: "Horror",
    romance: "Romance",
    scifi: "Sci-Fi",
    cozy: "Cozy",
    cyberpunk: "Cyberpunk"
};

export function initMoodMode() {

    if (document.querySelector(".mood-panel")) return;

    const savedMood =
        localStorage.getItem("cinemii_mood") || "default";

    document.body.dataset.mood = savedMood;

    const panel =
        document.createElement("div");

    panel.className = "mood-panel";

    panel.innerHTML = `
        <button class="mood-main-btn">
            ✨ Mood
        </button>

        <div class="mood-list">
            ${Object.entries(moods).map(([key, value]) => `
                <button data-mood="${key}">
                    ${value}
                </button>
            `).join("")}
        </div>
    `;

    document.body.appendChild(panel);

    panel.querySelector(".mood-main-btn")
        .addEventListener("click", () => {
            panel.classList.toggle("active");
        });

    panel.querySelectorAll("[data-mood]")
        .forEach(btn => {
            btn.addEventListener("click", () => {
                const mood = btn.dataset.mood;

                localStorage.setItem("cinemii_mood", mood);

                document.body.dataset.mood = mood;

                panel.classList.remove("active");
            });
        });
}