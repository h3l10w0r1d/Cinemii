function qs(selector) {
    return document.querySelector(selector);
}

function qsa(selector) {
    return document.querySelectorAll(selector);
}

function createElement(tag, className = "") {

    const el = document.createElement(tag);

    if (className) {
        el.className = className;
    }

    return el;
}

function formatRuntime(minutes = 0) {

    const h = Math.floor(minutes / 60);

    const m = minutes % 60;

    return `${h}h ${m}m`;
}

function truncate(text = "", limit = 140) {

    if (text.length <= limit) return text;

    return text.slice(0, limit) + "...";
}

export {
    qs,
    qsa,
    createElement,
    formatRuntime,
    truncate
};