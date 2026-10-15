import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*
  SETUP: Replace these two placeholders with your Supabase Project URL and
  publishable/anon key. These are browser-side public values. NEVER put a
  service_role key or database password here.
*/
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY";

const configured = !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = (id) => document.getElementById(id);
let currentUser = null;
let products = [];
let transactions = [];
let authMode = "signin";
let activePage = "dashboard";

const money = (value) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
const dateTime = (value) => new Date(value).toLocaleString();
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const stockStatus = (p) => Number(p.quantity) <= 0 ? ["Out of stock","out"] : Number(p.quantity) <= Number(p.reorder_level) ? ["Low stock","low"] : ["In stock","good"];
const setMessage = (message, isError = false) => { $("app-message").textContent = message; $("app-message").style.color = isError ? "#b42335" : "#16845c"; };
const setAuthMessage = (message, isError = false) => { $("auth-message").textContent = message; $("auth-message").style.color = isError ? "#b42335" : "#16845c"; };

function showAuth() {
  $("auth-view").classList.remove("hidden");
  $("app-view").classList.add("hidden");
}
function showApp() {
  $("auth-view").classList.add("hidden");
  $("app-view").classList.remove("hidden");
  $("signed-in-email").textContent = currentUser?.email || "";
  $("today-label").textContent = new Date().toLocaleDateString(undefined, { year:"numeric", month:"short", day:"numeric" });
  navigate("dashboard");
}
function navigate(page) {
  activePage = page;
  document.querySelectorAll(".page").forEach(el => el.classList.add("hidden"));
  $(`page-${page}`).classList.remove("hidden");
  document.querySelectorAll(".nav-item[data-page]").forEach(el => el.classList.toggle("active", el.dataset.page === page));
  $("page-title").textContent = ({dashboard:"Dashboard", products:"Products", transactions:"Stock movements", reports:"Reports"})[page];
  if (page === "products") renderProducts();
  if (page === "transactions") renderTransactions();
  if (page === "reports") renderReports();
}
function statusPill(p) {
  const [label, cls] = stockStatus(p);
  return `<span class="pill ${cls}">${label}</span>`;
}
function renderDashboard() {
  $("stat-products").textContent = products.length;
  $("stat-units").textContent = products.reduce((sum, p) => sum + Number(p.quantity), 0).toLocaleString();
  const low = products.filter(p => Number(p.quantity) <= Number(p.reorder_level));
  $("stat-low").textContent = low.length;
  $("low-stock-body").innerHTML = low.length ? low.map(p => `<tr><td class="product-name">${escapeHtml(p.name)}</td><td>${escapeHtml(p.sku)}</td><td>${Number(p.quantity)}</td><td>${Number(p.reorder_level)}</td><td>${statusPill(p)}</td></tr>`).join("") : `<tr><td colspan="5" class="empty">No low-stock items. You're all set!</td></tr>`;
}
function renderProducts() {
  const query = $("product-search").value.trim().toLowerCase();
  const filtered = products.filter(p => [p.name,p.sku,p.category].some(v => String(v || "").toLowerCase().includes(query)));
  $("product-count").textContent = `${filtered.length} product${filtered.length === 1 ? "" : "s"}`;
  $("products-body").innerHTML = filtered.length ? filtered.map(p => `<tr>
    <td class="product-name">${escapeHtml(p.name)}</td><td>${escapeHtml(p.sku)}</td><td>${escapeHtml(p.category || "—")}</td>
    <td>${money(p.unit_price)}</td><td>${Number(p.quantity)}</td><td>${statusPill(p)}</td>
    <td><div class="action-group"><button class="action-button" data-edit="${p.id}">Edit</button><button class="action-button danger" data-delete="${p.id}">Delete</button></div></td>
  </tr>`).join("") : `<tr><td colspan="7" class="empty">No products found. Add your first product above.</td></tr>`;
  $("movement-product").innerHTML = `<option value="">Choose a product</option>` + products.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (${escapeHtml(p.sku)}) — ${p.quantity} in stock</option>`).join("");
}
function renderTransactions() {
  const productMap = new Map(products.map(p => [p.id, p]));
  $("transactions-body").innerHTML = transactions.length ? transactions.slice(0,100).map(t => `<tr>
    <td>${escapeHtml(dateTime(t.created_at))}</td><td class="product-name">${escapeHtml(productMap.get(t.product_id)?.name || "Product")}</td>
    <td><span class="pill ${t.movement_type === "in" ? "good" : "low"}">${t.movement_type === "in" ? "Stock in" : "Stock out"}</span></td>
    <td>${t.movement_type === "in" ? "+" : "−"}${Number(t.quantity)}</td><td>${escapeHtml(t.note || "—")}</td>
  </tr>`).join("") : `<tr><td colspan="5" class="empty">No stock movements yet.</td></tr>`;
}
function renderReports() {
  const low = products.filter(p => Number(p.quantity) <= Number(p.reorder_level)).length;
  $("report-value").textContent = money(products.reduce((sum,p) => sum + Number(p.quantity)*Number(p.unit_price), 0));
  $("report-movements").textContent = transactions.length;
  $("report-low").textContent = low;
  $("report-body").innerHTML = products.length ? products.map(p => `<tr><td class="product-name">${escapeHtml(p.name)}</td><td>${escapeHtml(p.sku)}</td><td>${Number(p.quantity)}</td><td>${money(p.unit_price)}</td><td>${money(Number(p.quantity)*Number(p.unit_price))}</td></tr>`).join("") : `<tr><td colspan="5" class="empty">Add products to see your stock report.</td></tr>`;
}
function renderAll() {
  renderDashboard();
  renderProducts();
  renderTransactions();
  renderReports();
}
async function loadData() {
  if (!supabase || !currentUser) return;
  setMessage("Loading inventory…");
  const [productResult, transactionResult] = await Promise.all([
    supabase.from("products").select("*").order("name"),
    supabase.from("stock_transactions").select("*").order("created_at", { ascending:false }).limit(500)
  ]);
  if (productResult.error || transactionResult.error) {
    setMessage(`Could not load data: ${(productResult.error || transactionResult.error).message}`, true);
    return;
  }
  products = productResult.data || [];
  transactions = transactionResult.data || [];
  renderAll();
  setMessage("");
}
function resetProductForm() {
  $("product-form").reset();
  $("product-id").value = "";
  $("product-quantity").disabled = false;
  $("product-form-title").textContent = "Add a product";
  $("product-form").classList.add("hidden");
}
function startEditProduct(id) {
  const p = products.find(item => item.id === id);
  if (!p) return;
  $("product-id").value = p.id;
  $("product-name").value = p.name;
  $("product-sku").value = p.sku;
  $("product-category").value = p.category || "";
  $("product-price").value = p.unit_price;
  $("product-quantity").value = p.quantity;
  $("product-reorder").value = p.reorder_level;
  $("product-quantity").disabled = true;
  $("product-form-title").textContent = "Edit product details";
  $("product-form").classList.remove("hidden");
  $("product-form").scrollIntoView({ behavior:"smooth", block:"start" });
}
async function saveProduct(event) {
  event.preventDefault();
  const id = $("product-id").value;
  const data = {
    name: $("product-name").value.trim(),
    sku: $("product-sku").value.trim(),
    category: $("product-category").value.trim() || null,
    unit_price: Number($("product-price").value),
    reorder_level: Number($("product-reorder").value)
  };
  if (!data.name || !data.sku || data.unit_price < 0 || data.reorder_level < 0) return setMessage("Please check the product details.", true);
  setMessage("Saving product…");
  let result;
  if (id) {
    result = await supabase.from("products").update(data).eq("id", id).select().single();
  } else {
    data.quantity = Number($("product-quantity").value);
    data.user_id = currentUser.id;
    result = await supabase.from("products").insert(data).select().single();
    if (!result.error && data.quantity > 0) {
      const movement = await supabase.from("stock_transactions").insert({
        user_id: currentUser.id, product_id: result.data.id, movement_type:"in",
        quantity:data.quantity, note:"Opening stock"
      });
      if (movement.error) console.error("Opening movement history could not be saved:", movement.error.message);
    }
  }
  if (result.error) return setMessage(`Save failed: ${result.error.message}`, true);
  resetProductForm();
  await loadData();
  setMessage(id ? "Product updated." : "Product added.");
}
async function deleteProduct(id) {
  const p = products.find(item => item.id === id);
  if (!p || !confirm(`Delete "${p.name}" and its stock movement history? This cannot be undone.`)) return;
  const result = await supabase.from("products").delete().eq("id", id);
  if (result.error) return setMessage(`Delete failed: ${result.error.message}`, true);
  await loadData();
  setMessage("Product deleted.");
}
async function saveMovement(event) {
  event.preventDefault();
  const productId = $("movement-product").value;
  const type = $("movement-type").value;
  const quantity = Number($("movement-quantity").value);
  const note = $("movement-note").value.trim() || null;
  if (!productId || !Number.isInteger(quantity) || quantity <= 0) return setMessage("Choose a product and enter a whole-number quantity greater than zero.", true);
  setMessage("Recording stock movement…");
  const { error } = await supabase.rpc("record_stock_movement", {
    p_product_id: productId, p_movement_type: type, p_quantity: quantity, p_note: note
  });
  if (error) return setMessage(`Movement failed: ${error.message}`, true);
  $("movement-form").reset();
  await loadData();
  navigate("transactions");
  setMessage("Stock movement saved.");
}
function exportCsv() {
  const rows = [["Product","SKU","Category","Quantity","Reorder level","Unit price PHP","Estimated value PHP"]];
  products.forEach(p => rows.push([p.name,p.sku,p.category || "",p.quantity,p.reorder_level,p.unit_price,(Number(p.quantity)*Number(p.unit_price)).toFixed(2)]));
  const csv = rows.map(row => row.map(value => `"${String(value ?? "").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8;"}));
  const a = document.createElement("a"); a.href = url; a.download = "inventory-report.csv"; a.click(); URL.revokeObjectURL(url);
}

