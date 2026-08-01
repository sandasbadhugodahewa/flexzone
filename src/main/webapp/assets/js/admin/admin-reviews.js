let currentFilter = "all";
let searchTimeout = null;
let _allReviews   = [];

const STATUS_MAP = {
    all:      { db: "all",      label: "All"      },
    pending:  { db: "PENDING",  label: "Pending"  },
    approved: { db: "ACTIVE",   label: "Approved" },
    rejected: { db: "INACTIVE", label: "Rejected" },
    flagged:  { db: "BLOCKED",  label: "Flagged"  }
};

const STATUS_BADGE = {
    PENDING:  { cls: "badge-soft-warning",   label: "Pending"  },
    ACTIVE:   { cls: "badge-soft-success",   label: "Approved" },
    INACTIVE: { cls: "badge-soft-secondary", label: "Rejected" },
    BLOCKED:  { cls: "badge-soft-danger",    label: "Flagged"  }
};

function loadReviews() {
    wireFilterTabs();
    wireSearch();
    wireRatingFilter();
    fetchReviews();
}

function wireFilterTabs() {
    document.querySelectorAll(".reviews-filter-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".reviews-filter-tab")
                .forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.dataset.filter;
            fetchReviews();
        });
    });
}

function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll(".reviews-filter-tab").forEach(b => {
        b.classList.toggle("active", b.dataset.filter === filter);
    });
    fetchReviews();
}

function wireSearch() {
    const input = document.getElementById("reviewSearchInput");
    if (!input) return;
    input.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(fetchReviews, 380);
    });
}

function wireRatingFilter() {
    const sel = document.getElementById("ratingFilterSelect");
    if (!sel) return;
    sel.addEventListener("change", fetchReviews);
}

async function fetchReviews() {
    const dbStatus = STATUS_MAP[currentFilter]?.db || "all";
    const search   = document.getElementById("reviewSearchInput")?.value.trim() || "";
    const rating   = parseInt(document.getElementById("ratingFilterSelect")?.value || "0");

    try {
        Notiflix.Loading.pulse("Loading reviews...", { svgColor: "#6c5ce7" });

        const url = `api/reviews/admin?status=${dbStatus}&search=${encodeURIComponent(search)}&rating=${rating}`;
        const res  = await fetch(url);
        const data = await res.json();

        if (!data.status) {
            Notiflix.Notify.failure(data.message, { position: "center-top" });
            return;
        }

        _allReviews = data.reviews || [];
        renderKpi(data.kpi);
        renderTable(_allReviews);

    } catch (e) {
        Notiflix.Notify.failure(e.message, { position: "center-top" });
    } finally {
        Notiflix.Loading.remove();
    }
}

//Render cards
function renderKpi(kpi) {
    if (!kpi) return;
    setText("kpiTotal",     kpi.totalAll    ?? "—");
    setText("kpiPending",   kpi.totalPending ?? "—");
    setText("kpiFlagged",   kpi.totalFlagged ?? "—");

    const avgEl = document.getElementById("kpiAvgRating");
    if (avgEl) avgEl.innerHTML =
        `${kpi.avgRating ?? "0"} <small style="font-size:0.8125rem;color:var(--muted-color);font-weight:500;">/ 5</small>`;
}

