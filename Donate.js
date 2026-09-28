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
   PROGRESS
========================================= */

async function updateProgress(){

    try{

        const response =
            await fetch(HISTORY_API, {
                method:"GET",
                cache:"no-store"
            });

        if(!response.ok){

            throw new Error(
                `HTTP ${response.status}`
            );

        }

        const data =
            await response.json();

        let total = 0;

        if(
            data &&
            data.total !== undefined &&
            data.total !== null &&
            Number.isFinite(
                Number(data.total)
            )
        ){

            total =
                Number(data.total);

        }else if(
            data &&
            Array.isArray(data.history)
        ){

            total =
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

        received =
            Math.max(0,total);

    }catch(error){

        console.warn(
            "Không lấy được lịch sử donate:",
            error
        );

    }

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
       BẮT ĐẦU ĐẾM NGƯỢC
       10 PHÚT
    ===================================== */

    startTimer();

    /* =====================================
       BẮT ĐẦU KIỂM TRA THANH TOÁN
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

    /* Dừng lần kiểm tra cũ */

    clearInterval(
        paymentCheckInterval
    );

    /* =====================================
       HÀM CHECK
    ===================================== */

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

                    /* Dừng kiểm tra */

                    clearInterval(
                        paymentCheckInterval
                    );

                    paymentCheckInterval =
                        null;

                    /* Dừng countdown */

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

                    /* Cập nhật progress */

                    setTimeout(() => {

                        updateProgress();

                    },1000);

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
   10 PHÚT = 600 GIÂY

   DÙNG TIMESTAMP THỰC
   => KHÔNG BỊ SAI KHI TRÌNH DUYỆT
      TẠM DỪNG JAVASCRIPT
========================================= */

function startTimer(){

    /* =====================================
       DỪNG TIMER CŨ
    ===================================== */

    clearInterval(
        countdownInterval
    );

    countdownInterval = null;

    /* =====================================
       10 PHÚT
    ===================================== */

    const TEN_MINUTES =
        10 * 60 * 1000;

    /* =====================================
       THỜI ĐIỂM HẾT HẠN
    ===================================== */

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

    /* =====================================
       HÀM HIỂN THỊ THỜI GIAN
    ===================================== */

    function updateCountdown(){

        /* Nếu không còn thời gian */

        if(!countdownEndTime){

            return;

        }

        const now =
            Date.now();

        let remaining =
            Math.max(
                0,
                countdownEndTime - now
            );

        /* =================================
           ĐỔI MILLISECOND -> GIÂY
        ================================= */

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

        /* =================================
           HIỂN THỊ
        ================================= */

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

            /* Dừng kiểm tra thanh toán */

            clearInterval(
                paymentCheckInterval
            );

            paymentCheckInterval =
                null;

            /* Hiển thị hết hạn */

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

    /* =====================================
       HIỂN THỊ NGAY
       10:00
    ===================================== */

    updateCountdown();

    /* =====================================
       CẬP NHẬT MỖI 250ms
       NHƯNG HIỂN THỊ THEO GIÂY
    ===================================== */

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
       DỪNG CẢ 2 TIMER
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