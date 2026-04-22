window.addEventListener("load", async () => {
    try {
        await loadUserName();
        await loadCategory();
        await loadCartCount();
        await loadWishlistCount();
    } finally {
        Notiflix.loading.remove();
    }
});

document.addEventListener("submit", function(event) {
    const form = event.target;
    if (form.classList.contains("search-form")) {
        event.preventDefault();
        const input   = form.querySelector('input[name="q"]');
        const keyword = input ? input.value.trim() : "";
        if (!keyword) return;
        window.location.href = `advanced-search.html?q=${encodeURIComponent(keyword)}`;
    }
});

async function loadUserName() {

    let signinBtn = document.getElementById("signInBtn");
    let registerBtn = document.getElementById("registerBtn");
    let logoutBtn = document.getElementById("logoutBtn");

    try{
        const response = await fetch("api/header", {
            method: "GET",
            credentials: "include"
        });
        if (response.ok) {
            const data = await response.json();

            const welcomeUser = document.getElementById("welcomeUser");

            if (data.logged) {
                welcomeUser.innerText = "Welcome " + data.username + " !";
                if (signinBtn) signinBtn.style.display = "none";
                if (registerBtn) registerBtn.style.display = "none";
                if (logoutBtn) logoutBtn.style.display = "block";

            } else {
                welcomeUser.innerText = "Sign-in Or Register";
                if (signinBtn) signinBtn.style.display = "block";
                if (registerBtn) registerBtn.style.display = "block";
            }
        }else{
            Notiflix.Notify.failure("Header data loading failed!", {
                position: 'center-top'
            });
        }
    }catch (e){
        Notiflix.Notify.failure(e.message, {
            position: 'center-top'
        });
    }
}

async function logOut() {
    try {
        await fetch("api/users/logout", {
            method: "GET",
            credentials: "include"
        });
        window.location.reload();
    } catch (e) {
        Notiflix.Notify.failure("Logout failed: " + e.message, {
            position: 'center-top'
        });
    }
}

async function loadCategory() {

    Notiflix.Loading.pulse("Wait...", {
        clickToClose: false,
        svgColor: '#0284c7'
    });

    try {

        const response = await fetch("api/header/loadCategories");
        if(response.ok){

            const data = await response.json();

            if(data.status){
                let dropdown = document.getElementById("categoryDropdown");
                dropdown.innerHTML = "";

                data.categories.forEach(category => {
                    let item = `
                        <li>
                            <a href="#">${category.name}</a>
                        </li>
                    `;
                    dropdown.innerHTML += item;
                });
                // loadCategoryCard(data);
            }else {
                Notiflix.Notify.failure(data.message,{
                    position:"center-top"
                });
            }
        }
    }catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    } finally {
        Notiflix.Loading.remove(1000);
    }
}

async function loadCategoryCard(){

    try {

        const response = await fetch("api/header/loadCategories");
        if(response.ok){
            const data = await response.json();
            if(data.status){

                let container = document.getElementById("categoryCardContainer");
                container.innerHTML = "";

                data.categories.forEach(category => {
                    let card = `
                   <div class="swiper-slide">
                        <div class="category-card rounded" data-aos="fade-up" data-aos-delay="100">
                            <div class="category-image">
                                <img src="assets/images/categoryImg/${category.image_path}"
                                     alt="Category" class="img-fluid">
                            </div>
                            <h3 class="category-title">${category.name}</h3>
                            <p class="category-count">${category.productCount} Products</p>
                            <a href="#"
                               class="stretched-link"></a>
                        </div>
                   </div>
                    `;
                    container.innerHTML += card;
                });

            }
        }

    }catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    }

}
