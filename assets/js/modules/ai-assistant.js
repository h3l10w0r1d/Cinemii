import {
    API_KEY,
    BASE_URL,
    IMG
} from "../core/api.js";

const aiBtn =
    document.getElementById("aiBtn");

const aiModal =
    document.getElementById("aiModal");

const aiClose =
    document.getElementById("aiClose");

const aiInput =
    document.getElementById("aiInput");

const aiSearchBtn =
    document.getElementById("aiSearchBtn");

const aiResults =
    document.getElementById("aiResults");

export function initAIAssistant() {

    aiBtn?.addEventListener("click", () => {
    window.scrollTo(0, 0);
    aiModal.classList.add("active");
    document.body.classList.add("modal-open");
});

    aiModal.classList.remove("active");
document.body.classList.remove("modal-open");

    aiModal?.addEventListener("click", e => {
        if (e.target === aiModal) {
            aiModal.classList.remove("active");
            document.body.classList.remove("modal-open");
        }
    });

    aiSearchBtn?.addEventListener("click", searchAI);

    aiInput?.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            searchAI();
        }
    });
}

async function searchAI() {

    const query =
        aiInput.value.trim();

    if (!query) return;

    aiResults.innerHTML =
        `<p class="ai-loading">AI is searching cinematic universe...</p>`;

    try {

        const res = await fetch(
            `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
        );

        const data =
            await res.json();

        const results =
            (data.results || [])
                .filter(item =>
                    (item.media_type === "movie" || item.media_type === "tv") &&
                    item.poster_path
                )
                .slice(0, 8);

        renderAIResults(results);

    } catch (error) {

        aiResults.innerHTML =
            `<p class="ai-loading">AI failed. Try again.</p>`;
    }
}

function renderAIResults(items) {

    if (!items.length) {
        aiResults.innerHTML =
            `<p class="ai-loading">No cinematic matches found.</p>`;
        return;
    }

    aiResults.innerHTML =
        items.map(item => `
            <div
                class="ai-result-card"
                data-id="${item.id}"
                data-type="${item.media_type}"
            >

                <img
                    src="${IMG + item.poster_path}"
                    alt="${item.title || item.name}"
                >

                <div>
                    <h4>
                        ${item.title || item.name}
                    </h4>

                    <p>
                        ${item.media_type === "tv" ? "TV Series" : "Movie"}
                        • ⭐ ${item.vote_average?.toFixed(1) || "N/A"}
                    </p>
                </div>

            </div>
        `).join("");

    aiResults
        .querySelectorAll(".ai-result-card")
        .forEach(card => {

            card.addEventListener("click", () => {

                localStorage.setItem(
                    "cinemii_selected_movie",
                    JSON.stringify({
                        id: card.dataset.id,
                        media_type: card.dataset.type
                    })
                );

                window.location.href =
                    "./pages/movie.html";
            });
        });
}