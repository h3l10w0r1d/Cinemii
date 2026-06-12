const storage = {

    get(key, fallback = []) {

        try {

            return JSON.parse(localStorage.getItem(key)) || fallback;

        } catch {

            return fallback;
        }
    },

    set(key, value) {

        localStorage.setItem(
            key,
            JSON.stringify(value)
        );
    },

    toggleArrayItem(key, item) {

        const current = this.get(key);

        const exists = current.includes(item);

        let updated;

        if (exists) {

            updated = current.filter(id => id !== item);

        } else {

            updated = [...current, item];
        }

        this.set(key, updated);

        return !exists;
    }
};

export default storage;