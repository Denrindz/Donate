/* =========================================
   CẤU HÌNH DONATE
========================================= */

const BANK_ID = "970422";
const ACCOUNT_NO = "09637164106868";
const BANK_NAME = "MB Bank";

const PROJECT_TARGET = 1000000;

let received = 0;
let currentContent = "";


/* =========================================
   TIMER TÁCH RIÊNG
========================================= */

let countdownInterval = null;
let paymentCheckInterval = null;

let countdownEndTime = null;


/* =========================================
   API
========================================= */

const API_BASE =
    "https://doante-api.tnt300709.workers.dev";

const CHECK_API =
    `${API_BASE}/check`;

const HISTORY_API =
    `${API_BASE}/history`;


/* =========================================
   FORMAT TIỀN
========================================= */

function formatMoney(number){

    return new Intl.NumberFormat("vi-VN")
        .format(number) + " ₫";

}


/* =========================================
   CẬP NHẬT PROGRESS
========================================= */

function renderProgress(){

    const percent =
        Math.min(
            (received / PROJECT_TARGET) * 100,
            100
        );


    const receivedElement =
        document.getElementById("received");

    const remainingElement =
        document.getElementById("remaining");

    const percentElement =
        document.getElementById("percent");

    const progressBar =
        document.getElementById("progressBar");


    if(receivedElement){

        receivedElement.textContent =
            formatMoney(received);

    }


    if(remainingElement){

        remainingElement.textContent =
            formatMoney(
                Math.max(
                    PROJECT_TARGET - received,
                    0
                )
            );

    }


    if(percentElement){

        percentElement.textContent =
            percent
                .toFixed(1)
                .replace(".",",") +
            "%";

    }


    if(progressBar){

        progressBar.style.width =
            percent + "%";

    }

}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHTML(value){

    return String(value)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");

}


/* =========================================
   LỊCH SỬ DONATE
   CHỈ HIỂN THỊ 5 NGƯỜI GẦN NHẤT
========================================= */

function renderHistory(history){

    const supporterList =
        document.getElementById(
            "supporterList"
        );


    if(!supporterList){

        return;

    }


    if(!Array.isArray(history)){

        return;

    }


    /* =====================================
       LỌC + SẮP XẾP
       MỚI NHẤT -> CŨ NHẤT
    ===================================== */

    const donations =
        history
            .filter(item => {

                const code =
                    String(
                        item.code || ""
                    )
                    .toUpperCase();

                return code.startsWith("DXM");

            })
            .sort((a,b) => {

                const dateA =
                    new Date(
                        a.time ||
                        a.createdAt ||
                        a.created_at ||
                        a.date ||
                        0
                    ).getTime();

                const dateB =
                    new Date(
                        b.time ||
                        b.createdAt ||
                        b.created_at ||
                        b.date ||
                        0
                    ).getTime();

                return dateB - dateA;

            })
            .slice(0,5);


    /* =====================================
       KHÔNG CÓ LỊCH SỬ
    ===================================== */

    if(donations.length === 0){

        supporterList.innerHTML = `

            <div class="supporter">

                <div class="avatar">
                    …
                </div>

                <div class="supporter-info">

                    <div class="supporter-name">
                        Chưa có lượt donate
                    </div>

                    <div class="supporter-time">
                        Hãy là người đầu tiên ủng hộ
                    </div>

                </div>

                <div class="amount">
                    —
                </div>

            </div>

        `;

        return;

    }


    /* =====================================
       XÓA DANH SÁCH CŨ
    ===================================== */

    supporterList.innerHTML = "";


    /* =====================================
       HIỂN THỊ 5 DONATE GẦN NHẤT
    ===================================== */

    donations.forEach(item => {

        const name =
            item.name ||
            item.donor ||
            "Ẩn danh";


        const amount =
            Number(
                item.amount
            ) || 0;


        const code =
            item.code ||
            "DXM";


        const dateValue =
            item.time ||
            item.createdAt ||
            item.created_at ||
            item.date;


        let timeText =
            "Không rõ thời gian";


        if(dateValue){

            const date =
                new Date(dateValue);


            if(!Number.isNaN(
                date.getTime()
            )){

                timeText =
                    date.toLocaleString(
                        "vi-VN"
                    );

            }else{

                timeText =
                    String(dateValue);

            }

        }


        const firstLetter =
            String(name)
                .trim()
                .charAt(0)
                .toUpperCase() || "D";


        const supporter =
            document.createElement("div");


        supporter.className =
            "supporter";


        supporter.innerHTML = `

            <div class="avatar">
                ${escapeHTML(firstLetter)}
            </div>

            <div class="supporter-info">

                <div class="supporter-name">
                    ${escapeHTML(name)}
                </div>

                <div class="supporter-time">
                    ${escapeHTML(timeText)}
                    ·
                    ${escapeHTML(code)}
                </div>

            </div>

            <div class="amount">
                +${formatMoney(amount)}
            </div>

        `;


        supporterList.appendChild(
            supporter
        );

    });

}


