export function initDayNightMode() {
    const hour = new Date().getHours();

    if (hour >= 7 && hour < 18) {
        document.body.classList.add("day-mode");
        document.body.classList.remove("night-mode");
    } else {
        document.body.classList.add("night-mode");
        document.body.classList.remove("day-mode");
    }
}