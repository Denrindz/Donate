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
   LẤY THỜI GIAN DONATE
========================================= */

function getDonationTime(item){

    /*
       Ưu tiên các trường thời gian thường gặp
    */

    const value =
        item.time ??
        item.createdAt ??
        item.created_at ??
        item.timestamp ??
        item.datetime ??
        item.date ??
        item.created;


    if(
        value === undefined ||
        value === null ||
        value === ""
    ){

        return 0;

    }


    /*
       Nếu API trả timestamp dạng số
    */

    if(typeof value === "number"){

        /*
           10 chữ số = giây
           13 chữ số = milliseconds
        */

        if(value < 10000000000){

            return value * 1000;

        }

        return value;

    }


    /*
       Nếu timestamp là chuỗi số
    */

    if(
        typeof value === "string" &&
        /^\d+$/.test(value.trim())
    ){

        const number =
            Number(value.trim());


        if(number < 10000000000){

            return number * 1000;

        }

        return number;

    }


    /*
       Nếu API trả ISO date hoặc
       chuỗi ngày giờ bình thường
    */

    const parsed =
        new Date(value).getTime();


    if(Number.isNaN(parsed)){

        return 0;

    }


    return parsed;

}


/* =========================================
   HIỂN THỊ THỜI GIAN
========================================= */

function formatDonationTime(item){

    const timestamp =
        getDonationTime(item);


    /*
       Nếu API thật sự không có thời gian
       thì không bịa ngày giờ.
    */

    if(!timestamp){

        return "Thời gian không có dữ liệu";

    }


    const date =
        new Date(timestamp);


    if(Number.isNaN(date.getTime())){

        return "Thời gian không hợp lệ";

    }


    return date.toLocaleString(
        "vi-VN",
        {
            timeZone:"Asia/Ho_Chi_Minh",
            day:"2-digit",
            month:"2-digit",
            year:"numeric",
            hour:"2-digit",
            minute:"2-digit",
            second:"2-digit",
            hour12:false
        }
    );

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
   CHỈ 5 NGƯỜI GẦN NHẤT
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
       Chỉ lấy giao dịch donate DXM.
       Sau đó sắp xếp mới nhất trước.
       Cuối cùng chỉ lấy 5 người.
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
            .sort((a,b) => {

                return (
                    getDonationTime(b) -
                    getDonationTime(a)
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
            item.donorName ||
            "Ẩn danh";


        const amount =
            Number(item.amount) || 0;


        const timeText =
            formatDonationTime(item);


        const firstLetter =
            String(name)
                .trim()
                .charAt(0)
                .toUpperCase() || "D";


        const supporter =
            document.createElement("div");


        supporter.className =
            "supporter";


        /*
           KHÔNG HIỂN THỊ:
           - mã DXM
           - code giao dịch
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
           LẤY TỔNG TỪ API
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
           Không cho dữ liệu API cũ
           làm tổng tiền bị tụt.
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
        document.getElementById("modal");


    if(modal){

        modal.classList.add("show");

    }

}


/* =========================================
   ĐÓNG MODAL
========================================= */

function closeModal(){

    const modal =
        document.getElementById("modal");


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
       DỪNG CŨ
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
       TẠO MÃ
    ===================================== */

    const randomCode =
        Math.floor(
            100000 +
            Math.random() * 900000
        );


    currentContent =
        "DXM-" + randomCode;


    /* =====================================
       THÔNG TIN QR
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
                       Cộng tiền ngay trên giao diện.
                    */

                    received =
                        Math.max(
                            received,
                            0
                        ) + amount;


                    renderProgress();


                    /*
                       Đợi server cập nhật rồi
                       lấy lại lịch sử.
                    */

                    setTimeout(() => {

                        updateProgress();

                    },5000);


                    setTimeout(() => {

                        updateProgress();

                    },8000);

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