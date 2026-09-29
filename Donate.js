/* =========================================
   CẤU HÌNH DONATE
========================================= */

const BANK_ID = "970422";
const ACCOUNT_NO = "09637164106868";
const BANK_NAME = "MB Bank";

const PROJECT_TARGET = 1000000;

let received = 0;
let currentContent = "";

let pendingPaidDonations = {};

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
   LẤY HISTORY
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
   KIỂM TRA GIAO DỊCH
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

    return Number(
        item.amount ??
        item.transferAmount ??
        item.money ??
        0
    ) || 0;

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
   RENDER LỊCH SỬ
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

                <div class="avatar">
                    …
                </div>

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
   THÔNG BÁO ĐÃ NHẬN TIỀN
========================================= */

function showDonationSuccess(amount){

    let modal =
        document.getElementById(
            "donationSuccessModal"
        );

    if(!modal){

        modal =
            document.createElement("div");

        modal.id =
            "donationSuccessModal";

        modal.innerHTML = `
            <div class="donation-success-box">

                <button
                    class="donation-success-close"
                    type="button"
                    aria-label="Đóng"
                >
                    ×
                </button>

                <div class="donation-success-icon">
                    ✓
                </div>

                <div class="donation-success-label">
                    ĐÃ NHẬN ĐƯỢC
                </div>

                <div class="donation-success-title">
                    Cảm ơn bạn!
                </div>

                <div class="donation-success-text">
                    Khoản ủng hộ đã được xác nhận.
                    Bạn vừa giúp dự án 3105 tiến gần hơn một chút.
                </div>

                <div class="donation-success-amount">
                    ${formatMoney(amount)}
                </div>

                <button
                    class="donation-success-reload"
                    type="button"
                >
                    Xem tiến độ mới
                </button>

            </div>
        `;

        document.body.appendChild(
            modal
        );


        /* =================================
           ĐÓNG
        ================================= */

        const closeButton =
            modal.querySelector(
                ".donation-success-close"
            );

        closeButton.addEventListener(
            "click",
            function(){

                modal.classList.remove(
                    "show"
                );

            }
        );


        /* =================================
           XEM TIẾN ĐỘ MỚI
        ================================= */

        const reloadButton =
            modal.querySelector(
                ".donation-success-reload"
            );

        reloadButton.addEventListener(
            "click",
            function(){

                window.location.reload();

            }
        );

    }else{

        const amountElement =
            modal.querySelector(
                ".donation-success-amount"
            );

        if(amountElement){

            amountElement.textContent =
                formatMoney(amount);

        }

    }


    /* =================================
       HIỆN MODAL
    ================================= */

    requestAnimationFrame(() => {

        modal.classList.add(
            "show"
        );

    });

}


/* =========================================
   CSS CHO THÔNG BÁO
========================================= */

function injectDonationSuccessStyle(){

    if(
        document.getElementById(
            "donationSuccessStyle"
        )
    ){

        return;

    }

    const style =
        document.createElement("style");

    style.id =
        "donationSuccessStyle";

    style.textContent = `

        #donationSuccessModal{
            position:fixed;
            inset:0;
            z-index:999999;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:20px;
            box-sizing:border-box;
            background:rgba(20,24,24,.48);
            backdrop-filter:blur(12px);
            -webkit-backdrop-filter:blur(12px);
            opacity:0;
            visibility:hidden;
            transition:
                opacity .25s ease,
                visibility .25s ease;
        }

        #donationSuccessModal.show{
            opacity:1;
            visibility:visible;
        }

        .donation-success-box{
            position:relative;
            width:100%;
            max-width:460px;
            box-sizing:border-box;
            padding:30px 30px 28px;
            border-radius:24px;
            background:#fff;
            text-align:center;
            box-shadow:
                0 24px 70px
                rgba(0,0,0,.20);
            transform:
                translateY(12px)
                scale(.97);
            transition:
                transform .3s ease;
        }

        #donationSuccessModal.show
        .donation-success-box{
            transform:
                translateY(0)
                scale(1);
        }

        .donation-success-close{
            position:absolute;
            top:14px;
            right:14px;
            width:34px;
            height:34px;
            border:1px solid #e5e5e5;
            border-radius:10px;
            background:#fff;
            color:#777;
            font-size:22px;
            line-height:1;
            cursor:pointer;
        }

        .donation-success-icon{
            width:60px;
            height:60px;
            margin:0 auto 17px;
            display:flex;
            align-items:center;
            justify-content:center;
            border-radius:18px;
            background:#ffb817;
            color:#111;
            font-size:30px;
            font-weight:700;
            box-shadow:
                0 8px 24px
                rgba(255,184,23,.28);
        }

        .donation-success-label{
            margin-bottom:7px;
            font-size:11px;
            font-weight:800;
            letter-spacing:3px;
            color:#777;
        }

        .donation-success-title{
            margin-bottom:8px;
            font-size:28px;
            line-height:1.15;
            font-weight:800;
            color:#111;
        }

        .donation-success-text{
            max-width:350px;
            margin:0 auto;
            font-size:13px;
            line-height:1.55;
            color:#888;
        }

        .donation-success-amount{
            margin:18px 0 20px;
            font-size:23px;
            line-height:1;
            font-weight:800;
            color:#111;
        }

        .donation-success-reload{
            width:100%;
            height:48px;
            border:0;
            border-radius:13px;
            background:#ffb817;
            color:#111;
            font-size:13px;
            font-weight:800;
            cursor:pointer;
            transition:
                transform .15s ease,
                opacity .15s ease;
        }

        .donation-success-reload:active{
            transform:scale(.98);
        }

        @media(max-width:480px){

            .donation-success-box{
                max-width:100%;
                padding:30px 30px 28px;
                border-radius:23px;
            }

            .donation-success-title{
                font-size:27px;
            }

        }

    `;

    document.head.appendChild(
        style
    );

}

