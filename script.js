const STORAGE_KEY = "mercadoMZ_anuncios_v1";
const FAVORITES_KEY = "mercadoMZ_favoritos_v1";

const sampleProducts = [];

let selectedCategory = "Todos";
let searchTerm = "";
let products = loadProducts();
let favorites = loadFavorites();
let toastTimer;

const productGrid = document.getElementById("productGrid");
const resultsCount = document.getElementById("resultsCount");
const emptyState = document.getElementById("emptyState");
const postDialog = document.getElementById("postDialog");
const planDialog = document.getElementById("planDialog");
const paymentDialog = document.getElementById("paymentDialog");

function loadProducts() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? [...sampleProducts, ...saved] : [...sampleProducts];
  } catch {
    return [...sampleProducts];
  }
}
function loadFavorites() {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; }
  catch { return []; }
}
function saveProducts() {
  const userProducts = products.filter(p => !p.sample);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userProducts));
}
function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[char]);
}
function formatPrice(price) {
  return Number(price) === 0 ? "Preço a combinar" : `${Number(price).toLocaleString("pt-PT")} MT`;
}
function cleanPhone(phone) {
  return String(phone).replace(/\D/g, "").replace(/^00/, "");
}
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}
function getFilteredProducts() {
  let list = products.filter(product => {
    const matchesCategory = selectedCategory === "Todos" || product.category === selectedCategory;
    const matchesLocation = !document.getElementById("locationFilter").value ||
      product.location.toLowerCase() === document.getElementById("locationFilter").value.toLowerCase();
    const searchable = `${product.title} ${product.description} ${product.category} ${product.location}`.toLowerCase();
    return matchesCategory && matchesLocation && searchable.includes(searchTerm.toLowerCase());
  });
  const sort = document.getElementById("sortFilter").value;
  if (sort === "low") list.sort((a,b) => Number(a.price)-Number(b.price));
  else if (sort === "high") list.sort((a,b) => Number(b.price)-Number(a.price));
  else if (sort === "new") list.sort((a,b) => b.createdAt-a.createdAt);
  else list.sort((a,b) => Number(b.featured)-Number(a.featured) || b.createdAt-a.createdAt);
  return list;
}
function renderProducts() {
  const list = getFilteredProducts();
  resultsCount.textContent = `${list.length} ${list.length === 1 ? "anúncio" : "anúncios"}`;
  emptyState.classList.toggle("hidden", list.length !== 0);
  productGrid.innerHTML = list.map(product => {
    const isFavorite = favorites.includes(product.id);
    const badge = product.featured ? '<span class="featured-badge">✦ Destaque</span>' : "";
    const emoji = escapeHTML(product.emoji || categoryEmoji(product.category));
    return `
      <article class="product-card">
        <div class="product-visual">
          ${badge}
          ${product.imageData ? `<img src="${product.imageData}" alt="${escapeHTML(product.title)}">` : `<span class="emoji" aria-hidden="true">${emoji}</span>`}
          <button class="favorite-button ${isFavorite ? "saved" : ""}" data-favorite="${escapeHTML(product.id)}" aria-label="${isFavorite ? "Remover dos favoritos" : "Guardar nos favoritos"}">${isFavorite ? "♥" : "♡"}</button>
        </div>
        <div class="product-info">
          <div class="product-meta"><span>${escapeHTML(product.category)}</span><span>📍 ${escapeHTML(product.location)}</span></div>
          <h3>${escapeHTML(product.title)}</h3>
          <p class="product-description">${escapeHTML(product.description)}</p>
          <div class="product-bottom">
            <strong class="product-price">${formatPrice(product.price)}</strong>
            <div class="product-actions">
              <button class="icon-action" data-details="${escapeHTML(product.id)}">Detalhes</button>
              <button class="contact-action" data-contact="${escapeHTML(product.id)}">WhatsApp ↗</button>
            </div>
          </div>
        </div>
      </article>`;
  }).join("");
}
function categoryEmoji(category) {
  return ({ "Veículos":"🚗","Eletrónicos":"📱","Moda":"👟","Casa":"🛋️","Agricultura":"🌱","Serviços":"🧰","Outros":"📦" })[category] || "📦";
}
function openPostDialog() {
  postDialog.showModal();
}
function closeDialog(id) {
  const dialog = document.getElementById(id);
  if (dialog && dialog.open) dialog.close();
}
function publishProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const title = String(data.get("title") || "").trim();
  const category = String(data.get("category") || "");
  const location = String(data.get("location") || "").trim();
  const description = String(data.get("description") || "").trim();
  const phone = cleanPhone(data.get("phone") || "");
  const price = Number(data.get("price"));
  if (!title || !category || !location || !description || !phone || !Number.isFinite(price) || price < 0) {
    showToast("Verifica os campos do anúncio.");
    return;
  }
  if (phone.length < 9) {
    showToast("Confirma o número de WhatsApp com indicativo do país.");
    return;
  }
  const featured = data.get("featured") === "on";
  const product = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    title, category, location, description, phone, price,
    condition: String(data.get("condition") || "Novo"),
    featured, emoji: categoryEmoji(category), sample:false, createdAt:Date.now()
  };
  products.unshift(product);
  saveProducts();
  form.reset();
  closeDialog("postDialog");
  selectedCategory = "Todos";
  document.querySelectorAll(".category-card").forEach(btn => btn.classList.toggle("active", btn.dataset.category === "Todos"));
  document.getElementById("searchInput").value = "";
  document.getElementById("locationFilter").value = "";
  searchTerm = "";
  renderProducts();
  document.getElementById("anuncios").scrollIntoView({behavior:"smooth"});
  showToast(featured ? "Anúncio guardado como destaque demonstrativo. Nenhum pagamento foi cobrado." : "Anúncio publicado neste navegador!");
}
function contactSeller(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  const phone = cleanPhone(product.phone);
  if (!phone) { showToast("Este anúncio não tem um número válido."); return; }
  const message = `Olá! Vi o anúncio "${product.title}" no Mercado MZ, por ${formatPrice(product.price)}. Ainda está disponível?`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}
