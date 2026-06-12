import {
    API_KEY,
    BASE_URL,
    IMG
} from "../core/api.js";

const input =
    document.getElementById("searchInput");

let dropdown;
let timer;

export function initSearch() {

    if (!input) return;

    createDropdown();

    input.addEventListener("input", () => {

        clearTimeout(timer);

        const query =
            input.value.trim();

        if (!query) {
            closeDropdown();
            return;
        }

        timer = setTimeout(() => {
            searchAll(query);
        }, 350);
    });

    document.addEventListener("click", e => {

        if (!e.target.closest(".search-box")) {
            closeDropdown();
        }
    });
}

function createDropdown() {

    dropdown =
        document.createElement("div");

    dropdown.className =
        "premium-search-dropdown";

    input
        .closest(".search-box")
        .appendChild(dropdown);
}

async function searchAll(query) {

    dropdown.innerHTML = `
        <div class="search-loading">
            Searching movies & series...
        </div>
    `;

    dropdown.classList.add("active");

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
                );

        renderResults(results);

    } catch (error) {

        dropdown.innerHTML = `
            <div class="search-empty">
                Search failed
            </div>
        `;
    }
}

function renderResults(items) {

    if (!items.length) {

        dropdown.innerHTML = `
            <div class="search-empty">
                No movies or series found
            </div>
        `;

        return;
    }

    dropdown.innerHTML =
        items.slice(0, 8).map(item => {

            const title =
                item.title || item.name;

            const date =
                item.release_date || item.first_air_date || "";

            const year =
                date ? date.slice(0, 4) : "N/A";

            const type =
                item.media_type === "tv"
                    ? "TV Series"
                    : "Movie";

            return `
                <div
                    class="premium-search-item"
                    data-id="${item.id}"
                    data-type="${item.media_type}"
                >

                    <img
                        src="${IMG + item.poster_path}"
                        alt="${title}"
                    >

                    <div class="search-info">

                        <h4>
                            ${title}
                        </h4>

                        <p>
                            ${type} • ${year} • ⭐ ${item.vote_average?.toFixed(1) || "N/A"}
                        </p>

                    </div>

                    <span class="search-arrow">
                        →
                    </span>

                </div>
            `;
        }).join("");

    dropdown
        .querySelectorAll(".premium-search-item")
        .forEach(item => {

            item.addEventListener("click", () => {

                localStorage.setItem(
                    "cinemii_selected_movie",
                    JSON.stringify({
                        id: item.dataset.id,
                        media_type: item.dataset.type
                    })
                );

                window.location.href =
                    "./pages/movie.html";
            });
        });
}

function closeDropdown() {

    if (!dropdown) return;

    dropdown.classList.remove("active");
}