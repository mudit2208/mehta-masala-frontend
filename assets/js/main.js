/* =========================================================
   main.js — consolidated frontend logic (cart, product pages, checkout)
========================================================= */

const API_BASE = "https://mehta-masala-backend.onrender.com"; // <--- update if needed

/* ------------------------------
   Utilities: cart in localStorage
-------------------------------*/
function getCart() {
  try { return JSON.parse(localStorage.getItem("cart")) || []; }
  catch(e) { return []; }
}
function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}
function updateCartCount() {
  const cart = getCart();
  const sum = cart.reduce((s,i)=> s + (i.quantity||0), 0);
  const el = document.getElementById("cart-count");
  if (el) {
    el.textContent = sum;
    el.classList.add("pulse");
    setTimeout(()=> el.classList.remove("pulse"), 500);
  }
}
updateCartCount();

/* ------------------------------
   Helper: escape HTML
------------------------------- */
function escapeHTML(s) {
  return String(s || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

/* =========================================================
   HOME / PRODUCTS — Load all products from data/products.json
   (or fallback to embedded list if file missing)
========================================================= */
async function fetchProducts() {
  try {
    const res = await fetch("data/products.json");
    if (!res.ok) throw new Error("no json");
    return await res.json();
    } catch (e) {
      // fallback: keep small inline list (keeps site usable)
      return [
        {
          slug: "red-chilli",
          name: "Red Chilli Powder",
          description: "100% pure red chilli powder",
          image: "assets/images/red-chilli.webp",
          variants: [
            { weight: 100,  price: 40 },
            { weight: 250,  price: 100 },
            { weight: 500,  price: 200 },
            { weight: 1000, price: 400 }
          ]
        },
        {
          slug: "turmeric",
          name: "Turmeric Powder",
          description: "Pure haldi powder",
          image: "assets/images/turmeric.webp",
          variants: [
            { weight: 100,  price: 38 },
            { weight: 250,  price: 95 },
            { weight: 500,  price: 190 },
            { weight: 1000, price: 380 }
          ]
        },
        {
          slug: "dhaniya",
          name: "Coriander Powder",
          description: "Fresh & aromatic coriander powder",
          image: "assets/images/coriander.webp",
          variants: [
            { weight: 100,  price: 12 },
            { weight: 250,  price: 30 },
            { weight: 500,  price: 60 },
            { weight: 1000, price: 120 }
          ]
        },
        {
          slug: "jeeravan",
          name: "Jeeravan Masala",
          description: "Special Mehta Masala recipe",
          image: "assets/images/jeeravan.webp",
          variants: [
            { weight: 100,  price: 42 },
            { weight: 250,  price: 105 },
            { weight: 500,  price: 210 },
            { weight: 1000, price: 420 }
          ]
        }
      ];
    }
}

// Get price for a given weight from a product's variants
function getVariantPrice(product, weight) {
  const w = Number(weight);
  if (product.variants && product.variants.length) {
    const found = product.variants.find(v => Number(v.weight) === w);
    if (found) return found.price;
  }
  // fallback if variants missing
  if (typeof product.price === "number") return product.price;
  return 0;
}

// Get minimum (starting) price of a product
function getStartingPrice(product) {
  if (product.variants && product.variants.length) {
    return product.variants.reduce(
      (min, v) => v.price < min ? v.price : min,
      product.variants[0].price
    );
  }
  return product.price || 0;
}

// Get weights array for pills/list
function getWeights(product) {
  if (product.variants && product.variants.length) {
    return product.variants.map(v => v.weight);
  }
  return product.weights || [100];
}

// =============================
// HOME PAGE – FEATURED PRODUCTS
// =============================
async function loadHomeProducts() {
  const grid = document.getElementById("featured-products");
  if (!grid) return; // safely do nothing if not on home page

  const products = await fetchProducts();
  const featured = products.slice(0, 4); // first 4 as featured

  grid.innerHTML = featured.map(p => `
    <div class="product-card">
      <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}">
      <h3>${escapeHTML(p.name)}</h3>
      <p>${escapeHTML(p.description || "")}</p>
      <p class="price">
      From ₹${getStartingPrice(p)}
      <span class="small-text">(Multiple sizes)</span>
      </p>


      <div class="card-actions">
        <a href="product.html?slug=${p.slug}" class="btn-outline">Details</a>
        <button class="btn-primary" onclick="quickAdd('${p.slug}')">Add</button>
      </div>
    </div>
  `).join('');
}

async function loadAllProducts() {
  const grid = document.getElementById("all-products");
  if (!grid) return;
  const products = await fetchProducts();
  grid.innerHTML = products.map(p => `
      <div class="product-card">
        <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}">
        <h3>${escapeHTML(p.name)}</h3>
        <p>${escapeHTML(p.description || p.short || "")}</p>
        <p class="price">
        From ₹${getStartingPrice(p)}
        <span class="small-text">(Multiple sizes)</span>
        </p>


        <div class="card-actions">
            <a href="product.html?slug=${p.slug}" class="btn-outline">Details</a>
            <button class="btn-primary" onclick="quickAdd('${p.slug}')">Add</button>
        </div>
      </div>
  `).join('');
}


function updateBreadcrumbSchema(product) {
  const scriptTag = document.querySelector('script[type="application/ld+json"][data-breadcrumb="1"]');
  if (!scriptTag) return;

  let data = JSON.parse(scriptTag.textContent);
  data.itemListElement[2].name = product.name;
  data.itemListElement[2].item = window.location.href;
  scriptTag.textContent = JSON.stringify(data);
}

/* =========================================================
   PRODUCT DETAIL
========================================================= */
async function loadProductDetail() {
  if (!window.location.pathname.includes("product.html")) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  if (!slug) return;

  const products = await fetchProducts();
  const product = products.find(p => p.slug === slug);
  if (!product) {
    const page = document.getElementById("product-page");
    if (page) page.innerHTML = "<p>Product not found.</p>";
    return;
  }

  // Save globally if needed later
  window.currentProduct = product;
  updateBreadcrumbSchema(product);

  // Image + title + price
  const imgEl = document.getElementById("prod-image");
  if (imgEl) {
    imgEl.src = product.image;
    imgEl.alt = product.name;
  }

  const nameEl = document.getElementById("prod-name");
  if (nameEl) nameEl.textContent = product.name;

  const priceEl = document.getElementById("prod-price");
  const weights = getWeights(product);
  let selectedWeight = weights[0];

  function updateDisplayedPrice() {
    if (priceEl) {
      priceEl.textContent = getVariantPrice(product, selectedWeight);
    }
  }

  // initial correct price
  updateDisplayedPrice();  // initial correct price

  // Short + long description
  const fullDesc = product.description || "";
  const short = fullDesc.length > 160 ? fullDesc.slice(0, 157) + "..." : fullDesc;

  const shortEl = document.getElementById("prod-desc");
  if (shortEl) shortEl.textContent = short;

  const longEl = document.getElementById("prod-desc-long");
  if (longEl) longEl.textContent = fullDesc;

  // SEO: Update title + meta description
  document.title = `${product.name} – Pure Indian Spice by Mehta Masala`;

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute(
      "content",
      `${product.name} by Mehta Masala – pure, freshly packed spice. ${short}`
    );
  }

  // JSON-LD Product schema (kept from earlier version)
  // JSON-LD Product schema
  const prices = product.variants.map(v => v.price);
  const variantWeights = product.variants.map(v => v.weight);

  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": [location.origin + "/" + product.image],
    "description": fullDesc,
    "brand": {
      "@type": "Brand",
      "name": "Mehta Masala Gruh Udhyog"
    },
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "INR",
      "lowPrice": Math.min(...prices),
      "highPrice": Math.max(...prices),
      "offerCount": product.variants.length,
      "offers": product.variants.map(v => ({
        "@type": "Offer",
        "price": v.price,
        "priceCurrency": "INR",
        "sku": product.slug + "-" + v.weight + "g",
        "availability": "https://schema.org/InStock",
        "url": location.href
      }))
    }
  };

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(ld);
  document.head.appendChild(script);

  // ----- Size / Weight Pills -----
  const weightWrap = document.getElementById("weight-options");

  if (weightWrap) {
    weightWrap.innerHTML = weights
      .map(
        (w, idx) =>
          `<button type="button" class="mm-weight-pill ${
            idx === 0 ? "active" : ""
          }" data-weight="${w}">${w} g</button>`
      )
      .join("");

    weightWrap.querySelectorAll(".mm-weight-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        weightWrap
          .querySelectorAll(".mm-weight-pill")
          .forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedWeight = Number(btn.dataset.weight);
        updateDisplayedPrice();
      });
    });
  }

  // ----- Quantity stepper -----
  let qty = 1;
  const qtyValueEl = document.getElementById("qty-value");
  const minusBtn = document.getElementById("qty-minus");
  const plusBtn = document.getElementById("qty-plus");

  function renderQty() {
    if (qtyValueEl) qtyValueEl.textContent = qty;
  }
  renderQty();

  if (minusBtn) {
    minusBtn.addEventListener("click", () => {
      if (qty > 1) {
        qty -= 1;
        renderQty();
      }
    });
  }

  if (plusBtn) {
    plusBtn.addEventListener("click", () => {
      qty += 1;
      renderQty();
    });
  }

  // ----- Add to Cart -----
  const addBtn = document.getElementById("btn-add-cart");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      addToCart(product, selectedWeight, qty);
    });
  }

  // ----- Buy Now (add to cart + go to checkout) -----
  const buyBtn = document.getElementById("btn-buy-now");
  if (buyBtn) {
    buyBtn.addEventListener("click", () => {
      addToCart(product, selectedWeight, qty);
      window.location.href = "checkout.html";
    });
  }
}
/* =========================================================
   CART FUNCTIONS
========================================================= */


