export function showNotification(message, type = "success") {
    const box = document.createElement("div");

    box.className = `cinemii-toast ${type}`;

    box.innerHTML = `
        <span>${message}</span>
    `;

    document.body.appendChild(box);

    setTimeout(() => {
        box.classList.add("show");
    }, 50);

    setTimeout(() => {
        box.classList.remove("show");

        setTimeout(() => {
            box.remove();
        }, 400);

    }, 3000);
}