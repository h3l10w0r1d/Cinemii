import storage from "./storage.js";

const WATCH_KEY = "cinemii-watch-history";

function addToHistory(movie) {

    let history = storage.get(WATCH_KEY);

    history = history.filter(item => item.id !== movie.id);

    history.unshift(movie);

    history = history.slice(0, 30);

    storage.set(WATCH_KEY, history);
}

function getHistory() {
    return storage.get(WATCH_KEY);
}

export {
    addToHistory,
    getHistory
};