function addToCart(product, weight, qty = 1) {
  const cart = getCart();
  const w = Number(weight);
  const unitPrice = getVariantPrice(product, w);

  const existing = cart.find(i => i.slug === product.slug && i.weight === w);

  if (existing) {
    existing.quantity += qty;
    // keep price in sync in case it ever changes
    existing.price = unitPrice;
  } else {
    cart.push({
      slug: product.slug,
      name: product.name,
      price: unitPrice,      // store per-variant price
      weight: w,
      quantity: qty,
      image: product.image
    });
  }

  saveCart(cart);
  updateCartCount();
  showCartPopup(product, weight, qty);

  if (window.location.pathname.includes("cart.html")) {
    loadCartPage();
    updateCartSummary();
  }
  if (window.location.pathname.includes("checkout.html")) {
    loadCheckoutSummary();
  }
}

function quickAdd(slug) {
  fetchProducts().then(products => {
    const p = products.find(x => x.slug === slug);
    if (!p) return alert("Product not found");

    const defaultWeight = p.variants[0].weight;
    addToCart(p, defaultWeight);
  });
}


function loadCartPage() {
  const container = document.getElementById("cart-items");
  if (!container) return;

  const cart = getCart();
  const emptyBox = document.getElementById("cart-empty");
  const summaryBox = document.getElementById("cart-summary");

  // If cart is empty
  if (!cart || cart.length === 0) {
    container.innerHTML = "";
    if (emptyBox) emptyBox.classList.remove("hidden");
    if (summaryBox) summaryBox.classList.add("hidden");
    updateCartSummary();  // will set totals to 0
    return;
  }

  // Cart has items
  if (emptyBox) emptyBox.classList.add("hidden");
  if (summaryBox) summaryBox.classList.remove("hidden");

  container.innerHTML = cart
    .map((item) => {
      // If quantity is 1 -> show bin icon instead of minus
      const minusButtonHtml =
        item.quantity === 1
          ? `<button class="qty-btn qty-trash"
                     onclick="removeFromCart('${item.slug}', ${item.weight})">
                 <img src="assets/images/bin.svg" class="trash-icon">
             </button>`
          : `<button class="qty-btn"
                      onclick="changeQty('${item.slug}', ${item.weight}, -1)">
                 −
             </button>`;

      return `
      <div class="cart-item" id="cart-item-${item.slug}-${item.weight}">
        <img src="${escapeHTML(item.image)}"
             class="cart-img"
             alt="${escapeHTML(item.name)}">

        <div class="cart-meta">
          <h3>${escapeHTML(item.name)}</h3>
          <div class="cart-meta-line">${item.weight} g • ₹${item.price} each</div>

          <div class="qty-controls">
            ${minusButtonHtml}
            <span class="qty">${item.quantity}</span>
            <button class="qty-btn"
                    onclick="changeQty('${item.slug}', ${item.weight}, 1)">
              +
            </button>
          </div>
        </div>

        <div class="cart-item-price">
          ₹${item.price * item.quantity}
        </div>
      </div>
    `;
    })
    .join("");

  // animate showing items (optional)
  document.querySelectorAll(".cart-item").forEach((el, i) => {
    el.style.opacity = 0;
    setTimeout(() => (el.style.opacity = 1), 30 * i);
  });

  updateCartTotal();
  updateCartCount();
  updateCartSummary();
  loadCartSuggestions(); // fill right-side suggestions
}

