import { db } from "./firebase-config.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { formatPrice } from "./utils.js";

const catalogRoot = document.querySelector("#dynamic-catalog");
const statusElement = document.querySelector("#catalog-status");
const previewRoot = document.querySelector("#dynamic-product-preview");

const state = { products: [], stock: new Map() };
const CATEGORY_ORDER = ["Anéis", "Berloques", "Brincos", "Colares", "Pulseiras", "Outros"];

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[char]);
}

function imageSource(value = "") {
  const src = String(value).trim();
  return src || "midia/logos/L1b.PNG";
}

function normalizedCategory(product) {
  return product.categoria || (product.id.startsWith("FB") ? "Brincos" : product.id.startsWith("FC") ? "Colares" : product.id.startsWith("FP") ? "Pulseiras" : "Outros");
}

function currentPrice(product) {
  const promo = Number(product.precoPromocional);
  return promo > 0 && promo < Number(product.preco || 0) ? promo : Number(product.preco || 0);
}

function sortedProducts(products) {
  return products.slice().sort((a, b) => {
    const stockA = state.stock.get(a.id) || 0;
    const stockB = state.stock.get(b.id) || 0;
    if (Boolean(a.destaque) !== Boolean(b.destaque)) return a.destaque ? -1 : 1;
    if ((stockA > 0) !== (stockB > 0)) return stockA > 0 ? -1 : 1;
    const orderDiff = Number(a.ordem || 9999) - Number(b.ordem || 9999);
    if (orderDiff) return orderDiff;
    return String(a.nome || a.id).localeCompare(String(b.nome || b.id), "pt-BR");
  });
}

function productCard(product) {
  const stock = state.stock.get(product.id) || 0;
  const price = currentPrice(product);
  const hasPromo = price < Number(product.preco || 0);
  return `<div class="product dynamic-product ${stock <= 0 ? "product-sold-out" : ""}" data-name="${escapeHtml(product.id)}" data-product-name="${escapeHtml(product.nome || product.id)}" data-product-price="${price}" data-product-image="${escapeHtml(imageSource(product.imagem))}">
    <div class="product-image-wrap">
      ${product.destaque ? '<span class="product-label">Destaque</span>' : ""}
      <img src="${escapeHtml(imageSource(product.imagem))}" alt="${escapeHtml(product.nome || product.id)}" loading="lazy">
    </div>
    <h3>${escapeHtml(product.nome || product.id)}</h3>
    <div class="preco">
      ${hasPromo ? `<small class="old-price">${formatPrice(product.preco)}</small>` : ""}
      ${formatPrice(price)}
    </div>
    <button class="btn-card ${stock <= 0 ? "esgotado" : ""}" ${stock <= 0 ? "disabled" : ""}>${stock <= 0 ? "Esgotado" : "Adicionar ao Carrinho"}</button>
  </div>`;
}

function previewMarkup(product) {
  const stock = state.stock.get(product.id) || 0;
  const price = currentPrice(product);
  const hasPromo = price < Number(product.preco || 0);
  return `<div class="preview active" data-target="${escapeHtml(product.id)}" data-product-name="${escapeHtml(product.nome || product.id)}" data-product-price="${price}" data-product-image="${escapeHtml(imageSource(product.imagem))}">
    <button type="button" class="close-preview fas fa-times" aria-label="Fechar preview"></button>
    <img src="${escapeHtml(imageSource(product.imagem))}" alt="${escapeHtml(product.nome || product.id)}">
    <h3>${escapeHtml(product.nome || product.id)}</h3>
    <div class="preco">${hasPromo ? `<small class="old-price">${formatPrice(product.preco)}</small>` : ""}${formatPrice(price)}</div>
    ${product.material ? `<p><strong>Material:</strong> ${escapeHtml(product.material)}</p>` : ""}
    ${product.cor ? `<p><strong>Cor:</strong> ${escapeHtml(product.cor)}</p>` : ""}
    <p>${escapeHtml(product.descricao || "Acessório selecionado com cuidado para acompanhar diferentes momentos.")}</p>
    <button class="btn-card ${stock <= 0 ? "esgotado" : ""}" ${stock <= 0 ? "disabled" : ""}>${stock <= 0 ? "Esgotado" : "Adicionar ao Carrinho"}</button>
  </div>`;
}

function render() {
  if (!catalogRoot) return;
  const active = state.products.filter(product => product.ativo !== false);
  if (!active.length) {
    statusElement.textContent = "Nenhum produto disponível no momento.";
    catalogRoot.innerHTML = "";
    return;
  }
  statusElement.hidden = true;
  const groups = new Map();
  active.forEach(product => {
    const category = normalizedCategory(product);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(product);
  });
  const categories = [...groups.keys()].sort((a,b) => {
    const ai=CATEGORY_ORDER.indexOf(a), bi=CATEGORY_ORDER.indexOf(b);
    return (ai<0?999:ai)-(bi<0?999:bi) || a.localeCompare(b,"pt-BR");
  });
  catalogRoot.innerHTML = categories.map(category => {
    const products = sortedProducts(groups.get(category));
    return `<section class="dynamic-category" data-category="${escapeHtml(category)}">
      <h2 class="seçoes">${escapeHtml(category)}</h2>
      <div class="product-grd">${products.map(productCard).join("")}</div>
      ${products.length > 3 ? '<button type="button" class="btn-ver-todos">Ver todos dessa categoria</button>' : ""}
    </section>`;
  }).join("");
  document.dispatchEvent(new CustomEvent("forever:catalog-rendered"));
}

export function getProductForCart(productId) {
  const normalized = String(productId || "").trim().toUpperCase();
  const product = state.products.find(item => item.id === normalized && item.ativo !== false);
  if (!product) return null;

  return {
    id: product.id,
    name: String(product.nome || product.id).trim(),
    price: currentPrice(product),
    image: imageSource(product.imagem),
    quantity: 1
  };
}

export function openProductPreview(productId) {
  const normalized = String(productId || "").trim().toUpperCase();
  const product = state.products.find(item => item.id === normalized && item.ativo !== false);
  if (!product || !previewRoot) return;
  previewRoot.innerHTML = previewMarkup(product);
  previewRoot.style.display = "flex";
  previewRoot.setAttribute("aria-hidden", "false");
}

export function closeProductPreview() {
  if (!previewRoot) return;
  previewRoot.style.display = "none";
  previewRoot.innerHTML = "";
  previewRoot.setAttribute("aria-hidden", "true");
}

onSnapshot(collection(db, "produtos"), snapshot => {
  state.products = snapshot.docs.map(document => ({
    ...document.data(),
    id: document.id.trim().toUpperCase()
  }));
  render();
  document.dispatchEvent(new CustomEvent("forever:products-updated", {
    detail: state.products.map(product => ({
      id: product.id,
      name: String(product.nome || product.id).trim(),
      price: currentPrice(product),
      image: imageSource(product.imagem),
      active: product.ativo !== false
    }))
  }));
}, error => {
  console.error("Erro ao carregar produtos:", error);
  statusElement.textContent = "Não foi possível carregar o catálogo.";
});

onSnapshot(collection(db, "estoque"), snapshot => {
  state.stock = new Map(snapshot.docs.map(document => [document.id.trim().toUpperCase(), Number(document.data().quantidade) || 0]));
  render();
});

window.ForeverCatalog = { openProductPreview, closeProductPreview, getProductForCart };
