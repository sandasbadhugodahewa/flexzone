let currentUserId = null;

window.addEventListener("load", async () => {
    const params = new URLSearchParams(window.location.search);
    currentUserId = parseInt(params.get("userId"));

    if (!currentUserId) {
        Notiflix.Notify.failure("No user ID provided!", {position: "center-top"});
        setTimeout(() => window.location.href = "admin-users.html", 1500);
        return;
    }

    await loadUser();
});

async function loadUser() {
    try {
        Notiflix.Loading.pulse("Loading user...", {svgColor: "#0284c7"});

        const res = await fetch(`api/admin/users/${currentUserId}`);
        const data = await res.json();

        if (!data.status) {
            Notiflix.Notify.failure(data.message, {position: "center-top"});
            return;
        }

        const u = data.user;
        if (u.status === "INACTIVE") {

            let roleContainer = document.getElementById("roleSection");

            if (roleContainer) {
                roleContainer.innerHTML = `
            <div class="text-center py-1">
                <i class="bi bi-person-x" style="font-size:40px;color:#dc3545;"></i>
                <h5 class="mt-3">User no longer exists</h5>
                <p class="text-muted">This account may have been deleted.</p>
            </div>
        `;
            }
            document.getElementById("passwordSection")?.classList.add("d-none");
            document.getElementById("savebtn")?.setAttribute("disabled", true);
            document.getElementById("deleteBtn")?.setAttribute("disabled", true);
        }

        //Personal info
        setVal("firstName", u.firstName);
        setVal("lastName", u.lastName);
        setVal("emailField", u.email);
        setVal("mobileField", u.mobile);

        //Role
        setVal("roleSelect", u.role);
        setVal("statusSelect", u.status);

        updateStatusCard(u);

        //breadcrumb ──
        const fullName = `${u.firstName} ${u.lastName}`;
        const nameEl = document.getElementById("userFullName");
        if (nameEl) nameEl.textContent = fullName;

        const deleteNameEl = document.getElementById("deleteUserName");
        if (deleteNameEl) deleteNameEl.textContent = fullName;

        await renderAddresses(u.addresses);

    } catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    } finally {
        Notiflix.Loading.remove();
    }
}

function updateStatusCard(u) {
    const statusMap = {
        "VERIFIED": { cls: "active",   dot: "#198754", label: "Active" },
        "PENDING":  { cls: "pending",  dot: "#f59e0b", label: "Pending" },
        "BLOCKED":  { cls: "inactive", dot: "#dc3545", label: "Blocked" },
    };
    const s = statusMap[u.status] || { cls: "inactive", dot: "#dc3545", label: u.status };

    const statusBadge = document.getElementById("statusBadge");
    if (statusBadge) {
        statusBadge.className = `users-status ${s.cls}`;
        statusBadge.innerHTML = `<span class="users-status-dot"></span> ${s.label}`;
    }

    //Role
    const roleMap = {
        "ADMIN": { cls: "admin", icon: "bi-shield-check", label: "Admin" },
        "USER":  { cls: "user",  icon: "bi-person",       label: "User" },
    };
    const r = roleMap[u.role] || { cls: "user", icon: "bi-person", label: u.role };

    const roleBadge = document.getElementById("roleBadge");
    if (roleBadge) {
        roleBadge.className = `users-role ${r.cls}`;
        roleBadge.innerHTML = `<i class="bi ${r.icon}"></i> ${r.label}`;
    }

    //Email Verified
    const emailVerifiedBadge = document.getElementById("emailVerifiedBadge");
    if (emailVerifiedBadge) {
        const isVerified = u.status === "VERIFIED";
        if (isVerified) {
            emailVerifiedBadge.innerHTML = `<i class="bi bi-check-circle-fill"></i> Yes`;
            emailVerifiedBadge.style.color = "#198754";
        } else {
            emailVerifiedBadge.innerHTML = `<i class="bi bi-x-circle-fill"></i> No`;
            emailVerifiedBadge.style.color = "#dc3545";
        }
    }

    const joinedEl  = document.getElementById("joinedDate");
    const updatedEl = document.getElementById("updatedDate");
    if (joinedEl)  joinedEl.textContent  = u.joinedAt  || "—";
    if (updatedEl) updatedEl.textContent = u.updatedAt || "—";
}

