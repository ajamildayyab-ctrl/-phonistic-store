// PHONISTIC — Smart shopping. Simple choice.

const SUPABASE_URL = "https://irdqazkxbinwcorvfwjg.supabase.co";

// Replace this placeholder with your Supabase publishable/anon key.
const SUPABASE_KEY = "PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE";

const money = amount =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);

const demoProducts = [
  { id: "iphone-15-pro-max", name: "iPhone 15 Pro Max", category: "iPhones", price: 1500000, description: "256GB · Natural Titanium", emoji: "📱", is_active: true },
  { id: "iphone-15-pro", name: "iPhone 15 Pro", category: "iPhones", price: 1300000, description: "256GB · Blue Titanium", emoji: "📱", is_active: true },
  { id: "iphone-15", name: "iPhone 15", category: "iPhones", price: 950000, description: "128GB · Black", emoji: "📱", is_active: true },
  { id: "iphone-14-pro-max", name: "iPhone 14 Pro Max", category: "iPhones", price: 1200000, description: "256GB · Deep Purple", emoji: "📱", is_active: true },
  { id: "iphone-14", name: "iPhone 14", category: "iPhones", price: 820000, description: "128GB · Midnight", emoji: "📱", is_active: true },
  { id: "airpods-pro", name: "AirPods Pro", category: "AirPods", price: 180000, description: "Wireless listening", emoji: "🎧", is_active: true },
  { id: "phone-case", name: "Premium Phone Case", category: "Cases", price: 12000, description: "Everyday protection", emoji: "📱", is_active: true },
  { id: "fast-charger", name: "Fast USB-C Charger", category: "Chargers", price: 18000, description: "Compact charging adapter", emoji: "🔌", is_active: true },
  { id: "power-bank", name: "Portable Power Bank", category: "Power Banks", price: 35000, description: "Power on the go", emoji: "🔋", is_active: true },
  { id: "usb-c-cable", name: "USB-C Charging Cable", category: "Accessories", price: 8000, description: "Everyday charging cable", emoji: "🔌", is_active: true }
];

const $ = selector => document.querySelector(selector);

let products = [];
let activeCategory = "All";
let searchTerm = "";
let wishlistOnly = false;
let cart = JSON.parse(localStorage.getItem("phonistic-cart") || "[]");
let wishlist = JSON.parse(localStorage.getItem("phonistic-wishlist") || "[]");
let toastTimer;

const supabaseReady =
  window.supabase &&
  SUPABASE_KEY !== "PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE";

const db = supabaseReady
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

function toast(message) {
  const element = $("#toast");
  if (!element) return;

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 2600);
}

function saveCart() {
  localStorage.setItem("phonistic-cart", JSON.stringify(cart));
  renderCart();
}

function saveWishlist() {
  localStorage.setItem("phonistic-wishlist", JSON.stringify(wishlist));
  renderProducts();
}

function productEmoji(product) {
  if (product.emoji) return product.emoji;

  const name = String(product.name || "").toLowerCase();

  if (name.includes("airpod") || name.includes("headphone")) return "🎧";
  if (name.includes("charger") || name.includes("cable")) return "🔌";
  if (name.includes("power bank")) return "🔋";
  if (name.includes("case")) return "📱";

  return "📱";
}

function normaliseProduct(product) {
  return {
    ...product,
    id: String(product.id),
    name: product.name || "Product",
    category: product.category || "Accessories",
    price: Number(product.price) || 0,
    description: product.description || product.short_description || "",
    emoji: productEmoji(product),
    image_url: product.image_url || product.image || "",
    is_active: product.is_active !== false
  };
}

async function loadProducts() {
  const status = $("#product-status");

  if (!db) {
    products = demoProducts.map(normaliseProduct);
    if (status) {
      status.textContent = "Sample products · Database not connected";
    }
    renderProducts();
    return;
  }

  try {
    const { data, error } = await db
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    products = (data || []).map(normaliseProduct);

    if (status) {
      status.textContent = `${products.length} products available`;
    }

    renderProducts();
  } catch (error) {
    console.error("Product loading failed:", error);
    products = demoProducts.map(normaliseProduct);

    if (status) {
      status.textContent = "Showing sample products · Database unavailable";
    }

    renderProducts();
    toast("Showing sample products. Database connection needs checking.");
  }
}

function filteredProducts() {
  return products.filter(product => {
    const matchesCategory =
      activeCategory === "All" ||
      product.category.toLowerCase() === activeCategory.toLowerCase() ||
      (activeCategory === "Accessories" &&
        !["iphones", "airpods", "cases", "chargers", "power banks"].includes(
          product.category.toLowerCase()
        ));

    const text = `${product.name} ${product.description} ${product.category}`
      .toLowerCase();

    const matchesSearch = text.includes(searchTerm.toLowerCase());
    const matchesWishlist = !wishlistOnly || wishlist.includes(product.id);

    return matchesCategory && matchesSearch && matchesWishlist;
  });
}

