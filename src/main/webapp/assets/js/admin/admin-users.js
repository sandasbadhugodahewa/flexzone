let currentPage   = 0;
let currentFilter = "all";
let currentSearch = "";
let searchTimeout = null;
let totalCount    = 0;
const PAGE_SIZE   = 8;

window.addEventListener("load", async () => {
    try {
        await loadUserList();
        wireSearchInput();
        wireFilterTabs();
        wireSelectAll();
    } finally {
        Notiflix.Loading.remove();
    }
});

async function loadUserList() {
    Notiflix.Loading.pulse("Loading users...", {
        clickToClose: false,
        svgColor: "#0284c7"
    });

    try {
        const url = `api/admin/users?filter=${currentFilter}&search=${encodeURIComponent(currentSearch)}&page=${currentPage}`;
        const res  = await fetch(url);

        if (!res.ok) {
            Notiflix.Notify.failure("Failed to load users!", { position: "center-top" });
            return;
        }

        const data = await res.json();

        if (!data.status) {
            Notiflix.Notify.failure(data.message, { position: "center-top" });
            return;
        }

        totalCount = data.totalCount;

        renderTableBody(data.users);
        renderPagination(data.totalCount, data.currentPage);
        updateTabCounts(data);
        updatePaginationInfo(data.totalCount, data.currentPage);

    } catch (e) {
        Notiflix.Notify.failure(e.message, { position: "center-top" });
    } finally {
        Notiflix.Loading.remove(500);
    }
}

