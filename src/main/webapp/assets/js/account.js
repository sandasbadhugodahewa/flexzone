window.addEventListener("load", async () => {
    try {
        await loadUserData();
        await loadOrderCard();
        await loadOrderCount();
    } finally {
        Notiflix.loading.remove();
    }
});

async function loadUserData() {
    try {
        const response = await fetch("api/profiles/user-profile");

        if (response.redirected) {
            window.location.href = response.url;
            return;
        }

        if (!response.ok) {
            Notiflix.Notify.failure("Profile data loading failed!", {position: "center-top"});
            return;
        }

        const json = await response.json();

        if (!json.status) {
            Notiflix.Notify.failure(json.message || "Failed to load profile", {position: "center-top"});
            return;
        }

        const user = json.data;

        const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
        document.getElementById("userFullName").textContent = fullName || "User";

        document.getElementById("firstName").value = user.firstName;
        document.getElementById("lastName").value = user.lastName;
        document.getElementById("email").value = user.email;

        // 2) Set member since text (optional)
        if (user.memberSince) {
            document.getElementById("since").textContent = `Member Since ${user.memberSince}`;
        }

    } catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    }
}

async function saveChanges() {
    Notiflix.Loading.circle("Wait...", {
        clickToClose: false,
        svgColor: '#0284c7'
    });

    let firstName = document.getElementById("firstName");
    let lastName = document.getElementById("lastName");

    const userObj = {
        firstName: firstName.value,
        lastName: lastName.value,
    };

    try {
        const response = await fetch("api/profiles/update-profile", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(userObj)
        });
        if (response.ok) {
            const data = await response.json();
            if (data.status) {
                Notiflix.Report.success(
                    'Flex Zone',
                    data.message,
                    'Okay'
                );
                await loadUserData();
            } else {
                Notiflix.Notify.failure(data.message, {
                    position: 'center-top'
                });
            }
        } else {
            Notiflix.Notify.failure("Profile update failed!", {
                position: 'center-top'
            });
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, {
            position: 'center-top'
        });
    } finally {
        Notiflix.Loading.remove(1000);
    }

}

async function updatePassword() {
    let currentPassword = document.getElementById("currentPassword");
    let newPassword = document.getElementById("newPassword");
    let confirmPassword = document.getElementById("confirmPassword");

    const userObj = {
        password: currentPassword.value,
        newPassword: newPassword.value,
        confirmPassword: confirmPassword.value,
    };


    try {
        const response = await fetch("api/profiles/update-password", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(userObj)
        });
        if (response.ok) {
            const data = await response.json();
            if (data.status) {
                Notiflix.Report.success(
                    'Flex Zone',
                    data.message,
                    'Okay'
                );
            } else {
                Notiflix.Notify.failure(data.message, {
                    position: 'center-top'
                });
            }
        } else {
            Notiflix.Notify.failure("Password update failed!", {
                position: 'center-top'
            });
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, {
            position: 'center-top'
        });
    } finally {
        Notiflix.Loading.remove(1000);
    }

}

async function deactivateAccount() {
    Notiflix.Confirm.show(
        'Flex Zone',
        'Are you sure you want to deactivate your account?',
        'Yes', 'No',
        async function () {
            try {
                const response = await fetch("api/profiles/deactivate", {
                    method: "PUT", // matches backend
                    headers: {
                        "Content-Type": "application/json"
                    },
                });

                const data = await response.json();
                if (data.status) {
                    Notiflix.Report.success(
                        'Flex Zone',
                        data.message,
                        'Okay'
                    );
                    window.location.href = "sign-in.html"; // redirect to login page
                } else {
                    Notiflix.Notify.failure(data.message);
                }

            } catch (e) {
                Notiflix.Notify.failure(e.message);
            }
        }
    );
}
