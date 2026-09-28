/* =========================================
   CẤU HÌNH DONATE
========================================= */

const BANK_ID = "970422";
const ACCOUNT_NO = "09637164106868";
const BANK_NAME = "MB Bank";

const PROJECT_TARGET = 1000000;

let received = 0;
let currentContent = "";
let timerInterval;


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
                method: "GET",
                cache: "no-store"
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
                        (sum, item) =>
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
            Math.max(0, total);

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
                .replace(".", ",") +
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

    if(
        event.target.id === "modal"
    ){

        closeModal();

    }

}


/* =========================================
   CHỌN NHANH SỐ TIỀN
========================================= */

function setAmount(amount){

    document
        .getElementById("donationAmount")
        .value = amount;

}


/* =========================================
   TẠO QR
========================================= */

function generateQR(){

    const name =
        document
            .getElementById("donorName")
            .value
            .trim();


    const amount =
        Number(
            document
                .getElementById("donationAmount")
                .value
        );


    if(!name){

        alert(
            "Vui lòng nhập tên hiển thị."
        );

        return;
    }


    /* File thật quy định tối thiểu 10.000đ */

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

    document
        .getElementById("qrAmount")
        .textContent =
        formatMoney(amount);


    document
        .getElementById("qrName")
        .textContent =
        name;


    document
        .getElementById("qrContent")
        .textContent =
        currentContent;


    document
        .getElementById("qrStk")
        .textContent =
        ACCOUNT_NO;


    document
        .getElementById("qrTime")
        .textContent =
        new Date()
            .toLocaleString("vi-VN");


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


    document
        .getElementById("qrImage")
        .src = qrURL;


    /* =====================================
       CHUYỂN SANG MÀN QR
    ===================================== */

    document
        .getElementById("formArea")
        .style.display = "none";


    document
        .getElementById("qrResult")
        .classList.add("show");


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

    const stk =
        ACCOUNT_NO;


    navigator.clipboard
        .writeText(stk)
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

            }, 1500);

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
        timerInterval
    );


    const check =
        async () => {

            try{

                const response =
                    await fetch(
                        CHECK_API,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    code: code,
                                    amount: amount,
                                    name: name,
                                    message: code
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
                        timerInterval
                    );


                    const status =
                        document
                            .getElementById(
                                "paymentStatus"
                            );


                    if(status){

                        status.textContent =
                            `✓ Đã nhận ${formatMoney(amount)} — cảm ơn bạn!`;

                        status.classList.add(
                            "paid"
                        );

                    }


                    /* Cập nhật lại tổng donate */

                    setTimeout(() => {

                        updateProgress();

                    }, 1000);

                }

            }catch(error){

                console.warn(
                    "Payment check error:",
                    error
                );

            }

        };


    check();


    /* API thật kiểm tra mỗi 3 giây */

    timerInterval =
        setInterval(
            check,
            3000
        );

}


/* =========================================
   TIMER 10 PHÚT
========================================= */

function startTimer(){

    clearInterval(
        timerInterval
    );


    let seconds =
        10 * 60;


    const timer =
        document.getElementById(
            "timer"
        );


    function tick(){

        const minutes =
            Math.floor(
                seconds / 60
            );


        const sec =
            seconds % 60;


        if(timer){

            timer.textContent =
                String(minutes)
                    .padStart(2,"0")
                +
                ":"
                +
                String(sec)
                    .padStart(2,"0");

        }


        if(seconds <= 0){

            clearInterval(
                timerInterval
            );


            if(timer){

                timer.textContent =
                    "Hết hạn";

            }


            const status =
                document.getElementById(
                    "paymentStatus"
                );


            if(status){

                status.textContent =
                    "Mã đã hết hạn.";

                status.classList.add(
                    "expired"
                );

            }

        }


        seconds--;

    }


    tick();


    timerInterval =
        setInterval(
            tick,
            1000
        );

}


/* =========================================
   TẠO MÃ MỚI
========================================= */

function newCode(){

    clearInterval(
        timerInterval
    );


    document
        .getElementById("qrResult")
        .classList.remove("show");


    document
        .getElementById("formArea")
        .style.display = "";


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

}