$("toggle-auth").addEventListener("click", () => {
  authMode = authMode === "signin" ? "signup" : "signin";
  $("auth-submit").textContent = authMode === "signin" ? "Sign in" : "Create account";
  $("toggle-auth").textContent = authMode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in";
  setAuthMessage("");
});
$("auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!configured) return setAuthMessage("Setup required: add your Supabase Project URL and publishable/anon key in app.js.", true);
  const email = $("email").value.trim();
  const password = $("password").value;
  $("auth-submit").disabled = true;
  try {
    if (authMode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.session) setAuthMessage("Account created. Check your email to confirm it, then sign in.");
      else setAuthMessage("Account created. Loading your inventory…");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (error) { setAuthMessage(error.message || "Authentication failed.", true); }
  finally { $("auth-submit").disabled = false; }
});
$("sign-out").addEventListener("click", async () => { await supabase.auth.signOut(); });
document.querySelectorAll(".nav-item[data-page]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.page)));
document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.go)));
$("show-product-form").addEventListener("click", () => { resetProductForm(); $("product-form").classList.remove("hidden"); $("product-form").scrollIntoView({behavior:"smooth",block:"start"}); });
$("cancel-product").addEventListener("click", resetProductForm);
$("product-form").addEventListener("submit", saveProduct);
$("product-search").addEventListener("input", renderProducts);
$("products-body").addEventListener("click", event => {
  const edit = event.target.closest("[data-edit]");
  const del = event.target.closest("[data-delete]");
  if (edit) startEditProduct(edit.dataset.edit);
  if (del) deleteProduct(del.dataset.delete);
});
$("movement-form").addEventListener("submit", saveMovement);
$("export-report").addEventListener("click", exportCsv);

if (!configured) setAuthMessage("Before signing in, connect this app to your Supabase project using the setup guide.");
if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    if (currentUser) {
      showApp();
      setTimeout(() => loadData(), 0);
    } else {
      products = []; transactions = [];
      showAuth();
    }
  });
  supabase.auth.getSession().then(({data}) => {
    currentUser = data.session?.user || null;
    if (currentUser) { showApp(); awaitInitialLoad(); } else showAuth();
  });
}
async function awaitInitialLoad() { await loadData(); }
