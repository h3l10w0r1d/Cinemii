function openMovie(movieId) {

    sessionStorage.setItem(
        "cinemii-current-movie",
        movieId
    );

    window.location.href =
        `pages/movie.html?id=${movieId}`;
}

function goHome() {
    window.location.href = "../index.html";
}

export {
    openMovie,
    goHome
};