// PRODUCTS SUGGESTIONS ON CART PAGE (right side)
async function loadCartSuggestions() {
  const grid = document.getElementById("cart-suggest-grid");
  if (!grid) return;

  const products = await fetchProducts();

  // Show up to 3 products for now
  const suggestions = products.slice(0, 3);

  grid.innerHTML = suggestions
    .map(
      (p) => `
        <div class="product-card cart-suggest-card">
          <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}">
          <h4>${escapeHTML(p.name)}</h4>
          <p class="price">From ₹${getStartingPrice(p)}</p>

          <div class="card-actions">
            <button class="btn-primary" onclick="quickAdd('${p.slug}')">
              Add to Cart
            </button>
            <a href="product.html?slug=${p.slug}" class="btn-outline">
              View Details
            </a>
          </div>
        </div>
      `
    )
    .join("");
}

function changeQty(slug, weight, delta) {
  let cart = getCart();
  const item = cart.find(i => i.slug === slug && i.weight == weight);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) cart = cart.filter(i => !(i.slug===slug && i.weight==weight));
  saveCart(cart);
  loadCartPage();
  loadCheckoutSummary();
  updateCartCount();
  updateCartSummary();
}

function removeFromCart(slug, weight) {
  let cart = getCart();
  cart = cart.filter(i => !(i.slug === slug && i.weight == weight));
  saveCart(cart);
  loadCartPage();
  loadCheckoutSummary();
  updateCartCount();
  updateCartSummary();
}

