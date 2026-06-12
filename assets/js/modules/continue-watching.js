const KEY = "cinemii_continue_watching";

export function saveContinueWatching(movie) {
    let list = JSON.parse(localStorage.getItem(KEY)) || [];

    list = list.filter(item => item.id !== movie.id);

    list.unshift({
        id: movie.id,
        title: movie.title || movie.name,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        media_type: movie.media_type || "movie",
        progress: 63
    });

    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 12)));
}

export function getContinueWatching() {
    return JSON.parse(localStorage.getItem(KEY)) || [];
}