import { decreaseStock } from "./estoque.js";
import { db } from "./firebase-config.js";
import { addDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { CART_STORAGE_KEY, formatPrice, loadCart, normalizeText, saveCart } from "./utils.js";


const WHATSAPP_NUMBER = "5585998729885";

/* =========================================
   PREÇO DOS FRETES JUAZEIRO
========================================= */

const PRICE_BLOCK_1 = 3;
const PRICE_BLOCK_2 = 6;
const PRICE_BLOCK_3 = 9;
/* =========================================
   FRETES PARA CRATO E BARBALHA
========================================= */

const PRICE_EXTERNAL_BLOCK_1 = 15;
const PRICE_EXTERNAL_BLOCK_2 = 20;
const PRICE_EXTERNAL_BLOCK_3 = 25;

const checkoutForm = document.querySelector("#checkout-form");
const checkoutProducts = document.querySelector("#checkout-products");

const deliveryFields = document.querySelector("#delivery-fields");

const customerNameInput = document.querySelector("#customer-name");
const customerPhoneInput = document.querySelector("#customer-phone");
const customerCityInput = document.querySelector("#customer-city");
const customerNeighborhoodInput = document.querySelector(
    "#customer-neighborhood"
);
const customerAddressInput = document.querySelector("#customer-address");
const customerComplementInput = document.querySelector(
    "#customer-complement"
);

const freightMessage = document.querySelector("#freight-message");
const whatsappButton = document.querySelector("#whatsapp-button");

const subtotalElement = document.querySelector("#checkout-subtotal");
const freightElement = document.querySelector("#checkout-freight");
const totalElement = document.querySelector("#checkout-total");

const deliveryTypeInputs = document.querySelectorAll(
    'input[name="deliveryType"]'
);

const paymentMethodInputs = document.querySelectorAll(
    'input[name="paymentMethod"]'
);

/* =========================================
   BAIRROS
========================================= */

const JUAZEIRO_BLOCK_1 = [
    "Pio XII",
    "São Miguel",
    "Franciscanos",
    "Pirajá",
    "Santa Tereza",
    "Centro",
    "Salesianos",
    "Romeirão",
    "João Cabral",
    "Triângulo",
    "Lagoa Seca",
    "Antônio Vieira",
    "Socorro",
    "Juvêncio Santana"
];

const JUAZEIRO_BLOCK_2 = [
    "Jardim Gonzaga",
    "São José",
    "Frei Damião",
    "Novo Juazeiro",
    "Limoeiro",
    "Timbaúbas",
    "Leandro Bezerra de Menezes",
    "Vila Fátima",
    "Aeroporto",
    "Tiradentes",
    "Betolândia",
    "Planalto",
    "Campo Alegre",
    "Horto"
];

const JUAZEIRO_BLOCK_3 = [
    "Salgadinho",
    "Vila Três Marias",
    "Palmeirinha",
    "Parque São Geraldo",
    "Pedrinhas",
    "Santo Antônio",
    "Cidade Universitária",
    "José Geraldo da Cruz",
    "Monsenhor Francisco de Sá Barreto",
    "Monsenhor Murilo de Sá Barreto",
    "Professora Maria Geli",
    "Brejo Seco",
    "Carité"
];

const BARBALHA_BLOCK_1 = [
    "Bulandeira",
    "Novo Araçás",
    "Mata dos Dudas",
    "Mata dos Limas",
    "Cidade Kariris",
    "Conjunto Nassau",
    "Santo Antônio"
];

const BARBALHA_BLOCK_2 = [
    "Bela Vista",
    "Cirolândia",
    "Nossa Senhora de Fátima",
    "Centro",
    "Rosário",
    "Alto do Rosário",
    "Santo André",
    "Tupinambá"
];

const BARBALHA_BLOCK_3 = [
    "José Barreto Sampaio",
    "Alto da Alegria",
    "Buriti",
    "Jardins dos Ipês",
    "Malvinas"
];

const CRATO_BLOCK_1 = [
    "Muriti",
    "São José",
    "Novo Crato",
    "Parque Recreio",
    "Zacarias Gonçalves",
    "São Bento",
    "Mirandão",
    "Mutirão"
];

const CRATO_BLOCK_2 = [
    "Pinto Madeira",
    "Pimenta",
    "Centro",
    "Vila Alta",
    "Vila Lobo",
    "São Miguel",
    "Independência",
    "Ossian Araripe",
    "Sossego",
    "Cruz"
];

const CRATO_BLOCK_3 = [
    "Seminário",
    "Alto da Penha",
    "Pantanal",
    "Gizélia Pinheiro",
    "Franca Alencar",
    "Novo Horizonte",
    "Santa Luzia",
    "Granjeiro",
    "Lameiro",
    "Barro Branco"
];

const FREIGHT_BY_NEIGHBORHOOD = {
    "Juazeiro do Norte": {},
    "Crato": {},
    "Barbalha": {}
};

JUAZEIRO_BLOCK_1.forEach(bairro => {
    FREIGHT_BY_NEIGHBORHOOD["Juazeiro do Norte"][bairro] = PRICE_BLOCK_1;
});

JUAZEIRO_BLOCK_2.forEach(bairro => {
    FREIGHT_BY_NEIGHBORHOOD["Juazeiro do Norte"][bairro] = PRICE_BLOCK_2;
});

JUAZEIRO_BLOCK_3.forEach(bairro => {
    FREIGHT_BY_NEIGHBORHOOD["Juazeiro do Norte"][bairro] = PRICE_BLOCK_3;
});


BARBALHA_BLOCK_1.forEach(bairro => {
    FREIGHT_BY_NEIGHBORHOOD["Barbalha"][bairro] =
        PRICE_EXTERNAL_BLOCK_1;
});

BARBALHA_BLOCK_2.forEach(bairro => {
    FREIGHT_BY_NEIGHBORHOOD["Barbalha"][bairro] =
        PRICE_EXTERNAL_BLOCK_2;
});

BARBALHA_BLOCK_3.forEach(bairro => {
    FREIGHT_BY_NEIGHBORHOOD["Barbalha"][bairro] =
        PRICE_EXTERNAL_BLOCK_3;
});



CRATO_BLOCK_1.forEach(bairro => {
    FREIGHT_BY_NEIGHBORHOOD["Crato"][bairro] =
        PRICE_EXTERNAL_BLOCK_1;
});

CRATO_BLOCK_2.forEach(bairro => {
    FREIGHT_BY_NEIGHBORHOOD["Crato"][bairro] =
        PRICE_EXTERNAL_BLOCK_2;
});

CRATO_BLOCK_3.forEach(bairro => {
    FREIGHT_BY_NEIGHBORHOOD["Crato"][bairro] =
        PRICE_EXTERNAL_BLOCK_3;
});


const CITY_NEIGHBORHOODS = {
    "Juazeiro do Norte": [
        ...JUAZEIRO_BLOCK_1,
        ...JUAZEIRO_BLOCK_2,
        ...JUAZEIRO_BLOCK_3
    ],

    "Crato": [
        ...CRATO_BLOCK_1,
        ...CRATO_BLOCK_2,
        ...CRATO_BLOCK_3
    ],

    "Barbalha": [
        ...BARBALHA_BLOCK_1,
        ...BARBALHA_BLOCK_2,
        ...BARBALHA_BLOCK_3
    ]
};

let cart = loadCart();
let freightValue = 0;
let isSubmittingOrder = false;

function checkoutCurrentPrice(product) {
    const regular = Number(product.preco) || 0;
    const promo = Number(product.precoPromocional) || 0;
    return promo > 0 && promo < regular ? promo : regular;
}

async function synchronizeCartWithCatalog() {
    const snapshot = await getDocs(collection(db, "produtos"));
    const products = new Map(snapshot.docs.map(document => {
        const data = document.data();
        return [document.id.trim().toUpperCase(), { id: document.id.trim().toUpperCase(), ...data }];
    }));

    const removed = [];
    let changed = false;

    cart = cart.filter(item => {
        const id = String(item.id || "").trim().toUpperCase();
        const product = products.get(id);

        if (!product || product.ativo === false) {
            removed.push(item.name || id);
            changed = true;
            return false;
        }

        const nextName = String(product.nome || id).trim();
        const nextPrice = checkoutCurrentPrice(product);
        const nextImage = String(product.imagem || item.image || "").trim();

        if (item.name !== nextName || Number(item.price) !== nextPrice || item.image !== nextImage) {
            item.name = nextName;
            item.price = nextPrice;
            item.image = nextImage;
            changed = true;
        }

        return true;
    });

    if (changed) saveCart(cart);

    if (removed.length) {
        alert(`Alguns produtos foram removidos do pedido porque não estão mais disponíveis: ${removed.join(", ")}.`);
    }
}





function calculateSubtotal() {
    return cart.reduce((subtotal, product) => {
        const price = Number(product.price) || 0;
        const quantity = Number(product.quantity) || 0;

        return subtotal + price * quantity;
    }, 0);
}


function getDeliveryType() {
    return document.querySelector(
        'input[name="deliveryType"]:checked'
    )?.value;
}

function getPaymentMethod() {
    return document.querySelector(
        'input[name="paymentMethod"]:checked'
    )?.value || "pix";
}

function getPaymentMethodLabel() {
    return {
        pix: "Pix",
        cartao: "Cartão",
        dinheiro: "Dinheiro"
    }[getPaymentMethod()] || "Não informado";
}

function normalizePhone(value) {
    return String(value || "").replace(/\D/g, "");
}

function formatPhoneInput(value) {
    const digits = normalizePhone(value).slice(0, 11);

    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function loadNeighborhoods() {

    const city = customerCityInput.value;

    customerNeighborhoodInput.innerHTML =
        '<option value="">Selecione um bairro</option>';

    if (!CITY_NEIGHBORHOODS[city]) return;

    CITY_NEIGHBORHOODS[city]
        .sort()
        .forEach(bairro => {

            const option = document.createElement("option");

            option.value = bairro;
            option.textContent = bairro;

            customerNeighborhoodInput.appendChild(option);

        });

}

function renderProducts() {
    if (cart.length === 0) {
        checkoutProducts.innerHTML = `
            <div class="empty-order">
                <p>Seu carrinho está vazio.</p>

                <a href="index.html">
                    Voltar ao catálogo
                </a>
            </div>
        `;

        whatsappButton.disabled = true;
        updateValues();
        return;
    }

    checkoutProducts.innerHTML = "";

    cart.forEach((product) => {
        const productElement = document.createElement("article");

        const productTotal =
            Number(product.price) * Number(product.quantity);

        productElement.className = "checkout-product";

        productElement.innerHTML = `
            <img
                src="${product.image}"
                alt="${product.name}"
            >

            <div class="checkout-product-info">
                <h3>${product.name}</h3>

                <p>
                    ${product.quantity} unidade(s) ×
                    ${formatPrice(product.price)}
                </p>
            </div>

            <strong class="checkout-product-total">
                ${formatPrice(productTotal)}
            </strong>
        `;

        checkoutProducts.appendChild(productElement);
    });

    updateValues();
}


function updateValues() {
    const subtotal = calculateSubtotal();
    const total = subtotal + freightValue;

    subtotalElement.textContent = formatPrice(subtotal);
    freightElement.textContent = formatPrice(freightValue);
    totalElement.textContent = formatPrice(total);
}


function toggleDeliveryFields() {
    const deliveryType = getDeliveryType();
    const isDelivery = deliveryType === "entrega";

    deliveryFields.hidden = !isDelivery;

    customerCityInput.required = isDelivery;
    customerNeighborhoodInput.required = isDelivery;
    customerAddressInput.required = isDelivery;

    if (!isDelivery) {
        freightValue = 0;

        freightMessage.textContent = "";
        freightMessage.className = "freight-message";

        whatsappButton.disabled = cart.length === 0;

        updateValues();
        return;
    }

    calculateFreight();
}


function findNeighborhoodFreight(city, neighborhood) {
    const cityNeighborhoods = FREIGHT_BY_NEIGHBORHOOD[city];

    if (!cityNeighborhoods) return null;

    const normalizedNeighborhood = normalizeText(neighborhood);

    const matchingNeighborhood = Object.keys(cityNeighborhoods).find(
        (registeredNeighborhood) => {
            return (
                normalizeText(registeredNeighborhood) ===
                normalizedNeighborhood
            );
        }
    );

    if (!matchingNeighborhood) return null;

    return Number(cityNeighborhoods[matchingNeighborhood]);
}


function calculateFreight() {
    if (getDeliveryType() !== "entrega") {
        freightValue = 0;
        updateValues();
        return;
    }

    const city = customerCityInput.value;
    const neighborhood = customerNeighborhoodInput.value.trim();

    if (!city || !neighborhood) {
        freightValue = 0;

        freightMessage.textContent =
            "Informe a cidade e o bairro para calcular a entrega.";

        freightMessage.className = "freight-message";

        whatsappButton.disabled = true;

        updateValues();
        return;
    }

    const neighborhoodFreight = findNeighborhoodFreight(
        city,
        neighborhood
    );

    if (neighborhoodFreight === null) {
        freightValue = 0;

        freightMessage.textContent =
            "O valor de entrega para este bairro ainda não foi configurado.";

        freightMessage.className = "freight-message error";

        whatsappButton.disabled = true;

        updateValues();
        return;
    }

    freightValue = neighborhoodFreight;

    freightMessage.textContent =
        `Entrega calculada: ${formatPrice(freightValue)}`;

    freightMessage.className = "freight-message success";

    whatsappButton.disabled = cart.length === 0;

    updateValues();
}


function createItemsMessage() {
    return cart.map((product, index) => {
        const itemTotal =
            Number(product.price) * Number(product.quantity);

        return [
            `${index + 1}. ${product.name}`,
            `Quantidade: ${product.quantity}`,
            `Valor unitário: ${formatPrice(product.price)}`,
            `Total do item: ${formatPrice(itemTotal)}`
        ].join("\n");
    }).join("\n\n");
}


function createWhatsAppMessage() {
    const deliveryType = getDeliveryType();
    const subtotal = calculateSubtotal();
    const total = subtotal + freightValue;

    const customerName = customerNameInput.value.trim();

    const messageParts = [
        "🧾 *RESUMO DO PEDIDO*",
        "",
        `👤 *Cliente:* ${customerName}`,
        `🛵 *Forma de recebimento:* ${
            deliveryType === "entrega"
                ? "Entrega"
                : "Retirada"
        }`,
        `💳 *Forma de pagamento:* ${getPaymentMethodLabel()}`
    ];

    if (deliveryType === "entrega") {
        messageParts.push(
            `📍 *Endereço de entrega:* ${customerAddressInput.value.trim()}, ${customerNeighborhoodInput.value.trim()}, ${customerCityInput.value}`,
        );

        const complement =
            customerComplementInput.value.trim();

        if (complement) {
            messageParts.push(
                `*Complemento:* ${complement}`
            );
        }
    }

    messageParts.push(
        "",
        "━━━━━━━━━━━━━━━━━━",
        "📦 *ITENS DO PEDIDO*",
        "",
        createItemsMessage(),
        "",
        "━━━━━━━━━━━━━━━━━━",
        `*Subtotal:* ${formatPrice(subtotal)}`,
        `*Entrega:* ${formatPrice(freightValue)}`,
        `*TOTAL:* ${formatPrice(total)}`,
        "",
        "✨ Aguardo a confirmação do pedido."
    );

    return messageParts.join("\n");
}


deliveryTypeInputs.forEach((input) => {
    input.addEventListener("change", toggleDeliveryFields);
});

customerPhoneInput.addEventListener("input", () => {
    customerPhoneInput.value = formatPhoneInput(customerPhoneInput.value);
});


customerCityInput.addEventListener("change", () => {

    loadNeighborhoods();

    calculateFreight();

});

customerNeighborhoodInput.addEventListener(
    "change",
    calculateFreight
);


checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmittingOrder) return;

    if (cart.length === 0) {
        alert("Seu carrinho está vazio.");
        return;
    }

    if (!checkoutForm.checkValidity()) {
        checkoutForm.reportValidity();
        return;
    }

    const deliveryType = getDeliveryType();
    const phoneDigits = normalizePhone(customerPhoneInput.value);

    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        customerPhoneInput.setCustomValidity("Informe um telefone válido com DDD.");
        customerPhoneInput.reportValidity();
        return;
    }

    customerPhoneInput.setCustomValidity("");

    if (deliveryType === "entrega") {
        calculateFreight();

        if (whatsappButton.disabled) {
            alert("Ainda não foi possível calcular a entrega para esse bairro.");
            return;
        }
    }

    isSubmittingOrder = true;
    const originalButtonText = whatsappButton.innerHTML;
    whatsappButton.disabled = true;
    whatsappButton.setAttribute("aria-busy", "true");
    whatsappButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Preparando pedido...';

    try {
        const subtotal = calculateSubtotal();
        const message = createWhatsAppMessage();
        const whatsappUrl =
            `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}` +
            `&text=${encodeURIComponent(message)}`;

        await decreaseStock(cart);

        try {
            await addDoc(collection(db, "pedidos"), {
                cliente: {
                    nome: customerNameInput.value.trim(),
                    telefone: phoneDigits,
                    cidade: deliveryType === "entrega" ? customerCityInput.value : "",
                    bairro: deliveryType === "entrega" ? customerNeighborhoodInput.value.trim() : "",
                    endereco: deliveryType === "entrega" ? customerAddressInput.value.trim() : "",
                    complemento: deliveryType === "entrega" ? customerComplementInput.value.trim() : ""
                },
                itens: cart.map(item => ({
                    id: item.id,
                    nome: item.name,
                    preco: Number(item.price) || 0,
                    quantidade: Number(item.quantity) || 0,
                    imagem: item.image || ""
                })),
                tipoEntrega: deliveryType,
                formaPagamento: getPaymentMethod(),
                formaPagamentoLabel: getPaymentMethodLabel(),
                subtotal,
                frete: freightValue,
                total: subtotal + freightValue,
                status: "novo",
                origem: "checkout-whatsapp",
                criadoEm: serverTimestamp()
            });
        } catch (orderError) {
            console.error("Não foi possível registrar o pedido no painel:", orderError);
        }

        // Limpa o carrinho antes do redirecionamento para impedir pedidos duplicados
        // caso o cliente toque várias vezes ou volte para a página pelo navegador.
        cart = [];
        saveCart(cart);

        whatsappButton.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Abrindo WhatsApp...';

        // Navegação na mesma aba: não é bloqueada pelos navegadores mobile,
        // ao contrário de window.open executado depois de operações assíncronas.
        window.location.assign(whatsappUrl);
    } catch (error) {
        console.error(error);

        isSubmittingOrder = false;
        whatsappButton.disabled = false;
        whatsappButton.removeAttribute("aria-busy");
        whatsappButton.innerHTML = originalButtonText;

        alert(
            error.message ||
            "Não foi possível finalizar o pedido. Verifique o estoque disponível."
        );
    }
});

window.addEventListener("pageshow", async () => {
    isSubmittingOrder = false;
    whatsappButton.removeAttribute("aria-busy");

    cart = loadCart();
    try {
        await synchronizeCartWithCatalog();
    } catch (error) {
        console.error("Não foi possível atualizar os dados dos produtos:", error);
    }
    renderProducts();
    toggleDeliveryFields();
});

async function initializeCheckout() {
    try {
        await synchronizeCartWithCatalog();
    } catch (error) {
        console.error("Não foi possível atualizar os dados dos produtos:", error);
    }

    renderProducts();
    toggleDeliveryFields();
}

initializeCheckout();