function showDetails(id) {
  const p = products.find(product => product.id === id);
  if (!p) return;
  alert(`${p.title}\n\nCategoria: ${p.category}\nPreço: ${formatPrice(p.price)}\nLocalização: ${p.location}\nEstado: ${p.condition || "Não indicado"}\n\n${p.description}\n\nConfirma os detalhes e encontra-te num local seguro antes de concluir a compra.`);
}
function toggleFavorite(id) {
  if (favorites.includes(id)) {
    favorites = favorites.filter(fav => fav !== id);
    showToast("Removido dos favoritos.");
  } else {
    favorites.push(id);
    showToast("Adicionado aos favoritos.");
  }
  saveFavorites();
  renderProducts();
}
let selectedPaymentPlan = null;
const paymentPlans = {
  "Destaque": { amount: 300, period: "7 dias" },
  "Profissional": { amount: 1500, period: "1 mês" }
};

function selectPlan(plan) {
  if (plan === "Gratuito") {
    document.getElementById("planDialogTitle").textContent = "Plano Gratuito";
    document.getElementById("planDialogText").textContent =
      "Podes começar com até 3 anúncios ativos nesta proposta. No protótipo, os anúncios ficam guardados apenas neste navegador.";
    planDialog.showModal();
    return;
  }
  const details = paymentPlans[plan];
  if (!details) return;
  selectedPaymentPlan = { plan, ...details, orderId: `MZ-${Date.now().toString(36).toUpperCase()}` };
  document.getElementById("paymentTitle").textContent = `Pagar plano ${plan}`;
  document.getElementById("paymentSummary").textContent =
    `Plano ${plan} — ${details.amount.toLocaleString("pt-PT")} MT por ${details.period}. Escolhe a tua carteira móvel para abrir o menu de pagamento.`;
  document.getElementById("paymentReference").value = "";
  document.getElementById("paymentPayerPhone").value = "";
  document.getElementById("paymentStatusNote").textContent =
    `Pedido ${selectedPaymentPlan.orderId}. O site não consegue confirmar o pagamento automaticamente nesta versão.`;
  updateUssdInstructions();
  paymentDialog.showModal();
}

