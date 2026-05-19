async function checkAdmin() {
    Notiflix.Loading.pulse("Wait...", {
        clickToClose: false,
        svgColor: '#0284c7'
    });
    try {
        const res  = await fetch("api/users/admin-check");
        const data = await res.json();

        if (data.status) {
            document.querySelector(".main").style.display = "block";
        } else {
            window.location.href = "admin-login.html";
        }
    } catch (err) {
        console.error("Auth check failed", err);
        window.location.href = "admin-login.html";
    } finally {
        Notiflix.Loading.remove(1000);
    }
}

async function loadAdminName() {
    try {
        const res = await fetch('api/header');
        const { username } = await res.json();

        if (!username) return;

        [
            'adminName',
            'adminSideBarName1',
            'adminSideBarName2',
            'adminSideBarName3'
        ].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = username;
        });

    } catch (err) {
        console.error('Failed to load admin name:', err);
    }
}