function renderProducts() {
  const grid = $("#product-grid");
  const empty = $("#empty-state");
  if (!grid) return;

  const list = filteredProducts();

  grid.innerHTML = list.map(product => {
    const selected = wishlist.includes(product.id);
    const image = product.image_url
      ? `<img src="${escapeHTML(product.image_url)}" alt="${escapeHTML(product.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">`
      : "";

    return `
      <article class="product-card">
        <div class="product-image">
          ${image}
          <span class="product-emoji" ${product.image_url ? 'style="display:none"' : ""}>${product.emoji}</span>
          <span class="badge">PHONISTIC PICK</span>
          <button class="wishlist-button ${selected ? "selected" : ""}"
            data-wishlist="${escapeHTML(product.id)}"
            aria-label="${selected ? "Remove from" : "Add to"} wishlist">
            ${selected ? "♥" : "♡"}
          </button>
        </div>
        <div class="product-info">
          <span class="product-category">${escapeHTML(product.category)}</span>
          <h3>${escapeHTML(product.name)}</h3>
          <p class="product-description">${escapeHTML(product.description)}</p>
          <div class="price-row">
            <span class="product-price">${money(product.price)}</span>
            ${product.old_price ? `<span class="old-price">${money(product.old_price)}</span>` : ""}
          </div>
          <button class="add-cart-button" data-add="${escapeHTML(product.id)}">
            Add to cart +
          </button>
        </div>
      </article>
    `;
  }).join("");

  if (empty) empty.classList.toggle("hidden", list.length !== 0);
  if (grid) grid.classList.toggle("hidden", list.length === 0);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function addToCart(id) {
  const product = products.find(item => item.id === String(id));
  if (!product) return;

  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      emoji: product.emoji,
      quantity: 1
    });
  }

  saveCart();
  toast(`${product.name} added to your cart.`);
}

function updateQuantity(id, change) {
  const item = cart.find(entry => entry.id === String(id));
  if (!item) return;

  item.quantity += change;

  if (item.quantity <= 0) {
    cart = cart.filter(entry => entry.id !== String(id));
  }

  saveCart();
}

function cartTotal() {
  return cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
}

