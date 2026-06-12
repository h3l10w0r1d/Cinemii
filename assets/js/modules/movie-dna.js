export function getMovieDNA() {
    const favorites =
        JSON.parse(localStorage.getItem("favorites")) || [];

    const history =
        JSON.parse(localStorage.getItem("cinemii_continue_watching")) || [];

    const all =
        [...favorites, ...history];

    if (!all.length) {
        return [
            { name: "Sci-Fi", value: 20 },
            { name: "Action", value: 15 },
            { name: "Drama", value: 10 },
            { name: "Romance", value: 8 }
        ];
    }

    return [
        { name: "Sci-Fi", value: 82 },
        { name: "Action", value: 64 },
        { name: "Drama", value: 48 },
        { name: "Romance", value: 36 }
    ];
}