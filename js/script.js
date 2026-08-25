import { watchStock } from "./estoque.js";
import { CART_STORAGE_KEY, formatPrice, loadCart, saveCart } from "./utils.js";

window.addEventListener("scroll", () => {
    const header = document.querySelector("header");

    if (!header) return;

    if (window.scrollY > 50) {
        header.classList.add("scrolled");
    } else {
        header.classList.remove("scrolled");
    }
});


/* =========================
   MENU MOBILE
========================= */
const currentStock = {};
const menuOpenButton = document.querySelector("#menu-open-button");
const menuCloseButton = document.querySelector("#menu-close-button");
const navLinks = document.querySelectorAll(".nav-menu .nav-link");

menuOpenButton?.addEventListener("click", () => {
    document.body.classList.remove("cart-open");
    document.body.classList.add("show-mobile-menu");
});

menuCloseButton?.addEventListener("click", () => {
    document.body.classList.remove("show-mobile-menu");
});

navLinks.forEach((link) => {
    link.addEventListener("click", () => {
        document.body.classList.remove("show-mobile-menu");
    });
});


/* =========================
   PREVIEW DOS PRODUTOS
========================= */

document.addEventListener("click", (event) => {
    const closeButton = event.target.closest(".close-preview");
    if (closeButton) {
        window.ForeverCatalog?.closeProductPreview?.();
        return;
    }

    const product = event.target.closest(".product[data-name]");
    if (!product || event.target.closest(".btn-card")) return;

    window.ForeverCatalog?.openProductPreview?.(
        String(product.dataset.name || "").trim().toUpperCase()
    );
});

/* =========================
   BOTÕES VER MAIS
========================= */

document.addEventListener("click", (event) => {
    const button = event.target.closest(".btn-ver-todos");
    if (!button) return;
    const grid = button.previousElementSibling;
    if (!grid?.classList.contains("product-grd")) return;
    grid.classList.toggle("show-all");
    button.textContent = grid.classList.contains("show-all")
        ? "Ver menos"
        : "Ver todos dessa categoria";
});

/* =========================
   CARRINHO
========================= */


const cartOpenButton = document.querySelector("#cart-open-button");
const cartCloseButton = document.querySelector("#cart-close-button");
const cartOverlay = document.querySelector("#cart-overlay");
const cartSidebar = document.querySelector("#cart-sidebar");
const cartItemsContainer = document.querySelector("#cart-items");
const cartSubtotalElement = document.querySelector("#cart-subtotal");
const cartCounterElement = document.querySelector("#cart-counter");
const checkoutButton = document.querySelector("#cart-checkout-button");

let cart = loadCart();
function sortProductsByStock() {
    document.querySelectorAll(".product-grd").forEach((grid) => {
        const products = [...grid.querySelectorAll(":scope > .product")];

        products.forEach((product, index) => {
            if (!product.dataset.originalOrder) {
                product.dataset.originalOrder = String(index);
            }
        });

        products.sort((a, b) => {
            const stockA = Number(currentStock[String(a.dataset.name || "").toUpperCase()]) || 0;
            const stockB = Number(currentStock[String(b.dataset.name || "").toUpperCase()]) || 0;

            // Primeiro os disponíveis; entre eles, maior estoque vem antes.
            if ((stockA > 0) !== (stockB > 0)) return stockA > 0 ? -1 : 1;
            if (stockA !== stockB) return stockB - stockA;

            // Em caso de empate, preserva a ordem original do catálogo.
            return Number(a.dataset.originalOrder) - Number(b.dataset.originalOrder);
        });

        products.forEach((product) => grid.appendChild(product));
    });
}





function openCart() {
    document.body.classList.remove("show-mobile-menu");
    document.body.classList.add("cart-open");

    cartSidebar?.setAttribute("aria-hidden", "false");
}


function closeCart() {
    document.body.classList.remove("cart-open");

    cartSidebar?.setAttribute("aria-hidden", "true");
}


