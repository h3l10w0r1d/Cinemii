const activities = [
    {
        avatar: "M",
        name: "Michael",
        action: "started watching",
        movie: "Interstellar",
        time: "2 min ago"
    },
    {
        avatar: "E",
        name: "Emma",
        action: "added to favorites",
        movie: "Dune",
        time: "8 min ago"
    },
    {
        avatar: "D",
        name: "Daniel",
        action: "joined Global Show",
        movie: "Oppenheimer",
        time: "14 min ago"
    },
    {
        avatar: "S",
        name: "Sofia",
        action: "rated",
        movie: "The Matrix",
        time: "21 min ago"
    }
];

export function getActivityFeed() {
    return activities;
}