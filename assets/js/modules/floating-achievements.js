export function showFloatingAchievement(
    title = "Achievement Unlocked"
) {

    const achievement =
        document.createElement("div");

    achievement.className =
        "floating-achievement";

    achievement.innerHTML = `

        <div class="achievement-glow"></div>

        <div class="achievement-icon">
            🏆
        </div>

        <div class="achievement-content">

            <span>
                ACHIEVEMENT
            </span>

            <h3>
                ${title}
            </h3>

        </div>

    `;

    document.body.appendChild(
        achievement
    );

    requestAnimationFrame(() => {
        achievement.classList.add("show");
    });

    setTimeout(() => {

        achievement.classList.remove(
            "show"
        );

        setTimeout(() => {
            achievement.remove();
        }, 500);

    }, 4000);
}