const SUPABASE_URL = "https://irdqazkxbinwcorvfwjg.supabase.co";
const SUPABASE_KEY = "sb_publishable__irFocXiCfSKi-0uO4Wlcg_-CKO8B8";

const DEMO_PRODUCTS = [
  { id: "demo-1", name: "iPhone 15 Pro Max", category: "iPhones", description: "256GB · Natural Titanium", price: 1500000, image_url: "", emoji: "📱", old_price: 1700000 },
  { id: "demo-2", name: "iPhone 15 Pro", category: "iPhones", description: "256GB · Blue Titanium", price: 1300000, image_url: "", emoji: "📱", old_price: 1450000 },
  { id: "demo-3", name: "iPhone 15", category: "iPhones", description: "128GB · Black", price: 950000, image_url: "", emoji: "📱" },
  { id: "demo-4", name: "iPhone 14 Pro Max", category: "iPhones", description: "256GB · Deep Purple", price: 1200000, image_url: "", emoji: "📱", old_price: 1300000 },
  { id: "demo-5", name: "iPhone 14", category: "iPhones", description: "128GB · Midnight", price: 820000, image_url: "", emoji: "📱" },
  { id: "demo-6", name: "AirPods Pro", category: "AirPods", description: "Wireless earbuds", price: 250000, image_url: "", emoji: "🎧" },
  { id: "demo-7", name: "Phone Case", category: "Cases", description: "Protective case", price: 12000, image_url: "", emoji: "📱" },
  { id: "demo-8", name: "Fast Charger", category: "Chargers", description: "USB-C fast charger", price: 25000, image_url: "", emoji: "🔌" }
];

let products = [...DEMO_PRODUCTS];
let cart = JSON.parse(localStorage.getItem("phonistic_cart") || "[]");
let wishlist = JSON.parse(localStorage.getItem("phonistic_wishlist") || "[]");
let selectedCategory = "All";
let searchTerm = "";
let supabaseClient = null;

const naira = value => new Intl.NumberFormat("en-NG", {
  style: "currency", currency: "NGN", maximumFractionDigits: 0
}).format(Number(value || 0));

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function getImage(product) {
  if (product.image_url) {
    return `<img src="${escapeHTML(product.image_url)}" alt="${escapeHTML(product.name)}" loading="lazy">`;
  }
  return `<div class="product-emoji" aria-hidden="true">${escapeHTML(product.emoji || "📱")}</div>`;
}