const paymentNetworks = {
  mpesa: {
    name: "M-Pesa (Vodacom)",
    code: "*111#",
    uri: "tel:*111%23",
    steps: "Marca *111# e escolhe M-Pesa → Transferir dinheiro. Confirma cuidadosamente o número 843480824, o valor e o nome apresentado antes de confirmar."
  },
  emola: {
    name: "e-Mola (Movitel)",
    code: "*898#",
    uri: "tel:*898%23",
    steps: "Marca *898# para abrir o menu e-Mola. Segue as opções de transferência e confirma cuidadosamente o número 843480824, o valor e o nome apresentado."
  },
  mkesh: {
    name: "mKesh (Tmcel)",
    code: "*500#",
    uri: "tel:*500%23",
    steps: "Marca *500# para abrir o menu mKesh. Escolhe a opção de envio/transferência e confirma cuidadosamente o número 843480824, o valor e o nome apresentado."
  }
};

function updateUssdInstructions() {
  const network = paymentNetworks[document.getElementById("paymentNetwork").value];
  document.getElementById("ussdCode").textContent = network.code;
  document.getElementById("ussdSteps").textContent = network.steps;
  document.getElementById("openUssd").dataset.ussdUri = network.uri;
  document.getElementById("openUssd").textContent = `Abrir menu ${network.name}`;
}

document.getElementById("paymentNetwork").addEventListener("change", updateUssdInstructions);
document.getElementById("openUssd").addEventListener("click", () => {
  const uri = document.getElementById("openUssd").dataset.ussdUri;
  // O dispositivo pode não aceitar ligações USSD iniciadas a partir do navegador.
  if (uri) window.location.href = uri;
});

document.getElementById("paymentReferenceForm").addEventListener("submit", event => {
  event.preventDefault();
  if (!selectedPaymentPlan) return;
  const reference = document.getElementById("paymentReference").value.trim();
  const payerPhone = document.getElementById("paymentPayerPhone").value.trim();
  const network = paymentNetworks[document.getElementById("paymentNetwork").value];
  const request = {
    orderId: selectedPaymentPlan.orderId,
    plan: selectedPaymentPlan.plan,
    amount: selectedPaymentPlan.amount,
    network: network.name,
    recipient: "843480824",
    reference,
    payerPhone,
    status: "pending-verification",
    createdAt: new Date().toISOString()
  };
  try {
    const existing = JSON.parse(localStorage.getItem("mercadoMZPaymentRequests") || "[]");
    existing.push(request);
    localStorage.setItem("mercadoMZPaymentRequests", JSON.stringify(existing));
    document.getElementById("paymentStatusNote").textContent =
      `Pedido ${request.orderId} registado neste navegador com estado “Pendente de verificação”. Nenhum pagamento foi confirmado e o plano não foi ativado.`;
    showToast("Pedido guardado para verificação local.");
  } catch {
    document.getElementById("paymentStatusNote").textContent =
      "Não foi possível guardar o pedido neste navegador. O pagamento continua sem confirmação.";
  }
});

document.getElementById("searchForm").addEventListener("submit", event => {
  event.preventDefault();
  searchTerm = document.getElementById("searchInput").value.trim();
  renderProducts();
  document.getElementById("anuncios").scrollIntoView({behavior:"smooth"});
});
document.getElementById("searchInput").addEventListener("input", event => {
  searchTerm = event.target.value.trim();
  renderProducts();
});
document.getElementById("categoryGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  selectedCategory = button.dataset.category;
  document.querySelectorAll(".category-card").forEach(card => card.classList.toggle("active", card === button));
  renderProducts();
  document.getElementById("anuncios").scrollIntoView({behavior:"smooth"});
});
document.getElementById("locationFilter").addEventListener("change", renderProducts);
document.getElementById("sortFilter").addEventListener("change", renderProducts);
document.getElementById("clearFilters").addEventListener("click", () => {
  selectedCategory = "Todos";
  searchTerm = "";
  document.getElementById("searchInput").value = "";
  document.getElementById("locationFilter").value = "";
  document.getElementById("sortFilter").value = "featured";
  document.querySelectorAll(".category-card").forEach(card => card.classList.toggle("active", card.dataset.category === "Todos"));
  renderProducts();
  showToast("Filtros limpos.");
});
productGrid.addEventListener("click", event => {
  const favoriteButton = event.target.closest("[data-favorite]");
  const contactButton = event.target.closest("[data-contact]");
  const detailsButton = event.target.closest("[data-details]");
  if (favoriteButton) toggleFavorite(favoriteButton.dataset.favorite);
  if (contactButton) contactSeller(contactButton.dataset.contact);
  if (detailsButton) showDetails(detailsButton.dataset.details);
});
document.getElementById("openPost").addEventListener("click", openPostDialog);
document.getElementById("bannerPost").addEventListener("click", openPostDialog);
document.getElementById("postForm").addEventListener("submit", publishProduct);
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => closeDialog(button.dataset.close)));
document.querySelectorAll(".plan-select").forEach(button => button.addEventListener("click", () => selectPlan(button.dataset.plan)));
document.getElementById("menuToggle").addEventListener("click", () => {
  const nav = document.getElementById("mainNav");
  const isOpen = nav.classList.toggle("open");
  document.getElementById("menuToggle").setAttribute("aria-expanded", String(isOpen));
});
document.querySelectorAll("#mainNav a").forEach(link => link.addEventListener("click", () => {
  document.getElementById("mainNav").classList.remove("open");
  document.getElementById("menuToggle").setAttribute("aria-expanded", "false");
}));
document.getElementById("year").textContent = new Date().getFullYear();
renderProducts();