injectDonationSuccessStyle();


/* =========================================
   CẬP NHẬT TIẾN ĐỘ + LỊCH SỬ
========================================= */

async function updateProgress(){

    try{

        const response =
            await fetch(
                HISTORY_API,
                {
                    method:"GET",
                    cache:"no-store",
                    headers:{
                        "Accept":"application/json"
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


        const historyDonations =
            history.filter(
                isDonateTransaction
            );


        /* =====================================
           TỔNG TIỀN

           Ưu tiên total từ Worker.
        ===================================== */

        let historyTotal =
            Number(data?.total);

        if(
            !Number.isFinite(
                historyTotal
            )
        ){

            historyTotal =
                historyDonations.reduce(
                    (sum,item) =>
                        sum +
                        getItemAmount(item),
                    0
                );

        }


        /* =====================================
           PENDING
        ===================================== */

        const historyCodes =
            new Set(
                historyDonations.map(item =>
                    String(
                        item.code ||
                        item.content ||
                        item.message ||
                        ""
                    )
                    .trim()
                    .toUpperCase()
                )
            );


        let pendingTotal = 0;


        if(
            !Number.isFinite(
                Number(data?.total)
            )
        ){

            Object.keys(
                pendingPaidDonations
            ).forEach(code => {

                if(
                    !historyCodes.has(code)
                ){

                    pendingTotal +=
                        Number(
                            pendingPaidDonations[code]
                        ) || 0;

                }else{

                    delete pendingPaidDonations[
                        code
                    ];

                }

            });

        }else{

            Object.keys(
                pendingPaidDonations
            ).forEach(code => {

                delete pendingPaidDonations[
                    code
                ];

            });

        }


        received =
            Math.max(
                historyTotal +
                pendingTotal,
                0
            );


        /* =====================================
           HISTORY
        ===================================== */

        renderHistory(history);


        /* =====================================
           PHẦN TRĂM
        ===================================== */

        const percent =
            Math.min(
                (received / PROJECT_TARGET) * 100,
                100
            );


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


        if(receivedElement){

            receivedElement.textContent =
                formatMoney(received);

        }


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

    }catch(error){

        console.warn(
            "Không lấy được lịch sử donate:",
            error
        );

    }

}


/* =========================================
   TỰ ĐỘNG CẬP NHẬT
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


    if(!name){

        alert(
            "Vui lòng nhập tên hiển thị."
        );

        return;

    }


    if(
        !amount ||
        amount < 10000
    ){

        alert(
            "Số tiền tối thiểu là 10.000đ."
        );

        return;

    }


    clearInterval(
        countdownInterval
    );

    clearInterval(
        paymentCheckInterval
    );

    countdownInterval = null;
    paymentCheckInterval = null;
    countdownEndTime = null;


    const randomCode =
        Math.floor(
            100000 +
            Math.random() * 900000
        );

    currentContent =
        "DXM-" + randomCode;


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


    startTimer();


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

                    const paidCode =
                        String(code)
                            .trim()
                            .toUpperCase();


                    if(
                        !pendingPaidDonations[
                            paidCode
                        ]
                    ){

                        pendingPaidDonations[
                            paidCode
                        ] =
                            Number(amount) || 0;

                    }


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
                       TRẠNG THÁI TRÊN QR
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
                       HIỆN BẢNG THÔNG BÁO
                    ================================= */

                    showDonationSuccess(
                        Number(
                            data?.donor?.amount ||
                            amount
                        )
                    );


                    /* =================================
                       CẬP NHẬT TIẾN ĐỘ
                    ================================= */

                    await updateProgress();

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