function renderCart() {
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const total = cartTotal();

  if ($("#cart-count")) $("#cart-count").textContent = count;
  if ($("#drawer-count")) $("#drawer-count").textContent = `(${count})`;
  if ($("#cart-subtotal")) $("#cart-subtotal").textContent = money(total);
  if ($("#checkout-total")) $("#checkout-total").textContent = money(total);

  const items = $("#cart-items");
  const empty = $("#cart-empty");
  const footer = $("#cart-footer");

  if (items) {
    items.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-image">${item.emoji || "📱"}</div>
        <div>
          <h4>${escapeHTML(item.name)}</h4>
          <p>${money(item.price)}</p>
          <div class="quantity-control">
            <button data-quantity="${escapeHTML(item.id)}" data-change="-1" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button data-quantity="${escapeHTML(item.id)}" data-change="1" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <button class="remove-item" data-remove="${escapeHTML(item.id)}" aria-label="Remove item">×</button>
      </div>
    `).join("");
  }

  if (empty) empty.classList.toggle("hidden", cart.length > 0);
  if (footer) footer.classList.toggle("hidden", cart.length === 0);
}

function openCart() {
  $("#overlay")?.classList.remove("hidden");
  $("#cart-drawer")?.classList.add("open");
  $("#cart-drawer")?.setAttribute("aria-hidden", "false");
}

function closePanels() {
  $("#overlay")?.classList.add("hidden");
  $("#cart-drawer")?.classList.remove("open");
  $("#cart-drawer")?.setAttribute("aria-hidden", "true");
  $("#checkout-modal")?.classList.add("hidden");
  $("#success-modal")?.classList.add("hidden");
}

function openCheckout() {
  if (cart.length === 0) {
    toast("Your cart is empty.");
    return;
  }

  closePanels();
  $("#checkout-total").textContent = money(cartTotal());
  $("#checkout-error")?.classList.add("hidden");
  $("#checkout-modal")?.classList.remove("hidden");
}

async function placeOrder(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const submit = $("#place-order");
  const errorBox = $("#checkout-error");

  if (cart.length === 0) {
    toast("Your cart is empty.");
    return;
  }

  const formData = new FormData(form);
  const customer = Object.fromEntries(formData.entries());

  if (!customer.customer_name.trim() ||
      !customer.phone.trim() ||
      !customer.address.trim() ||
      !customer.state.trim() ||
      !customer.city.trim()) {
    if (errorBox) {
      errorBox.textContent = "Please complete all required fields.";
      errorBox.classList.remove("hidden");
    }
    return;
  }

  submit.disabled = true;
  submit.textContent = "Submitting order…";
  errorBox?.classList.add("hidden");

  try {
    if (!db) {
      throw new Error(
        "The database is not connected yet. Connect Supabase before placing live orders."
      );
    }

    const orderReference = "PH-" +
      Date.now().toString(36).toUpperCase();

    const orderPayload = {
      customer_name: customer.customer_name.trim(),
      phone: customer.phone.trim(),
      email: customer.email.trim() || null,
      address: customer.address.trim(),
      state: customer.state.trim(),
      city: customer.city.trim(),
      note: customer.note.trim() || null,
      total: cartTotal(),
      status: "pending",
      order_reference: orderReference
    };

    const { data: order, error: orderError } = await db
      .from("orders")
      .insert(orderPayload)
      .select("id")
      .single();

    if (orderError) throw orderError;

    const orderItems = cart.map(item => ({
      order_id: order.id,
      product_id: products.some(product => product.id === item.id)
        ? item.id
        : null,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: item.price * item.quantity
    }));

    const { error: itemsError } = await db
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Order saved but order items failed:", itemsError);
      throw new Error(
        "Your order was created, but its items could not be saved. Please contact support before submitting again."
      );
    }

    cart = [];
    saveCart();
    form.reset();
    closePanels();

    $("#order-reference").textContent = orderReference;
    $("#success-modal")?.classList.remove("hidden");
  } catch (error) {
    console.error("Checkout failed:", error);

    if (errorBox) {
      errorBox.textContent = error.message ||
        "We couldn't submit your order. Please try again.";
      errorBox.classList.remove("hidden");
    }
  } finally {
    submit.disabled = false;
    submit.textContent = "Place order →";
  }
}

function setupEvents() {
  $("#search-form")?.addEventListener("submit", event => {
    event.preventDefault();
    searchTerm = $("#search-input").value.trim();
    renderProducts();
    $("#shop")?.scrollIntoView({ behavior: "smooth" });
  });

  $("#search-input")?.addEventListener("input", event => {
    searchTerm = event.target.value.trim();
    renderProducts();
  });

  $("#categories")?.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;

    activeCategory = button.dataset.category;
    $("#categories").querySelectorAll(".category").forEach(category => {
      category.classList.toggle("active", category === button);
    });

    wishlistOnly = false;
    $("#wishlist-toggle")?.classList.remove("selected");
    renderProducts();
  });

  $("#product-grid")?.addEventListener("click", event => {
    const add = event.target.closest("[data-add]");
    const wish = event.target.closest("[data-wishlist]");

    if (add) addToCart(add.dataset.add);

    if (wish) {
      const id = wish.dataset.wishlist;

      wishlist = wishlist.includes(id)
        ? wishlist.filter(item => item !== id)
        : [...wishlist, id];

      saveWishlist();
    }
  });

  $("#clear-filters")?.addEventListener("click", () => {
    searchTerm = "";
    activeCategory = "All";
    wishlistOnly = false;

    if ($("#search-input")) $("#search-input").value = "";

    $("#categories")?.querySelectorAll(".category").forEach(button => {
      button.classList.toggle("active", button.dataset.category === "All");
    });

    renderProducts();
  });

  $("#wishlist-toggle")?.addEventListener("click", () => {
    wishlistOnly = !wishlistOnly;
    $("#wishlist-toggle").classList.toggle("selected", wishlistOnly);
    renderProducts();
    $("#shop")?.scrollIntoView({ behavior: "smooth" });
  });

  $("#cart-open")?.addEventListener("click", openCart);
  $("#overlay")?.addEventListener("click", closePanels);
  $("#checkout-open")?.addEventListener("click", openCheckout);
  $("#checkout-form")?.addEventListener("submit", placeOrder);

  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", closePanels);
  });

  $("#cart-items")?.addEventListener("click", event => {
    const quantity = event.target.closest("[data-quantity]");
    const remove = event.target.closest("[data-remove]");

    if (quantity) {
      updateQuantity(
        quantity.dataset.quantity,
        Number(quantity.dataset.change)
      );
    }

    if (remove) {
      cart = cart.filter(item => item.id !== remove.dataset.remove);
      saveCart();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closePanels();
  });
}

function init() {
  if ($("#year")) {
    $("#year").textContent = new Date().getFullYear();
  }

  setupEvents();
  renderCart();
  loadProducts();
}

document.addEventListener("DOMContentLoaded", init);