// Formulário visível "Adicionar produto".
let quickImageData = "";
const quickImageInput = document.getElementById("quickProductImage");
const quickImagePreview = document.getElementById("quickImagePreview");

if (quickImageInput && quickImagePreview) {
  quickImageInput.addEventListener("change", () => {
    const file = quickImageInput.files && quickImageInput.files[0];
    quickImageData = "";
    if (!file) {
      quickImagePreview.innerHTML = '<span>🖼️</span><small>A pré-visualização da imagem aparecerá aqui.</small>';
      return;
    }
    if (!file.type.startsWith("image/")) {
      quickImageInput.value = "";
      showToast("Escolhe um ficheiro de imagem.");
      return;
    }
    if (file.size > 1_500_000) {
      quickImageInput.value = "";
      showToast("A imagem deve ter menos de 1,5 MB para este protótipo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      quickImageData = String(reader.result || "");
      quickImagePreview.innerHTML = "";
      const img = document.createElement("img");
      img.src = quickImageData;
      img.alt = "Pré-visualização do produto";
      const caption = document.createElement("small");
      caption.textContent = file.name;
      quickImagePreview.append(img, caption);
    };
    reader.readAsDataURL(file);
  });
}

const quickProductForm = document.getElementById("quickProductForm");
if (quickProductForm) {
  quickProductForm.addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") || "").trim();
    const category = String(data.get("category") || "");
    const location = String(data.get("location") || "").trim();
    const description = String(data.get("description") || "").trim();
    const phone = cleanPhone(data.get("phone") || "");
    const price = Number(data.get("price"));
    if (!title || !category || !location || !description || !phone || !Number.isFinite(price) || price < 0) {
      showToast("Verifica os campos obrigatórios.");
      return;
    }
    if (phone.length < 9) {
      showToast("Confirma o WhatsApp com indicativo do país.");
      return;
    }
    const featured = data.get("featured") === "on";
    const product = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      title, category, location, description, phone, price,
      condition: String(data.get("condition") || "Novo"),
      featured, emoji: categoryEmoji(category), imageData: quickImageData,
      sample:false, createdAt:Date.now()
    };
    products.unshift(product);
    try {
      saveProducts();
    } catch (error) {
      products = products.filter(item => item.id !== product.id);
      showToast("Não foi possível guardar. Tenta uma imagem menor ou remove a imagem.");
      return;
    }
    form.reset();
    quickImageData = "";
    if (quickImagePreview) quickImagePreview.innerHTML = '<span>🖼️</span><small>A pré-visualização da imagem aparecerá aqui.</small>';
    selectedCategory = "Todos";
    searchTerm = "";
    document.getElementById("searchInput").value = "";
    document.getElementById("locationFilter").value = "";
    document.querySelectorAll(".category-card").forEach(btn => btn.classList.toggle("active", btn.dataset.category === "Todos"));
    renderProducts();
    document.getElementById("anuncios").scrollIntoView({behavior:"smooth"});
    showToast(featured ? "Anúncio publicado como destaque demonstrativo. Sem cobrança real." : "Produto publicado neste navegador!");
  });
}
