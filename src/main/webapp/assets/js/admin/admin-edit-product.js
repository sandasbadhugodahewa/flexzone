// ═══════════════════════════════════════════════════════
//  FLEXZONE ADMIN — Edit Product JS
//  Flow:
//   1. Read productId from URL
//   2. Load dropdown options from /form-data
//   3. Load existing product from /api/admin/products/{id}
//   4. Pre-fill all form fields with existing data
//   5. Show existing images (keep/delete) + allow new uploads
//   6. Load existing stock rows (edit in place)
//   7. On save → PUT /api/admin/products/{id} (multipart)
// ═══════════════════════════════════════════════════════

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
let currentProductId  = null;
let existingImages    = [];   // filenames already saved in DB  e.g. ["123_shirt.png"]
let newUploadedImages = [];   // new File objects user just selected
let deletedImages     = [];   // filenames user marked for removal
let stockRowCounter   = 0;
let allSizes          = [];
let allDiscounts      = [];


// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
window.addEventListener("load", async () => {
    const params      = new URLSearchParams(window.location.search);
    currentProductId  = parseInt(params.get("productId"));

    if (!currentProductId) {
        Notiflix.Notify.failure("No product ID provided!", { position: "center-top" });
        setTimeout(() => window.location.href = "admin-products.html", 1500);
        return;
    }

    try {
        Notiflix.Loading.pulse("Loading product...", { svgColor: "#6c5ce7" });

        await Promise.all([
            loadDropdownData(),
            loadProductData()
        ]);

        setupImageUpload();
        setupCharCounter("descriptionInput", "descCharCount", 1000);

    } finally {
        Notiflix.Loading.remove();
    }
});