/* =========================================
   LẤY PROGRESS + HISTORY
========================================= */

async function updateProgress(){

    try{

        const response =
            await fetch(
                HISTORY_API,
                {
                    method:"GET",
                    cache:"no-store"
                }
            );


        if(!response.ok){

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        let serverTotal = 0;


        /* =====================================
           LẤY TỔNG TIỀN
        ===================================== */

        if(
            data &&
            data.total !== undefined &&
            data.total !== null &&
            Number.isFinite(
                Number(data.total)
            )
        ){

            serverTotal =
                Number(data.total);

        }else if(
            data &&
            Array.isArray(data.history)
        ){

            serverTotal =
                data.history
                    .filter(item =>
                        String(
                            item.code || ""
                        )
                        .toUpperCase()
                        .startsWith("DXM")
                    )
                    .reduce(
                        (sum,item) =>
                            sum +
                            (
                                Number(
                                    item.amount
                                ) || 0
                            ),
                        0
                    );

        }


        /*
           KHÔNG CHO API CŨ LÀM TỤT PROGRESS

           Nếu web đang có:
           200.000

           nhưng API tạm thời trả:
           100.000

           thì vẫn giữ:
           200.000
        */

        received =
            Math.max(
                received,
                Number(serverTotal) || 0
            );


        /* =====================================
           CẬP NHẬT LỊCH SỬ
        ===================================== */

        if(
            data &&
            Array.isArray(data.history)
        ){

            renderHistory(
                data.history
            );

        }


    }catch(error){

        console.warn(
            "Không lấy được lịch sử donate:",
            error
        );

    }


    /* =====================================
       HIỂN THỊ PROGRESS
    ===================================== */

    renderProgress();

}


/* =========================================
   LOAD DỮ LIỆU BAN ĐẦU
========================================= */

updateProgress();


/* =========================================
   MỞ MODAL
========================================= */

function openModal(){

    document
        .getElementById("modal")
        .classList.add("show");

}


/* =========================================
   ĐÓNG MODAL
========================================= */

function closeModal(){

    document
        .getElementById("modal")
        .classList.remove("show");

}


/* =========================================
   CLICK RA NGOÀI MODAL
========================================= */

function outsideClose(event){

    if(event.target.id === "modal"){

        closeModal();

    }

}


/* =========================================
   CHỌN NHANH SỐ TIỀN
========================================= */

function setAmount(amount){

    const input =
        document.getElementById(
            "donationAmount"
        );


    if(!input){

        return;

    }


    input.value =
        Number(amount).toLocaleString(
            "vi-VN"
        );

}


/* =========================================
   FORMAT INPUT SỐ TIỀN
========================================= */

const donationInput =
    document.getElementById(
        "donationAmount"
    );


if(donationInput){

    donationInput.addEventListener(
        "input",
        function(){

            let value =
                this.value.replace(/\D/g,"");


            if(!value){

                this.value = "";

                return;

            }


            this.value =
                Number(value).toLocaleString(
                    "vi-VN"
                );

        }
    );

}


/* =========================================
   TẠO QR
========================================= */

function generateQR(){

    const nameElement =
        document.getElementById(
            "donorName"
        );


    const amountElement =
        document.getElementById(
            "donationAmount"
        );


    if(!nameElement || !amountElement){

        return;

    }


    const name =
        nameElement.value.trim();


    const amount =
        Number(
            amountElement.value
                .replace(/\./g,"")
                .replace(/,/g,"")
        );


    /* =====================================
       KIỂM TRA TÊN
    ===================================== */

    if(!name){

        alert(
            "Vui lòng nhập tên hiển thị."
        );

        return;

    }


    /* =====================================
       KIỂM TRA SỐ TIỀN
    ===================================== */

    if(
        !amount ||
        amount < 10000
    ){

        alert(
            "Số tiền tối thiểu là 10.000đ."
        );

        return;

    }


    /* =====================================
       DỪNG TIMER CŨ
    ===================================== */

    clearInterval(
        countdownInterval
    );

    clearInterval(
        paymentCheckInterval
    );


    countdownInterval = null;
    paymentCheckInterval = null;

    countdownEndTime = null;


    /* =====================================
       TẠO MÃ GIAO DỊCH
    ===================================== */

    const randomCode =
        Math.floor(
            100000 +
            Math.random() * 900000
        );


    currentContent =
        "DXM-" + randomCode;


    /* =====================================
       HIỂN THỊ THÔNG TIN
    ===================================== */

    const qrAmount =
        document.getElementById(
            "qrAmount"
        );

    const qrName =
        document.getElementById(
            "qrName"
        );

    const qrContent =
        document.getElementById(
            "qrContent"
        );

    const qrStk =
        document.getElementById(
            "qrStk"
        );

    const qrTime =
        document.getElementById(
            "qrTime"
        );


    if(qrAmount){

        qrAmount.textContent =
            formatMoney(amount);

    }


    if(qrName){

        qrName.textContent =
            name;

    }


    if(qrContent){

        qrContent.textContent =
            currentContent;

    }


    if(qrStk){

        qrStk.textContent =
            ACCOUNT_NO;

    }


    if(qrTime){

        qrTime.textContent =
            new Date()
                .toLocaleString("vi-VN");

    }


    /* =====================================
       TẠO VIETQR MB BANK
    ===================================== */

    const qrURL =
        "https://img.vietqr.io/image/" +
        BANK_ID +
        "-" +
        ACCOUNT_NO +
        "-qr_only.png" +
        "?amount=" +
        encodeURIComponent(amount) +
        "&addInfo=" +
        encodeURIComponent(
            currentContent
        );


    const qrImage =
        document.getElementById(
            "qrImage"
        );


    if(qrImage){

        qrImage.src =
            qrURL;

    }


    /* =====================================
       RESET PAYMENT STATUS
    ===================================== */

    const status =
        document.getElementById(
            "paymentStatus"
        );


    if(status){

        status.classList.remove(
            "paid",
            "expired"
        );


        status.textContent =
            "● Đang chờ chuyển khoản…";

    }


    /* =====================================
       CHUYỂN SANG QR
    ===================================== */

    const formArea =
        document.getElementById(
            "formArea"
        );

    const qrResult =
        document.getElementById(
            "qrResult"
        );


    if(formArea){

        formArea.style.display =
            "none";

    }


    if(qrResult){

        qrResult.classList.add(
            "show"
        );

    }


    /* =====================================
       BẮT ĐẦU TIMER
    ===================================== */

    startTimer();


    /* =====================================
       KIỂM TRA THANH TOÁN
    ===================================== */

    checkPayment(
        amount,
        name,
        currentContent
    );

}


/* =========================================
   COPY SỐ TÀI KHOẢN
========================================= */

function copyStk(){

    navigator.clipboard
        .writeText(ACCOUNT_NO)
        .then(() => {

            const button =
                document.querySelector(
                    ".copy-btn"
                );


            if(!button){

                return;

            }


            const oldText =
                button.textContent;


            button.textContent =
                "Đã sao chép";


            setTimeout(() => {

                button.textContent =
                    oldText;

            },1500);

        });

}


/* =========================================
   KIỂM TRA THANH TOÁN
========================================= */

function checkPayment(
    amount,
    name,
    code
){

    clearInterval(
        paymentCheckInterval
    );


    const check =
        async () => {

            try{

                const response =
                    await fetch(
                        CHECK_API,
                        {
                            method:"POST",

                            headers:{
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    code:code,
                                    amount:amount,
                                    name:name,
                                    message:code
                                })
                        }
                    );


                if(!response.ok){

                    return;

                }


                const data =
                    await response.json();


                /* =================================
                   ĐÃ THANH TOÁN
                ================================= */

                if(
                    data &&
                    data.ok === true &&
                    data.paid === true
                ){

                    clearInterval(
                        paymentCheckInterval
                    );

                    paymentCheckInterval =
                        null;


                    clearInterval(
                        countdownInterval
                    );

                    countdownInterval =
                        null;


                    /* =================================
                       HIỂN THỊ ĐÃ THANH TOÁN
                    ================================= */

                    const status =
                        document.getElementById(
                            "paymentStatus"
                        );


                    if(status){

                        status.textContent =
                            `✓ Đã nhận ${formatMoney(amount)} — cảm ơn bạn!`;


                        status.classList.remove(
                            "expired"
                        );


                        status.classList.add(
                            "paid"
                        );

                    }


                    /* =================================
                       CẬP NHẬT PROGRESS NGAY
                    ================================= */

                    received =
                        Math.max(
                            received,
                            0
                        ) + amount;


                    renderProgress();


                    /* =================================
                       ĐỢI SERVER CẬP NHẬT
                    ================================= */

                    setTimeout(() => {

                        updateProgress();

                    },5000);


                    /* =================================
                       CẬP NHẬT LỊCH SỬ
                       SAU KHI SERVER GHI NHẬN
                    ================================= */

                    setTimeout(() => {

                        updateProgress();

                    },8000);

                }

            }catch(error){

                console.warn(
                    "Payment check error:",
                    error
                );

            }

        };


    /* Kiểm tra ngay */

    check();


    /* Kiểm tra mỗi 3 giây */

    paymentCheckInterval =
        setInterval(
            check,
            3000
        );

}


