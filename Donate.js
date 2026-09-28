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
   TIMER
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
   CHUYỂN GIÁ TRỊ THỜI GIAN THÀNH TIMESTAMP
========================================= */

function parseTimeValue(value){

    if(
        value === undefined ||
        value === null ||
        value === ""
    ){

        return 0;

    }


    /* Timestamp dạng number */

    if(typeof value === "number"){

        if(value <= 0){
            return 0;
        }

        return value < 10000000000
            ? value * 1000
            : value;

    }


    const text =
        String(value).trim();


    if(!text){
        return 0;
    }


    /* Timestamp dạng chuỗi số */

    if(/^\d+$/.test(text)){

        const number =
            Number(text);

        if(number <= 0){
            return 0;
        }

        return number < 10000000000
            ? number * 1000
            : number;

    }


    /*
       ISO / Date string
    */

    let timestamp =
        Date.parse(text);


    if(!Number.isNaN(timestamp)){
        return timestamp;
    }


    /*
       Hỗ trợ dạng:
       DD/MM/YYYY HH:mm:ss
       DD/MM/YYYY HH:mm
    */

    const match =
        text.match(
            /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
        );


    if(match){

        const day =
            Number(match[1]);

        const month =
            Number(match[2]);

        const year =
            Number(match[3]);

        const hour =
            Number(match[4] || 0);

        const minute =
            Number(match[5] || 0);

        const second =
            Number(match[6] || 0);


        timestamp =
            new Date(
                year,
                month - 1,
                day,
                hour,
                minute,
                second
            ).getTime();


        if(!Number.isNaN(timestamp)){
            return timestamp;
        }

    }


    return 0;

}


/* =========================================
   TÌM THỜI GIAN TRONG OBJECT
========================================= */

function findDonationTimestamp(item){

    if(!item || typeof item !== "object"){
        return 0;
    }


    /*
       Những tên trường thời gian phổ biến.
       KHÔNG bao gồm code giao dịch.
    */

    const timeKeys = [

        "time",
        "timestamp",

        "createdAt",
        "created_at",
        "created",

        "date",
        "datetime",
        "dateTime",

        "transactionTime",
        "transaction_time",

        "transactionDate",
        "transaction_date",

        "paidAt",
        "paid_at",

        "paymentTime",
        "payment_time",

        "transferTime",
        "transfer_time",

        "transferredAt",
        "transferred_at",

        "completedAt",
        "completed_at",

        "processedAt",
        "processed_at",

        "occurredAt",
        "occurred_at"

    ];


    /*
       Ưu tiên các field trực tiếp.
    */

    for(const key of timeKeys){

        if(
            Object.prototype.hasOwnProperty.call(
                item,
                key
            )
        ){

            const timestamp =
                parseTimeValue(
                    item[key]
                );


            if(timestamp){
                return timestamp;
            }

        }

    }


    /*
       Một số API có object lồng bên trong:
       transaction.createdAt
       payment.time
       data.timestamp...
    */

    const nestedKeys = [
        "transaction",
        "payment",
        "transfer",
        "bank",
        "data",
        "details",
        "metadata"
    ];


    for(const key of nestedKeys){

        if(
            item[key] &&
            typeof item[key] === "object"
        ){

            const timestamp =
                findDonationTimestamp(
                    item[key]
                );


            if(timestamp){
                return timestamp;
            }

        }

    }


    return 0;

}


/* =========================================
   THỜI GIAN TƯƠNG ĐỐI
========================================= */

function formatRelativeTime(timestamp){

    if(!timestamp){

        return "Vừa xong";

    }


    const now =
        Date.now();


    let diff =
        now - timestamp;


    /*
       Nếu server lệch vài giây/phút
       thì không cho ra số âm.
    */

    if(diff < 0){
        diff = 0;
    }


    const seconds =
        Math.floor(
            diff / 1000
        );


    const minutes =
        Math.floor(
            seconds / 60
        );


    const hours =
        Math.floor(
            minutes / 60
        );


    const days =
        Math.floor(
            hours / 24
        );


    if(seconds < 10){

        return "Vừa xong";

    }


    if(seconds < 60){

        return `${seconds} giây trước`;

    }


    if(minutes < 60){

        return `${minutes} phút trước`;

    }


    if(hours < 24){

        return `${hours} giờ trước`;

    }


    return `${days} ngày trước`;

}