function renderTableBody(users) {
    const tbody = document.querySelector("table tbody");
    if (!tbody) return;

    if (!users || users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <div style="color:#6c757d;">
                        <i class="bi bi-people" style="font-size:40px;display:block;margin-bottom:12px;"></i>
                        <strong>No users found</strong>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = users.map(u => buildUserRow(u)).join("");
}

function buildUserRow(u) {
    const initials = (u.firstName.charAt(0) + u.lastName.charAt(0)).toUpperCase();

    const statusMap = {
        "VERIFIED": { cls: "badge-soft-success", label: "Active" },
        "PENDING":  { cls: "badge-soft-warning", label: "Pending" },
        "BLOCKED":  { cls: "badge-soft-danger",  label: "Blocked" },
        "ACTIVE":   { cls: "badge-soft-success", label: "Active" },
    };
    const s = statusMap[u.status] || { cls: "badge-soft-secondary", label: u.status };

    const roleMap = {
        "ADMIN": { cls: "badge-soft-primary", label: "Admin" },
        "USER":  { cls: "badge-soft-info",    label: "User" },
    };
    const r = roleMap[u.role] || { cls: "badge-soft-secondary", label: u.role };

    const isAdmin   = u.role === "ADMIN";
    const isBlocked = u.status === "BLOCKED";

    return `
    <tr data-user-id="${u.id}">
        <td>
            <div class="form-check">
                <input class="form-check-input row-check" type="checkbox" value="${u.id}">
            </div>
        </td>
        <td>
            <div class="table-user">
                <div class="table-user-avatar-initials"
                     style="width:36px;height:36px;border-radius:50%;
                            background:color-mix(in srgb,var(--accent-color),transparent 85%);
                            color:var(--accent-color);font-weight:700;font-size:13px;
                            display:inline-flex;align-items:center;justify-content:center;
                            margin-right:10px;flex-shrink:0;">
                    ${initials}
                </div>
                <div style="display:inline-block;vertical-align:middle;">
                    <div class="table-user-name fw-semibold">${u.firstName} ${u.lastName}</div>
                    <div style="font-size:12px;color:#6c757d;">${u.email} <i class="bi bi-clipboard" style="cursor:pointer; margin-left:8px;" onclick="copyEmail(u.email)"></i></div>
                </div>
            </div>
        </td>
        <td><span class="badge ${r.cls}">${r.label}</span></td>
        <td><span class="badge ${s.cls}">${s.label}</span></td>
        <td style="font-size:13px;">${u.mobile}</td>
        <td style="font-size:13px;color:#6c757d;">${u.joinedAt}</td>
        <td>
            <div class="dropdown">
                <button class="btn btn-sm btn-outline-secondary dropdown-toggle"
                        data-bs-toggle="dropdown" style="border-radius:6px;">
                    <i class="bi bi-three-dots"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li>
                        <a class="dropdown-item" href="admin-user-edit.html?userId=${u.id}" title="Edit">
                            <i class="bi bi-pencil me-2"></i>Edit User
                        </a>
                    </li>
                    <li><a class="dropdown-item" href="#"><i class="bi bi-envelope me-2"></i> Send Email</a></li>
                    <li><hr class="dropdown-divider"></li>
                    ${!isBlocked ? `
                    <li>
                        <a class="dropdown-item text-danger" href="#"
                           onclick="blockUser(${u.id}); return false;">
                            <i class="bi bi-slash-circle me-2"></i>Block User
                        </a>
                    </li>` : `
                    <li>
                        <a class="dropdown-item text-success" href="#"
                           onclick="unblockUser(${u.id}); return false;">
                            <i class="bi bi-check-circle me-2"></i>Activate User
                        </a>
                    </li>`}

                </ul>
            </div>
        </td>
    </tr>`;
}

function copyEmail(email) {
    navigator.clipboard.writeText(email);
    Notiflix.Notify.success("copied!", {position: "right-top"});
}

//PAGINATION
function renderPagination(totalCount, page) {
    const nav        = document.querySelector(".users-pagination nav ul");
    if (!nav) return;

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    if (totalPages <= 1) {
        nav.closest(".users-pagination").querySelector("nav").style.display = "none";
        return;
    }

    nav.closest(".users-pagination").querySelector("nav").style.display = "";
    nav.innerHTML = "";

    // ── Prev ──
    const prevLi = document.createElement("li");
    prevLi.className = `page-item ${page === 0 ? "disabled" : ""}`;
    prevLi.innerHTML = `<a class="page-link" href="#"><i class="bi bi-chevron-left"></i></a>`;
    prevLi.addEventListener("click", e => {
        e.preventDefault();
        if (page > 0) { currentPage--; loadUserList(); }
    });
    nav.appendChild(prevLi);

    // ── Smart page range ──
    let start = Math.max(0, page - 1);
    let end   = Math.min(totalPages - 1, page + 1);

    if (start > 0) {
        addPageItem(nav, 0, page);
        if (start > 1) addDots(nav);
    }

    for (let i = start; i <= end; i++) {
        addPageItem(nav, i, page);
    }

    if (end < totalPages - 1) {
        if (end < totalPages - 2) addDots(nav);
        addPageItem(nav, totalPages - 1, page);
    }

    // ── Next ──
    const nextLi = document.createElement("li");
    nextLi.className = `page-item ${page === totalPages - 1 ? "disabled" : ""}`;
    nextLi.innerHTML = `<a class="page-link" href="#"><i class="bi bi-chevron-right"></i></a>`;
    nextLi.addEventListener("click", e => {
        e.preventDefault();
        if (page < totalPages - 1) { currentPage++; loadUserList(); }
    });
    nav.appendChild(nextLi);
}

function addPageItem(nav, i, currentPageIndex) {
    const li = document.createElement("li");
    li.className = `page-item ${i === currentPageIndex ? "active" : ""}`;
    li.innerHTML = `<a class="page-link" href="#">${i + 1}</a>`;
    li.addEventListener("click", e => {
        e.preventDefault();
        currentPage = i;
        loadUserList();
    });
    nav.appendChild(li);
}

function addDots(nav) {
    const li = document.createElement("li");
    li.className = "page-item disabled";
    li.innerHTML = `<a class="page-link" href="#">...</a>`;
    nav.appendChild(li);
}

function updatePaginationInfo(totalCount, page) {
    const infoEl = document.querySelector(".users-pagination-info");
    if (!infoEl) return;
    const start = page * PAGE_SIZE + 1;
    const end   = Math.min((page + 1) * PAGE_SIZE, totalCount);
    infoEl.innerHTML = `Showing <strong>${totalCount === 0 ? 0 : start}–${end}</strong> of <strong>${totalCount}</strong> users`;
}


// ─────────────────────────────────────────────
//  FILTER TABS
// ─────────────────────────────────────────────
function wireFilterTabs() {
    document.querySelectorAll(".users-filter-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".users-filter-tab")
                .forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.getAttribute("data-filter");
            currentPage   = 0;
            loadUserList();
        });
    });
}