/* =========================================
   TIMER ĐẾM NGƯỢC
========================================= */

function startTimer(){

    clearInterval(
        countdownInterval
    );


    countdownInterval = null;


    const TEN_MINUTES =
        10 * 60 * 1000;


    countdownEndTime =
        Date.now() + TEN_MINUTES;


    const timer =
        document.getElementById(
            "timer"
        );


    const status =
        document.getElementById(
            "paymentStatus"
        );


    function updateCountdown(){

        if(!countdownEndTime){

            return;

        }


        const now =
            Date.now();


        const remaining =
            Math.max(
                0,
                countdownEndTime - now
            );


        const totalSeconds =
            Math.ceil(
                remaining / 1000
            );


        const minutes =
            Math.floor(
                totalSeconds / 60
            );


        const seconds =
            totalSeconds % 60;


        const displayMinutes =
            String(minutes)
                .padStart(2,"0");


        const displaySeconds =
            String(seconds)
                .padStart(2,"0");


        if(timer){

            timer.textContent =
                `${displayMinutes}:${displaySeconds}`;

        }


        /* =================================
           HẾT HẠN
        ================================= */

        if(remaining <= 0){

            clearInterval(
                countdownInterval
            );

            countdownInterval =
                null;


            countdownEndTime =
                null;


            clearInterval(
                paymentCheckInterval
            );

            paymentCheckInterval =
                null;


            if(timer){

                timer.textContent =
                    "Hết hạn";

            }


            if(status){

                status.classList.remove(
                    "paid"
                );

                status.classList.add(
                    "expired"
                );


                status.textContent =
                    "Mã đã hết hạn.";

            }

        }

    }


    /* Hiển thị ngay */

    updateCountdown();


    /* Cập nhật mỗi 250ms */

    countdownInterval =
        setInterval(
            updateCountdown,
            250
        );

}


/* =========================================
   TẠO MÃ MỚI
========================================= */

function newCode(){

    /* =====================================
       DỪNG TIMER
    ===================================== */

    clearInterval(
        countdownInterval
    );

    clearInterval(
        paymentCheckInterval
    );


    countdownInterval =
        null;

    paymentCheckInterval =
        null;

    countdownEndTime =
        null;


    /* =====================================
       ẨN QR
    ===================================== */

    const qrResult =
        document.getElementById(
            "qrResult"
        );


    if(qrResult){

        qrResult.classList.remove(
            "show"
        );

    }


    /* =====================================
       HIỆN LẠI FORM
    ===================================== */

    const formArea =
        document.getElementById(
            "formArea"
        );


    if(formArea){

        formArea.style.display =
            "";

    }


    /* =====================================
       RESET STATUS
    ===================================== */

    const status =
        document.getElementById(
            "paymentStatus"
        );


    if(status){

        status.classList.remove(
            "paid",
            "expired"
        );


        status.textContent =
            "● Đang chờ chuyển khoản…";

    }


    /* =====================================
       RESET TIMER
    ===================================== */

    const timer =
        document.getElementById(
            "timer"
        );


    if(timer){

        timer.textContent =
            "10:00";

    }

}