function updateCartTotal() {
  const cart = getCart();
  const total = cart.reduce((s,i) => s + i.price * i.quantity, 0);
  const el = document.getElementById("cart-total");
  if (el) el.textContent = total;
}

/* clear-cart button wiring (if present) */
document.addEventListener("click", function(ev){
  if (ev.target && ev.target.id === "clear-cart") {
    localStorage.removeItem("cart");
    loadCartPage();
    updateCartCount();
  }
});

// --- PREMIUM sticky bar updater (new) ---
function updatePremiumStickyButton(product, weight) {
  const stickyBtn = document.getElementById("sticky-add-btn");
  if (!stickyBtn) return;

  const finalPrice = getVariantPrice(product, weight);
  stickyBtn.textContent = `Add to Cart — ₹${finalPrice}`;
}

/* =========================================================
   STICKY ADD-TO-CART BAR
========================================================= */
function setupStickyBar(product) {
  const bar = document.getElementById("sticky-bar");
  if (!bar) return;
  const stickyName = document.getElementById("sticky-name");
  const stickyWeight = document.getElementById("sticky-weight");
  const stickyPrice = document.getElementById("sticky-price");
  const stickyBtn = document.getElementById("sticky-add-btn");
  const weightSelect = document.getElementById("prod-weight");

  let defaultWeight = product.variants[0].weight;

  stickyName.textContent = product.name;
  stickyPrice.textContent = "₹" + getVariantPrice(product, defaultWeight);
  stickyWeight.textContent = defaultWeight + " g";
  updatePremiumStickyButton(product, defaultWeight);

  if (weightSelect) {
    weightSelect.addEventListener("change", () => {
      const w = Number(weightSelect.value);
      stickyWeight.textContent = w + " g";
      stickyPrice.textContent = "₹" + getVariantPrice(product, w);
      updatePremiumStickyButton(product, w);
    });
  }

  if (stickyBtn) {
    stickyBtn.onclick = ()=> {
      const chosenWeight = Number(weightSelect ? weightSelect.value : product.variants[0].weight);
      addToCart(product, chosenWeight);
      updatePremiumStickyButton(product, chosenWeight);
    };
  }

  // Animated sticky bar reveal
  let lastScrollY = 0;

  window.addEventListener("scroll", ()=> {
    const currentY = window.scrollY;

    // show when scrolling down past product info
    if (currentY > 250 && currentY > lastScrollY) {
      bar.classList.add("show");
    }
    // hide when scrolling up
    else if (currentY < lastScrollY) {
      bar.classList.remove("show");
    }

    lastScrollY = currentY;
  });
}