/* =========================================
   PROGRESS
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
   LỊCH SỬ DONATE
   CHỈ HIỆN 5 NGƯỜI GẦN NHẤT
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


    /*
       Lọc giao dịch donate.
    */

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
            .map(item => {

                return {

                    original:item,

                    timestamp:
                        findDonationTimestamp(item)

                };

            })
            .sort((a,b) => {

                return (
                    b.timestamp -
                    a.timestamp
                );

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


    supporterList.innerHTML = "";


    /* =====================================
       HIỂN THỊ
    ===================================== */

    donations.forEach(entry => {

        const item =
            entry.original;


        /*
           Tên người donate.
        */

        const name =
            item.name ||
            item.donor ||
            item.donorName ||
            item.displayName ||
            item.username ||
            "Ẩn danh";


        /*
           Số tiền.
        */

        const amount =
            Number(
                item.amount
            ) || 0;


        /*
           Thời gian tương đối.
        */

        const timeText =
            formatRelativeTime(
                entry.timestamp
            );


        /*
           Chữ cái avatar.
        */

        const firstLetter =
            String(name)
                .trim()
                .charAt(0)
                .toUpperCase() || "D";


        const supporter =
            document.createElement(
                "div"
            );


        supporter.className =
            "supporter";


        /*
           QUAN TRỌNG:
           Không đưa item.code vào HTML.
           Không đưa mã giao dịch vào lịch sử.
        */

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
   CẬP NHẬT PROGRESS + HISTORY
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
           TỔNG TIỀN
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

        }
        else if(
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
           Không để API cũ làm tụt số tiền
           đang hiển thị.
        */

        received =
            Math.max(
                received,
                Number(serverTotal) || 0
            );


        /* =====================================
           LỊCH SỬ
        ===================================== */

        if(
            data &&
            Array.isArray(data.history)
        ){

            renderHistory(
                data.history
            );

        }

    }
    catch(error){

        console.warn(
            "Không lấy được lịch sử donate:",
            error
        );

    }


    renderProgress();

}


/* =========================================
   LOAD BAN ĐẦU
========================================= */

updateProgress();


/* =========================================
   MỞ MODAL
========================================= */

function openModal(){

    const modal =
        document.getElementById(
            "modal"
        );


    if(modal){

        modal.classList.add("show");

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

        modal.classList.remove("show");

    }

}


/* =========================================
   CLICK NGOÀI MODAL
========================================= */

function outsideClose(event){

    if(event.target.id === "modal"){

        closeModal();

    }

}


/* =========================================
   CHỌN NHANH TIỀN
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
   FORMAT INPUT TIỀN
========================================= */

const donationInput =
    document.getElementById(
        "donationAmount"
    );


if(donationInput){

    donationInput.addEventListener(
        "input",
        function(){

            const value =
                this.value.replace(
                    /\D/g,
                    ""
                );


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


    /* =====================================
       MÃ GIAO DỊCH
       Chỉ dùng cho API/QR,
       KHÔNG HIỂN THỊ TRONG LỊCH SỬ.
    ===================================== */

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
            new Date().toLocaleString(
                "vi-VN",
                {
                    timeZone:
                        "Asia/Ho_Chi_Minh"
                }
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
       HIỆN QR
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


                    /*
                       Cộng ngay vào tổng.
                    */

                    received =
                        Math.max(
                            received,
                            0
                        ) + amount;


                    renderProgress();


                    /*
                       Cho server thời gian ghi lịch sử.
                    */

                    setTimeout(
                        updateProgress,
                        5000
                    );


                    setTimeout(
                        updateProgress,
                        8000
                    );

                }

            }
            catch(error){

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


    countdownEndTime =
        Date.now() +
        (10 * 60 * 1000);


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


        const remaining =
            Math.max(
                0,
                countdownEndTime -
                Date.now()
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
                String(minutes)
                    .padStart(2,"0") +
                ":" +
                String(seconds)
                    .padStart(2,"0");

        }


        if(remaining <= 0){

            clearInterval(
                countdownInterval
            );

            countdownInterval = null;

            countdownEndTime = null;


            clearInterval(
                paymentCheckInterval
            );

            paymentCheckInterval = null;


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