// ═══════════════════════════════════════════════════════
//  STEP 1 — LOAD DROPDOWN DATA
// ═══════════════════════════════════════════════════════
async function loadDropdownData() {
    try {
        const res  = await fetch("api/admin/products/form-data");
        if (!res.ok) return;
        const data = await res.json();
        if (!data.status) return;

        allSizes     = data.sizes     || [];
        allDiscounts = data.discounts || [];

        // populate all selects (pre-selection happens after product loads)
        populateSelect("categorySelect",    data.categories,    "id", "name");
        populateSelect("subcategorySelect", data.subcategories, "id", "name");
        populateSelect("brandSelect",       data.brands,        "id", "name");
        populateSelect("genderSelect",      data.genders,       "id", "name");

        // Colors with hex
        const colorSel = document.getElementById("colorSelect");
        if (colorSel && data.colors) {
            data.colors.forEach(c => {
                const opt       = document.createElement("option");
                opt.value       = c.id;
                opt.textContent = c.value;
                opt.dataset.hex = c.hexCode || "#ccc";
                colorSel.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Form data load error:", e.message);
    }
}

function populateSelect(id, items, valueKey, labelKey) {
    const sel = document.getElementById(id);
    if (!sel || !items) return;
    items.forEach(item => {
        const opt       = document.createElement("option");
        opt.value       = item[valueKey];
        opt.textContent = item[labelKey] || item["value"] || "—";
        sel.appendChild(opt);
    });
}


// ═══════════════════════════════════════════════════════
//  STEP 2 — LOAD EXISTING PRODUCT & PRE-FILL FIELDS
// ═══════════════════════════════════════════════════════
async function loadProductData() {
    const res  = await fetch(`api/admin/products/${currentProductId}`);
    const data = await res.json();

    if (!data.status || !data.singleProduct) {
        Notiflix.Notify.failure(data.message || "Failed to load product!", { position: "center-top" });
        return;
    }

    const p = data.singleProduct;

    // Update page title
    document.title = `Edit: ${p.title} | FlexZone Admin`;
    const titleEl = document.querySelector(".page-title");
    if (titleEl) titleEl.textContent = `Edit: ${p.title}`;

    // ── Basic fields ──
    setVal("titleInput",       p.title       || "");
    setVal("descriptionInput", p.description || "");

    // ── Dropdowns — set selected value after options loaded ──
    setSelectVal("categorySelect",    p.categoryId);
    setSelectVal("subcategorySelect", p.subcatId);
    setSelectVal("brandSelect",       p.brandId);
    setSelectVal("colorSelect",       p.colorId);
    setSelectVal("genderSelect",      p.genderId);

    // ── Optional product_details fields ──
    productDetails = p.product_details;
    if (productDetails) {
        const d = typeof productDetails === "string"
            ? JSON.parse(productDetails)
            : productDetails;

        setVal("fabricSelect",    d.fabric        || "");
        setVal("materialSelect",  d.material      || "");
        setVal("stretchSelect",   d.stretchability || "");
        setVal("thicknessSelect", d.thickness     || "");
        setVal("fitTypeSelect",   d.fitType       || "");
        setVal("chestSizeSelect", d.chestSize     || "");
        setVal("waistSizeSelect", d.waistSize     || "");
        setVal("neckTypeSelect",  d.neckType      || "");
        setVal("patternSelect",   d.pattern       || "");
        setVal("seasonSelect",    d.season        || "");
        setVal("washingInput",    d.washing       || "");
        setVal("ironingInput",    d.ironing       || "");
        setVal("specialCareInput",d.specialCare   || "");
    }

    // ── Existing images ──
    existingImages = p.images || [];
    renderAllImages();

    // ── Stock rows ──
    const tbody = document.getElementById("stockTableBody");
    if (tbody) tbody.innerHTML = ""; // clear placeholder

    (p.stocks || []).forEach(stock => {
        addStockRow({
            stockId:     stock.stockId,
            sizeId:      stock.sizeId,
            price:       stock.price,
            quantity:    stock.quantity,
            discountId:  stock.discountId || null
        });
    });

    updateChecklist();
}


// ═══════════════════════════════════════════════════════
//  STEP 3 — IMAGE MANAGEMENT
//  existingImages = already-saved filenames
//  newUploadedImages = new File objects
//  deletedImages = filenames marked for removal
//
//  The combined preview shows both sets side by side.
//  The first non-deleted existing image (or first new) = MAIN
// ═══════════════════════════════════════════════════════
function setupImageUpload() {
    const zone  = document.getElementById("uploadZone");
    const input = document.getElementById("imageInput");
    if (!zone || !input) return;

    zone.addEventListener("dragover",  e => { e.preventDefault(); zone.classList.add("dragover"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
    zone.addEventListener("drop", e => {
        e.preventDefault();
        zone.classList.remove("dragover");
        handleNewFiles([...e.dataTransfer.files]);
    });
    input.addEventListener("change", () => {
        handleNewFiles([...input.files]);
        input.value = "";
    });
}

function handleNewFiles(files) {
    const ALLOWED   = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const MAX_SIZE  = 5 * 1024 * 1024;
    const MAX_TOTAL = 6;

    const activeExisting = existingImages.filter(img => !deletedImages.includes(img));
    const currentTotal   = activeExisting.length + newUploadedImages.length;

    files.forEach(file => {
        if (!ALLOWED.includes(file.type))
            return Notiflix.Notify.warning(`"${file.name}" is not a supported image type.`, { position: "center-top" });
        if (file.size > MAX_SIZE)
            return Notiflix.Notify.warning(`"${file.name}" exceeds 5MB limit.`, { position: "center-top" });
        if (currentTotal + newUploadedImages.length >= MAX_TOTAL)
            return Notiflix.Notify.warning(`Maximum ${MAX_TOTAL} images allowed.`, { position: "center-top" });

        newUploadedImages.push(file);
    });

    renderAllImages();
    updateChecklist();
}

// Renders existing (kept) images + new previews in one grid
function renderAllImages() {
    const grid = document.getElementById("imagePreviewGrid");
    if (!grid) return;

    const activeExisting = existingImages.filter(img => !deletedImages.includes(img));
    const totalImages    = activeExisting.length + newUploadedImages.length;

    if (totalImages === 0) {
        grid.style.display = "none";
        grid.innerHTML     = "";
        return;
    }

    grid.style.display = "grid";
    grid.innerHTML     = "";
    let thumbIndex     = 0;

    // ── Existing images (already saved) ──
    activeExisting.forEach(filename => {
        const isMain = thumbIndex === 0;
        const thumb  = document.createElement("div");
        thumb.className = "ap-image-thumb";
        thumb.innerHTML = `
            <img src="assets/images/productImg/${filename}"
                 alt="${filename}"
                 onerror="this.src='assets/images/default.png'">
            ${isMain
            ? `<span style="position:absolute;bottom:4px;left:4px;background:var(--accent-color);
                               color:#fff;font-size:9px;font-weight:700;padding:2px 6px;
                               border-radius:4px;">MAIN</span>`
            : ""}
            <span style="position:absolute;top:4px;left:6px;background:rgba(0,0,0,0.55);
                         color:#fff;font-size:9px;font-weight:600;padding:1px 5px;
                         border-radius:4px;">SAVED</span>
            <button class="ap-image-thumb-remove"
                    onclick="markImageDeleted('${filename}')"
                    type="button" title="Remove image">
                <i class="bi bi-x"></i>
            </button>`;
        grid.appendChild(thumb);
        thumbIndex++;
    });

    // ── New images (just selected) ──
    newUploadedImages.forEach((file, i) => {
        const isMain = thumbIndex === 0;
        const url    = URL.createObjectURL(file);
        const thumb  = document.createElement("div");
        thumb.className = "ap-image-thumb";
        thumb.innerHTML = `
            <img src="${url}" alt="new ${i+1}">
            ${isMain
            ? `<span style="position:absolute;bottom:4px;left:4px;background:var(--accent-color);
                               color:#fff;font-size:9px;font-weight:700;padding:2px 6px;
                               border-radius:4px;">MAIN</span>`
            : ""}
            <span style="position:absolute;top:4px;left:6px;background:rgba(25,135,84,0.85);
                         color:#fff;font-size:9px;font-weight:600;padding:1px 5px;
                         border-radius:4px;">NEW</span>
            <button class="ap-image-thumb-remove"
                    onclick="removeNewImage(${i})"
                    type="button" title="Remove image">
                <i class="bi bi-x"></i>
            </button>`;
        grid.appendChild(thumb);
        thumbIndex++;
    });
}

function markImageDeleted(filename) {
    deletedImages.push(filename);
    renderAllImages();
    updateChecklist();
}

function removeNewImage(index) {
    newUploadedImages.splice(index, 1);
    renderAllImages();
    updateChecklist();
}


// ═══════════════════════════════════════════════════════
//  STEP 4 — STOCK ROWS
//  Each row has a hidden stockId for existing stocks.
//  New rows have stockId = null → backend will INSERT
//  Existing rows → backend will UPDATE
// ═══════════════════════════════════════════════════════
function addStockRow(existing = null) {
    const tbody = document.getElementById("stockTableBody");
    if (!tbody) return;

    const rowId = ++stockRowCounter;
    const isExisting = existing !== null;

    const sizeOptions = allSizes.map(s =>
        `<option value="${s.id}" ${isExisting && existing.sizeId === s.id ? "selected" : ""}>
            ${s.name}
        </option>`
    ).join("");

    const discountOptions =
        `<option value="" ${!isExisting || !existing.discountId ? "selected" : ""}>— No Discount —</option>` +
        allDiscounts.map(d =>
            `<option value="${d.id}" ${isExisting && existing.discountId === d.id ? "selected" : ""}>
                ${d.couponCode} (${d.value}% off)
            </option>`
        ).join("");

    const tr = document.createElement("tr");
    tr.id = `stockRow_${rowId}`;


    tr.innerHTML = `
    <!-- Hidden stockId -->
    <td style="display:none;">
       <input type="hidden" id="stockId_${rowId}"
           value="${isExisting && existing.stockId ? existing.stockId : ""}">
    </td>

    <td style="font-size:12px;color:var(--muted-color);font-weight:600;text-align:center;">
        ${isExisting && existing.stockId
        ? `<span class="badge badge-soft-secondary">#${existing.stockId}</span>`
        : `<span class="badge badge-soft-success">NEW</span>`}
    </td>

    <td>
        <select class="form-select" id="size_${rowId}">
            <option value="">Select size</option>
            ${sizeOptions}
        </select>
    </td>

    <td>
        <input type="number" class="form-control" id="price_${rowId}"
               value="${isExisting ? existing.price : ""}">
    </td>

    <td>
        <input type="number" class="form-control" id="qty_${rowId}"
               value="${isExisting ? existing.quantity : ""}">
    </td>

    <td>
        <select class="form-select" id="discount_${rowId}">
            ${discountOptions}
        </select>
    </td>

    <td class="text-center">
        <button type="button" class="btn btn-sm btn-outline-danger"
                onclick="removeStockRow(${rowId})">
            <i class="bi bi-trash"></i>
        </button>
    </td>
`;

    tbody.appendChild(tr);
    tr.addEventListener("change", updateChecklist);
    tr.addEventListener("input",  updateChecklist);
    updateChecklist();
}

function removeStockRow(rowId) {
    document.getElementById(`stockRow_${rowId}`)?.remove();
    updateChecklist();
}


// ═══════════════════════════════════════════════════════
//  STEP 5 — COLLECT FORM DATA
// ═══════════════════════════════════════════════════════
function collectFormData() {
    const title    = getVal("titleInput");
    const catId    = getVal("categorySelect");
    const subcatId = getVal("subcategorySelect");
    const brandId  = getVal("brandSelect");
    const colorId  = getVal("colorSelect");
    const genderId = getVal("genderSelect");
    const desc     = getVal("descriptionInput");

    // Optional product_details
    const productDetails = {};
    const fields = [
        ["fabric",         "fabricSelect"],
        ["material",       "materialSelect"],
        ["stretchability", "stretchSelect"],
        ["thickness",      "thicknessSelect"],
        ["fitType",        "fitTypeSelect"],
        ["chestSize",      "chestSizeSelect"],
        ["waistSize",      "waistSizeSelect"],
        ["neckType",       "neckTypeSelect"],
        ["pattern",        "patternSelect"],
        ["season",         "seasonSelect"],
        ["washing",        "washingInput"],
        ["ironing",        "ironingInput"],
        ["specialCare",    "specialCareInput"],
    ];
    fields.forEach(([key, id]) => {
        const val = getVal(id);
        if (val) productDetails[key] = val;
    });

    // Stock rows
    const stockList = [];
    let stockValid  = true;

    document.querySelectorAll("#stockTableBody tr").forEach(row => {
        const id       = row.id.replace("stockRow_", "");
        const stockId  = getVal(`stockId_${id}`);   // "" = new, number = existing
        const sizeId   = getVal(`size_${id}`);
        const price    = parseFloat(getVal(`price_${id}`));
        const qty      = parseInt(getVal(`qty_${id}`));
        const discount = getVal(`discount_${id}`);

        if (!sizeId || isNaN(price) || price < 0 || isNaN(qty) || qty < 0) {
            stockValid = false;
            return;
        }

        stockList.push({
            stockId:    stockId ? parseInt(stockId) : 0, // 0 = INSERT new, >0 = UPDATE existing
            sizeId:     parseInt(sizeId),
            price,
            quantity:   qty,
            discountId: discount ? parseInt(discount) : null
        });
    });

    // Images: kept existing + new uploads
    const keptImages = existingImages.filter(img => !deletedImages.includes(img));

    return {
        title, catId, subcatId, brandId, colorId, genderId,
        desc, productDetails, stockList, stockValid, keptImages
    };
}


// ═══════════════════════════════════════════════════════
//  STEP 6 — UPDATE / SAVE
//
//  PUT /api/admin/products/{id}   (multipart/form-data)
//  ┌─────────────────────────────────────────────────┐
//  │  "product"      → JSON string (all fields)      │
//  │  "images"       → new File objects (optional)   │
//  └─────────────────────────────────────────────────┘
//  keptImages[] is inside the JSON so backend knows
//  which existing files to keep in product_images table
// ═══════════════════════════════════════════════════════
async function saveProduct() {
    const {
        title, catId, subcatId, brandId, colorId, genderId,
        desc, productDetails, stockList, stockValid, keptImages
    } = collectFormData();

    // Validate
    if (!title)    return showError("Product title is required!");
    if (!catId)    return showError("Please select a category!");
    if (!subcatId) return showError("Please select a subcategory!");
    if (!brandId)  return showError("Please select a brand!");
    if (!colorId)  return showError("Please select a color!");
    if (!genderId) return showError("Please select a gender!");

    const totalImages = keptImages.length + newUploadedImages.length;
    if (totalImages === 0) return showError("At least one product image is required!");

    if (stockList.length === 0) return showError("Please add at least one stock/size entry!");
    if (!stockValid)            return showError("Please complete all Size, Price and Quantity fields!");

    // Build product JSON
    const productJson = JSON.stringify({
        title,
        description:    desc,
        categoryId:     parseInt(catId),
        subCategoryId:  parseInt(subcatId),
        brandId:        parseInt(brandId),
        colorId:        parseInt(colorId),
        genderId:       parseInt(genderId),
        status:         getVal("statusSelect") || "ACTIVE",
        productDetails: Object.keys(productDetails).length > 0 ? productDetails : null,
        keptImages,       // backend replaces product_images with these + new uploads
        stockDTOList: stockList   // ← must match ProductDTO: {stockId, sizeId, price, quantity, discountId}
    });

    const formData = new FormData();
    formData.append("product", productJson);
    newUploadedImages.forEach(file => formData.append("images", file));

    console.log("Sending subcategoryId:", subcatId);

    try {
        Notiflix.Loading.pulse("Updating product...", { svgColor: "#6c5ce7" });

        const res  = await fetch(`api/admin/products/${currentProductId}`, {
            method: "PUT",
            body:   formData
            // No Content-Type — browser sets multipart boundary automatically
        });

        if (!res.ok) {
            Notiflix.Notify.failure("Server error! Please try again.", { position: "center-top" });
            return;
        }

        const data = await res.json();

        if (data.status) {
            Notiflix.Report.success(
                "Product Updated!",
                data.message,
                "OK",
                () => window.location.href = `admin-view-product.html?productId=${currentProductId}`
            );
        } else {
            Notiflix.Notify.failure(data.message, { position: "center-top" });
        }

    } catch (e) {
        Notiflix.Notify.failure(e.message, { position: "center-top" });
    } finally {
        Notiflix.Loading.remove();
    }
}


// ─────────────────────────────────────────────
//  LIVE CHECKLIST
// ─────────────────────────────────────────────
function updateChecklist() {
    const activeExisting = existingImages.filter(img => !deletedImages.includes(img));
    const totalImages    = activeExisting.length + newUploadedImages.length;

    const checks = {
        chk_title: getVal("titleInput").length   > 0,
        chk_cat:   getVal("categorySelect")      !== "",
        chk_img:   totalImages                   > 0,
        chk_stock: document.querySelectorAll("#stockTableBody tr").length > 0
    };

    Object.entries(checks).forEach(([id, ok]) => {
        const el   = document.getElementById(id);
        const icon = el?.querySelector("i");
        if (!el || !icon) return;
        icon.className   = ok ? "bi bi-check-circle-fill" : "bi bi-circle";
        icon.style.color = ok ? "var(--success-color)"    : "var(--muted-color)";
        el.style.opacity = ok ? "1" : "0.65";
    });
}


// ─────────────────────────────────────────────
//  CHAR COUNTER
// ─────────────────────────────────────────────
function setupCharCounter(inputId, counterId, max) {
    const input   = document.getElementById(inputId);
    const counter = document.getElementById(counterId);
    if (!input || !counter) return;

    // Set initial count from pre-filled value
    const initial         = input.value.length;
    counter.textContent   = `${initial}/${max}`;

    input.addEventListener("input", () => {
        const len            = input.value.length;
        counter.textContent  = `${len}/${max}`;
        counter.style.color  = len > max * 0.9
            ? "var(--danger-color)" : "var(--muted-color)";
    });
}


// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function setVal(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function setSelectVal(id, value) {
    const el = document.getElementById(id);
    if (el && value) el.value = value;
}

function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
}

function showError(msg) {
    Notiflix.Notify.failure(msg, { position: "center-top" });
}