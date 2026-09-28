const BANK_ID = “970422”;
const ACCOUNT_NO = “09637164106868”;
const BANK_NAME = “MB Bank”;

const PROJECT_TARGET = 1000000;

let received = 0;
let currentContent = “”;

let timerInterval = null;
let paymentCheckInterval = null;

/* =========================================
API
========================================= */

const API_BASE =
“https://doante-api.tnt300709.workers.dev”;

const CHECK_API =
${API_BASE}/check;

const HISTORY_API =
${API_BASE}/history;

/* =========================================
FORMAT TIỀN
========================================= */

function formatNumber(number){
return new Intl.NumberFormat(“vi-VN”)
.format(Number(number) || 0);
}

function formatMoney(number){
return formatNumber(number) + “ ₫”;
}

/* =========================================
FORMAT Ô NHẬP TIỀN
10000 -> 10.000
========================================= */

function formatAmountInput(input){

if(!input){
    return;
}
let value =
    String(input.value || "")
        .replace(/\D/g, "");
if(!value){
    input.value = "";
    return;
}
value =
    value.replace(/^0+(?=\d)/, "");
input.value =
    formatNumber(Number(value));

}

/* =========================================
KHỞI TẠO Ô TIỀN
========================================= */

document.addEventListener(“DOMContentLoaded”, () => {

const amountInput =
    document.getElementById(
        "donationAmount"
    );
if(amountInput){
    amountInput.addEventListener(
        "input",
        () => {
            formatAmountInput(
                amountInput
            );
        }
    );
    amountInput.addEventListener(
        "keydown",
        (event) => {
            const allowedKeys = [
                "Backspace",
                "Delete",
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
                "End",
                "Tab"
            ];
            if(
                allowedKeys.includes(
                    event.key
                )
            ){
                return;
            }
            if(
                event.ctrlKey ||
                event.metaKey
            ){
                return;
            }
            if(!/^\d$/.test(event.key)){
                event.preventDefault();
            }
        }
    );
}

});

/* =========================================
PROGRESS
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

const input =
    document.getElementById(
        "donationAmount"
    );
if(!input){
    return;
}
input.value =
    formatNumber(amount);
input.focus();

}

/* =========================================
LẤY SỐ TIỀN THỰC
10.000 -> 10000
========================================= */

function getDonationAmount(){

const input =
    document.getElementById(
        "donationAmount"
    );
if(!input){
    return 0;
}
return Number(
    String(input.value || "")
        .replace(/\./g,"")
        .replace(/\D/g,"")
) || 0;

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
    getDonationAmount();
if(!name){
    alert(
        "Vui lòng nhập tên hiển thị."
    );
    document
        .getElementById("donorName")
        .focus();
    return;
}
if(
    !amount ||
    amount < 10000
){
    alert(
        "Số tiền tối thiểu là 10.000đ."
    );
    document
        .getElementById(
            "donationAmount"
        )
        .focus();
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
    .src =
    qrURL;
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
if(
    !navigator.clipboard
){
    return;
}
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
check();
paymentCheckInterval =
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
        clearInterval(
            paymentCheckInterval
        );
        if(timer){
            timer.textContent =
                "Hết hạn";
        }
        if(status){
            status.textContent =
                "Mã đã hết hạn.";
            status.classList.remove(
                "paid"
            );
            status.classList.add(
                "expired"
            );
        }
        return;
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
clearInterval(
    paymentCheckInterval
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