async function loadProvince(){
    try {

        let provinceSelect = document.getElementById("province");
        let provinceSelect1 = document.getElementById("province1");
        provinceSelect.innerHTML = "";
        provinceSelect1.innerHTML = "";

        const response = await fetch("api/address/loadProvince")
        if (response.ok) {
            const data = await response.json();
            provinceSelect.innerHTML = `<option value="">Select Province</option>`;
            provinceSelect1.innerHTML = `<option value="">Select Province</option>`;

            data.provinces.forEach(province => {
                let option = `
                        <option value="${province.pid}">
                            ${province.provinces}
                        </option>
                    `;
                provinceSelect.innerHTML += option;
                provinceSelect1.innerHTML += option;
            });

        }else{
            Notiflix.Notify.info(data.message, {
                position: 'center-top'
            });
        }

    }catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    }
}

async function addAddress(){

    const lineOne = document.getElementById("line_one").value.trim();
    const lineTwo = document.getElementById("line_two").value.trim();
    const city = document.getElementById("city").value.trim();
    const provinceId = document.getElementById("province").value;
    const postalCode = document.getElementById("postalCode").value.trim();
    const mobile = document.getElementById("mobile").value.trim();

    const userObj = {
        lineOne : lineOne,
        lineTwo: lineTwo,
        city : city,
        provinceId : parseInt(provinceId),
        postalCode : postalCode,
        mobile : mobile,
    }

    try {

        const response = await fetch("api/address/addAddress", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(userObj)
        })

        if(response.ok){
            const data = await response.json();
            if (data.status) {
                Notiflix.Report.success(
                    'Flex Zone',
                    data.message,
                    'Okay',
                    () => {
                        const modal = bootstrap.Modal.getInstance(document.getElementById("exampleModal"));
                        modal.hide();
                        loadAddressData();
                    }
                );
                await loadAddressData();
            } else {
                Notiflix.Notify.failure(data.message, {
                    position: 'center-top'
                });
            }
        }else {
            Notiflix.Notify.failure("Profile update failed!", {
                position: 'center-top'
            });
        }

    }catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    }

}

let updateAddressId = 1;

async function loadAddressData(){

    try {
        let container = document.getElementById("addressContainer");
        container.innerHTML = "";

        const response = await fetch("api/address/loadUserAddress");

        if(response.ok){
            const data = await response.json();
            if (data.status) {

                const addBtn = document.getElementById("addAddressBtn");
                if(data.addresses.length >= 2){
                    addBtn.style.display = "none";
                }else{
                    addBtn.style.display = "block";
                }

                data.addresses.forEach(address => {
                    let card = `

                             <div class="address-card default" data-aos="fade-up" data-aos-delay="100">
                                  <div class="card-header">
                                            <h4>Home</h4>
                                            <span class="default-badge"></span>
                                        </div>
                                        <div class="card-body">
                                            <p class="address-text">${address.lineOne},<br>${address.lineTwo},<br>${address.city}, ${address.postalCode}, <br>${address.province.provinces} Province</p>
                                            <div class="contact-info">
                                                <div><i class="bi bi-telephone"></i> ${address.mobile}</div>
                                            </div>
                                        </div>
                                        <div class="card-actions">
                                              <button type="button" class="btn-edit" data-bs-toggle="modal" data-bs-target="#exampleModal1"
                                                 onclick="openUpdateModal(${address.id},
                                                 '${address.lineOne}',
                                                 '${address.lineTwo}',
                                                 '${address.city}',
                                                  ${address.province.pid},
                                                 '${address.postalCode}',
                                                 '${address.mobile}')">
                                                 
                                                <i class="bi bi-pencil"></i> Edit
                                                
                                              </button>
                                            <button type="button" class="btn-remove" onclick="deleteAddress(${address.id})">
                                                <i class="bi bi-trash"></i>
                                                Remove
                                            </button>
                                        </div>
                                  </div>
                             </div>
                    `;
                    container.innerHTML += card;
                });
            }else {
                Notiflix.Notify.info(data.message,{
                    position:"center-top"
                });
            }
        }
    }catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    }
}

function openUpdateModal(id, line1, line2, city, provinceId, postalCode, mobile){
    updateAddressId = id;
    document.getElementById("line_one1").value = line1;
    document.getElementById("line_two1").value = line2;
    document.getElementById("city1").value = city;
    document.getElementById("province1").value = provinceId;
    document.getElementById("postalCode1").value = postalCode;
    document.getElementById("mobile1").value = mobile;
}

async function updateAddress(){

    const lineOne1 = document.getElementById("line_one1").value.trim();
    const lineTwo1 = document.getElementById("line_two1").value.trim();
    const city1 = document.getElementById("city1").value.trim();
    const provinceId1 = document.getElementById("province1").value;
    const postalCode1 = document.getElementById("postalCode1").value.trim();
    const mobile1 = document.getElementById("mobile1").value.trim();

    const addressObj = {
        id: updateAddressId,
        lineOne : lineOne1,
        lineTwo: lineTwo1,
        city : city1,
        provinceId : parseInt(provinceId1),
        postalCode : postalCode1,
        mobile : mobile1,
    }

    console.log(addressObj);

    try {
        const response = await fetch(`api/address/updateAddress`,{
            method : "PUT",
            headers : {
                "Content-Type":"application/json"
            },
            body : JSON.stringify(addressObj)
        });

        if(response.ok){

            const data = await response.json();

            if(data.status){
                Notiflix.Report.success(
                    "Flex Zone",
                    data.message,
                    "OK",
                    () => {
                        const modal = bootstrap.Modal.getInstance(document.getElementById("exampleModal1"));
                        modal.hide();
                        loadAddressData();
                    }
                );
            }else{
                Notiflix.Notify.failure(data.message,{
                    position:"center-top"
                });
            }
        }
    }catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    }
}

async function deleteAddress(id){
    Notiflix.Confirm.show(
        'Remove Address',
        `Are you sure you want to remove this address?`,
        'Yes',
        'No',
        async function okCb() {

            try {

                const response = await fetch(`api/address/deleteAddress/${id}`,{
                        method: "DELETE"
                    }
                );

                const data = await response.json();

                if (data.status) {

                    Notiflix.Notify.success(data.message);
                    loadAddressData();

                } else {
                    Notiflix.Notify.failure(data.message);
                }

            } catch (error) {
                console.error(error);
                Notiflix.Notify.failure("Remove failed!");
            }

        },
        function cancelCb() {
        }
    );
}