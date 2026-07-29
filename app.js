// Paste your deployed Google Apps Script Web App URL below.
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyz4JYtxsT1W4tPyYkK7r5x7yj9Eihk88rKR3t8ziJaRaRsit9OceNsp9x6TX37N9hw/exec";

const form = document.getElementById("orderForm");
const categoryContainer = document.getElementById("productCategories");
const summary = document.getElementById("orderSummary");
const formMessage = document.getElementById("formMessage");
const submitButton = document.getElementById("submitButton");

function nextThursdays(count = 10) {
  const dates = [];
  const current = new Date();
  current.setHours(0, 0, 0, 0);

  let cursor = new Date(current);
  const day = cursor.getDay();
  const daysUntilThursday = (4 - day + 7) % 7;
  cursor.setDate(cursor.getDate() + daysUntilThursday);

  for (let i = 0; i < count; i++) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  return dates;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function populateDeliveryDates() {
  const select = document.getElementById("deliveryDate");
  select.innerHTML = '<option value="">Select a Thursday</option>';

  nextThursdays().forEach(date => {
    const option = document.createElement("option");
    option.value = isoDate(date);
    option.textContent = formatDate(date);
    select.appendChild(option);
  });
}

function productId(category, product) {
  return `${category}-${product}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function renderProducts(filter = "") {
  const query = filter.trim().toLowerCase();
  categoryContainer.innerHTML = "";

  window.PRODUCTS.forEach(group => {
    const items = group.items.filter(item =>
      item.toLowerCase().includes(query) ||
      group.category.toLowerCase().includes(query)
    );

    if (!items.length) return;

    const details = document.createElement("details");
    details.className = "category";
    details.open = query.length > 0;

    const heading = document.createElement("summary");
    heading.textContent = `${group.category} (${items.length})`;
    details.appendChild(heading);

    const list = document.createElement("div");
    list.className = "product-list";

    items.forEach(item => {
      const id = productId(group.category, item);
      const row = document.createElement("div");
      row.className = "product-row";
      row.dataset.product = item.toLowerCase();

      row.innerHTML = `
        <div class="product-name">${item}</div>

        <label>
          Packaging
          <select data-field="packaging" data-product="${item}" data-category="${group.category}">
            <option value="">Select</option>
            <option>Cans</option>
            <option>Bottles</option>
            <option>Either is fine</option>
            <option>Not sure</option>
          </select>
        </label>

        <label>
          Pack size
          <select data-field="packSize" data-product="${item}" data-category="${group.category}">
            <option value="">Select</option>
            <option>Single</option>
            <option>4-pack</option>
            <option>6-pack</option>
            <option>10-pack</option>
            <option>Carton / case</option>
            <option>Wine case</option>
            <option>Bag</option>
            <option>Other</option>
            <option>Not sure</option>
          </select>
        </label>

        <label>
          Quantity
          <input type="number" min="0" step="1" value="0"
            data-field="quantity" data-product="${item}" data-category="${group.category}" />
        </label>
      `;

      list.appendChild(row);
    });

    details.appendChild(list);
    categoryContainer.appendChild(details);
  });

  bindProductEvents();
}

function bindProductEvents() {
  document.querySelectorAll("[data-field]").forEach(control => {
    control.addEventListener("change", updateSummary);
    control.addEventListener("input", updateSummary);
  });
}

function selectedProducts() {
  const rows = [];

  window.PRODUCTS.forEach(group => {
    group.items.forEach(item => {
      const quantity = Number(document.querySelector(
        `[data-field="quantity"][data-product="${CSS.escape(item)}"]`
      )?.value || 0);

      if (quantity > 0) {
        const packaging = document.querySelector(
          `[data-field="packaging"][data-product="${CSS.escape(item)}"]`
        )?.value || "Not specified";

        const packSize = document.querySelector(
          `[data-field="packSize"][data-product="${CSS.escape(item)}"]`
        )?.value || "Not specified";

        rows.push({
          category: group.category,
          product: item,
          packaging,
          packSize,
          quantity
        });
      }
    });
  });

  return rows;
}

function updateSummary() {
  const products = selectedProducts();

  if (!products.length) {
    summary.className = "summary empty";
    summary.textContent = "No products selected yet.";
    return;
  }

  summary.className = "summary";
  summary.innerHTML = `
    <strong>${products.length} product line${products.length === 1 ? "" : "s"} selected</strong>
    <ul>
      ${products.map(p =>
        `<li>${p.product}: ${p.quantity} × ${p.packSize}, ${p.packaging}</li>`
      ).join("")}
    </ul>
  `;
}

function toggleOrderType(value) {
  const collection = document.getElementById("collectionFields");
  const delivery = document.getElementById("deliveryFields");

  collection.classList.toggle("hidden", value !== "Collection");
  delivery.classList.toggle("hidden", value !== "Delivery");

  document.getElementById("collectionDate").required = value === "Collection";
  document.getElementById("deliveryDate").required = value === "Delivery";
}

document.querySelectorAll('input[name="orderType"]').forEach(radio => {
  radio.addEventListener("change", event => toggleOrderType(event.target.value));
});

document.getElementById("otherToggle").addEventListener("change", event => {
  document.getElementById("otherFields").classList.toggle("hidden", !event.target.checked);
});

document.getElementById("productSearch").addEventListener("input", event => {
  renderProducts(event.target.value);
});

document.getElementById("clearOrder").addEventListener("click", () => {
  renderProducts(document.getElementById("productSearch").value);
  updateSummary();
});

function collectPayload() {
  const orderType = document.querySelector('input[name="orderType"]:checked')?.value || "";

  return {
    account: document.getElementById("account").value,
    contactName: document.getElementById("contactName").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    email: document.getElementById("email").value.trim(),
    poNumber: document.getElementById("poNumber").value.trim(),
    orderType,
    requiredDate: orderType === "Delivery"
      ? document.getElementById("deliveryDate").value
      : document.getElementById("collectionDate").value,
    preferredTime: orderType === "Collection"
      ? document.getElementById("collectionTime").value
      : "",
    deliveryInstructions: document.getElementById("deliveryInstructions").value.trim(),
    products: selectedProducts(),
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

function validateOrder(payload) {
  if (!form.checkValidity()) {
    form.reportValidity();
    return "Please complete all required fields.";
  }

  const hasProducts = payload.products.length > 0;
  const hasOther = payload.otherRequest && payload.otherRequest.product;

  if (!hasProducts && !hasOther) {
    return "Please select at least one product or add a product not listed.";
  }

  if (payload.orderType === "Delivery") {
    const date = new Date(`${payload.requiredDate}T00:00:00`);
    if (date.getDay() !== 4) {
      return "Delivery must be scheduled for a Thursday.";
    }
  }

  return "";
}

form.addEventListener("submit", event => {
  event.preventDefault();
  formMessage.className = "form-message";
  formMessage.textContent = "";

  if (!SCRIPT_URL || SCRIPT_URL.includes("PASTE_YOUR")) {
    formMessage.className = "form-message error";
    formMessage.textContent = "The portal is ready, but the Google Apps Script URL still needs to be added in app.js.";
    return;
  }

  const payload = collectPayload();
  const validationError = validateOrder(payload);

  if (validationError) {
    formMessage.className = "form-message error";
    formMessage.textContent = validationError;
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
    renderProducts();
    updateSummary();
    toggleOrderType("");
    document.getElementById("otherFields").classList.add("hidden");
    submitButton.disabled = false;
    submitButton.textContent = "Submit trade order";
    submissionForm.remove();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 1400);
});

populateDeliveryDates();
renderProducts();
updateSummary();
