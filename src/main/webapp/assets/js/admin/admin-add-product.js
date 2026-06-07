let uploadedImages  = [];
let stockRowCounter = 0;
let allSizes        = [];
let allDiscounts    = [];
let quill;

//admin-add-product.js
window.addEventListener("load", async () => {
    await loadDropdownData();
    setupImageUpload();
    // setupCharCounter("descriptionInput", "descCharCount", 1000);
    initializeQuillEditor();
    addStockRow();
});

async function loadDropdownData() {
    try {
        const res  = await fetch("api/admin/products/form-data");
        if (!res.ok) return;
        const data = await res.json();
        if (!data.status) return;

        allSizes     = data.sizes     || [];
        allDiscounts = data.discounts || [];

        populateSelect("categorySelect",    data.categories,    "id", "name");
        populateSelect("subcategorySelect", data.subcategories, "id", "name");
        populateSelect("brandSelect",       data.brands,        "id", "name");
        populateSelect("genderSelect",      data.genders,       "id", "name");

        //Colors
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
        console.error("Form data load failed:", e.message);
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
//  STEP 2 — IMAGE UPLOAD
//  Files stored in uploadedImages[] — sent as FormData
//  Backend saves to /assets/images/productImg/
// ══════════════════════════════════════════════════════
function setupImageUpload() {
    const zone  = document.getElementById("uploadZone");
    const input = document.getElementById("imageInput");
    if (!zone || !input) return;

    zone.addEventListener("dragover",  e => { e.preventDefault(); zone.classList.add("dragover"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
    zone.addEventListener("drop", e => {
        e.preventDefault();
        zone.classList.remove("dragover");
        handleImageFiles([...e.dataTransfer.files]);
    });
    input.addEventListener("change", () => {
        handleImageFiles([...input.files]);
        input.value = "";
    });
}

function handleImageFiles(files) {
    const ALLOWED   = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const MAX_SIZE  = 5 * 1024 * 1024; // 5MB
    const MAX_COUNT = 6;

    files.forEach(file => {
        if (!ALLOWED.includes(file.type)) {
            return Notiflix.Notify.warning(`"${file.name}" is not a supported image type.`, { position: "center-top" });
        }
        if (file.size > MAX_SIZE) {
            return Notiflix.Notify.warning(`"${file.name}" exceeds 5MB limit.`, { position: "center-top" });
        }
        if (uploadedImages.length >= MAX_COUNT) {
            return Notiflix.Notify.warning(`Maximum ${MAX_COUNT} images allowed.`, { position: "center-top" });
        }
        uploadedImages.push(file);
    });

    renderImagePreviews();
    updateChecklist();
}

function renderImagePreviews() {
    const grid = document.getElementById("imagePreviewGrid");
    if (!grid) return;

    if (uploadedImages.length === 0) {
        grid.style.display = "none";
        grid.innerHTML     = "";
        return;
    }

    grid.style.display = "grid";
    grid.innerHTML     = "";

    uploadedImages.forEach((file, index) => {
        const url   = URL.createObjectURL(file);
        const thumb = document.createElement("div");
        thumb.className = "ap-image-thumb";
        thumb.innerHTML = `
            <img src="${url}" alt="preview ${index + 1}">
            ${index === 0
            ? `<span style="position:absolute;bottom:4px;left:4px;
                               background:var(--accent-color);color:#fff;
                               font-size:9px;font-weight:700;padding:2px 6px;
                               border-radius:4px;letter-spacing:0.3px;">MAIN</span>`
            : ""}
            <button class="ap-image-thumb-remove"
                    onclick="removeImage(${index})" type="button" title="Remove">
                <i class="bi bi-x"></i>
            </button>`;
        grid.appendChild(thumb);
    });
}

function removeImage(index) {
    uploadedImages.splice(index, 1);
    renderImagePreviews();
    updateChecklist();
}

function initializeQuillEditor() {

    quill = new Quill('#quillEditor', {
        theme: 'snow',
        placeholder: 'Describe the product — material, fit, occasion, care instructions...',
        modules: {
            toolbar: [
                [{ header: [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ list: 'ordered' }, { list: 'bullet' }],
                ['link'],
                ['clean']
            ]
        }
    });

    quill.on('text-change', () => {

        const text = quill.getText().trim();
        const count = text.length;

        const counter = document.getElementById("descCharCount");

        counter.innerText = `${count}/1000`;

        if (count > 900) {
            counter.style.color = "red";
        } else {
            counter.style.color = "";
        }
    });
}

//addStockRow
function addStockRow() {
    const tbody = document.getElementById("stockTableBody");
    if (!tbody) return;

    const rowId = ++stockRowCounter;

    const sizeOptions = allSizes.map(s =>
        `<option value="${s.id}">${s.name}</option>`
    ).join("");

    const discountOptions =
        `<option value="">— No Discount —</option>` +
        allDiscounts.map(d =>
            `<option value="${d.id}">${d.couponCode} (${d.value}% off)</option>`
        ).join("");

    const tr = document.createElement("tr");
    tr.id    = `stockRow_${rowId}`;
    tr.innerHTML = `
        <td>
            <select class="form-select" id="size_${rowId}">
                <option value="">Select size</option>
                ${sizeOptions}
            </select>
        </td>
        <td>
            <input type="number" class="form-control" id="price_${rowId}"
                   placeholder="0.00" min="0" step="0.01">
        </td>
        <td>
            <input type="number" class="form-control" id="qty_${rowId}"
                   placeholder="0" min="0">
        </td>
        <td>
            <select class="form-select" id="discount_${rowId}">
                ${discountOptions}
            </select>
        </td>
        <td class="text-center">
            <button type="button" class="btn btn-sm btn-outline-danger"
                    onclick="removeStockRow(${rowId})"
                    style="width:30px;height:30px;padding:0;border-radius:6px;">
                <i class="bi bi-trash"></i>
            </button>
        </td>`;

    tbody.appendChild(tr);
    tr.addEventListener("change", updateChecklist);
    tr.addEventListener("input",  updateChecklist);
    updateChecklist();
}

function removeStockRow(rowId) {
    document.getElementById(`stockRow_${rowId}`)?.remove();
    updateChecklist();
}

//Data collect
function collectFormData() {

    const title    = getVal("titleInput");
    const catId    = getVal("categorySelect");
    const subcatId = getVal("subcategorySelect");
    const brandId  = getVal("brandSelect");
    const colorId  = getVal("colorSelect");
    const genderId = getVal("genderSelect");
    // const desc     = getVal("descriptionInput");
    const plainText = quill.getText().trim();
    const desc = plainText.length === 0
        ? ""
        : quill.root.innerHTML;

    const productDetails = buildProductDetails();

    //Stock rows
    const stockList = [];
    let stockValid  = true;

    document.querySelectorAll("#stockTableBody tr").forEach(row => {
        const id = row.id.replace("stockRow_", "");
        const sizeId   = getVal(`size_${id}`);
        const price    = parseFloat(getVal(`price_${id}`));
        const qty      = parseInt(getVal(`qty_${id}`));
        const discount = getVal(`discount_${id}`);

        if (!sizeId || isNaN(price) || price < 0 || isNaN(qty) || qty < 0) {
            stockValid = false;
            return;
        }
        stockList.push({
            sizeId:     parseInt(sizeId),
            price,
            quantity:   qty,
            discountId: discount ? parseInt(discount) : null
        });
    });

    return { title, catId, subcatId, brandId, colorId, genderId,
        desc, productDetails, stockList, stockValid };
}

function buildProductDetails() {
    const details = {};

    // Material & Fabric
    const fabric          = getVal("fabricSelect");
    const material        = getVal("materialSelect");
    const stretchability  = getVal("stretchSelect");
    const thickness       = getVal("thicknessSelect");

    // Dimensions & Style
    const fitType         = getVal("fitTypeSelect");
    const chestSize       = getVal("chestSizeSelect");
    const waistSize       = getVal("waistSizeSelect");
    const neckType        = getVal("neckTypeSelect");
    const pattern         = getVal("patternSelect");

    // Additional Features
    const season          = getVal("seasonSelect");
    const washing         = getVal("washingInput");
    const ironing         = getVal("ironingInput");
    const specialCare     = getVal("specialCareInput");

    if (fabric)         details.fabric        = fabric;
    if (material)       details.material      = material;
    if (stretchability) details.stretchability = stretchability;
    if (thickness)      details.thickness     = thickness;
    if (fitType)        details.fitType       = fitType;
    if (chestSize)      details.chestSize     = chestSize;
    if (waistSize)      details.waistSize     = waistSize;
    if (neckType)       details.neckType      = neckType;
    if (pattern)        details.pattern       = pattern;
    if (season)         details.season        = season;
    if (washing)        details.washing       = washing;
    if (ironing)        details.ironing       = ironing;
    if (specialCare)    details.specialCare   = specialCare;

    return details;
}

function clearQuillContent() {
    quill.setText('');
}

async function saveProduct(asDraft = false) {

    const {
        title, catId, subcatId, brandId, colorId, genderId,
        desc, productDetails, stockList, stockValid
    } = collectFormData();

    // Validate
    if (!title)    return showError("Product title is required!");
    if (!catId)    return showError("Please select a category!");
    if (!subcatId) return showError("Please select a subcategory!");
    if (!brandId)  return showError("Please select a brand!");
    if (!colorId)  return showError("Please select a color!");
    if (!genderId) return showError("Please select a gender!");
    if (!desc || desc === "<p><br></p>") return showError("Please enter product description!");

    if (!asDraft) {
        if (uploadedImages.length === 0)
            return showError("Please upload at least one product image!");
        if (stockList.length === 0)
            return showError("Please add at least one size/stock entry!");
        if (!stockValid)
            return showError("Please complete all Size, Price and Quantity fields!");
    }

    const statusValue = asDraft ? "INACTIVE" : (getVal("statusSelect") || "ACTIVE");

    // Build JSON payload
    const productJson = JSON.stringify({
        title,
        description:    desc,
        categoryId:     parseInt(catId),
        subCategoryId: parseInt(subcatId),
        brandId:        parseInt(brandId),
        colorId:        parseInt(colorId),
        genderId:       parseInt(genderId),
        status:         statusValue,
        productDetails: Object.keys(productDetails).length > 0 ? productDetails : null,
        stockDTOList: stockList
    });

    // Build FormData
    // IMPORTANT: Do NOT manually set Content-Type header
    // The browser will set: multipart/form-data; boundary=----XYZ automatically
    const formData = new FormData();
    formData.append("product", productJson);          // JSON string part
    uploadedImages.forEach(file => {
        formData.append("images", file);              // image file parts
    });

    try {
        Notiflix.Loading.pulse(
            asDraft ? "Saving draft..." : "Publishing product...",
            { svgColor: "#6c5ce7" }
        );

        const res = await fetch("api/admin/products", {
            method: "POST",
            body:   formData
            // No Content-Type header — browser sets it automatically with boundary
        });

        if (!res.ok) {
            Notiflix.Notify.failure("Server error! Please try again.", { position: "center-top" });
            return;
        }

        const data = await res.json();

        if (data.status) {
            Notiflix.Report.success(
                asDraft ? "Draft Saved!" : "Product Published!",
                data.message,
                "Go to Products",
                () => window.location.href = "admin-products.html"
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

function saveDraft() {
    saveProduct(true);
}

function updateChecklist() {
    const checks = {
        chk_title: getVal("titleInput").length   > 0,
        chk_cat:   getVal("categorySelect")      !== "",
        chk_img:   uploadedImages.length         > 0,
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
function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
}

function showError(msg) {
    Notiflix.Notify.failure(msg, { position: "center-top" });
}