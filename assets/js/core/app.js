import { initHeroSlider } from "../modules/hero.js";
import { initSearch } from "../modules/search.js";
import { initMovieGrid, changeCategory } from "../modules/movie-grid.js";
import { initAuth } from "../modules/auth.js";
import { initAIAssistant } from "../modules/ai-assistant.js";
import { initNotificationCenter } from "../modules/notification-center.js";

document.addEventListener("DOMContentLoaded", async () => {
    await initHeroSlider();
    await initMovieGrid();

    initNavbar();
    initSearch();

    initAuth();
    initAIAssistant();
    initNotificationCenter();
});

function initNavbar() {
    document.getElementById("trendingBtn")?.addEventListener("click", () => {
        changeCategory("trending");
    });

    document.getElementById("popularBtn")?.addEventListener("click", () => {
        changeCategory("popular");
    });

    document.getElementById("topRatedBtn")?.addEventListener("click", () => {
        changeCategory("top_rated");
    });

    document.getElementById("tvBtn")?.addEventListener("click", () => {
        changeCategory("tv");
    });

    document.getElementById("profileBtn")?.addEventListener("click", () => {
        window.location.href = "./pages/profile.html";
    });

    document.getElementById("globalShowBtn")?.addEventListener("click", () => {
        window.location.href = "./pages/global-show.html";
    });

    document.getElementById("logoBtn")?.addEventListener("click", () => {
        window.location.href = "./index.html";
    });
}