//Render table
function renderTable(reviews) {
    const tbody = document.getElementById("reviewsTableBody");
    if (!tbody) return;

    const countText = document.getElementById("reviewsCountText");
    if (countText) countText.textContent = `Showing ${reviews.length} review${reviews.length !== 1 ? "s" : ""}`;

    if (reviews.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <i class="bi bi-chat-square-text"
                       style="font-size:36px;color:#d1d5db;display:block;margin-bottom:10px;"></i>
                    <strong style="font-size:15px;">No reviews found</strong>
                    <p style="font-size:13px;color:#9ca3af;margin-top:4px;">
                        Try changing filters or search terms.
                    </p>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = reviews.map(r => buildRow(r)).join("");
}

//Build a table row
function buildRow(r) {
    const badge = STATUS_BADGE[r.status] || { cls: "badge-soft-secondary", label: r.status };
    const stars = renderStars(r.rating);

    const parts    = (r.customerName || "").split(" ");
    const initials = ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();

    const img = r.productImage
        ? `assets/images/productImg/${r.productImage}`
        : `assets/images/default.png`;

    const comment = r.review || r.reviewTitle || "—";

    return `
    <tr>
        <td>
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:34px;height:34px;border-radius:50%;flex-shrink:0;
                            background:color-mix(in srgb,var(--accent-color),transparent 82%);
                            color:var(--accent-color);display:flex;align-items:center;
                            justify-content:center;font-size:12px;font-weight:700;">
                    ${initials}
                </div>
                <div>
                    <div style="font-weight:600;font-size:13px;">${r.customerName}</div>
                    <div style="font-size:11px;color:var(--muted-color);">${r.customerEmail || ""}</div>
                </div>
            </div>
        </td>
        <td>
            <div class="review-product-cell">
                <img src="${img}"
                     alt="${r.productName}"
                     onerror="this.src='assets/images/default.png'">
                <div style="font-size:13px;font-weight:600;
                            white-space:nowrap;overflow:hidden;
                            text-overflow:ellipsis;max-width:140px;">
                    ${r.productName}
                </div>
            </div>
        </td>
        <td>
            <div style="display:flex;gap:2px;color:#f59e0b;font-size:13px;">
                ${stars}
            </div>
            <div style="font-size:11px;color:var(--muted-color);margin-top:2px;">
                ${r.rating}/5
            </div>
        </td>
        <td>
            <div class="review-comment-cell">${comment}</div>
        </td>
        <td style="font-size:12px;color:var(--muted-color);white-space:nowrap;">
            ${r.createdAt}
        </td>
        <td>
            <span class="badge ${badge.cls}">${badge.label}</span>
        </td>
        <td class="text-end">
            <div style="display:flex;gap:6px;justify-content:flex-end;">
                <button class="btn btn-sm btn-outline-secondary"
                        style="padding:4px 9px;"
                        title="View & Edit"
                        onclick="openReviewModal(${r.id})">
                    <i class="bi bi-eye"></i>
                </button>
                <div class="dropdown d-inline-block">
                    <button class="btn btn-sm btn-outline-secondary dropdown-toggle"
                            style="padding:4px 9px;"
                            data-bs-toggle="dropdown"
                            title="Quick status">
                        <i class="bi bi-three-dots"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end"
                        style="font-size:13px;min-width:150px;">
                        <li class="dropdown-header"
                            style="font-size:11px;font-weight:700;
                                   text-transform:uppercase;color:var(--muted-color);">
                            Change Status
                        </li>
                        <li><a class="dropdown-item" href="#"
                               onclick="quickStatus(${r.id},'ACTIVE');return false;">
                            <i class="bi bi-check-circle me-2 text-success"></i>Approve
                        </a></li>
                        <li><a class="dropdown-item" href="#"
                               onclick="quickStatus(${r.id},'PENDING');return false;">
                            <i class="bi bi-clock me-2 text-warning"></i>Pending
                        </a></li>
                        <li><a class="dropdown-item" href="#"
                               onclick="quickStatus(${r.id},'INACTIVE');return false;">
                            <i class="bi bi-dash-circle me-2 text-secondary"></i>Reject
                        </a></li>
                        <li><a class="dropdown-item" href="#"
                               onclick="quickStatus(${r.id},'BLOCKED');return false;">
                            <i class="bi bi-flag me-2 text-danger"></i>Flag
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="#"
                               onclick="deleteReview(${r.id});return false;">
                            <i class="bi bi-trash me-2"></i>Delete
                        </a></li>
                    </ul>
                </div>
            </div>
        </td>
    </tr>`;
}

//Open review model
function openReviewModal(reviewId) {
    const r = _allReviews.find(x => x.id === reviewId);
    if (!r) return;

    document.getElementById("reviewModalId").value          = r.id;
    document.getElementById("reviewModalName").textContent  = r.customerName;
    document.getElementById("reviewModalMeta").textContent  = `${r.createdAt} · ${r.rating}/5 stars`;
    document.getElementById("reviewModalComment").textContent = r.review || r.reviewTitle || "—";
    document.getElementById("reviewModalProductName").textContent = r.productName;
    document.getElementById("reviewModalStatus").value      = dbToTab(r.status);

    document.getElementById("reviewModalStars").innerHTML =
        `<span style="color:#f59e0b;font-size:16px;">${renderStars(r.rating)}</span>`;

    const imgSrc = r.productImage
        ? `assets/images/productImg/${r.productImage}`
        : `assets/images/default.png`;
    document.getElementById("reviewModalProductImg").src = imgSrc;

    const parts    = r.customerName.split(" ");
    const initials = ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
    const avatar   = document.getElementById("reviewModalAvatar");
    if (avatar) {
        avatar.style.cssText = `width:36px;height:36px;border-radius:50%;flex-shrink:0;
            background:color-mix(in srgb,var(--accent-color),transparent 82%);
            color:var(--accent-color);display:flex;align-items:center;
            justify-content:center;font-size:12px;font-weight:700;`;
        avatar.src = "";
        avatar.alt = initials;

        const div = document.createElement("div");
        div.style.cssText = avatar.style.cssText;
        div.textContent = initials;
        avatar.replaceWith(div);
        div.id = "reviewModalAvatar";
    }

    new bootstrap.Modal(document.getElementById("reviewModal")).show();
}

//Save from modal
async function saveReviewModal() {
    const id        = parseInt(document.getElementById("reviewModalId").value);
    const tabStatus = document.getElementById("reviewModalStatus").value;
    const dbStatus  = tabToDb(tabStatus);

    await quickStatus(id, dbStatus);
    bootstrap.Modal.getInstance(document.getElementById("reviewModal"))?.hide();
}

//Delete from modal
async function deleteReviewFromModal() {
    const id = parseInt(document.getElementById("reviewModalId").value);
    bootstrap.Modal.getInstance(document.getElementById("reviewModal"))?.hide();
    await deleteReview(id);
}

//status change
async function quickStatus(reviewId, dbStatus) {
    try {
        Notiflix.Loading.pulse("Updating...", { svgColor: "#6c5ce7" });

        const res  = await fetch(`api/reviews/admin/${reviewId}/status`, {
            method:  "PUT",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ status: dbStatus })
        });
        const data = await res.json();

        if (data.status) {
            Notiflix.Notify.success(data.message, { position: "center-top" });
            fetchReviews(); // reload table
        } else {
            Notiflix.Notify.failure(data.message, { position: "center-top" });
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, { position: "center-top" });
    } finally {
        Notiflix.Loading.remove();
    }
}

