const notifications = [
    {
        icon: "🏆",
        title: "Achievement unlocked",
        text: "Movie Explorer badge is ready"
    },
    {
        icon: "🔥",
        title: "Trending now",
        text: "Dune is exploding worldwide"
    },
    {
        icon: "👥",
        title: "Friend online",
        text: "Emma joined CINEMII"
    },
    {
        icon: "🌍",
        title: "Global Show",
        text: "Interstellar starts soon"
    }
];

export function initNotificationCenter() {
    const btn =
        document.getElementById("notificationBtn");

    const panel =
        document.getElementById("notificationPanel");

    const list =
        document.getElementById("notificationList");

    if (!btn || !panel || !list) return;

    renderNotifications(list);

    btn.addEventListener("click", () => {
        panel.classList.toggle("active");
    });

    document.addEventListener("click", e => {
        if (
            !e.target.closest("#notificationPanel") &&
            !e.target.closest("#notificationBtn")
        ) {
            panel.classList.remove("active");
        }
    });
}

function renderNotifications(list) {
    list.innerHTML =
        notifications.map(item => `
            <div class="notification-item">

                <div class="notification-icon">
                    ${item.icon}
                </div>

                <div>
                    <h4>${item.title}</h4>
                    <p>${item.text}</p>
                </div>

            </div>
        `).join("");
}