function updateTabCounts(data) {
    const tabs = document.querySelectorAll(".users-filter-tab");
    tabs.forEach(tab => {
        const filter    = tab.getAttribute("data-filter");
        const countSpan = tab.querySelector(".users-filter-count");
        if (!countSpan) return;
        if (filter === "all")      countSpan.textContent = data.totalAll;
        if (filter === "active")   countSpan.textContent = data.totalVerified;
        if (filter === "pending")  countSpan.textContent = data.totalPending;
        if (filter === "inactive") countSpan.textContent = data.totalBlocked;
    });

    // Also update stat cards
    const totalEl    = document.getElementById("totalUsers");
    const activeEl   = document.getElementById("activeUsers");
    const blockEl    = document.getElementById("blockUsers");
    const inactiveEl = document.getElementById("inactiveUsers");

    if (totalEl)    totalEl.textContent    = data.totalAll;
    if (activeEl)   activeEl.textContent   = data.totalVerified;
    if (blockEl)    blockEl.textContent    = data.totalBlocked;
    if (inactiveEl) inactiveEl.textContent = data.totalPending;
}


// ─────────────────────────────────────────────
//  SEARCH
// ─────────────────────────────────────────────
function wireSearchInput() {
    const searchInput = document.querySelector(".users-search input");
    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = searchInput.value.trim();
            currentPage   = 0;
            loadUserList();
        }, 400);
    });
}


// ─────────────────────────────────────────────
//  SELECT ALL CHECKBOX
// ─────────────────────────────────────────────
function wireSelectAll() {
    const selectAll = document.getElementById("selectAll");
    if (!selectAll) return;
    selectAll.addEventListener("change", () => {
        document.querySelectorAll(".row-check")
            .forEach(cb => cb.checked = selectAll.checked);
    });
}

function blockUser(userId) {
    Notiflix.Confirm.show(
        "Block User",
        "Are you sure you want to block this user?",
        "Block",
        "Cancel",
        async () => {
            try {
                Notiflix.Loading.pulse("Blocking...", { svgColor: "#0284c7" });
                const res  = await fetch(`api/admin/users/${userId}/block`, { method: "PUT" });
                const data = await res.json();
                if (data.status) {
                    Notiflix.Notify.success(data.message, { position: "center-top" });
                    await loadUserList();
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

function unblockUser(userId) {
    Notiflix.Confirm.show(
        "Activate User",
        "Are you sure you want to activate this user?",
        "Activate",
        "Cancel",
        async () => {
            try {
                Notiflix.Loading.pulse("Activating...", { svgColor: "#0284c7" });
                const res  = await fetch(`api/admin/users/${userId}/unblock`, { method: "PUT" });
                const data = await res.json();
                if (data.status) {
                    Notiflix.Notify.success(data.message, { position: "center-top" });
                    await loadUserList();
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

// function makeAdmin(userId) {
//     Notiflix.Confirm.show(
//         "Promote to Admin",
//         "This user will have full admin access. Continue?",
//         "Promote",
//         "Cancel",
//         async () => {
//             try {
//                 Notiflix.Loading.pulse("Promoting...", { svgColor: "#0284c7" });
//                 const res  = await fetch(`api/admin/users/${userId}/make-admin`, { method: "PUT" });
//                 const data = await res.json();
//                 if (data.status) {
//                     Notiflix.Notify.success(data.message, { position: "center-top" });
//                     await loadUserList();
//                 } else {
//                     Notiflix.Notify.failure(data.message, { position: "center-top" });
//                 }
//             } catch (e) {
//                 Notiflix.Notify.failure(e.message, { position: "center-top" });
//             } finally {
//                 Notiflix.Loading.remove();
//             }
//         }
//     );
// }
//
// function deleteUser(userId) {
//     Notiflix.Confirm.show(
//         "Delete User",
//         "This action cannot be undone. Are you sure?",
//         "Delete",
//         "Cancel",
//         async () => {
//             try {
//                 Notiflix.Loading.pulse("Deleting...", { svgColor: "#0284c7" });
//                 const res  = await fetch(`api/admin/users/${userId}`, { method: "DELETE" });
//                 const data = await res.json();
//                 if (data.status) {
//                     Notiflix.Notify.success(data.message, { position: "center-top" });
//                     await loadUserList();
//                 } else {
//                     Notiflix.Notify.failure(data.message, { position: "center-top" });
//                 }
//             } catch (e) {
//                 Notiflix.Notify.failure(e.message, { position: "center-top" });
//             } finally {
//                 Notiflix.Loading.remove();
//             }
//         },
//         { okButtonBackground: "#dc3545" }
//     );
// }


