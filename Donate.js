/* =========================================
   CẤU HÌNH DONATE
========================================= */

const BANK_ID = "970422";
const ACCOUNT_NO = "09637164106868";
const BANK_NAME = "MB Bank";

const PROJECT_TARGET = 1000000;

let received = 0;
let currentContent = "";

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
        .format(Number(number) || 0) + " ₫";

}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHTML(value){

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================
   LẤY HISTORY ARRAY
========================================= */

function getHistoryArray(data){

    if(!data){
        return [];
    }

    if(Array.isArray(data)){
        return data;
    }

    if(Array.isArray(data.history)){
        return data.history;
    }

    if(Array.isArray(data.data)){
        return data.data;
    }

    if(
        data.data &&
        Array.isArray(data.data.history)
    ){
        return data.data.history;
    }

    return [];

}


/* =========================================
   KIỂM TRA GIAO DỊCH DONATE
========================================= */

function isDonateTransaction(item){

    if(!item){
        return false;
    }

    const code =
        String(
            item.code ||
            item.content ||
            item.message ||
            ""
        )
        .trim()
        .toUpperCase();

    return code.startsWith("DXM");

}


/* =========================================
   LẤY SỐ TIỀN
========================================= */

function getItemAmount(item){

    if(!item){
        return 0;
    }

    let value =
        item.amount ??
        item.transferAmount ??
        item.money ??
        0;

    /*
       Hỗ trợ API trả:
       10000
       "10000"
       "10.000"
       "10,000"
    */

    if(typeof value === "string"){

        value =
            value.replace(/[^\d]/g, "");

    }

    return Number(value) || 0;

}


/* =========================================
   LẤY TÊN
========================================= */

function getItemName(item){

    return (
        item.name ||
        item.donorName ||
        item.senderName ||
        item.accountName ||
        "Một người ủng hộ"
    );

}


/* =========================================
   LẤY THỜI GIAN
========================================= */

function getItemTime(item){

    return (
        item.time ||
        item.createdAt ||
        item.created_at ||
        item.date ||
        item.transactionDate ||
        item.when ||
        ""
    );

}


/* =========================================
   FORMAT THỜI GIAN
========================================= */

function formatHistoryTime(value){

    if(!value){
        return "Vừa ủng hộ";
    }

    const date =
        new Date(value);

    if(!Number.isNaN(date.getTime())){

        return date.toLocaleString(
            "vi-VN",
            {
                day:"2-digit",
                month:"2-digit",
                year:"numeric",
                hour:"2-digit",
                minute:"2-digit"
            }
        );

    }

    return String(value);

}


/* =========================================
   RENDER LỊCH SỬ DONATE
========================================= */

function renderHistory(history){

    const list =
        document.getElementById(
            "supporterList"
        );

    if(!list){
        return;
    }

    const donations =
        history
            .filter(isDonateTransaction)
            .filter(item =>
                getItemAmount(item) > 0
            )
            .sort((a,b) => {

                const da =
                    new Date(
                        getItemTime(a)
                    ).getTime() || 0;

                const db =
                    new Date(
                        getItemTime(b)
                    ).getTime() || 0;

                return db - da;

            });


    if(!donations.length){

        list.innerHTML = `
            <div class="supporter">
                <div class="avatar">…</div>

                <div class="supporter-info">
                    <div class="supporter-name">
                        Chưa có lượt ủng hộ
                    </div>

                    <div class="supporter-time">
                        Hãy là người đầu tiên ủng hộ dự án
                    </div>
                </div>

                <div class="amount">
                    —
                </div>
            </div>
        `;

        return;

    }


    list.innerHTML =
        donations
            .map(item => {

                const name =
                    escapeHTML(
                        getItemName(item)
                    );

                const amount =
                    getItemAmount(item);

                const time =
                    escapeHTML(
                        formatHistoryTime(
                            getItemTime(item)
                        )
                    );

                const firstLetter =
                    escapeHTML(
                        String(
                            getItemName(item)
                        )
                        .trim()
                        .charAt(0)
                        .toUpperCase() || "?"
                    );


                return `
                    <div class="supporter">

                        <div class="avatar">
                            ${firstLetter}
                        </div>

                        <div class="supporter-info">

                            <div class="supporter-name">
                                ${name}
                            </div>

                            <div class="supporter-time">
                                ${time}
                            </div>

                        </div>

                        <div class="amount">
                            +${formatMoney(amount)}
                        </div>

                    </div>
                `;

            })
            .join("");

}


/* =========================================
   CẬP NHẬT TIẾN ĐỘ + LỊCH SỬ
========================================= */

async function updateProgress(){

    try{

        /*
           Thêm timestamp để tránh trình duyệt
           lấy lại response cũ từ cache.
        */

        const response =
            await fetch(
                HISTORY_API +
                "?t=" +
                Date.now(),
                {
                    method:"GET",
                    cache:"no-store",

                    headers:{
                        "Accept":"application/json",
                        "Cache-Control":"no-cache"
                    }
                }
            );


        if(!response.ok){

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        const history =
            getHistoryArray(data);


        /* =====================================
           CHỈ LẤY GIAO DỊCH DXM HỢP LỆ
        ===================================== */

        const donations =
            history
                .filter(isDonateTransaction)
                .filter(item =>
                    getItemAmount(item) > 0
                );


        /* =====================================
           TÍNH TỔNG TIỀN ĐÃ NHẬN

           QUAN TRỌNG:
           KHÔNG DÙNG data.total.

           LẤY TRỰC TIẾP TỪ HISTORY.
        ===================================== */

        received =
            donations.reduce(
                (sum,item) => {

                    return sum +
                        getItemAmount(item);

                },
                0
            );


        received =
            Math.max(
                received,
                0
            );


        /* =====================================
           RENDER LỊCH SỬ
        ===================================== */

        renderHistory(history);


        /* =====================================
           TÍNH %
        ===================================== */

        const percent =
            Math.min(
                (
                    received /
                    PROJECT_TARGET
                ) * 100,
                100
            );


        /* =====================================
           DOM
        ===================================== */

        const receivedElement =
            document.getElementById(
                "received"
            );

        const remainingElement =
            document.getElementById(
                "remaining"
            );

        const percentElement =
            document.getElementById(
                "percent"
            );

        const progressBar =
            document.getElementById(
                "progressBar"
            );


        /* =====================================
           ĐÃ NHẬN
        ===================================== */

        if(receivedElement){

            receivedElement.textContent =
                formatMoney(received);

        }


        /* =====================================
           CÒN LẠI
        ===================================== */

        if(remainingElement){

            remainingElement.textContent =
                formatMoney(
                    Math.max(
                        PROJECT_TARGET -
                        received,
                        0
                    )
                );

        }


        /* =====================================
           PHẦN TRĂM
        ===================================== */

        if(percentElement){

            percentElement.textContent =
                percent
                    .toFixed(1)
                    .replace(".",",") +
                "%";

        }


        /* =====================================
           THANH TIẾN ĐỘ
        ===================================== */

        if(progressBar){

            progressBar.style.width =
                percent + "%";

        }


    }catch(error){

        console.warn(
            "Không lấy được lịch sử donate:",
            error
        );

    }

}


/* =========================================
   TỰ ĐỘNG CẬP NHẬT
   MỖI 5 GIÂY
========================================= */

updateProgress();

setInterval(
    updateProgress,
    5000
);


/* =========================================
   MỞ MODAL
========================================= */

function openModal(){

    const modal =
        document.getElementById(
            "modal"
        );

    if(modal){

        modal.classList.add(
            "show"
        );

    }

}


/* =========================================
   ĐÓNG MODAL
========================================= */

function closeModal(){

    const modal =
        document.getElementById(
            "modal"
        );

    if(modal){

        modal.classList.remove(
            "show"
        );

    }

}


/* =========================================
   CLICK RA NGOÀI MODAL
========================================= */

function outsideClose(event){

    if(
        event.target &&
        event.target.id === "modal"
    ){

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
        Number(amount)
            .toLocaleString("vi-VN");

}


/* =========================================
   FORMAT INPUT
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
                this.value.replace(
                    /\D/g,
                    ""
                );


            if(!value){

                this.value = "";

                return;

            }


            this.value =
                Number(value)
                    .toLocaleString(
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


    if(
        !nameElement ||
        !amountElement
    ){

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
       KIỂM TRA TIỀN
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
       TẠO CODE
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
                .toLocaleString(
                    "vi-VN"
                );

    }


    /* =====================================
       VIETQR
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
       STATUS
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
       TIMER
    ===================================== */

    startTimer();


    /* =====================================
       CHECK PAYMENT
    ===================================== */

    checkPayment(
        amount,
        name,
        currentContent
    );

}


/* =========================================
   COPY STK
========================================= */

function copyStk(){

    if(
        !navigator.clipboard
    ){

        return;

    }


    navigator.clipboard
        .writeText(
            ACCOUNT_NO
        )
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

                    countdownEndTime =
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
                       CẬP NHẬT TIẾN ĐỘ NGAY
                    ================================= */

                    await updateProgress();


                    /*
                       API history đôi khi cần một
                       khoảng thời gian ngắn để ghi
                       giao dịch.

                       Kiểm tra lại thêm một lần
                       sau 1 giây.
                    */

                    setTimeout(
                        updateProgress,
                        1000
                    );

                }


            }catch(error){

                console.warn(
                    "Payment check error:",
                    error
                );

            }

        };


    /* Check ngay */

    check();


    /* Check mỗi 3 giây */

    paymentCheckInterval =
        setInterval(
            check,
            3000
        );

}


/* =========================================
   TIMER
========================================= */

function startTimer(){

    clearInterval(
        countdownInterval
    );


    countdownInterval = null;


    const TEN_MINUTES =
        10 * 60 * 1000;


    countdownEndTime =
        Date.now() +
        TEN_MINUTES;


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
                countdownEndTime -
                now
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


        if(timer){

            timer.textContent =
                `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;

        }


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


    updateCountdown();


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

    clearInterval(
        countdownInterval
    );

    clearInterval(
        paymentCheckInterval
    );


    countdownInterval = null;
    paymentCheckInterval = null;
    countdownEndTime = null;


    const qrResult =
        document.getElementById(
            "qrResult"
        );


    if(qrResult){

        qrResult.classList.remove(
            "show"
        );

    }


    const formArea =
        document.getElementById(
            "formArea"
        );


    if(formArea){

        formArea.style.display =
            "";

    }


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


    const timer =
        document.getElementById(
            "timer"
        );


    if(timer){

        timer.textContent =
            "10:00";

    }

}