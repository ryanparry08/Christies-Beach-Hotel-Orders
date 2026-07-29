const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyz4JYtxsT1W4tPyYkK7r5x7yj9Eihk88rKR3t8ziJaRaRsit9OceNsp9x6TX37N9hw/exec";

const form = document.getElementById("orderForm");
const categoryContainer = document.getElementById("productCategories");
const summary = document.getElementById("orderSummary");
const formMessage = document.getElementById("formMessage");
const submitButton = document.getElementById("submitButton");
const cartCount = document.getElementById("cartCount");
let cart = [];

function nextThursdays(count = 10) {
  const dates = [];
  const cursor = new Date();
  cursor.setHours(0,0,0,0);
  cursor.setDate(cursor.getDate() + ((4 - cursor.getDay() + 7) % 7));
  for (let i = 0; i < count; i++) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return dates;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric"
  }).format(date);
}

function populateDeliveryDates() {
  const select = document.getElementById("deliveryDate");
  select.innerHTML = '<option value="">Select a Thursday</option>';
  nextThursdays().forEach(date => {
    const option = document.createElement("option");
    option.value = date.toISOString().slice(0,10);
    option.textContent = formatDate(date);
    select.appendChild(option);
  });
}

function renderProducts(filter = "") {
  const query = filter.trim().toLowerCase();
  categoryContainer.innerHTML = "";

  window.PRODUCTS.forEach(group => {
    const items = group.items.filter(item =>
      item.name.toLowerCase().includes(query) ||
      group.category.toLowerCase().includes(query)
    );
    if (!items.length) return;

    const details = document.createElement("details");
    details.className = "category";
    details.open = query.length > 0 || group.category === "Beer";

    const heading = document.createElement("summary");
    heading.innerHTML = `<span>${group.icon} ${group.category}</span><span>${items.length} products</span>`;
    details.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "product-card-grid";

    items.forEach(item => {
      const safeId = `${group.category}-${item.name}`.replace(/[^a-z0-9]/gi,"-").toLowerCase();
      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
        <span class="category-tag">${group.category}</span>
        <h3>${item.name}</h3>
        <label>Pack size
          <select id="${safeId}-pack">
            <option value="">Select pack size</option>
            ${item.options.map(option => `<option>${option}</option>`).join("")}
          </select>
        </label>
        <label>Quantity
          <input id="${safeId}-qty" type="number" min="1" step="1" value="1">
        </label>
        <button type="button" class="add-button"
          data-category="${group.category}"
          data-product="${item.name}"
          data-pack-id="${safeId}-pack"
          data-qty-id="${safeId}-qty">Add to order</button>
      `;
      grid.appendChild(card);
    });

    details.appendChild(grid);
    categoryContainer.appendChild(details);
  });

  document.querySelectorAll(".add-button").forEach(button => {
    button.addEventListener("click", () => {
      const packSize = document.getElementById(button.dataset.packId).value;
      const quantity = Number(document.getElementById(button.dataset.qtyId).value || 0);
      if (!packSize) return alert("Please select a pack size.");
      if (quantity < 1) return alert("Please enter a quantity of at least 1.");

      const existing = cart.find(item =>
        item.product === button.dataset.product && item.packSize === packSize
      );
      if (existing) existing.quantity += quantity;
      else cart.push({
        category: button.dataset.category,
        product: button.dataset.product,
        packaging: "As selected",
        packSize,
        quantity
      });
      updateSummary();
    });
  });
}

function removeCartItem(index) {
  cart.splice(index,1);
  updateSummary();
}

function updateCartQuantity(index,value) {
  const quantity = Number(value || 0);
  if (quantity < 1) return removeCartItem(index);
  cart[index].quantity = quantity;
  updateSummary();
}

function updateSummary() {
  cartCount.textContent = cart.reduce((sum,item) => sum + item.quantity, 0);
  if (!cart.length) {
    summary.className = "summary empty";
    summary.innerHTML = "<strong>Your order is empty.</strong><span>Add products using the buttons above.</span>";
    return;
  }
  summary.className = "summary";
  summary.innerHTML = `
    <div class="summary-title"><strong>Order summary</strong><span>${cart.length} product lines</span></div>
    <div class="cart-lines">
      ${cart.map((item,index) => `
        <div class="cart-line">
          <div><strong>${item.product}</strong><span>${item.packSize}</span></div>
          <label>Qty<input type="number" min="1" value="${item.quantity}" onchange="updateCartQuantity(${index},this.value)"></label>
          <button type="button" class="remove-button" onclick="removeCartItem(${index})">Remove</button>
        </div>
      `).join("")}
    </div>`;
}

function toggleOrderType(value) {
  document.getElementById("collectionFields").classList.toggle("hidden", value !== "Collection");
  document.getElementById("deliveryFields").classList.toggle("hidden", value !== "Delivery");
  document.getElementById("collectionDate").required = value === "Collection";
  document.getElementById("deliveryDate").required = value === "Delivery";
}

document.querySelectorAll('input[name="orderType"]').forEach(radio =>
  radio.addEventListener("change", e => toggleOrderType(e.target.value))
);

document.getElementById("otherToggle").addEventListener("change", e =>
  document.getElementById("otherFields").classList.toggle("hidden", !e.target.checked)
);

document.getElementById("productSearch").addEventListener("input", e => renderProducts(e.target.value));
document.getElementById("clearOrder").addEventListener("click", () => { cart = []; updateSummary(); });

function collectPayload() {
  const orderType = document.querySelector('input[name="orderType"]:checked')?.value || "";
  return {
    account: document.getElementById("account").value,
    contactName: document.getElementById("contactName").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    email: document.getElementById("email").value.trim(),
    poNumber: document.getElementById("poNumber").value.trim(),
    orderType,
    requiredDate: orderType === "Delivery" ? document.getElementById("deliveryDate").value : document.getElementById("collectionDate").value,
    preferredTime: orderType === "Collection" ? document.getElementById("collectionTime").value : "",
    deliveryInstructions: document.getElementById("deliveryInstructions").value.trim(),
    products: cart,
    otherRequest: document.getElementById("otherToggle").checked ? {
      product: document.getElementById("otherProduct").value.trim(),
      packaging: document.getElementById("otherPackaging").value,
      packSize: document.getElementById("otherPackSize").value,
      quantity: document.getElementById("otherQuantity").value,
      approxDrinks: document.getElementById("approxDrinks").value,
      acceptAlternative: document.getElementById("acceptAlternative").value
    } : null,
    notes: document.getElementById("notes").value.trim(),
    submittedAt: new Date().toISOString()
  };
}

form.addEventListener("submit", event => {
  event.preventDefault();
  if (!form.checkValidity()) return form.reportValidity();

  const payload = collectPayload();
  const hasOther = payload.otherRequest && payload.otherRequest.product;
  if (!payload.products.length && !hasOther) {
    formMessage.className = "form-message error";
    formMessage.textContent = "Please add at least one product or request a product not listed.";
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  const submissionForm = document.createElement("form");
  submissionForm.method = "POST";
  submissionForm.action = SCRIPT_URL;
  submissionForm.target = "submissionFrame";
  submissionForm.style.display = "none";

  const field = document.createElement("input");
  field.type = "hidden";
  field.name = "payload";
  field.value = JSON.stringify(payload);
  submissionForm.appendChild(field);
  document.body.appendChild(submissionForm);
  submissionForm.submit();

  setTimeout(() => {
    formMessage.className = "form-message success";
    formMessage.textContent = "Thank you. Your order has been sent to the Christies Beach Hotel Bottle Shop.";
    form.reset();
    cart = [];
    updateSummary();
    toggleOrderType("");
    document.getElementById("otherFields").classList.add("hidden");
    submitButton.disabled = false;
    submitButton.textContent = "Submit trade order";
    submissionForm.remove();
    window.scrollTo({top:0,behavior:"smooth"});
  }, 1400);
});

populateDeliveryDates();
renderProducts();
updateSummary();
window.removeCartItem = removeCartItem;
window.updateCartQuantity = updateCartQuantity;
