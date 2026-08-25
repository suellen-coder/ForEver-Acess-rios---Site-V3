export const CART_STORAGE_KEY = "forever-acessorios-cart";

export function loadCart(storageKey = CART_STORAGE_KEY) {
    try {
        const savedCart = localStorage.getItem(storageKey);
        if (!savedCart) return [];
        const parsedCart = JSON.parse(savedCart);
        return Array.isArray(parsedCart) ? parsedCart : [];
    } catch (error) {
        console.error("Erro ao carregar o carrinho:", error);
        return [];
    }
}

export function saveCart(cart, storageKey = CART_STORAGE_KEY) {
    try {
        localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch (error) {
        console.error("Erro ao salvar o carrinho:", error);
    }
}

export function formatPrice(value) {
    return Number(value).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

export function normalizeText(text = "") {
    return String(text)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}