function parsePrice(priceText) {
    if (!priceText) return 0;

    const normalizedPrice = priceText
        .replace(/[^\d,.-]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");

    const price = Number.parseFloat(normalizedPrice);

    return Number.isFinite(price) ? price : 0;
}



function getProductInformation(button) {
    const productElement = button.closest(".product, .preview");

    if (!productElement) return null;

    const productId = (
        productElement.dataset.name ||
        productElement.dataset.target
    )?.trim().toUpperCase();

    if (!productId) return null;

    // Fonte principal: o mesmo cadastro do Firestore usado pelo Admin.
    const firestoreProduct = window.ForeverCatalog?.getProductForCart?.(productId);

    if (firestoreProduct) {
        return firestoreProduct;
    }

    // Fallback para evitar falha durante os primeiros milissegundos de carregamento.
    const name = productElement.dataset.productName?.trim();
    const price = Number(productElement.dataset.productPrice);
    const image = productElement.dataset.productImage?.trim();

    if (!name || !Number.isFinite(price) || price <= 0 || !image) {
        return null;
    }

    return {
        id: productId,
        name,
        price,
        image,
        quantity: 1
    };
}


function addProductToCart(product) {
    const productId = String(product.id)
        .trim()
        .toUpperCase();

    const availableStock = currentStock[productId];

    const existingProduct = cart.find(
        (item) =>
            String(item.id).trim().toUpperCase() === productId
    );

    console.log("ID do produto:", productId);
    console.log("Estoque disponível:", availableStock);
    console.log("Produto no carrinho:", existingProduct);
    console.log("Estoque completo:", currentStock);

    if (availableStock === undefined) {
        alert("O estoque ainda não foi carregado.");
        return;
    }

    if (availableStock <= 0) {
        alert("Este produto está esgotado.");
        return;
    }

    if (existingProduct) {
        if (existingProduct.quantity >= availableStock) {
            alert(
                `Há apenas ${availableStock} unidade(s) disponível(is) deste produto.`
            );
            return;
        }

        existingProduct.quantity += 1;
    } else {
        cart.push({
            ...product,
            id: productId,
            quantity: 1
        });
    }

    updateCart();
    openCart();
}

function increaseQuantity(productId) {
    const normalizedProductId = String(productId)
        .trim()
        .toUpperCase();

    const product = cart.find(
        (item) =>
            String(item.id).trim().toUpperCase() === normalizedProductId
    );

    if (!product) return;

    const availableStock = currentStock[normalizedProductId];

    if (availableStock === undefined) {
        alert("O estoque ainda está sendo carregado.");
        return;
    }

    if (product.quantity >= availableStock) {
        alert(
            `Há apenas ${availableStock} unidade(s) disponível(is) deste produto.`
        );
        return;
    }

    product.quantity += 1;

    updateCart();
}


function decreaseQuantity(productId) {
    const normalizedProductId = String(productId)
        .trim()
        .toUpperCase();

    const product = cart.find(
        (item) =>
            String(item.id).trim().toUpperCase() === normalizedProductId
    );

    if (!product) return;

    product.quantity -= 1;

    if (product.quantity <= 0) {
        removeProduct(productId);
        return;
    }

    updateCart();
}


function removeProduct(productId) {
    cart = cart.filter((item) => item.id !== productId);

    updateCart();
}


function calculateSubtotal() {
    return cart.reduce((subtotal, product) => {
        return subtotal + product.price * product.quantity;
    }, 0);
}


function calculateTotalQuantity() {
    return cart.reduce((total, product) => {
        return total + product.quantity;
    }, 0);
}


function renderCart() {
    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = "";

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-bag-shopping"></i>
                <p>Seu carrinho está vazio.</p>
            </div>
        `;
    } else {
        cart.forEach((product) => {
            const cartItem = document.createElement("article");

            cartItem.className = "cart-item";
            cartItem.dataset.productId = product.id;

            cartItem.innerHTML = `
                <img
                    src="${product.image}"
                    alt="${product.name}"
                    class="cart-item-image"
                >

                <div class="cart-item-info">
                    <h3 class="cart-item-name">${product.name}</h3>

                    <p class="cart-item-price">
                        ${formatPrice(product.price)}
                    </p>

                    <div class="cart-item-controls">
                        <button
                            type="button"
                            class="cart-quantity-button"
                            data-cart-action="decrease"
                            aria-label="Diminuir quantidade de ${product.name}"
                        >
                            −
                        </button>

                        <span class="cart-item-quantity">
                            ${product.quantity}
                        </span>

                        <button
                            type="button"
                            class="cart-quantity-button"
                            data-cart-action="increase"
                            aria-label="Aumentar quantidade de ${product.name}"
                        >
                            +
                        </button>
                    </div>
                </div>

                <button
                    type="button"
                    class="cart-remove-button fas fa-trash"
                    data-cart-action="remove"
                    aria-label="Remover ${product.name} do carrinho"
                ></button>
            `;

            cartItemsContainer.appendChild(cartItem);
        });
    }

    const subtotal = calculateSubtotal();
    const totalQuantity = calculateTotalQuantity();

    if (cartSubtotalElement) {
        cartSubtotalElement.textContent = formatPrice(subtotal);
    }

    if (cartCounterElement) {
        cartCounterElement.textContent = totalQuantity;
        cartCounterElement.dataset.count = String(totalQuantity);
    }

    if (checkoutButton) {
        checkoutButton.disabled = cart.length === 0;
    }
}


function updateCart() {
    saveCart(cart);
    renderCart();
}


/* Adicionar produto pelo card ou pelo preview */
document.addEventListener("click", (event) => {
    const addButton = event.target.closest(".btn-card");

    if (!addButton) return;

    event.preventDefault();
    event.stopPropagation();

    const product = getProductInformation(addButton);

    if (!product) {
        console.warn("Não foi possível identificar o produto.");
        return;
    }

    addProductToCart(product);
});


/* Controles internos do carrinho */
cartItemsContainer?.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-cart-action]");

    if (!actionButton) return;

    const cartItem = actionButton.closest(".cart-item");
    const productId = cartItem?.dataset.productId;
    const action = actionButton.dataset.cartAction;

    if (!productId) return;

    if (action === "increase") {
        increaseQuantity(productId);
    }

    if (action === "decrease") {
        decreaseQuantity(productId);
    }

    if (action === "remove") {
        removeProduct(productId);
    }
});


cartOpenButton?.addEventListener("click", openCart);
cartCloseButton?.addEventListener("click", closeCart);
cartOverlay?.addEventListener("click", closeCart);


document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeCart();

        window.ForeverCatalog?.closeProductPreview?.();

        document.body.classList.remove("show-mobile-menu");
    }
});


document.addEventListener("forever:products-updated", (event) => {
    const products = Array.isArray(event.detail) ? event.detail : [];
    const productMap = new Map(products.map(product => [String(product.id).toUpperCase(), product]));
    let changed = false;

    cart = cart.filter(item => {
        const product = productMap.get(String(item.id).trim().toUpperCase());
        if (!product || product.active === false) {
            changed = true;
            return false;
        }

        const nextName = product.name;
        const nextPrice = Number(product.price) || 0;
        const nextImage = product.image;

        if (item.name !== nextName || Number(item.price) !== nextPrice || item.image !== nextImage) {
            item.name = nextName;
            item.price = nextPrice;
            item.image = nextImage;
            changed = true;
        }

        return true;
    });

    if (changed) {
        updateCart();
    }
});


checkoutButton?.addEventListener("click", () => {
    if (cart.length === 0) return;

    window.location.href = "checkout.html";
});


renderCart();

watchStock((productId, quantity) => {
    const normalizedProductId = String(productId)
        .trim()
        .toUpperCase();

    currentStock[normalizedProductId] = Number(quantity) || 0;

    const productElements = document.querySelectorAll(
        `.product[data-name="${normalizedProductId}"],
         .preview[data-target="${normalizedProductId}"]`
    );

    productElements.forEach((productElement) => {
        const button = productElement.querySelector(".btn-card");

        if (!button) return;

        if (quantity <= 0) {
            button.textContent = "Esgotado";
            button.disabled = true;
            button.classList.add("esgotado");
        } else {
            button.textContent = "Adicionar ao Carrinho";
            button.disabled = false;
            button.classList.remove("esgotado");
        }
    });


    sortProductsByStock();
});

document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("heroVideo");

  if (!video) return;

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.controls = false;

  const iniciarVideo = () => {
    video.play().catch(() => {
      // Alguns celulares bloqueiam autoplay mesmo com o vídeo mudo.
    });
  };

  iniciarVideo();

  document.addEventListener("touchstart", iniciarVideo, {
    once: true,
    passive: true
  });
});
