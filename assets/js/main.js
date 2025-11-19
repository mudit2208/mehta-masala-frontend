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
      { slug:"red-chilli", name:"Red Chilli Powder", description:"100% pure red chilli powder", price:180, weights:[100,250,500,1000], image:"assets/images/red-chilli.png" },
      { slug:"turmeric", name:"Turmeric Powder", description:"Pure haldi powder", price:140, weights:[100,250,500,1000], image:"assets/images/turmeric.png" },
      { slug:"dhaniya", name:"Coriander Powder", description:"Fresh & aromatic", price:160, weights:[100,250,500,1000], image:"assets/images/dhaniya.png" },
      { slug:"jeeravan", name:"Jeeravan Masala", description:"Special Mehta Masala recipe", price:220, weights:[50,100,200], image:"assets/images/jeeravan.png" }
    ];
  }
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
      <p class="price">₹${p.price}</p>
      <a href="product.html?slug=${p.slug}" class="btn-primary">View Details</a>
    </div>
  `).join('');
}

async function loadHomeProducts() {
  const grid = document.getElementById("featured-products");
  if (!grid) return;
  const products = await fetchProducts();
  const featured = products.slice(0,4);
  grid.innerHTML = featured.map(p => `
    <div class="product-card">
      <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}">
      <h3>${escapeHTML(p.name)}</h3>
      <p>${escapeHTML(p.description || p.short || "")}</p>
      <p class="price">₹${p.price}</p>
      <a href="product.html?slug=${p.slug}" class="btn-primary">View Details</a>
    </div>
  `).join('');
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
    document.getElementById("product-page").innerHTML = "<p>Product not found.</p>";
    return;
  }

  document.getElementById("prod-image").src = product.image;
  document.getElementById("prod-image").alt = product.name;
  document.getElementById("prod-name").textContent = product.name;
  document.getElementById("prod-desc").textContent = product.description || "";
  document.getElementById("prod-price").textContent = product.price;

  const weightSelect = document.getElementById("prod-weight");
  weightSelect.innerHTML = "";
  (product.weights || [100]).forEach(w => {
    const opt = document.createElement("option");
    opt.value = w;
    opt.textContent = w + " g";
    weightSelect.appendChild(opt);
  });

  document.getElementById("add-to-cart").onclick = () => addToCart(product, Number(weightSelect.value));
  setupStickyBar(product);
}

/* =========================================================
   CART FUNCTIONS
========================================================= */
function addToCart(product, weight) {
  const cart = getCart();
  const existing = cart.find(i => i.slug === product.slug && i.weight === Number(weight));
  if (existing) existing.quantity += 1;
  else cart.push({ slug: product.slug, name: product.name, price: product.price, weight: Number(weight), quantity: 1, image: product.image });

  saveCart(cart);
  updateCartCount();
  // quick UI feedback
  alert("Added to cart");
  // If on cart page refresh
  if (window.location.pathname.includes("cart.html")) loadCartPage();
  if (window.location.pathname.includes("checkout.html")) loadCheckoutSummary();
}

function loadCartPage() {
  const container = document.getElementById("cart-items");
  if (!container) return;
  const cart = getCart();
  const emptyBox = document.getElementById("cart-empty");
  const summaryBox = document.getElementById("cart-summary");

  if (!cart || cart.length === 0) {
    if (emptyBox) emptyBox.classList.remove("hidden");
    if (summaryBox) summaryBox.classList.add("hidden");
    container.innerHTML = "";
    updateCartCount();
    return;
  }

  if (emptyBox) emptyBox.classList.add("hidden");
  if (summaryBox) summaryBox.classList.remove("hidden");

  container.innerHTML = cart.map(item => `
    <div class="cart-item" id="cart-item-${item.slug}-${item.weight}">
      <img src="${escapeHTML(item.image)}" class="cart-img" alt="${escapeHTML(item.name)}">
      <div class="cart-meta">
        <h3>${escapeHTML(item.name)}</h3>
        <div>${item.weight} g • ₹${item.price} each</div>
        <div class="qty-controls">
          <button onclick="changeQty('${item.slug}', ${item.weight}, -1)">−</button>
          <span class="qty">${item.quantity}</span>
          <button onclick="changeQty('${item.slug}', ${item.weight}, 1)">+</button>
        </div>
        <div style="margin-top:8px;">
          <button class="btn-remove" onclick="removeFromCart('${item.slug}', ${item.weight})">Remove</button>
        </div>
      </div>
      <div style="min-width:110px; text-align:right;">
        <div>₹${item.price * item.quantity}</div>
      </div>
    </div>
  `).join('');

  // animate items
  document.querySelectorAll('.cart-item').forEach((el,i)=>{ el.style.opacity=0; setTimeout(()=>el.style.opacity=1, 30*i); });

  updateCartTotal();
  updateCartCount();
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
}

function removeFromCart(slug, weight) {
  let cart = getCart();
  cart = cart.filter(i => !(i.slug === slug && i.weight == weight));
  saveCart(cart);
  loadCartPage();
  loadCheckoutSummary();
  updateCartCount();
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

  stickyName.textContent = product.name;
  stickyPrice.textContent = "₹" + product.price;
  stickyWeight.textContent = (weightSelect ? weightSelect.value : (product.weights && product.weights[0] || "")) + " g";

  if (weightSelect) weightSelect.addEventListener("change", ()=> stickyWeight.textContent = weightSelect.value + " g");

  if (stickyBtn) stickyBtn.onclick = ()=> addToCart(product, Number(weightSelect.value || product.weights[0]));

  window.addEventListener("scroll", ()=> {
    if (window.scrollY > 300) bar.classList.add("show");
    else bar.classList.remove("show");
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
  const listContainer = document.getElementById("checkout-summary");
  if (!listContainer) return;
  const cart = getCart();
  if (!cart || cart.length === 0) {
    listContainer.innerHTML = "<p>Your cart is empty.</p>";
    recalcCheckoutTotals();
    return;
  }
  listContainer.innerHTML = cart.map(item => `
    <div class="checkout-row">
      <div class="left">
        <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}">
        <div><strong>${escapeHTML(item.name)}</strong><div style="font-size:13px;color:#666;">${item.weight}g • ₹${item.price}</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <div class="qty-controls">
          <button onclick="changeQty('${item.slug}', ${item.weight}, -1)">−</button>
          <span class="qty">${item.quantity}</span>
          <button onclick="changeQty('${item.slug}', ${item.weight}, 1)">+</button>
        </div>
        <div style="min-width:80px;text-align:right;">₹${item.price * item.quantity}</div>
        <button class="btn-remove" onclick="removeFromCart('${item.slug}', ${item.weight})">Remove</button>
      </div>
    </div>
  `).join('');
  recalcCheckoutTotals();
  // wire place-order to computed finalTotal
  const placeBtn = document.getElementById("place-order");
  if (placeBtn) {
    placeBtn.onclick = ()=> {
      const totals = recalcCheckoutTotals();
      placeOrder(totals.finalTotal);
    };
  }
}

/* placeOrder stores lastOrder locally (temporary) or calls backend later */
function placeOrder(finalTotal) {
  // read form fields
  const name = document.getElementById("cust-name") ? document.getElementById("cust-name").value : "";
  const phone = document.getElementById("cust-phone") ? document.getElementById("cust-phone").value : "";
  const address = document.getElementById("cust-address") ? document.getElementById("cust-address").value : "";
  const city = document.getElementById("cust-city") ? document.getElementById("cust-city").value : "";
  const pin = document.getElementById("cust-pin") ? document.getElementById("cust-pin").value : "";

  if (!name || !phone || !address || !city || !pin) {
    alert("Please fill all fields before placing an order.");
    return;
  }

  const cart = getCart();
  const order = {
    id: "ORD" + Math.floor(Math.random() * 90000 + 10000),
    customer: { name, phone, address, city, pincode: pin },
    cart, total: finalTotal, payment: "Offline (Test)", time: new Date().toLocaleString()
  };

  localStorage.setItem("lastOrder", JSON.stringify(order));
  localStorage.removeItem("cart");
  updateCartCount();
  window.location.href = "order-success.html";
}

/* =========================================================
   ONLINE PAYMENT (Razorpay initialization — optional)
   initOnlinePayment() will call backend to create an order
   Backend endpoints expected:
     POST /create-order  (accepts { customer, cart, total })
     POST /verify-payment (for verification) — optional
========================================================= */
async function initOnlinePayment() {
  const payBtn = document.getElementById("pay-now");
  if (!payBtn) return;

  payBtn.onclick = async () => {
    const name = document.getElementById("cust-name").value;
    const phone = document.getElementById("cust-phone").value;
    const address = document.getElementById("cust-address").value;
    const city = document.getElementById("cust-city").value;
    const pin = document.getElementById("cust-pin").value;

    if (!name || !phone || !address || !city || !pin) {
      alert("Please fill all fields before payment.");
      return;
    }

    const cart = getCart();
    if (!cart || cart.length === 0) { alert("Cart is empty."); return; }

    const total = cart.reduce((s,i) => s + i.price * i.quantity, 0);

    // create order on backend
    try {
      const resp = await fetch(API_BASE + "/create-order", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ customer: {name, phone, address, city, pincode: pin}, cart, total })
      });
      const data = await resp.json();
      // test-mode backend may return only order object; if no Razorpay keys present, fallback
      if (!data || !data.razorpay_order_id) {
        alert("Online payment not configured on backend. Using test flow. Order will be placed as Test.");
        // store order and redirect to success
        localStorage.setItem("lastOrder", JSON.stringify({
          id: data && data.order && data.order.id ? data.order.id : ("ORD" + Math.floor(Math.random()*100000)),
          total, payment: "Test-Backend", time: new Date().toLocaleString(),
          customer: { name, phone }
        }));
        localStorage.removeItem("cart");
        updateCartCount();
        window.location.href = "order-success.html";
        return;
      }

      // If razorpay fields exist, launch checkout
      const options = {
        key: data.razorpay_key,
        amount: data.amount,
        currency: "INR",
        name: "Mehta Masala",
        description: "Order: " + (data.local_order_id || ""),
        order_id: data.razorpay_order_id,
        handler: async function(response) {
          // verify on server
          const verify = await fetch(API_BASE + "/verify-payment", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify(response)
          });
          const v = await verify.json();
          if (v && v.success) {
            localStorage.setItem("lastOrder", JSON.stringify({
              id: data.local_order_id,
              total, payment: "Online", time: new Date().toLocaleString(), customer: {name, phone}
            }));
            localStorage.removeItem("cart");
            updateCartCount();
            window.location.href = "order-success.html";
          } else {
            alert("Payment verification failed.");
          }
        },
        prefill: { name, contact: phone },
        theme: { color: "#2C7A52" }
      };
      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert("Could not create payment. Try again later.");
    }
  };
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
document.addEventListener("DOMContentLoaded", ()=> {
  loadHomeProducts(); // no-op if not on home
  loadAllProducts(); // no-op if not on products
  loadProductDetail(); // no-op if not on product page
  loadCartPage(); // no-op if not on cart page
  loadCheckoutSummary(); // no-op if not on checkout
  initOnlinePayment(); // wire payment if button present
  // year element
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
});