async function renderAddresses(addresses) {
    const container = document.getElementById("addressContainer");
    if (!container) return;
    container.innerHTML = "";

    if (!addresses || addresses.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-4" style="color:#9ca3af;">
                <i class="bi bi-geo-alt" style="font-size:32px;display:block;margin-bottom:8px;"></i>
                <p style="font-size:13px;margin:0;">No address on record</p>
            </div>`;
        return;
    }

    addresses.forEach((addr, index) => {
        const label      = `Address ${index + 1}`;
        const primaryBadge = addr.isPrimary
            ? `<span class="badge badge-soft-primary ms-1" style="font-size:10px;vertical-align:middle;">Primary</span>`
            : "";
        const line2 = addr.lineTwo ? addr.lineTwo + ",<br>" : "";
        const copyText = [addr.lineOne, addr.lineTwo, `${addr.city} ${addr.postalCode}`, addr.provinceName]
            .filter(Boolean).join(", ");

        container.innerHTML += `
            <div class="col-md-6">
                <div class="card h-100" style="border:1px solid #e5e7eb;border-radius:10px;">
                    <div class="card-header d-flex justify-content-between align-items-center"
                         style="background:#f9fafb;border-bottom:1px solid #e5e7eb;border-radius:10px 10px 0 0;padding:10px 14px;">
                        <h6 class="mb-0" style="font-size:13px;font-weight:700;">
                            ${label} ${primaryBadge}
                        </h6>
                        <button type="button" class="btn btn-sm btn-outline-secondary"
                                style="padding:2px 8px;font-size:11px;border-radius:6px;"
                                id="copyBtn_${index}"
                                onclick="copyAddress('${copyText.replace(/'/g,"\'")}', ${index})">
                            <i class="bi bi-clipboard"></i> Copy
                        </button>
                    </div>
                    <div class="card-body" style="padding:14px;">
                        <div style="font-size:13px;line-height:1.8;color:#374151;">
                            ${addr.lineOne},<br>
                            ${line2}
                            ${addr.city}, ${addr.postalCode},<br>
                            ${addr.provinceName || ""}
                            <div style="font-size:13px;color:#6b7280;margin-top:8px;">
                               <i class="bi bi-telephone me-1"></i>${addr.mobile}
                            </div>
                        </div>

                    </div>
                </div>
            </div>`;
    });
}

//Copy address to clipboard
function copyAddress(text, index) {
    const btn = document.getElementById(`copyBtn_${index}`);
    navigator.clipboard.writeText(text).then(() => {
        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = `<i class="bi bi-check-lg"></i> Copied!`;
            btn.classList.replace("btn-outline-secondary", "btn-success");
            setTimeout(() => {
                btn.innerHTML = orig;
                btn.classList.replace("btn-success", "btn-outline-secondary");
            }, 2000);
        }
    }).catch(() => {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        Notiflix.Notify.success("Address copied!", { position: "center-top" });
    });
}


async function saveUserChanges() {
    const firstName = getVal("firstName");
    const lastName = getVal("lastName");
    const roleValue = getVal("roleSelect");
    const statusValue = getVal("statusSelect");
    const newPassword = getVal("newPassword");
    const confirmPassword = getVal("confirmPassword");

    if (!firstName || !lastName) {
        Notiflix.Notify.warning("First name and last name are required!", {position: "center-top"});
        return;
    }

    if (newPassword && newPassword !== confirmPassword) {
        Notiflix.Notify.warning("Passwords do not match!", {position: "center-top"});
        return;
    }

    const payload = {
        firstName,
        lastName,
        roleValue,
        statusValue,
        newPassword: newPassword || null,
        confirmPassword: confirmPassword || null,
    };

    try {
        Notiflix.Loading.pulse("Saving...", {svgColor: "#0284c7"});

        const res = await fetch(`api/admin/users/${currentUserId}`, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.status) {
            Notiflix.Notify.success(data.message, {position: "center-top"});
            await loadUser(); // refresh the page data
        } else {
            Notiflix.Notify.failure(data.message, {position: "center-top"});
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    } finally {
        Notiflix.Loading.remove();
    }
}

//Delete User
async function confirmDeleteUser() {
    try {
        Notiflix.Loading.pulse("Deleting...", {svgColor: "#dc3545"});

        const res = await fetch(`api/admin/users/${currentUserId}`, {method: "DELETE"});
        const data = await res.json();

        if (data.status) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(
                document.getElementById("deleteUserModal")
            );
            if (modal) modal.hide();

            Notiflix.Notify.success(data.message, {position: "center-top"});
            setTimeout(() => window.location.href = "admin-users.html", 1200);
        } else {
            Notiflix.Notify.failure(data.message, {position: "center-top"});
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    } finally {
        Notiflix.Loading.remove();
    }
}


// ─────────────────────────────────────────────
//  QUICK ACTIONS (block/unblock from edit page)
// ─────────────────────────────────────────────
async function quickBlockUser() {
    try {
        Notiflix.Loading.pulse("Blocking...", {svgColor: "#0284c7"});
        const res = await fetch(`api/admin/users/${currentUserId}/block`, {method: "PUT"});
        const data = await res.json();
        if (data.status) {
            Notiflix.Notify.success(data.message, {position: "center-top"});
            await loadUser();
        } else {
            Notiflix.Notify.failure(data.message, {position: "center-top"});
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    } finally {
        Notiflix.Loading.remove();
    }
}

async function quickUnblockUser() {
    try {
        Notiflix.Loading.pulse("Activating...", {svgColor: "#0284c7"});
        const res = await fetch(`api/admin/users/${currentUserId}/unblock`, {method: "PUT"});
        const data = await res.json();
        if (data.status) {
            Notiflix.Notify.success(data.message, {position: "center-top"});
            await loadUser();
        } else {
            Notiflix.Notify.failure(data.message, {position: "center-top"});
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    } finally {
        Notiflix.Loading.remove();
    }
}

function setVal(id, value) {
    const el = document.getElementById(id);
    if (el && value !== null && value !== undefined) el.value = value;
}

function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
}