//Delete review
async function deleteReview(reviewId) {
    Notiflix.Confirm.show(
        "Delete Review",
        "Are you sure you want to permanently delete this review?",
        "Delete", "Cancel",
        async () => {
            try {
                Notiflix.Loading.pulse("Deleting...", { svgColor: "#dc2626" });
                const res  = await fetch(`api/reviews/admin/${reviewId}`, { method: "DELETE" });
                const data = await res.json();
                if (data.status) {
                    Notiflix.Notify.success(data.message, { position: "center-top" });
                    fetchReviews();
                } else {
                    Notiflix.Notify.failure(data.message, { position: "center-top" });
                }
            } catch (e) {
                Notiflix.Notify.failure(e.message, { position: "center-top" });
            } finally {
                Notiflix.Loading.remove();
            }
        }
    );
}

function renderStars(rating) {
    let html = "";
    for (let i = 1; i <= 5; i++) {
        html += `<i class="bi ${i <= rating ? "bi-star-fill" : "bi-star"}"></i>`;
    }
    return html;
}

function tabToDb(tab) {
    return { approved: "ACTIVE", pending: "PENDING",
        rejected: "INACTIVE", flagged: "BLOCKED" }[tab] || tab;
}

function dbToTab(db) {
    return { ACTIVE: "approved", PENDING: "pending",
        INACTIVE: "rejected", BLOCKED: "flagged" }[db] || "pending";
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}