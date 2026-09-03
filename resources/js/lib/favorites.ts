export interface FavoriteItem {
    id: string;
    title: string;
    url: string;
}

const STORAGE_KEY = 'inbxer_favorites';

export function getFavorites(): FavoriteItem[] {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function isFavorite(id: string): boolean {
    const list = getFavorites();

    return list.some((item) => item.id === id);
}

export function toggleFavorite(item: FavoriteItem): boolean {
    const list = getFavorites();
    const index = list.findIndex((i) => i.id === item.id);
    let isAdded = false;

    if (index >= 0) {
        list.splice(index, 1);
        isAdded = false;
    } else {
        list.push(item);
        isAdded = true;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('inbxer-favorites-changed'));

    return isAdded;
}