/* =========================================================
   CHECKOUT / ORDER
========================================================= */
function recalcCheckoutTotals() {
  const cart = getCart();
  const subtotal = cart.reduce((s,i)=> s + i.price * i.quantity, 0);
  const gst = Math.round(subtotal * 0.05);
  const delivery = subtotal >= 500 ? 0 : (subtotal === 0 ? 0 : 40);
  const finalTotal = subtotal + gst + delivery;
  if (document.getElementById('sub-total')) document.getElementById('sub-total').textContent = "₹" + subtotal;
  if (document.getElementById('gst-amt')) document.getElementById('gst-amt').textContent = "₹" + gst;
  if (document.getElementById('delivery-amt')) document.getElementById('delivery-amt').textContent = "₹" + delivery;
  if (document.getElementById('final-total')) document.getElementById('final-total').textContent = "₹" + finalTotal;
  return { subtotal, gst, delivery, finalTotal };
}

function loadCheckoutSummary() {
    const container = document.getElementById("checkout-items");
    if (!container) return;

    const cart = getCart();
    if (!cart || cart.length === 0) {
        container.innerHTML = "<p>Your cart is empty.</p>";
        recalcCheckoutTotals();
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="checkout-product-row">

            <div class="cp-left">
                <img src="${escapeHTML(item.image)}">
                <div>
                    <div class="cp-title">${escapeHTML(item.name)}</div>
                    <div class="small-text">${item.weight}g • ₹${item.price}</div>
                </div>
            </div>

            <div class="qty-controls">
                <button onclick="changeQty('${item.slug}', ${item.weight}, -1)">−</button>
                <span class="qty">${item.quantity}</span>
                <button onclick="changeQty('${item.slug}', ${item.weight}, 1)">+</button>
            </div>

            <div style="width: 80px; text-align:right;">
                ₹${item.price * item.quantity}
            </div>

            <button class="btn-remove" onclick="removeFromCart('${item.slug}', ${item.weight})">
                Remove
            </button>

        </div>
    `).join('');

    recalcCheckoutTotals();
}

/* placeOrder stores lastOrder locally (temporary) or calls backend later */
function placeOrder(finalTotal) {
  // read form fields
  const name    = document.getElementById("cust-name")?.value || "";
  const phone   = document.getElementById("cust-phone")?.value || "";
  const email   = document.getElementById("cust-email")?.value || "";
  const address = document.getElementById("cust-address")?.value || "";
  const city    = document.getElementById("cust-city")?.value || "";
  const pin     = document.getElementById("cust-pin")?.value || "";

  // 1) full validation FIRST
  const error = validateCheckoutForm();
  if (error) {
    alert(error);
    return;
  }

  // 2) build and save order
  const cart = getCart();
  const order = {
    id: "ORD" + Math.floor(Math.random() * 90000 + 10000),
    customer: { name, phone, email, address, city, pincode: pin },
    cart,
    total: finalTotal,
    payment: "Offline (Test)",
    time: new Date().toLocaleString()
  };

  localStorage.setItem("lastOrder", JSON.stringify(order));
  localStorage.removeItem("cart");
  updateCartCount();
  window.location.href = "order-success.html";
}

function validateCheckoutForm() {
    const name = document.getElementById("cust-name").value.trim();
    const phone = document.getElementById("cust-phone").value.trim();
    const email = document.getElementById("cust-email").value.trim();
    const address = document.getElementById("cust-address").value.trim();
    const city = document.getElementById("cust-city").value.trim();
    const pin = document.getElementById("cust-pin").value.trim();

    if (!name) return "Enter your name";
    if (!/^[0-9]{10}$/.test(phone)) return "Enter valid 10-digit phone number";
    if (!email.includes("@")) return "Enter a valid email";
    if (address.length < 5) return "Enter complete address";
    if (!city) return "Enter city";
    if (!/^[0-9]{6}$/.test(pin)) return "Enter valid 6-digit pincode";

    return null; // success
}

/* =========================================================
   ONLINE PAYMENT (Razorpay initialization — optional)
   initOnlinePayment() will call backend to create an order
   Backend endpoints expected:
     POST /create-order  (accepts { customer, cart, total })
     POST /verify-payment (for verification) — optional
========================================================= */
function initOnlinePayment() {
  const payBtn = document.getElementById("pay-now");
  const testBtn = document.getElementById("place-order");

  if (!payBtn && !testBtn) return;

  // Helper to read customer + cart + totals
  function getCheckoutData() {
    const name = document.getElementById("cust-name").value.trim();
    const phone = document.getElementById("cust-phone").value.trim();
    const email = document.getElementById("cust-email").value.trim();
    const address = document.getElementById("cust-address").value.trim();
    const city = document.getElementById("cust-city").value.trim();
    const pin = document.getElementById("cust-pin").value.trim();

    if (!name || !phone || !email || !address || !city || !pin) {
      alert("Please fill all customer details (including email).");
      return null;
    }

    const cart = getCart(); // your existing cart helper
    if (!cart || cart.length === 0) {
      alert("Your cart is empty.");
      return null;
    }

    const totals = recalcCheckoutTotals(); // your existing totals helper

    return {
      customer: { name, phone, email, address, city, pincode: pin },
      cart,
      total: totals.finalTotal
    };
  }

  // ============= TEST ORDER BUTTON (no Razorpay, for manual testing) ============
  if (testBtn) {
    testBtn.onclick = async () => {
      const data = getCheckoutData();
      if (!data) return;

      try {
        const resp = await fetch(API_BASE + "/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            payment: { method: "test", status: "unpaid" }
          })
        });

        const resJson = await resp.json();
        if (resJson.success) {
          alert("Test order placed. Check email & CSV.");
          localStorage.removeItem("cart");
          updateCartCount();
          window.location.href = "order-success.html";
        } else {
          alert(resJson.error || "Test order failed");
        }
      } catch (e) {
        alert("Error placing test order.");
      }
    };
  }

  // ==================== REAL RAZORPAY PAYMENT ====================
  if (payBtn) {
    payBtn.onclick = async () => {
      const data = getCheckoutData();
      if (!data) return;

      // 1) Create Razorpay order
      const orderResp = await fetch(API_BASE + "/create-razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: data.total })
      });

      const orderData = await orderResp.json();

      if (!orderData.success) {
        alert("Payment server error");
        return;
      }

      // 2) Open Razorpay popup
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: "INR",
        name: "Mehta Masala",
        description: "Order Payment",
        order_id: orderData.razorpay_order_id,

        handler: async function (response) {
          // 3) Verify payment
          const verifyResp = await fetch(API_BASE + "/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });

          const verifyData = await verifyResp.json();
          if (!verifyData.success) {
            alert("Payment verification failed");
            return;
          }

          // 4) Save order + send emails
          try {
            const saveResp = await fetch(API_BASE + "/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...data,
                payment: {
                  method: "razorpay",
                  status: "paid",
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id
                }
              })
            });

            const saveData = await saveResp.json();
            if (!saveData.success) {
              alert(saveData.error || "Order save failed!");
              return;
            }

            localStorage.removeItem("cart");
            updateCartCount();
            window.location.href = "order-success.html?order_id=" + saveData.order_id;
          } catch (e) {
            alert("Error saving order after payment.");
          }
        },

        prefill: {
          name: data.customer.name,
          email: data.customer.email,
          contact: data.customer.phone
        },

        theme: { color: "#2C7A52" }
      };

      const rzp = new Razorpay(options);
      rzp.open();
    };
  }
}

/* =========================================================
   Scroll to top + active nav highlight
========================================================= */
const scrollBtn = document.getElementById("scrollTopBtn");
if (scrollBtn) {
  window.addEventListener("scroll", ()=> { scrollBtn.style.display = window.scrollY > 400 ? "block" : "none"; });
  scrollBtn.addEventListener("click", ()=> window.scrollTo({ top:0, behavior:"smooth" }));
}

function setActiveNav() {
  const links = document.querySelectorAll(".main-nav a, .nav-link");
  const current = window.location.pathname.split("/").pop() || "index.html";
  links.forEach(link => {
    const href = link.getAttribute("href");
    if (!href) return;
    if ((href === current) || (href === "./" && current === "")) link.classList.add("active");
    else link.classList.remove("active");
  });
}
setActiveNav();

/* =========================================================
   Initialize page-specific loaders
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    loadHomeProducts();
    loadAllProducts();
    loadProductDetail();
    loadCartPage();
    loadCheckoutSummary();
    initOnlinePayment();

    // =======================
    // FULL DROPDOWN SEARCH BAR
    // =======================
    const openSearch = document.getElementById("openSearch");
    const closeSearch = document.getElementById("closeSearch");
    const fullSearch = document.getElementById("fullSearchBar");
    const fullSearchInput = document.getElementById("full-search-input");

    if (openSearch && closeSearch && fullSearch && fullSearchInput) {

        // OPEN SEARCH BAR
        openSearch.addEventListener("click", (e) => {
            e.stopPropagation();
            fullSearch.classList.add("show");
            fullSearchInput.focus();
        });

        // CLOSE SEARCH BAR
        closeSearch.addEventListener("click", () => {
            fullSearch.classList.remove("show");
            fullSearchInput.value = "";
        });

        // CLOSE WHEN CLICKING OUTSIDE
        document.addEventListener("click", (e) => {
            if (!fullSearch.contains(e.target) && e.target !== openSearch) {
                fullSearch.classList.remove("show");
            }
        });
    }
});


// ============================
// SEARCH TOGGLE EXPAND / CLOSE
// ============================
// SEARCH BAR TOGGLE
// SEARCH BAR TOGGLE
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn   = document.getElementById("searchToggle");
  const searchInput = document.getElementById("nav-search-input");

  if (!toggleBtn || !searchInput) return;

  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    searchInput.classList.add("search-expanded");
    toggleBtn.classList.add("search-icon-hidden");
    searchInput.focus();
  });

  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target)) {
      searchInput.classList.remove("search-expanded");
      toggleBtn.classList.remove("search-icon-hidden");
    }
  });
});

// --- Mobile nav toggle, sticky header, and scroll fade-ins ---
document.addEventListener("DOMContentLoaded", function () {
  const navToggle = document.querySelector(".nav-toggle");
  const mainNav  = document.querySelector(".main-nav");
  const header   = document.querySelector(".site-header");

  // Sticky header shadow on scroll
  if (header) {
    window.addEventListener("scroll", function () {
      if (window.scrollY > 10) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    });
  }

  // Fade-in sections on scroll
  const fadeSections = document.querySelectorAll(".fade-section");
  if ("IntersectionObserver" in window && fadeSections.length > 0) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    fadeSections.forEach((section) => observer.observe(section));
  } else {
    // Fallback: if no IntersectionObserver, just show all
    fadeSections.forEach((section) => section.classList.add("in-view"));
  }
});

function updateCartSummary() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const gst = subtotal * 0.05;
    const shipping = subtotal >= 499 ? 0 : 40;
    const grandTotal = subtotal + gst + shipping;

    // Update all elements
    document.getElementById('item-count').textContent = itemCount;
    document.getElementById('cart-subtotal').textContent = subtotal.toFixed(2);
    document.getElementById('gst-amount').textContent = gst.toFixed(2);
    document.getElementById('cart-grand-total').textContent = grandTotal.toFixed(2);

    // Update shipping
    const shippingEl = document.getElementById('shipping-cost');
    const noticeEl = document.getElementById('shipping-notice');

    if (shipping === 0) {
        shippingEl.textContent = 'FREE';
        shippingEl.className = 'free-shipping';
        noticeEl.textContent = '🎉 You qualify for free shipping!';
        noticeEl.style.background = '#e4f7ec';
    } else {
        shippingEl.textContent = `₹${shipping}`;
        shippingEl.className = '';
        noticeEl.textContent = `Add ₹${(499 - subtotal).toFixed(2)} more for free shipping!`;
        noticeEl.style.background = '#fff3cd';
    }
}

// -------------------------
// SEARCH BAR FUNCTIONALITY
// -------------------------
const products = [
  { name: "Red Chilli Powder", slug: "red-chilli" },
  { name: "Turmeric Powder", slug: "turmeric" },
  { name: "Coriander Powder", slug: "dhaniya" },
  { name: "Jeeravan Masala", slug: "jeeravan" }
];

const searchInput = document.getElementById("nav-search-input");
const searchResults = document.getElementById("nav-search-results");

if (searchInput) {
    searchInput.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase().trim();
        searchResults.innerHTML = "";

        if (query.length === 0) {
            searchResults.style.display = "none";
            return;
        }

        const matches = products.filter(p =>
            p.name.toLowerCase().includes(query)
        );

        if (matches.length === 0) {
            searchResults.innerHTML = "<div>No results found</div>";
        } else {
            matches.forEach(p => {
                const div = document.createElement("div");
                div.textContent = p.name;
                div.onclick = () => {
                    window.location.href = `product.html?slug=${p.slug}`;
                };
                searchResults.appendChild(div);
            });
        }

        searchResults.style.display = "block";
    });

    // Hide dropdown when clicking outside
    document.addEventListener("click", function (e) {
        if (!searchResults.contains(e.target) &&
            !searchInput.contains(e.target)) {
            searchResults.style.display = "none";
        }
    });
}

/* ---------------------------------------------------------
   AUTO-DETECT CITY + STATE BASED ON PINCODE
   Uses: https://api.postalpincode.in/pincode/<pin>
----------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const pinField   = document.getElementById("cust-pin");
  const cityField  = document.getElementById("cust-city");
  const stateField = document.getElementById("cust-state");

  // If checkout fields don’t exist on this page, do nothing
  if (!pinField || !cityField || !stateField) return;

  pinField.addEventListener("input", async () => {
    const pin = pinField.value.trim();

    // Only search after exactly 6 digits
    if (pin.length !== 6) {
      cityField.value  = "";
      stateField.value = "";
      return;
    }

    try {
      const res  = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();

      if (!data[0] || data[0].Status !== "Success") {
        cityField.value  = "";
        stateField.value = "";
        return;
      }

      const post = data[0].PostOffice[0];

      cityField.value  = post.District;
      stateField.value = post.State;

    } catch (err) {
      console.error("Pincode lookup failed:", err);
      cityField.value  = "";
      stateField.value = "";
    }
  });
});

function showCartPopup(product, weight, qty) {
  const popup = document.getElementById("cart-popup");
  if (!popup) return;

  document.getElementById("cp-img").src = product.image;
  document.getElementById("cp-name").textContent = product.name;
  document.getElementById("cp-weight").textContent = `${weight} g × ${qty}`;

  popup.classList.add("show");

  setTimeout(() => {
    popup.classList.remove("show");
  }, 3000);

  document.getElementById("cp-close").onclick = () =>
    popup.classList.remove("show");
}


