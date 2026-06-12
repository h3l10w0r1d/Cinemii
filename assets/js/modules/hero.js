import {
    API_KEY,
    BASE_URL,
    BACKDROP
} from "../core/api.js";

const hero =
    document.querySelector(".hero");

let movies = [];
let index = 0;

export async function initHeroSlider() {

    if (!hero) return;

    try {

        const response = await fetch(
            `${BASE_URL}/trending/movie/week?api_key=${API_KEY}`
        );

        const data =
            await response.json();

        movies =
            data.results
                .filter(movie => {

                    const title =
                        movie.title || movie.name || "";

                    return (
                        title.length < 38 &&
                        movie.backdrop_path &&
                        movie.overview
                    );
                })
                .slice(0, 10);

        if (!movies.length) return;

        hero.innerHTML = "";

        renderHero(movies[0]);

        setInterval(() => {

            index++;

            if (index >= movies.length) {
                index = 0;
            }

            renderHero(movies[index]);

        }, 6000);

    } catch (error) {

        console.log("Hero error:", error);
    }
}

function renderHero(movie) {

    const title =
        movie.title || movie.name || "CINEMII";

    const shortTitle =
        title.length > 32
            ? title.slice(0, 32) + "..."
            : title;

    const image =
        BACKDROP + movie.backdrop_path;

    const nextHero =
        document.createElement("div");

    nextHero.className =
        "hero-slide hero-slide-next";

    nextHero.innerHTML = `

        <div
            class="hero-blur-bg"
            style="background-image:url('${image}')"
        ></div>

        <div
            class="hero-backdrop"
            style="background-image:url('${image}')"
        ></div>

        <div class="hero-overlay"></div>

        <div class="hero-content">

            <span class="hero-subtitle">
                NOW STREAMING
            </span>

            <h1 class="hero-title">
                ${shortTitle}
            </h1>

            <p class="hero-description">
                ${movie.overview || "No description available."}
            </p>

            <div class="hero-buttons">

                <button class="primary-btn">
                    ▶ Watch Now
                </button>

                <button class="secondary-btn">
                    More Info
                </button>

            </div>

        </div>

    `;

    const oldSlide =
        hero.querySelector(".hero-slide");

    hero.appendChild(nextHero);

    requestAnimationFrame(() => {
        nextHero.classList.add("active");
    });

    setTimeout(() => {
        oldSlide?.remove();
        nextHero.classList.remove("hero-slide-next");
    }, 900);

    nextHero
        .querySelector(".primary-btn")
        .onclick = () => openMovie(movie);

    nextHero
        .querySelector(".secondary-btn")
        .onclick = () => openMovie(movie);
}

function openMovie(movie) {

    localStorage.setItem(
        "cinemii_selected_movie",
        JSON.stringify(movie)
    );

    window.location.href =
        "./pages/movie.html";
}