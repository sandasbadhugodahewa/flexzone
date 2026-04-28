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

        // ── Personal info ──
        setVal("firstName", u.firstName);
        setVal("lastName", u.lastName);
        setVal("emailField", u.email);
        setVal("mobileField", u.mobile);

        // ── Role select ──
        setVal("roleSelect", u.role);
        setVal("statusSelect", u.status);

        // ── Account status card ──
        updateStatusCard(u);

        // ── Page title / breadcrumb ──
        const fullName = `${u.firstName} ${u.lastName}`;
        const nameEl = document.getElementById("userFullName");
        if (nameEl) nameEl.textContent = fullName;

        const deleteNameEl = document.getElementById("deleteUserName");
        if (deleteNameEl) deleteNameEl.textContent = fullName;

        // ── Addresses ──
        await renderAddresses(u.addresses);

    } catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    } finally {
        Notiflix.Loading.remove();
    }
}

function updateStatusCard(u) {
    const statusMap = {
        "VERIFIED": {cls: "active", label: "Active"},
        "PENDING": {cls: "pending", label: "Pending"},
        "BLOCKED": {cls: "inactive", label: "Blocked"},
    };
    const s = statusMap[u.status] || {cls: "inactive", label: u.status};

    const statusEl = document.querySelector(".users-status");
    if (statusEl) {
        statusEl.className = `users-status ${s.cls}`;
        statusEl.innerHTML = `<span class="users-status-dot"></span> ${s.label}`;
    }

    const verifiedEl = document.querySelector(".uv-info-check");
    if (verifiedEl) {
        const isVerified = u.status === "VERIFIED";
        verifiedEl.innerHTML = isVerified
            ? `<i class="bi bi-check-circle-fill text-success"></i> Yes`
            : `<i class="bi bi-x-circle-fill text-danger"></i> No`;
    }

    // Joined / Updated dates
    const infoValues = document.querySelectorAll(".uv-info-value");
    if (infoValues.length >= 2) {
        infoValues[0].textContent = u.joinedAt || "—";
        infoValues[1].textContent = u.updatedAt || "—";
    }
}

async function renderAddresses(addresses) {

    try {
        let container = document.getElementById("addressContainer");
        container.innerHTML = "";

        if (!addresses || addresses.length === 0) {
            let card = `
                       <div class="card-body text-center py-4">
                       <i class="bi bi-geo-alt" style="font-size:28px;color:#d1d5db;"></i>
                       <p style="font-size:13px;color:#9ca3af;margin-top:8px;">No address on record</p>
            `;
            container.innerHTML += card;
        } else {
            addresses.forEach((address, index) => {
                console.log(address);
                let card = `
                                <div class="col-md-6" >
                                    <div class="card h-100 shadow-sm">
                                        <div class="card-header">
                                            <h6 class="mb-0">Address ${index + 1}</h6>
                                            <div style="font-size:12px;color:#6c757d;"><i class="bi bi-clipboard" style="cursor:pointer; margin-left:8px;"></i></div>
                                        </div>
                                        <div class="card-body">
                                            <!-- Address Text -->
                                            <div class="address-text">
                                                ${address.lineOne},<br>
                                                ${address.lineTwo},<br>
                                                ${address.city}, ${address.postalCode},<br>
                                                ${address.provinceName}
                                            </div>
                                            <div class="contact-info">
                                                <div><i class="bi bi-telephone"> </i> ${address.mobile}</div>
                                            </div>
                                            <div class="mt-3 d-flex gap-2">
                                                <button class="btn btn-light btn-sm">
                                                    <i class="bi bi-pencil"></i> Edit
                                                </button>
                                                <button class="btn btn-danger btn-sm">
                                                    <i class="bi bi-trash"></i> Remove
                                                </button>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                    `;
                container.innerHTML += card;
            });
        }

    } catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    }

}


async function saveUserChanges() {
    const firstName = getVal("firstName");
    const lastName = getVal("lastName");
    const roleValue = getVal("roleSelect");
    const statusValue = getVal("statusSelect");
    const newPassword = getVal("newPassword");
    const confirmPassword = getVal("confirmPassword");

    // Basic validation
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


// ─────────────────────────────────────────────
//  DELETE USER (from danger zone modal)
// ─────────────────────────────────────────────
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


// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function setVal(id, value) {
    const el = document.getElementById(id);
    if (el && value !== null && value !== undefined) el.value = value;
}

function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
}