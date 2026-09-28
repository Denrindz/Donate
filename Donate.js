(function(){
    "use strict";
    /* =========================================
       THÔNG TIN THẬT TỪ FILE GỐC
    ========================================= */
    const BANK = {
        stk: "09637164106868",
        name: "MB Bank",
        vietqrBin: "970422"
    };
    const API_BASE =
        "https://doante-api.tnt300709.workers.dev";
    const CHECK_API =
        `${API_BASE}/check`;
    const HISTORY_API =
        `${API_BASE}/history`;
    /* =========================================
       CẤU HÌNH
    ========================================= */
    const MIN =
        10000;
    const EXPIRY_MS =
        10 * 60 * 1000;
    const POLL_MS =
        3000;
    const DONATION_TARGET =
        1000000;
    /* =========================================
       DOM
    ========================================= */
    const $ =
        selector =>
            document.querySelector(selector);
    const ov =
        $("#popupOverlay");
    const openBtn =
        $("#openPopup");
    const closeBtn =
        $("#pClose");
    const pForm =
        $("#pForm");
    const pSuccess =
        $("#pSuccess");
    const pNotice =
        $("#pNotice");
    const nameInput =
        $("#pName");
    const amtInput =
        $("#pAmount");
    const amtWrap =
        $("#pAmountWrap");
    const submitBtn =
        $("#pSubmit");
    const pErr =
        $("#pErr");
    const qrBox =
        $("#qrBox");
    const qrImage =
        $("#qrImage");
    const psNote =
        $("#psNote");
    const payStatus =
        $("#payStatus");
    const payStatusText =
        $("#payStatusText");
    const doneBtn =
        $("#pDone");
    const retryBtn =
        $("#pRetry");
    const cancelBtn =
        $("#pCancel");
    const copyBtn =
        $("#copyStk");
    const chips = [
        ...document.querySelectorAll(
            ".p-chips button"
        )
    ];
    /* =========================================
       STATE
    ========================================= */
    let amount = 0;
    let paid = false;
    let expiryTimer = null;
    let paymentTimer = null;
    let currentCode = "";
    /* =========================================
       FORMAT TIỀN
    ========================================= */
    function fmt(number){
        return Math.round(
            Number(number) || 0
        ).toLocaleString("vi-VN");
    }
    function money(number){
        return fmt(number) + " ₫";
    }
    /* =========================================
       PROGRESS
    ========================================= */
    async function loadDonationProgress(){
        try{
            const response =
                await fetch(
                    HISTORY_API,
                    {
                        cache:"no-store"
                    }
                );
            if(!response.ok){
                throw new Error(
                    "HTTP " +
                    response.status
                );
            }
            const data =
                await response.json();
            let total = 0;
            /*
             * API có thể trả về nhiều dạng.
             * Hàm này lấy tổng từ các giao dịch
             * nếu API trả về danh sách.
             */
            if(
                data &&
                Array.isArray(data)
            ){
                total =
                    data.reduce(
                        (sum,item) =>
                            sum +
                            Number(
                                item.amount
                            ),
                        0
                    );
            }
            else if(
                data &&
                Array.isArray(data.history)
            ){
                total =
                    data.history.reduce(
                        (sum,item) =>
                            sum +
                            Number(
                                item.amount
                            ),
                        0
                    );
            }
            else if(
                data &&
                typeof data.total === "number"
            ){
                total =
                    data.total;
            }
            updateProgress(total);
        }
        catch(error){
            console.warn(
                "History API error:",
                error
            );
            updateProgress(0);
        }
    }
    function updateProgress(total){
        const safeTotal =
            Math.max(
                0,
                Number(total) || 0
            );
        const percent =
            Math.min(
                100,
                (
                    safeTotal /
                    DONATION_TARGET
                ) * 100
            );
        const totalElement =
            $("#totalDonated");
        const percentElement =
            $("#donationPercent");
        const fillElement =
            $("#progressFill");
        const remainingElement =
            $("#remainingDonated");
        if(totalElement){
            totalElement.textContent =
                money(safeTotal);
        }
        if(percentElement){
            percentElement.textContent =
                percent
                    .toFixed(1)
                    .replace(".",",") +
                "%";
        }
        if(fillElement){
            fillElement.style.width =
                percent + "%";
        }
        if(remainingElement){
            remainingElement.textContent =
                money(
                    Math.max(
                        0,
                        DONATION_TARGET -
                        safeTotal
                    )
                );
        }
    }
    /* =========================================
       LỊCH SỬ ỦNG HỘ
    ========================================= */
    async function loadSupporters(){
        const list =
            $("#supportersList");
        if(!list){
            return;
        }
        try{
            const response =
                await fetch(
                    HISTORY_API,
                    {
                        cache:"no-store"
                    }
                );
            if(!response.ok){
                throw new Error(
                    "HTTP " +
                    response.status
                );
            }
            const data =
                await response.json();
            let history = [];
            if(
                Array.isArray(data)
            ){
                history = data;
            }
            else if(
                data &&
                Array.isArray(data.history)
            ){
                history =
                    data.history;
            }
            else if(
                data &&
                Array.isArray(data.transactions)
            ){
                history =
                    data.transactions;
            }
            history =
                history
                    .slice()
                    .reverse()
                    .slice(0,5);
            list.innerHTML = "";
            history.forEach(
                item => {
                    const name =
                        item.name ||
                        item.sender ||
                        "Người ẩn danh";
                    const itemAmount =
                        Number(
                            item.amount
                        ) || 0;
                    const avatar =
                        name
                            .trim()
                            .charAt(0)
                            .toUpperCase();
                    const row =
                        document.createElement(
                            "div"
                        );
                    row.className =
                        "supporter-row";
                    row.innerHTML = `
                        <div class="supporter-avatar">
                            ${escapeHTML(avatar)}
                        </div>
                        <div class="supporter-info">
                            <div class="supporter-name">
                                ${escapeHTML(name)}
                            </div>
                            <div class="supporter-time">
                                ${formatTime(item)}
                            </div>
                        </div>
                        <div class="supporter-amount">
                            +${money(itemAmount)}
                        </div>
                    `;
                    list.appendChild(row);
                }
            );
        }
        catch(error){
            console.warn(
                "History API error:",
                error
            );
        }
    }
    function formatTime(item){
        if(item.time){
            return escapeHTML(
                String(item.time)
            );
        }
        if(item.createdAt){
            const date =
                new Date(
                    item.createdAt
                );
            if(!Number.isNaN(
                date.getTime()
            )){
                return date.toLocaleString(
                    "vi-VN",
                    {
                        day:"2-digit",
                        month:"2-digit",
                        hour:"2-digit",
                        minute:"2-digit"
                    }
                );
            }
        }
        return "Vừa xong";
    }
    function escapeHTML(value){
        return String(value)
            .replaceAll("&","&amp;")
            .replaceAll("<","&lt;")
            .replaceAll(">","&gt;")
            .replaceAll('"',"&quot;")
            .replaceAll("'","&#039;");
    }
    /* =========================================
       OPEN POPUP
    ========================================= */
    function openPopup(){
        if(!ov){
            return;
        }
        ov.hidden =
            false;
        requestAnimationFrame(
            () => {
                ov.classList.add(
                    "show"
                );
            }
        );
        document.body.style.overflow =
            "hidden";
        setTimeout(
            () => {
                if(nameInput){
                    nameInput.focus();
                }
            },
            250
        );
    }
    /* =========================================
       CLOSE POPUP
    ========================================= */
    function closePopup(){
        if(!ov){
            return;
        }
        ov.classList.remove(
            "show"
        );
        stopExpiry();
        stopPaymentWatch();
        setTimeout(
            () => {
                ov.hidden =
                    true;
                resetForm();
            },
            250
        );
        document.body.style.overflow =
            "";
    }
    /* =========================================
       RESET
    ========================================= */
    function resetForm(){
        stopExpiry();
        stopPaymentWatch();
        amount = 0;
        paid = false;
        currentCode = "";
        if(pForm){
            pForm.hidden =
                false;
        }
        if(pSuccess){
            pSuccess.hidden =
                true;
        }
        if(nameInput){
            nameInput.value =
                "";
        }
        if(amtInput){
            amtInput.value =
                "";
        }
        if(pErr){
            pErr.hidden =
                true;
        }
        if(qrImage){
            qrImage.removeAttribute(
                "src"
            );
        }
        if(qrBox){
            qrBox.classList.remove(
                "expired",
                "paid"
            );
        }
        chips.forEach(
            chip =>
                chip.classList.remove(
                    "on"
                )
        );
        if(submitBtn){
            submitBtn.disabled =
                false;
            submitBtn.textContent =
                "Tạo mã ủng hộ";
        }
        if(doneBtn){
            doneBtn.hidden =
                false;
            doneBtn.disabled =
                true;
            doneBtn.textContent =
                "Chưa nhận được tiền";
        }
        if(retryBtn){
            retryBtn.hidden =
                true;
        }
        if(cancelBtn){
            cancelBtn.hidden =
                false;
        }
        setPayStatus(
            "wait",
            "Đang chờ chuyển khoản…"
        );
    }
    /* =========================================
       AMOUNT
    ========================================= */
    function setAmount(value){
        amount =
            Number(value) || 0;
        if(amtInput){
            amtInput.value =
                amount
                    ? fmt(amount)
                    : "";
        }
        chips.forEach(
            chip => {
                chip.classList.toggle(
                    "on",
                    Number(
                        chip.dataset.amount
                    ) === amount
                );
            }
        );
        hideError();
    }
    chips.forEach(
        chip => {
            chip.addEventListener(
                "click",
                () => {
                    setAmount(
                        chip.dataset.amount
                    );
                }
            );
        }
    );
    if(amtInput){
        amtInput.addEventListener(
            "input",
            () => {
                const digits =
                    amtInput.value
                        .replace(/\D/g,"")
                        .slice(0,9);
                amount =
                    digits
                        ? Number(digits)
                        : 0;
                amtInput.value =
                    digits
                        ? fmt(amount)
                        : "";
                chips.forEach(
                    chip => {
                        chip.classList.toggle(
                            "on",
                            Number(
                                chip.dataset.amount
                            ) === amount
                        );
                    }
                );
                hideError();
            }
        );
    }
    function showError(message){
        if(pErr){
            pErr.textContent =
                message;
            pErr.hidden =
                false;
        }
    }
    function hideError(){
        if(pErr){
            pErr.hidden =
                true;
        }
    }
    /* =========================================
       GENERATE QR
    ========================================= */
    if(submitBtn){
        submitBtn.addEventListener(
            "click",
            async () => {
                const name =
                    nameInput &&
                    nameInput.value.trim()
                        ? nameInput.value.trim()
                        : "Người ẩn danh";
                if(amount < MIN){
                    showError(
                        `Số tiền tối thiểu là ${fmt(MIN)}₫ nhé.`
                    );
                    return;
                }
                submitBtn.disabled =
                    true;
                submitBtn.textContent =
                    "Đang tạo mã…";
                const now =
                    Date.now();
                currentCode =
                    "DXM-" +
                    String(now).slice(-6);
                const date =
                    new Date();
                if($("#psName")){
                    $("#psName").textContent =
                        name;
                }
                if($("#psCode")){
                    $("#psCode").textContent =
                        currentCode;
                }
                if($("#psStk")){
                    $("#psStk").textContent =
                        BANK.stk;
                }
                if($("#psBank")){
                    $("#psBank").textContent =
                        BANK.name;
                }
                if($("#psTime")){
                    $("#psTime").textContent =
                        date.toLocaleTimeString(
                            "vi-VN",
                            {
                                hour:"2-digit",
                                minute:"2-digit",
                                second:"2-digit"
                            }
                        ) +
                        " · " +
                        date.toLocaleDateString(
                            "vi-VN"
                        );
                }
                /*
                 * QR VIETQR
                 *
                 * MB Bank BIN:
                 * 970422
                 */
                const qrURL =
                    "https://img.vietqr.io/image/" +
                    BANK.vietqrBin +
                    "-" +
                    encodeURIComponent(
                        BANK.stk
                    ) +
                    "-qr_only.png" +
                    "?amount=" +
                    encodeURIComponent(
                        amount
                    ) +
                    "&addInfo=" +
                    encodeURIComponent(
                        currentCode
                    );
                if(qrImage){
                    qrImage.src =
                        qrURL;
                }
                if(pForm){
                    pForm.hidden =
                        true;
                }
                if(pSuccess){
                    pSuccess.hidden =
                        false;
                }
                if($("#psAmount")){
                    $("#psAmount").textContent =
                        money(amount);
                }
                paid = false;
                startExpiry();
                startPaymentWatch({
                    amount,
                    code:
                        currentCode,
                    name
                });
                submitBtn.disabled =
                    false;
            }
        );
    }
    /* =========================================
       TIMER
    ========================================= */
    function stopExpiry(){
        if(expiryTimer){
            clearInterval(
                expiryTimer
            );
            expiryTimer =
                null;
        }
    }
    function startExpiry(){
        stopExpiry();
        const end =
            Date.now() +
            EXPIRY_MS;
        if(qrBox){
            qrBox.classList.remove(
                "expired",
                "paid"
            );
        }
        expiryTimer =
            setInterval(
                () => {
                    const left =
                        end -
                        Date.now();
                    if(left <= 0){
                        stopExpiry();
                        stopPaymentWatch();
                        if(qrBox){
                            qrBox.classList.add(
                                "expired"
                            );
                        }
                        if(psNote){
                            psNote.textContent =
                                "Mã đã hết hạn — tạo mã mới để ủng hộ tiếp nhé.";
                        }
                        setPayStatus(
                            "dead",
                            "Hết thời gian chờ — chưa nhận được tiền."
                        );
                        if(doneBtn){
                            doneBtn.hidden =
                                true;
                        }
                        if(retryBtn){
                            retryBtn.hidden =
                                false;
                        }
                        if(cancelBtn){
                            cancelBtn.hidden =
                                true;
                        }
                        return;
                    }
                    const seconds =
                        Math.ceil(
                            left / 1000
                        );
                    const count =
                        $("#psCount");
                    if(count){
                        count.textContent =
                            String(
                                Math.floor(
                                    seconds / 60
                                )
                            ).padStart(
                                2,
                                "0"
                            ) +
                            ":" +
                            String(
                                seconds % 60
                            ).padStart(
                                2,
                                "0"
                            );
                    }
                },
                250
            );
    }
    /* =========================================
       CHECK PAYMENT API
    ========================================= */
    function stopPaymentWatch(){
        if(paymentTimer){
            clearInterval(
                paymentTimer
            );
            paymentTimer =
                null;
        }
    }
    function startPaymentWatch(payment){
        stopPaymentWatch();
        setPayStatus(
            "wait",
            "Đang chờ chuyển khoản…"
        );
        let checking =
            false;
        async function checkPayment(){
            if(
                checking ||
                paid
            ){
                return;
            }
            checking =
                true;
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
                                    code:
                                        payment.code,
                                    amount:
                                        payment.amount,
                                    name:
                                        payment.name
                                })
                        }
                    );
                if(!response.ok){
                    throw new Error(
                        `HTTP ${response.status}`
                    );
                }
                const data =
                    await response.json();
                if(
                    data &&
                    data.ok === true &&
                    data.paid === true
                ){
                    const transactionAmount =
                        Number(
                            data.transaction &&
                            data.transaction.amount
                        ) ||
                        payment.amount;
                    markPaid(
                        transactionAmount
                    );
                }
            }
            catch(error){
                console.warn(
                    "Payment check error:",
                    error
                );
            }
            finally{
                checking =
                    false;
            }
        }
        checkPayment();
        paymentTimer =
            setInterval(
                checkPayment,
                POLL_MS
            );
    }
    /* =========================================
       PAID
    ========================================= */
    function markPaid(receivedAmount){
        paid =
            true;
        stopPaymentWatch();
        stopExpiry();
        if(qrBox){
            qrBox.classList.add(
                "paid"
            );
        }
        setPayStatus(
            "ok",
            `Đã nhận được ${money(receivedAmount)} — cảm ơn bạn nhiều!`
        );
        if(psNote){
            psNote.textContent =
                "Giao dịch hoàn tất.";
        }
        if(doneBtn){
            doneBtn.disabled =
                false;
            doneBtn.textContent =
                "Hoàn tất";
        }
        if(cancelBtn){
            cancelBtn.hidden =
                true;
        }
        /*
         * Sau khi thanh toán thành công,
         * tải lại lịch sử + tổng donate.
         */
        setTimeout(
            () => {
                loadSupporters();
                loadDonationProgress();
            },
            1000
        );
    }
    /* =========================================
       COPY STK
    ========================================= */
    if(copyBtn){
        copyBtn.addEventListener(
            "click",
            async () => {
                try{
                    await navigator.clipboard.writeText(
                        BANK.stk
                    );
                    copyBtn.textContent =
                        "Đã copy";
                    setTimeout(
                        () => {
                            copyBtn.textContent =
                                "Copy";
                        },
                        1500
                    );
                }
                catch(error){
                    console.warn(
                        error
                    );
                }
            }
        );
    }
    /* =========================================
       DONE
    ========================================= */
    if(doneBtn){
        doneBtn.addEventListener(
            "click",
            () => {
                if(paid){
                    closePopup();
                }
            }
        );
    }
    /* =========================================
       RETRY
    ========================================= */
    if(retryBtn){
        retryBtn.addEventListener(
            "click",
            () => {
                resetForm();
            }
        );
    }
    /* =========================================
       CANCEL
    ========================================= */
    if(cancelBtn){
        cancelBtn.addEventListener(
            "click",
            () => {
                stopExpiry();
                stopPaymentWatch();
                if(pSuccess){
                    pSuccess.hidden =
                        true;
                }
                if(pForm){
                    pForm.hidden =
                        false;
                }
                if(pNotice){
                    pNotice.textContent =
                        "Đã huỷ giao dịch — chưa có khoản nào được ghi nhận.";
                    pNotice.hidden =
                        false;
                }
            }
        );
    }
    /* =========================================
       EVENTS POPUP
    ========================================= */
    if(openBtn){
        openBtn.addEventListener(
            "click",
            openPopup
        );
    }
    if(closeBtn){
        closeBtn.addEventListener(
            "click",
            closePopup
        );
    }
    if(ov){
        ov.addEventListener(
            "click",
            event => {
                if(
                    event.target === ov
                ){
                    closePopup();
                }
            }
        );
    }
    window.addEventListener(
        "keydown",
        event => {
            if(
                event.key === "Escape" &&
                ov &&
                !ov.hidden
            ){
                closePopup();
            }
        }
    );
    /* =========================================
       INIT
    ========================================= */
    loadDonationProgress();
    loadSupporters();
})();