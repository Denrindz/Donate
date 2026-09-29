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
   BỘ ĐẾM LƯỢT ỦNG HỘ
========================================= */

function updateDonationCount(history, data){

    const countElement =
        document.getElementById(
            "donationCount"
        );

    if(!countElement){
        return;
    }


    /*
       Nếu API có trả count thì ưu tiên dùng count.
       Nếu không thì đếm các giao dịch DXM
       trong history.
    */

    let count =
        Number(data?.count);


    if(!Number.isFinite(count)){

        count =
            history.filter(
                item =>
                    isDonateTransaction(item) &&
                    getItemAmount(item) > 0
            ).length;

    }


    /*
       Không cho hiển thị số âm
    */

    count =
        Math.max(
            0,
            Math.floor(count)
        );


    countElement.textContent =
        count.toLocaleString("vi-VN");

}


/* =========================================
   THÔNG BÁO ĐÃ NHẬN TIỀN
========================================= */

function showDonationSuccess(amount){

    /*
       ẨN HOÀN TOÀN BẢNG QR / CHUYỂN KHOẢN
       KHI THÔNG BÁO ĐÃ NHẬN HIỆN LÊN
    */

    const qrResult =
        document.getElementById(
            "qrResult"
        );

    if(qrResult){

        qrResult.style.display =
            "none";

    }


    const formArea =
        document.getElementById(
            "formArea"
        );

    if(formArea){

        formArea.style.display =
            "none";

    }


    /*
       DỪNG TIMER
    */

    clearInterval(
        countdownInterval
    );

    countdownInterval = null;

    countdownEndTime = null;


    /*
       DỪNG CHECK THANH TOÁN
    */

    clearInterval(
        paymentCheckInterval
    );

    paymentCheckInterval = null;


    let modal =
        document.getElementById(
            "denrinDonationSuccess"
        );

    if(!modal){

        modal =
            document.createElement("div");

        modal.id =
            "denrinDonationSuccess";

        modal.innerHTML = `
            <div class="denrin-donation-box">

                <div class="denrin-donation-icon">
                    ✓
                </div>

                <div class="denrin-donation-label">
                    ĐÃ NHẬN ĐƯỢC
                </div>

                <div class="denrin-donation-title">
                    Cảm ơn bạn!
                </div>

                <div class="denrin-donation-text">
                    Khoản ủng hộ đã được xác nhận.
                </div>

                <div class="denrin-donation-amount">
                    ${formatMoney(amount)}
                </div>

                <button
                    class="denrin-donation-reload"
                    type="button"
                >
                    Xem tiến độ mới
                </button>

            </div>
        `;

        document.body.appendChild(
            modal
        );


        /*
           NÚT XEM TIẾN ĐỘ MỚI
        */

        const reloadButton =
            modal.querySelector(
                ".denrin-donation-reload"
            );

        if(reloadButton){

            reloadButton.addEventListener(
                "click",
                function(){

                    window.location.reload();

                }
            );

        }

    }else{

        const amountElement =
            modal.querySelector(
                ".denrin-donation-amount"
            );

        if(amountElement){

            amountElement.textContent =
                formatMoney(amount);

        }

    }


    /*
       HIỆN POPUP
    */

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
            "denrinDonationSuccessStyle"
        )
    ){

        return;

    }

    const style =
        document.createElement("style");

    style.id =
        "denrinDonationSuccessStyle";

    style.textContent = `

        #denrinDonationSuccess{

            position:fixed;
            inset:0;
            z-index:999999;

            display:flex;
            align-items:center;
            justify-content:center;

            padding:20px;
            box-sizing:border-box;

            background:
                rgba(0,70,70,.48);

            backdrop-filter:
                blur(12px);

            -webkit-backdrop-filter:
                blur(12px);

            opacity:0;
            visibility:hidden;

            transition:
                opacity .25s ease,
                visibility .25s ease;

        }


        #denrinDonationSuccess.show{

            opacity:1;
            visibility:visible;

        }


        .denrin-donation-box{

            position:relative;

            width:100%;
            max-width:520px;

            box-sizing:border-box;

            padding:
                30px
                30px
                28px;

            border-radius:24px;

            background:
                linear-gradient(
                    145deg,
                    #ffffff 0%,
                    #f5ffff 55%,
                    #e8fafa 100%
                );

            border:
                1px solid
                rgba(0,144,144,.22);

            text-align:center;

            box-shadow:
                0 30px 90px
                rgba(0,70,70,.28),

                0 10px 35px
                rgba(0,144,144,.16);

            transform:
                translateY(12px)
                scale(.97);

            transition:
                transform .3s ease;

        }


        #denrinDonationSuccess.show
        .denrin-donation-box{

            transform:
                translateY(0)
                scale(1);

        }


        .denrin-donation-icon{

            width:60px;
            height:60px;

            margin:
                0 auto 17px;

            display:flex;

            align-items:center;
            justify-content:center;

            border-radius:18px;

            background:
                linear-gradient(
                    145deg,
                    #00c2b8,
                    #009b9b,
                    #007f7f
                );

            color:#ffffff;

            font-size:30px;
            font-weight:700;

            box-shadow:
                0 8px 24px
                rgba(0,144,144,.30);

        }


        .denrin-donation-label{

            margin-bottom:7px;

            font-size:11px;
            font-weight:800;

            letter-spacing:3px;

            color:#008f8f;

        }


        .denrin-donation-title{

            margin-bottom:8px;

            font-size:28px;
            line-height:1.15;

            font-weight:800;

            color:#111818;

        }


        .denrin-donation-text{

            max-width:350px;

            margin:0 auto;

            font-size:13px;
            line-height:1.55;

            color:#708080;

        }


        .denrin-donation-amount{

            margin:
                18px 0 20px;

            font-size:23px;
            line-height:1;

            font-weight:800;

            color:#008f8f;

        }


        .denrin-donation-reload{

            width:100%;
            height:48px;

            border:0;
            border-radius:13px;

            background:
                linear-gradient(
                    135deg,
                    #007f7f,
                    #009f9f,
                    #00b8b8
                );

            color:#ffffff;

            font-size:13px;
            font-weight:800;

            cursor:pointer;

            box-shadow:
                0 8px 22px
                rgba(0,144,144,.25);

            transition:
                transform .15s ease,
                filter .15s ease,
                box-shadow .15s ease;

        }


        .denrin-donation-reload:hover{

            filter:
                brightness(1.05);

            box-shadow:
                0 10px 28px
                rgba(0,144,144,.30);

        }


        .denrin-donation-reload:active{

            transform:
                scale(.98);

        }


        @media(max-width:480px){

            .denrin-donation-box{

                width:100%;
                max-width:100%;

                padding:
                    30px
                    30px
                    28px;

                border-radius:23px;

            }

            .denrin-donation-title{

                font-size:27px;

            }

            .denrin-donation-text{

                max-width:300px;

            }

        }

    `;

    document.head.appendChild(
        style
    );

}

injectDonationSuccessStyle();


/* =========================================
   CẬP NHẬT TIẾN ĐỘ + LỊCH SỬ + BỘ ĐẾM
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


        /* =================================
           CẬP NHẬT BỘ ĐẾM
        ================================= */

        updateDonationCount(
            history,
            data
        );


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


        renderHistory(history);


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

        qrResult.style.display =
            "";

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


                    showDonationSuccess(
                        Number(
                            data?.donor?.amount ||
                            amount
                        )
                    );


                    await updateProgress();

                }

            }catch(error){

                console.warn(
                    "Payment check error:",
                    error
                );

            }

        };


    check();


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

        qrResult.style.display =
            "";

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