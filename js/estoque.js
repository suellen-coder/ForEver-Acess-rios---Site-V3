import { db } from "./firebase-config.js";

import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    runTransaction,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const INITIAL_STOCK = {
    FB002: 1,
    FB006: 1,
    FB008: 2,
    FB010: 2,
    FB012: 2,
    FB014: 2,
    FB017: 1,
    FB018: 2,

    FC001: 2,
    FC003: 2,
    FC008: 2,
    FC010: 1,
    FC011: 2,
    FC012: 2,
    FC017: 1,
    FC018: 2,
    FC019: 1,

    FP003: 1,
    FP006: 1,
    FP008: 1,
    FP014: 1,
    FP015: 1
};


function createCompleteStock() {
    const stock = {};

    for (let number = 1; number <= 18; number++) {
        const id = `FB${String(number).padStart(3, "0")}`;
        stock[id] = INITIAL_STOCK[id] ?? 0;
    }

    for (let number = 1; number <= 19; number++) {
        const id = `FC${String(number).padStart(3, "0")}`;
        stock[id] = INITIAL_STOCK[id] ?? 0;
    }

    for (let number = 1; number <= 15; number++) {
        const id = `FP${String(number).padStart(3, "0")}`;
        stock[id] = INITIAL_STOCK[id] ?? 0;
    }

    return stock;
}


export async function initializeStock() {
    const completeStock = createCompleteStock();

    for (const [productId, quantity] of Object.entries(completeStock)) {
        const productReference = doc(db, "estoque", productId);
        const productSnapshot = await getDoc(productReference);

        if (!productSnapshot.exists()) {
            await setDoc(productReference, {
                id: productId,
                quantidade: quantity,
                ativo: quantity > 0
            });
        }
    }

    console.log("Estoque cadastrado com sucesso.");
}

export function watchStock(updateProduct) {
    const stockCollection = collection(db, "estoque");

    return onSnapshot(stockCollection, (snapshot) => {
        snapshot.forEach((productDocument) => {
            const data = productDocument.data();

            updateProduct(
                productDocument.id,
                Number(data.quantidade) || 0
            );
        });
    });
}

export async function decreaseStock(cartItems) {
    await runTransaction(db, async (transaction) => {
        const products = [];

        for (const item of cartItems) {
            const productId = String(item.id)
                .trim()
                .toUpperCase();

            const productReference = doc(
                db,
                "estoque",
                productId
            );

            const productDocument =
                await transaction.get(productReference);

            if (!productDocument.exists()) {
                throw new Error(
                    `Produto ${productId} não encontrado no estoque.`
                );
            }

            const currentQuantity =
                Number(productDocument.data().quantidade) || 0;

            const requestedQuantity =
                Number(item.quantity) || 1;

            if (currentQuantity < requestedQuantity) {
                throw new Error(
                    `Estoque insuficiente para ${item.name}.`
                );
            }

            products.push({
                reference: productReference,
                newQuantity:
                    currentQuantity - requestedQuantity
            });
        }

        products.forEach((product) => {
            transaction.update(product.reference, {
                quantidade: product.newQuantity
            });
        });
    });
}