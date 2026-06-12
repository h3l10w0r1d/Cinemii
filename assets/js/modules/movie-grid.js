import {
    API_KEY,
    BASE_URL,
    IMG
} from "../core/api.js";

const moviesGrid =
    document.getElementById("moviesGrid");

let currentCategory = "popular";
let currentPage = 1;
let isLoading = false;
let loadedMovies = new Set();

export async function initMovieGrid() {
    if (!moviesGrid) return;

    await changeCategory("popular");

    initInfiniteScroll();
}

export async function changeCategory(category) {
    currentCategory = category;
    currentPage = 1;
    loadedMovies.clear();

    await loadMovies(true);
}

async function loadMovies(clear = false) {
    if (isLoading || !moviesGrid) return;

    isLoading = true;

    let endpoint = "movie/popular";

    if (currentCategory === "trending") {
        endpoint = "trending/movie/week";
    }

    if (currentCategory === "popular") {
        endpoint = "movie/popular";
    }

    if (currentCategory === "top_rated") {
        endpoint = "movie/top_rated";
    }

    if (currentCategory === "tv") {
        endpoint = "tv/popular";
    }

    try {
        const response = await fetch(
            `${BASE_URL}/${endpoint}?api_key=${API_KEY}&page=${currentPage}`
        );

        const data = await response.json();

        renderMovies(data.results || [], clear);

    } catch (error) {
        console.log("Movie loading error:", error);
    }

    isLoading = false;
}

function renderMovies(movies, clear = false) {
    if (clear) {
        moviesGrid.innerHTML = "";
    }

    const fragment =
        document.createDocumentFragment();

    movies.forEach(movie => {
        if (!movie.poster_path || loadedMovies.has(movie.id)) return;

        loadedMovies.add(movie.id);

        const card =
            document.createElement("article");

        card.className = "movie-card";

        card.innerHTML = `
            <img
                class="movie-poster"
                src="${IMG}${movie.poster_path}"
                alt="${movie.title || movie.name}"
                loading="lazy"
            >

            <div class="movie-overlay">
                <div class="movie-overlay-content">
                    <h3 class="movie-title">
                        ${movie.title || movie.name}
                    </h3>

                    <div class="movie-rating">
                        ⭐ ${movie.vote_average?.toFixed(1) || "N/A"}
                    </div>
                </div>
            </div>
        `;

        card.addEventListener("click", () => {
            localStorage.setItem(
                "cinemii_selected_movie",
                JSON.stringify({
                    ...movie,
                    media_type:
                        currentCategory === "tv"
                            ? "tv"
                            : "movie"
                })
            );

            window.location.href = "./pages/movie.html";
        });

        fragment.appendChild(card);
    });

    moviesGrid.appendChild(fragment);
}

function initInfiniteScroll() {
    window.addEventListener("scroll", async () => {
        const nearBottom =
            window.innerHeight + window.scrollY >=
            document.body.offsetHeight - 1200;

        if (nearBottom && !isLoading) {
            currentPage++;
            await loadMovies(false);
        }
    });
}