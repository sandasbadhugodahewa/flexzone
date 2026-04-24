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