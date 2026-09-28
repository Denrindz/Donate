const API_BASE =
  "https://doante-api.tnt300709.workers.dev";
const CHECK_API =
  `${API_BASE}/check`;
const HISTORY_API =
  `${API_BASE}/history`;
const BANK_BIN = "970422";
const ACCOUNT_NUMBER = "09637164106868";
const MIN_AMOUNT = 10000;
const TARGET_AMOUNT = 1000000;
const QR_EXPIRE_MINUTES = 10;
/* =========================
   ELEMENTS
========================= */
const amountInput =
  document.getElementById("amount");
const donateBtn =
  document.getElementById("donateBtn");
const qrSection =
  document.getElementById("qrSection");
const qrImage =
  document.getElementById("qrImage");
const qrAmount =
  document.getElementById("qrAmount");
const transferContent =
  document.getElementById("transferContent");
const closeQr =
  document.getElementById("closeQr");
const checkPayment =
  document.getElementById("checkPayment");
const paymentStatus =
  document.getElementById("paymentStatus");
const accountNumber =
  document.getElementById("accountNumber");
const historyList =
  document.getElementById("historyList");
const refreshHistory =
  document.getElementById("refreshHistory");
const receivedAmount =
  document.getElementById("receivedAmount");
const progressBar =
  document.getElementById("progressBar");
const copyAccount =
  document.getElementById("copyAccount");
const copyContent =
  document.getElementById("copyContent");
let currentAmount = 0;
let currentTransferContent = "";
let checkInterval = null;
/* =========================
   FORMAT MONEY
========================= */
function formatMoney(value) {
  return Number(value || 0).toLocaleString("vi-VN") + "₫";
}
/* =========================
   RANDOM CONTENT
========================= */
function generateTransferContent() {
  const random =
    Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
  return `DENRINDZ ${random}`;
}
/* =========================
   QUICK AMOUNTS
========================= */
document
  .querySelectorAll(".amount-btn")
  .forEach(button => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll(".amount-btn")
        .forEach(btn =>
          btn.classList.remove("active")
        );
      button.classList.add("active");
      amountInput.value =
        button.dataset.amount;
    });
  });