function renderProducts() {
  const grid = document.querySelector("#product-grid, #products-grid, [data-product-grid]");
  if (!grid) return;
  const filtered = products.filter(p => {
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    const matchesSearch = `${p.name || ""} ${p.description || ""} ${p.category || ""}`
      .toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  grid.innerHTML = filtered.length ? filtered.map(p => `
    <article class="product-card">
      <button class="wishlist-button" type="button" data-wishlist="${escapeHTML(p.id)}" aria-label="Toggle wishlist">
        ${wishlist.includes(String(p.id)) ? "♥" : "♡"}
      </button>
      <div class="product-image">${getImage(p)}</div>
      <div class="product-info">
        <p class="product-category">${escapeHTML(p.category || "Accessories")}</p>
        <h3>${escapeHTML(p.name)}</h3>
        <p class="product-description">${escapeHTML(p.description || "")}</p>
        <div class="product-price">${naira(p.price)}</div>
        <button class="add-to-cart" type="button" data-add="${escapeHTML(p.id)}">Add to cart</button>
      </div>
    </article>`).join("") : `<p class="empty-state">No products found. Try another search.</p>`;

  updateCartDisplay();
}

function updateCartDisplay() {
  const count = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  document.querySelectorAll("#cart-count, [data-cart-count]").forEach(el => el.textContent = count);
  document.querySelectorAll("#cart-total, [data-cart-total]").forEach(el => {
    el.textContent = naira(cart.reduce((sum, item) => sum + item.price * item.quantity, 0));
  });
  const cartList = document.querySelector("#cart-items, [data-cart-items]");
  if (cartList) {
    cartList.innerHTML = cart.length ? cart.map(item => `
      <div class="cart-item">
        <div><strong>${escapeHTML(item.name)}</strong><p>${naira(item.price)} × ${item.quantity}</p></div>
        <div class="cart-controls">
          <button type="button" data-qty="${escapeHTML(item.id)}" data-change="-1">−</button>
          <span>${item.quantity}</span>
          <button type="button" data-qty="${escapeHTML(item.id)}" data-change="1">+</button>
          <button type="button" data-remove="${escapeHTML(item.id)}" aria-label="Remove item">Remove</button>
        </div>
      </div>`).join("") : `<p>Your cart is empty.</p>`;
  }
}

function saveCart() {
  localStorage.setItem("phonistic_cart", JSON.stringify(cart));
  updateCartDisplay();
}

function addToCart(id) {
  const p = products.find(product => String(product.id) === String(id));
  if (!p) return;
  const existing = cart.find(item => String(item.id) === String(id));
  if (existing) existing.quantity += 1;
  else cart.push({ id: p.id, name: p.name, price: Number(p.price), quantity: 1 });
  saveCart();
  alert(`${p.name} added to your cart.`);
}

async function loadProducts() {
  if (!supabaseClient) {
    renderProducts();
    return;
  }
  try {
    const { data, error } = await supabaseClient.from("products")
      .select("*").eq("is_active", true).order("created_at", { ascending: false });
    if (error) throw error;
    if (data && data.length) products = data;
    renderProducts();
  } catch (error) {
    console.error("Could not load Supabase products:", error.message);
    renderProducts();
  }
}

function openCart() {
  const cartPanel = document.querySelector("#cart-panel, [data-cart-panel]");
  if (cartPanel) {
    cartPanel.classList.toggle("open");
    cartPanel.setAttribute("aria-hidden", cartPanel.classList.contains("open") ? "false" : "true");
  } else {
    alert(cart.length ? cart.map(i => `${i.name} × ${i.quantity} — ${naira(i.price * i.quantity)}`).join("\n") : "Your cart is empty.");
  }
}

async function checkout(form) {
  if (!cart.length) {
    alert("Your cart is empty.");
    return;
  }
  if (!supabaseClient) {
    alert("The cart works, but checkout needs the Supabase client library and database tables configured.");
    return;
  }
  const formData = new FormData(form);
  const value = name => String(formData.get(name) || "").trim();
  const customer = {
    customer_name: value("customer_name") || value("name"),
    phone: value("phone"),
    email: value("email"),
    address: value("address"),
    state: value("state"),
    city: value("city"),
    note: value("note")
  };
  if (!customer.customer_name || !customer.phone || !customer.address) {
    alert("Please enter your name, phone number, and delivery address.");
    return;
  }
  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  try {
    const { data: order, error: orderError } = await supabaseClient.from("orders").insert({
      ...customer, total, status: "pending"
    }).select().single();
    if (orderError) throw orderError;
    const orderItems = cart.map(item => ({
      order_id: order.id,
      product_id: products.some(p => String(p.id) === String(item.id) && !String(p.id).startsWith("demo-")) ? item.id : null,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: item.price * item.quantity
    }));
    const { error: itemsError } = await supabaseClient.from("order_items").insert(orderItems);
    if (itemsError) throw itemsError;
    cart = [];
    saveCart();
    form.reset();
    alert(`Order placed successfully. Reference: ${order.order_reference || order.id}\nPayment is not collected online yet. PHONISTIC will need to confirm your order.`);
  } catch (error) {
    console.error("Checkout failed:", error.message);
    alert(`Checkout could not be completed: ${error.message}`);
  }
}

document.addEventListener("click", event => {
  const add = event.target.closest("[data-add]");
  if (add) return addToCart(add.dataset.add);

  const wish = event.target.closest("[data-wishlist]");
  if (wish) {
    const id = String(wish.dataset.wishlist);
    wishlist = wishlist.includes(id) ? wishlist.filter(x => x !== id) : [...wishlist, id];
    localStorage.setItem("phonistic_wishlist", JSON.stringify(wishlist));
    renderProducts();
    return;
  }

  const qty = event.target.closest("[data-qty]");
  if (qty) {
    const item = cart.find(i => String(i.id) === String(qty.dataset.qty));
    if (item) item.quantity += Number(qty.dataset.change);
    cart = cart.filter(i => i.quantity > 0);
    return saveCart();
  }

  const remove = event.target.closest("[data-remove]");
  if (remove) {
    cart = cart.filter(i => String(i.id) !== String(remove.dataset.remove));
    return saveCart();
  }

  if (event.target.closest("#cart-button, [data-open-cart]")) openCart();
});

document.addEventListener("input", event => {
  if (event.target.matches("#search-input, [data-product-search]")) {
    searchTerm = event.target.value || "";
    renderProducts();
  }
});

document.addEventListener("change", event => {
  if (event.target.matches("#category-filter, [data-category-filter]")) {
    selectedCategory = event.target.value || "All";
    renderProducts();
  }
});

document.addEventListener("submit", event => {
  if (event.target.matches("#checkout-form, [data-checkout-form]")) {
    event.preventDefault();
    checkout(event.target);
  }
});

async function initialize() {
  if (window.supabase && typeof window.supabase.createClient === "function") {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    console.warn("Supabase JS library is not loaded. Demo products will still display.");
  }
  await loadProducts();
  updateCartDisplay();
}

document.addEventListener("DOMContentLoaded", initialize);
