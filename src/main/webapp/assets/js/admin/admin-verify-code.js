
window.addEventListener("load", () => {
    const email = sessionStorage.getItem("adminEmail");
    if (!email) window.location.href = "admin-login.html";
});

async function verifyAdminOtp() {
    const email = sessionStorage.getItem("adminEmail");
    const otp   = document.getElementById("vCode").value.trim();

    if (!otp) {
        Notiflix.Notify.warning("Please enter the OTP.", { position: "center-top" });
        return;
    }

    try {
        Notiflix.Loading.pulse("Verifying...", { svgColor: "#0a4db8" });

        const response = await fetch("api/users/admin-verify-otp", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
                email:            email,
                verificationCode: otp
            })
        });

        const data = await response.json();

        if (data.status) {
            sessionStorage.removeItem("adminEmail"); // clean up
            Notiflix.Notify.success(data.message, { position: "center-top" });
            setTimeout(() => {
                window.location.href = "admin-dashboard.html";
            }, 1000);
        } else {
            Notiflix.Notify.failure(data.message, { position: "center-top" });
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, { position: "center-top" });
    } finally {
        Notiflix.Loading.remove();
    }
}