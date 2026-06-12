const authBtn =
    document.getElementById("authBtn");

const modal =
    document.getElementById("authModal");

const closeBtn =
    document.getElementById("authClose");

const signInTab =
    document.getElementById("signInTab");

const signUpTab =
    document.getElementById("signUpTab");

const authTitle =
    document.getElementById("authTitle");

const authName =
    document.getElementById("authName");

const authEmail =
    document.getElementById("authEmail");

const authPassword =
    document.getElementById("authPassword");

const authSubmit =
    document.getElementById("authSubmit");

const authMessage =
    document.getElementById("authMessage");

const googleLogin =
    document.getElementById("googleLogin");

const phoneLogin =
    document.getElementById("phoneLogin");

const gmailLogin =
    document.getElementById("gmailLogin");

let mode = "signin";

export function initAuth() {

    const user =
        JSON.parse(
            localStorage.getItem("cinemii_user")
        );

    if (user) {
        authBtn.textContent = user.name || "Account";
    }

    authBtn?.addEventListener("click", openAuth);

    closeBtn?.addEventListener("click", closeAuth);

    modal?.addEventListener("click", e => {
        if (e.target === modal) closeAuth();
    });

    signInTab?.addEventListener("click", () => switchMode("signin"));

    signUpTab?.addEventListener("click", () => switchMode("signup"));

    authSubmit?.addEventListener("click", handleSubmit);

    googleLogin?.addEventListener("click", googleRealLogin);

    gmailLogin?.addEventListener("click", googleRealLogin);

    phoneLogin?.addEventListener("click", phoneLoginDemo);
}

function openAuth() {
    window.scrollTo(0, 0);
    modal.classList.add("active");
    document.body.classList.add("modal-open");
    document.body.classList.add("modal-open");
}

function closeAuth() {
    modal.classList.remove("active");
    document.body.classList.remove("modal-open");
}

function switchMode(newMode) {
    mode = newMode;

    authMessage.textContent = "";

    signInTab.classList.toggle("active", mode === "signin");
    signUpTab.classList.toggle("active", mode === "signup");

    authTitle.textContent =
        mode === "signin"
            ? "Sign In"
            : "Create Account";

    authName.style.display =
        mode === "signin"
            ? "none"
            : "block";
}

function handleSubmit() {
    const email =
        authEmail.value.trim();

    const password =
        authPassword.value.trim();

    const name =
        authName.value.trim() || "CINEMII User";

    if (!email || !password) {
        showMessage("Please fill email and password.", false);
        return;
    }

    if (password.length < 4) {
        showMessage("Password must be at least 4 characters.", false);
        return;
    }

    const users =
        JSON.parse(
            localStorage.getItem("cinemii_users")
        ) || [];

    if (mode === "signup") {

        const exists =
            users.find(u => u.email === email);

        if (exists) {
            showMessage("Account already exists. Sign in instead.", false);
            return;
        }

        const user = {
            name,
            email,
            password,
            provider: "Email",
            createdAt: new Date().toISOString()
        };

        users.push(user);

        localStorage.setItem(
            "cinemii_users",
            JSON.stringify(users)
        );

        loginUser(user);

        showMessage("Account created successfully.", true);
        return;
    }

    const user =
        users.find(
            u =>
                u.email === email &&
                u.password === password
        );

    if (!user) {
        showMessage("Wrong email or password.", false);
        return;
    }

    loginUser(user);

    showMessage("Welcome back.", true);
}

function socialLogin(provider) {
    const user = {
        name: `${provider} User`,
        email: `${provider.toLowerCase()}@cinemii.com`,
        provider,
        createdAt: new Date().toISOString()
    };

    loginUser(user);

    showMessage(`${provider} login connected.`, true);
}

function phoneLoginDemo() {
    const phone =
        prompt("Enter phone number:");

    if (!phone) return;

    const user = {
        name: "Phone User",
        email: phone,
        provider: "Phone",
        createdAt: new Date().toISOString()
    };

    loginUser(user);

    showMessage("Phone login connected.", true);
}

function loginUser(user) {
    localStorage.setItem(
        "cinemii_user",
        JSON.stringify(user)
    );

    authBtn.textContent =
        user.name || "Account";

    setTimeout(closeAuth, 700);
}

function showMessage(text, success) {
    authMessage.textContent = text;
    authMessage.style.color =
        success ? "#00ff99" : "#ff6b7a";
}
const GOOGLE_CLIENT_ID =
    "277488906528-8rk7dpimukrm1kivdq019eueoc4krcdp.apps.googleusercontent.com";

function googleRealLogin() {

    if (!window.google) {
        showMessage("Google login is still loading. Try again.", false);
        return;
    }

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse
    });

    google.accounts.id.prompt();
}

function handleGoogleResponse(response) {

    const userData =
        parseJwt(response.credential);

    const user = {
        name: userData.name,
        email: userData.email,
        picture: userData.picture,
        provider: "Google",
        createdAt: new Date().toISOString()
    };

    loginUser(user);

    showMessage("Google account connected.", true);
}

function parseJwt(token) {

    const base64Url =
        token.split(".")[1];

    const base64 =
        base64Url
            .replace(/-/g, "+")
            .replace(/_/g, "/");

    const jsonPayload =
        decodeURIComponent(
            atob(base64)
                .split("")
                .map(c => {
                    return "%" +
                        ("00" + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join("")
        );

    return JSON.parse(jsonPayload);
}