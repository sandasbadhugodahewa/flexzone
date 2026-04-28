// Step 1: Admin enters email + password
async function adminSignIn() {

    const email    = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
        Notiflix.Notify.warning("Please fill in all fields.", { position: "center-top" });
        return;
    }

    try {
        Notiflix.Loading.pulse("Authenticating...", { svgColor: "#0a4db8" });

        const response = await fetch("api/users/admin-login", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.status) {
            // Save email to sessionStorage to use on OTP page
            sessionStorage.setItem("adminEmail", email);
            Notiflix.Notify.success(data.message, { position: "center-top" });
            setTimeout(() => {
                window.location.href = "admin-verify.html";
            }, 1200);
        } else {
            Notiflix.Notify.failure(data.message, { position: "center-top" });
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, { position: "center-top" });
    } finally {
        Notiflix.Loading.remove();
    }
}