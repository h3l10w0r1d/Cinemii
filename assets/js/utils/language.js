export const translations = {
    en: {
        home: "Home",
        trending: "Trending",
        popular: "Popular",
        topRated: "Top Rated",
        profile: "Profile",
        globalShow: "Global Show",
        search: "Search movies...",
        watch: "Watch",
        watchNow: "Watch Now",
        moreInfo: "More Info",
        favorite: "Favorite",
        premium: "PREMIUM MEMBER",
        language: "Language",
        about: "Tell something about yourself...",
        favorites: "Favorite Movies",
        friends: "Online Friends",
        joinRoom: "Join Room",
        addFriend: "Add Friend"
    },

    ru: {
        home: "Главная",
        trending: "Тренды",
        popular: "Популярные",
        topRated: "Лучшие",
        profile: "Профиль",
        globalShow: "Глобальный показ",
        search: "Поиск фильмов...",
        watch: "Смотреть",
        watchNow: "Смотреть",
        moreInfo: "Подробнее",
        favorite: "Избранное",
        premium: "ПРЕМИУМ УЧАСТНИК",
        language: "Язык",
        about: "Расскажи немного о себе...",
        favorites: "Избранные фильмы",
        friends: "Друзья онлайн",
        joinRoom: "Войти в комнату",
        addFriend: "Добавить друга"
    },

    es: {
        home: "Inicio",
        trending: "Tendencias",
        popular: "Popular",
        topRated: "Mejores",
        profile: "Perfil",
        globalShow: "Show Global",
        search: "Buscar películas...",
        watch: "Ver",
        watchNow: "Ver ahora",
        moreInfo: "Más info",
        favorite: "Favoritos",
        premium: "MIEMBRO PREMIUM",
        language: "Idioma",
        about: "Cuenta algo sobre ti...",
        favorites: "Películas favoritas",
        friends: "Amigos online",
        joinRoom: "Unirse",
        addFriend: "Añadir amigo"
    },

    fr: {
        home: "Accueil",
        trending: "Tendances",
        popular: "Populaire",
        topRated: "Top",
        profile: "Profil",
        globalShow: "Show Global",
        search: "Rechercher des films...",
        watch: "Regarder",
        watchNow: "Regarder",
        moreInfo: "Plus d’infos",
        favorite: "Favoris",
        premium: "MEMBRE PREMIUM",
        language: "Langue",
        about: "Parle un peu de toi...",
        favorites: "Films favoris",
        friends: "Amis en ligne",
        joinRoom: "Rejoindre",
        addFriend: "Ajouter ami"
    }
};

export function getLanguage() {
    return localStorage.getItem("cinemii_language") || "en";
}

export function setLanguage(lang) {
    localStorage.setItem("cinemii_language", lang);
}

export function t(key) {
    const lang = getLanguage();
    return translations[lang]?.[key] || translations.en[key] || key;
}

export function applyLanguage() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.dataset.i18n;
        el.textContent = t(key);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        el.placeholder = t(key);
    });
}