/* =========================
   CREATE QR
========================= */
function createQR(amount, content) {
  const encodedContent =
    encodeURIComponent(content);
  const url =
    `https://img.vietqr.io/image/` +
    `${BANK_BIN}-${ACCOUNT_NUMBER}-qr_only.png` +
    `?amount=${amount}` +
    `&addInfo=${encodedContent}`;
  qrImage.src = url;
}
/* =========================
   OPEN DONATION
========================= */
donateBtn.addEventListener("click", () => {
  const amount =
    Number(amountInput.value);
  if (!amount || amount < MIN_AMOUNT) {
    paymentStatus.textContent =
      `Số tiền tối thiểu là ${formatMoney(MIN_AMOUNT)}.`;
    paymentStatus.className =
      "payment-status error";
    qrSection.classList.remove("hidden");
    qrSection.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
    return;
  }
  currentAmount = amount;
  currentTransferContent =
    generateTransferContent();
  qrAmount.textContent =
    formatMoney(amount);
  transferContent.textContent =
    currentTransferContent;
  accountNumber.textContent =
    ACCOUNT_NUMBER;
  createQR(
    amount,
    currentTransferContent
  );
  paymentStatus.textContent = "";
  paymentStatus.className =
    "payment-status";
  qrSection.classList.remove("hidden");
  qrSection.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
  startPaymentChecking();
});
/* =========================
   CLOSE QR
========================= */
closeQr.addEventListener("click", () => {
  qrSection.classList.add("hidden");
  stopPaymentChecking();
});
/* =========================
   COPY
========================= */
async function copyText(
  text,
  button
) {
  try {
    await navigator.clipboard.writeText(text);
    const oldText =
      button.textContent;
    button.textContent =
      "Đã sao chép";
    setTimeout(() => {
      button.textContent =
        oldText;
    }, 1500);
  } catch {
    alert("Không thể sao chép.");
  }
}
copyAccount.addEventListener(
  "click",
  () => copyText(
    ACCOUNT_NUMBER,
    copyAccount
  )
);
copyContent.addEventListener(
  "click",
  () => copyText(
    currentTransferContent,
    copyContent
  )
);
/* =========================
   CHECK PAYMENT
========================= */
async function checkPaymentStatus() {
  if (!currentAmount) {
    return;
  }
  try {
    const response =
      await fetch(
        CHECK_API,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            amount: currentAmount,
            content:
              currentTransferContent,
            account:
              ACCOUNT_NUMBER
          })
        }
      );
    if (!response.ok) {
      throw new Error(
        "Không thể kiểm tra giao dịch."
      );
    }
    const data =
      await response.json();
    if (
      data.success === true ||
      data.paid === true ||
      data.status === "success"
    ) {
      paymentStatus.textContent =
        "Đã nhận được giao dịch. Cảm ơn bạn đã ủng hộ!";
      paymentStatus.className =
        "payment-status success";
      stopPaymentChecking();
      loadHistory();
      return;
    }
    paymentStatus.textContent =
      "Chưa nhận được giao dịch. Hệ thống sẽ tiếp tục kiểm tra...";
    paymentStatus.className =
      "payment-status";
  } catch (error) {
    paymentStatus.textContent =
      "Đang chờ hệ thống xác nhận giao dịch...";
    paymentStatus.className =
      "payment-status";
  }
}
checkPayment.addEventListener(
  "click",
  checkPaymentStatus
);
/* =========================
   AUTO CHECK
========================= */
function startPaymentChecking() {
  stopPaymentChecking();
  checkInterval =
    setInterval(
      checkPaymentStatus,
      5000
    );
}
function stopPaymentChecking() {
  if (checkInterval) {
    clearInterval(
      checkInterval
    );
    checkInterval = null;
  }
}
/* =========================
   HISTORY
========================= */
async function loadHistory() {
  historyList.innerHTML =
    `<div class="loading">
      Đang tải lịch sử...
    </div>`;
  try {
    const response =
      await fetch(HISTORY_API);
    if (!response.ok) {
      throw new Error(
        "History API error"
      );
    }
    const data =
      await response.json();
    let history = [];
    if (Array.isArray(data)) {
      history = data;
    } else if (Array.isArray(data.history)) {
      history = data.history;
    } else if (Array.isArray(data.data)) {
      history = data.data;
    }
    history =
      history.slice(0, 5);
    renderHistory(history);
  } catch (error) {
    historyList.innerHTML =
      `<div class="empty-history">
        Chưa thể tải lịch sử ủng hộ.
      </div>`;
  }
}
/* =========================
   RENDER HISTORY
========================= */
function renderHistory(history) {
  if (!history.length) {
    historyList.innerHTML =
      `<div class="empty-history">
        Chưa có lượt ủng hộ nào.
      </div>`;
    updateProgress(0);
    return;
  }
  historyList.innerHTML =
    history.map(item => {
      const name =
        item.name ||
        item.sender ||
        item.from ||
        "Ẩn danh";
      const amount =
        Number(
          item.amount ||
          item.value ||
          0
        );
      const time =
        item.time ||
        item.createdAt ||
        item.date ||
        "";
      return `
        <div class="history-item">
          <div class="donor">
            <div class="donor-name">
              ${escapeHTML(name)}
            </div>
            <div class="donor-time">
              ${escapeHTML(
                formatTime(time)
              )}
            </div>
          </div>
          <div class="donor-amount">
            +${formatMoney(amount)}
          </div>
        </div>
      `;
    }).join("");
  const total =
    history.reduce(
      (sum, item) =>
        sum +
        Number(
          item.amount ||
          item.value ||
          0
        ),
      0
    );
  updateProgress(total);
}
/* =========================
   PROGRESS
========================= */
function updateProgress(total) {
  const percentage =
    Math.min(
      (total / TARGET_AMOUNT) * 100,
      100
    );
  receivedAmount.textContent =
    formatMoney(total);
  progressBar.style.width =
    `${percentage}%`;
}
/* =========================
   TIME
========================= */
function formatTime(value) {
  if (!value) {
    return "Gần đây";
  }
  const date =
    new Date(value);
  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }
  return date.toLocaleString(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}
/* =========================
   ESCAPE HTML
========================= */
function escapeHTML(value) {
  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}
/* =========================
   REFRESH HISTORY
========================= */
refreshHistory.addEventListener(
  "click",
  loadHistory
);
/* =========================
   INIT
========================= */
loadHistory();