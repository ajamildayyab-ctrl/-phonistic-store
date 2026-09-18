const SUPABASE_URL = "https://irdqazkxbinwcorvfwjg.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "PASTE_YOUR_SB_PUBLISHABLE_KEY_HERE";

const { createClient } = supabase;

const db = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let products = [];

async function loadProducts() {
  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("id", { ascending: true });

  if (error) {
    console.error("Could not load products:", error);
    return;
  }

  products = data || [];

  displayProducts(products);
}

function displayProducts(items) {
  const container = document.querySelector(".products");

  if (!container) return;

  container.innerHTML = "";

  items.forEach(product => {
    const card = document.createElement("div");

    card.className = "product";

    card.innerHTML = `
      <div class="product-image">
        ${product.image_url
          ? `<img src="${product.image_url}" alt="${product.name}" style="width:100%;height:100%;object-fit:contain;border-radius:12px;">`
          : product.name
        }
      </div>

      <h3>${product.name}</h3>

      <p>${product.storage || ""} · ${product.colour || ""}</p>

      <div class="price">
        ₦${Number(product.price).toLocaleString("en-NG")}
      </div>

      <button class="buy" onclick="addToCart(${product.id})">
        Add to Cart
      </button>
    `;

    container.appendChild(card);
  });
}

function addToCart(productId) {
  const product = products.find(item => item.id === productId);

  if (!product) return;

  alert(`${product.name} added to cart.`);
}

loadProducts();
