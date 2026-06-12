const links = [
    {
        id: "homeBtn",
        category: "popular"
    },
    {
        id: "trendingBtn",
        category: "trending"
    },
    {
        id: "topBtn",
        category: "top_rated"
    }
];

export function initNavbar(changeCategory) {

    links.forEach(link => {

        const element =
            document.getElementById(link.id);

        if (!element) return;

        element.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(".nav-link")
                    .forEach(btn =>
                        btn.classList.remove("active")
                    );

                element.classList.add("active");

                changeCategory(link.category);
            }
        );
    });

    const logo =
        document.querySelector(".logo");

    if (logo) {

        logo.addEventListener(
            "click",
            () => {

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }
        );
    }

    const profileBtn =
        document.getElementById("profileBtn");

    if (profileBtn) {

        profileBtn.addEventListener(
            "click",
            () => {

                alert(
                    "Profile system cinematic version coming next."
                );
            }
        );
    }
}