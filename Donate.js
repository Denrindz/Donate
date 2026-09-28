(function () {
  'use strict';

  /* =========================================================
     TIỆN ÍCH CHUNG
  ========================================================= */

  const $ = (s) => document.querySelector(s);

  const fmt = (n) =>
    Math.round(Number(n) || 0).toLocaleString('vi-VN');

  const reduceMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const store = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value == null ? fallback : JSON.parse(value);
      } catch (e) {
        return fallback;
      }
    },

    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {}
    }
  };

  /* =========================================================
     THÔNG TIN TÀI KHOẢN
  ========================================================= */

  const BANK = {
    stk: '09637164106868',
    name: 'MB Bank'
  };

  /* =========================================================
     API
  ========================================================= */

  const API_BASE =
    'https://doante-api.tnt300709.workers.dev';

  const CHECK_API =
    `${API_BASE}/check`;

  const HISTORY_API =
    `${API_BASE}/history`;

  /* =========================================================
     FONT
  ========================================================= */

  const globalFontStyle =
    document.createElement('style');

  globalFontStyle.textContent = `
    html,
    body,
    button,
    input,
    textarea,
    select,
    a,
    span,
    p,
    div,
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "SF Pro Display",
        "SF Pro Text",
        "Helvetica Neue",
        Arial,
        sans-serif !important;
    }

    h1,
    h2,
    h3,
    h4 {
      font-weight: 700 !important;
      letter-spacing: -0.5px !important;
    }

    button {
      font-weight: 600 !important;
      letter-spacing: -0.2px !important;
    }

    input,
    textarea,
    select {
      font-weight: 400 !important;
    }
  `;

  document.head.appendChild(globalFontStyle);

  /* =========================================================
     STYLE LỊCH SỬ ỦNG HỘ
  ========================================================= */

  const supporterStyle =
    document.createElement('style');

  supporterStyle.textContent = `
    .supporter-row {
      display: flex !important;
      align-items: center !important;
      width: 100% !important;
      gap: 14px !important;
    }

    .supporter-avatar {
      flex: 0 0 56px !important;
      width: 56px !important;
      height: 56px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .supporter-info {
      flex: 1 1 auto !important;
      min-width: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-start !important;
      justify-content: center !important;
      gap: 3px !important;
    }

    .supporter-name {
      display: block !important;
      width: 100% !important;
      margin: 0 !important;
      font-size: 17px !important;
      line-height: 1.15 !important;
      font-weight: 700 !important;
      color: #111 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    .supporter-time {
      display: block !important;
      margin: 0 !important;
      font-size: 12px !important;
      line-height: 1.2 !important;
      font-weight: 500 !important;
      color: #999 !important;
      white-space: nowrap !important;
    }

    .supporter-amount {
      flex: 0 0 auto !important;
      margin-left: auto !important;
      white-space: nowrap !important;
      font-size: 14px !important;
      line-height: 1.2 !important;
      font-weight: 700 !important;
    }
  `;

  document.head.appendChild(supporterStyle);

  /* =========================================================
     BĂNG CHỮ CHẠY
  ========================================================= */

  document.querySelectorAll('.mq-track').forEach((track) => {
    const text = track.dataset.text || '';

    const html = text.replaceAll(
      '◆',
      '<b>◆</b>'
    );

    track.innerHTML =
      `<span>${html.repeat(4)}</span>` +
      `<span aria-hidden="true">${html.repeat(4)}</span>`;
  });

  /* =========================================================
     CẤU HÌNH
  ========================================================= */

  const MIN = 10000;

  const EXPIRY_MS =
    10 * 60 * 1000;

  const SPAM_WINDOW =
    60000;

  const SPAM_MAX =
    3;

  const COOL_MS =
    30000;

  const POLL_MS =
    3000;

  /* =========================================================
     MỤC TIÊU ỦNG HỘ
  ========================================================= */

  const DONATION_TARGET =
    1000000;

  /* =========================================================
     DOM
  ========================================================= */

  const ov = $('#popupOverlay');
  const openBtn = $('#openPopup');
  const closeBtn = $('#pClose');

  const pForm = $('#pForm');
  const pSuccess = $('#pSuccess');
  const pNotice = $('#pNotice');

  const nameInput = $('#pName');
  const amtInput = $('#pAmount');
  const amtWrap = $('#pAmountWrap');
  const msgInput = $('#pMsg');
  const submitBtn = $('#pSubmit');

  const chips = [
    ...document.querySelectorAll('.p-chips button')
  ];

  const pErr = $('#pErr');
  const qrBox = $('#qrBox');
  const psNote = $('#psNote');

  const payStatus = $('#payStatus');
  const payStatusText = $('#payStatusText');

  const doneBtn = $('#pDone');
  const retryBtn = $('#pRetry');
  const cancelBtn = $('#pCancel');

  const copyBtn = $('#copyStk');

  const qrImage = $('#qrImage');

  /* =========================================================
     TRẠNG THÁI
  ========================================================= */

  let amt = 0;

  let expTimer = null;
  let coolTimer = null;
  let payTimer = null;

  let paid = false;

  let cancelArmed = false;
  let cancelArmTimer = null;

  /* =========================================================
     CHỐNG SPAM
  ========================================================= */

  let genTimes = store
    .get('dxm_qrgen', [])
    .filter(
      (time) =>
        Date.now() - Number(time) < SPAM_WINDOW
    );

  let coolUntil =
    Number(
      store.get('dxm_cool', 0)
    ) || 0;

  if (coolUntil <= Date.now()) {
    coolUntil = 0;
  }

  function startCooldown(ms) {
    clearInterval(coolTimer);

    const end =
      Date.now() + ms;

    const tick = () => {
      const left =
        Math.max(
          0,
          Math.ceil(
            (end - Date.now()) / 1000
          )
        );

      if (submitBtn) {
        submitBtn.disabled =
          left > 0;

        submitBtn.textContent =
          left > 0
            ? `Chờ ${left}s…`
            : 'Tạo mã ủng hộ';
      }

      if (left <= 0) {
        clearInterval(coolTimer);
        coolTimer = null;

        hideErr();
      }
    };

    tick();

    coolTimer =
      setInterval(
        tick,
        250
      );
  }

  function syncCooldownUI() {
    if (
      coolUntil > Date.now() &&
      !coolTimer
    ) {
      startCooldown(
        coolUntil - Date.now()
      );
    }
  }

  /* =========================================================
     MỞ / ĐÓNG POPUP
  ========================================================= */

  function openPopup() {
    if (!ov) return;

    ov.hidden = false;

    requestAnimationFrame(() => {
      ov.classList.add('show');
    });

    document.body.style.overflow = 'hidden';

    syncCooldownUI();

    setTimeout(() => {
      if (nameInput) {
        nameInput.focus();
      }
    }, 320);
  }

  function closePopup() {
    if (!ov) return;

    ov.classList.remove('show');

    stopExpiry();
    stopPayWatch();
    disarmCancel();

    setTimeout(() => {
      ov.hidden = true;
      resetForm();
    }, 300);

    document.body.style.overflow = '';
  }

  window.openDonationPopup =
    openPopup;

  function resetForm() {
    if (pSuccess) {
      pSuccess.hidden = true;
    }

    if (pForm) {
      pForm.hidden = false;
    }

    if (pNotice) {
      pNotice.hidden = true;
    }

    amt = 0;

    if (amtInput) {
      amtInput.value = '';
    }

    if (msgInput) {
      msgInput.value = '';
    }

    if (nameInput) {
      nameInput.value = '';
    }

    chips.forEach((chip) => {
      chip.classList.remove('on');
    });

    if (qrBox) {
      qrBox.classList.remove(
        'expired',
        'paid'
      );
    }

    if (qrImage) {
      qrImage.removeAttribute('src');
    }

    if (psNote) {
      psNote.innerHTML =
        'Mã hết hạn sau <b id="psCount">10:00</b>';
    }

    setPayStatus(
      'wait',
      'Đang chờ chuyển khoản…'
    );

    hideErr();

    if (doneBtn) {
      doneBtn.hidden = false;
      doneBtn.disabled = true;
      doneBtn.textContent =
        'Chưa nhận được tiền';
    }

    if (retryBtn) {
      retryBtn.hidden = true;
    }

    if (cancelBtn) {
      cancelBtn.hidden = false;
    }

    disarmCancel();

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent =
        'Tạo mã ủng hộ';
    }

    syncCooldownUI();
  }

  /* =========================================================
     EVENT POPUP
  ========================================================= */

  if (openBtn) {
    openBtn.addEventListener(
      'click',
      openPopup
    );
  }

  if (closeBtn) {
    closeBtn.addEventListener(
      'click',
      closePopup
    );
  }

  if (ov) {
    ov.addEventListener(
      'click',
      (event) => {
        if (event.target === ov) {
          closePopup();
        }
      }
    );
  }

  window.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key === 'Escape' &&
        ov &&
        !ov.hidden
      ) {
        closePopup();
      }
    }
  );

  /* =========================================================
     MOBILE KEYBOARD
  ========================================================= */

  if (ov) {
    ov.addEventListener(
      'focusin',
      (event) => {
        if (
          event.target.classList &&
          event.target.classList.contains('p-input')
        ) {
          setTimeout(() => {
            event.target.scrollIntoView({
              block: 'center',
              behavior: 'smooth'
            });
          }, 280);
        }
      }
    );
  }

  /* =========================================================
     SỐ TIỀN
  ========================================================= */

  function showErr(message) {
    if (pErr) {
      pErr.textContent = message;
      pErr.hidden = false;
    }

    if (amtWrap) {
      amtWrap.classList.add('err');
    }
  }

  function hideErr() {
    if (pErr) {
      pErr.hidden = true;
    }

    if (amtWrap) {
      amtWrap.classList.remove('err');
    }
  }

  function setAmount(
    value,
    fromChip = false
  ) {
    amt =
      Number(value) || 0;

    if (amtInput) {
      amtInput.value =
        amt ? fmt(amt) : '';
    }

    chips.forEach((chip) => {
      chip.classList.toggle(
        'on',
        Number(chip.dataset.amount) === amt
      );
    });

    if (!fromChip) {
      hideErr();
    }
  }

  chips.forEach((chip) => {
    chip.addEventListener(
      'click',
      () => {
        setAmount(
          Number(chip.dataset.amount),
          true
        );

        hideErr();

        if (amtInput) {
          amtInput.focus();
        }
      }
    );
  });

  if (amtInput) {
    amtInput.addEventListener(
      'input',
      () => {
        const digits =
          amtInput.value
            .replace(/\D/g, '')
            .slice(0, 9);

        setAmount(
          digits ? Number(digits) : 0
        );
      }
    );

    amtInput.addEventListener(
      'blur',
      () => {
        if (
          amtInput.value &&
          amt < MIN
        ) {
          showErr(
            `Số tiền tối thiểu là ${fmt(MIN)}₫ nhé.`
          );
        }
      }
    );
  }

  /* =========================================================
     TRẠNG THÁI THANH TOÁN
  ========================================================= */

  function setPayStatus(
    kind,
    text
  ) {
    if (!payStatus || !payStatusText) {
      return;
    }

    payStatus.classList.remove(
      'ok',
      'dead'
    );

    if (kind !== 'wait') {
      payStatus.classList.add(kind);
    }

    payStatusText.textContent =
      text;
  }

  /* =========================================================
     TIMER HẾT HẠN
  ========================================================= */

  function stopExpiry() {
    if (expTimer) {
      clearInterval(expTimer);
      expTimer = null;
    }
  }

  function startExpiry() {
    stopExpiry();

    if (qrBox) {
      qrBox.classList.remove(
        'expired',
        'paid'
      );
    }

    if (psNote) {
      psNote.innerHTML =
        'Mã hết hạn sau <b id="psCount">10:00</b>';
    }

    const end =
      Date.now() + EXPIRY_MS;

    expTimer =
      setInterval(
        () => {
          const left =
            end - Date.now();

          if (left <= 0) {
            stopExpiry();
            stopPayWatch();

            if (qrBox) {
              qrBox.classList.add(
                'expired'
              );
            }

            if (psNote) {
              psNote.textContent =
                'Mã đã hết hạn — tạo mã mới để ủng hộ tiếp nhé.';
            }

            setPayStatus(
              'dead',
              'Hết thời gian chờ — chưa nhận được tiền.'
            );

            if (doneBtn) {
              doneBtn.hidden = true;
            }

            if (retryBtn) {
              retryBtn.hidden = false;
            }

            if (cancelBtn) {
              cancelBtn.hidden = true;
            }

            disarmCancel();

            return;
          }

          const seconds =
            Math.ceil(
              left / 1000
            );

          const count =
            $('#psCount');

          if (count) {
            count.textContent =
              String(
                Math.floor(seconds / 60)
              ).padStart(2, '0') +
              ':' +
              String(
                seconds % 60
              ).padStart(2, '0');
          }
        },
        250
      );
  }

  /* =========================================================
     KIỂM TRA THANH TOÁN
  ========================================================= */

  function stopPayWatch() {
    if (payTimer) {
      clearInterval(payTimer);
      payTimer = null;
    }
  }

  function startPayWatch(payment) {
    stopPayWatch();

    setPayStatus(
      'wait',
      'Đang chờ chuyển khoản…'
    );

    let checking = false;

    async function checkPayment() {
      if (
        checking ||
        paid
      ) {
        return;
      }

      checking = true;

      try {
        const response =
          await fetch(
            CHECK_API,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body: JSON.stringify({
                code:
                  payment.code,

                amount:
                  payment.amount,

                name:
                  payment.name,

                message:
                  payment.message
              })
            }
          );

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}`
          );
        }

        const data =
          await response.json();

        if (
          data &&
          data.ok === true &&
          data.paid === true
        ) {
          stopPayWatch();

          const transactionAmount =
            Number(
              data.transaction &&
              data.transaction.amount
            ) || payment.amount;

          markPaid({
            amount:
              transactionAmount,

            code:
              payment.code
          });
        }

      } catch (error) {
        console.warn(
          'Payment check error:',
          error
        );
      } finally {
        checking = false;
      }
    }

    checkPayment();

    payTimer =
      setInterval(
        checkPayment,
        POLL_MS
      );
  }

  /* =========================================================
     ĐÁNH DẤU ĐÃ THANH TOÁN
  ========================================================= */

  function markPaid(payment) {
    paid = true;

    stopPayWatch();
    stopExpiry();

    if (qrBox) {
      qrBox.classList.add('paid');
    }

    if (psNote) {
      psNote.textContent =
        'Giao dịch hoàn tất · ' +
        new Date().toLocaleTimeString(
          'vi-VN',
          {
            hour: '2-digit',
            minute: '2-digit'
          }
        );
    }

    setPayStatus(
      'ok',
      `Đã nhận được ${fmt(payment.amount)}₫ — cảm ơn bạn nhiều!`
    );

    if (doneBtn) {
      doneBtn.disabled = false;
      doneBtn.textContent =
        'Hoàn tất';
    }

    if (cancelBtn) {
      cancelBtn.hidden = true;
    }

    disarmCancel();

    capyRain();

    setTimeout(() => {
      loadSupporters();
      loadDonationProgress();
    }, 1000);
  }

  /* =========================================================
     HOÀN TẤT
  ========================================================= */

  if (doneBtn) {
    doneBtn.addEventListener(
      'click',
      () => {
        if (paid) {
          closePopup();
        }
      }
    );
  }

  /* =========================================================
     TẠO MÃ MỚI
  ========================================================= */

  if (retryBtn) {
    retryBtn.addEventListener(
      'click',
      () => {
        stopPayWatch();
        stopExpiry();

        paid = false;

        if (pSuccess) {
          pSuccess.hidden = true;
        }

        if (pForm) {
          pForm.hidden = false;
        }

        if (pNotice) {
          pNotice.hidden = true;
        }

        if (qrBox) {
          qrBox.classList.remove(
            'expired',
            'paid'
          );
        }

        if (qrImage) {
          qrImage.removeAttribute('src');
        }

        setPayStatus(
          'wait',
          'Đang chờ chuyển khoản…'
        );

        if (doneBtn) {
          doneBtn.hidden = false;
          doneBtn.disabled = true;
          doneBtn.textContent =
            'Chưa nhận được tiền';
        }

        retryBtn.hidden = true;

        if (cancelBtn) {
          cancelBtn.hidden = false;
        }

        syncCooldownUI();
      }
    );
  }

  /* =========================================================
     HUỶ GIAO DỊCH
  ========================================================= */

  function disarmCancel() {
    cancelArmed = false;

    if (cancelBtn) {
      cancelBtn.classList.remove(
        'armed'
      );

      cancelBtn.textContent =
        'Huỷ giao dịch';
    }

    if (cancelArmTimer) {
      clearTimeout(cancelArmTimer);
      cancelArmTimer = null;
    }
  }

  if (cancelBtn) {
    cancelBtn.addEventListener(
      'click',
      () => {
        if (!cancelArmed) {
          cancelArmed = true;

          cancelBtn.classList.add(
            'armed'
          );

          cancelBtn.textContent =
            'Bấm lần nữa để xác nhận huỷ';

          cancelArmTimer =
            setTimeout(
              disarmCancel,
              3500
            );

          return;
        }

        stopPayWatch();
        stopExpiry();

        paid = false;

        disarmCancel();

        if (pSuccess) {
          pSuccess.hidden = true;
        }

        if (pForm) {
          pForm.hidden = false;
        }

        if (pNotice) {
          pNotice.textContent =
            'Đã huỷ giao dịch — chưa có khoản nào được ghi nhận. Bạn có thể tạo mã mới bất cứ lúc nào.';

          pNotice.hidden = false;
        }

        if (qrBox) {
          qrBox.classList.remove(
            'expired',
            'paid'
          );
        }

        if (qrImage) {
          qrImage.removeAttribute('src');
        }

        setPayStatus(
          'wait',
          'Đang chờ chuyển khoản…'
        );

        if (doneBtn) {
          doneBtn.hidden = false;
          doneBtn.disabled = true;
          doneBtn.textContent =
            'Chưa nhận được tiền';
        }

        if (retryBtn) {
          retryBtn.hidden = true;
        }

        cancelBtn.hidden = false;

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent =
            'Tạo mã ủng hộ';
        }

        syncCooldownUI();
      }
    );
  }

  /* =========================================================
     COPY SỐ TÀI KHOẢN
  ========================================================= */

  function copyText(text) {
    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      return navigator.clipboard.writeText(
        text
      );
    }

    const textarea =
      document.createElement('textarea');

    textarea.value = text;

    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';

    document.body.appendChild(
      textarea
    );

    textarea.select();

    try {
      document.execCommand('copy');
    } catch (e) {}

    textarea.remove();

    return Promise.resolve();
  }

  if (copyBtn) {
    copyBtn.addEventListener(
      'click',
      () => {
        copyText(BANK.stk)
          .then(() => {
            copyBtn.textContent =
              'Đã copy';

            copyBtn.classList.add('ok');

            setTimeout(() => {
              copyBtn.textContent =
                'Copy';

              copyBtn.classList.remove(
                'ok'
              );
            }, 1600);
          })
          .catch(() => {});
      }
    );
  }

  /* =========================================================
     TẠO MÃ ỦNG HỘ
  ========================================================= */

  if (submitBtn) {
    submitBtn.addEventListener(
      'click',
      () => {
        const now = Date.now();

        if (now < coolUntil) {
          return;
        }

        if (amt < MIN) {
          hideErr();

          if (amtWrap) {
            void amtWrap.offsetWidth;
          }

          showErr(
            `Số tiền tối thiểu là ${fmt(MIN)}₫ nhé.`
          );

          if (amtInput) {
            amtInput.focus();
          }

          return;
        }

        genTimes =
          genTimes.filter(
            (time) =>
              now - Number(time) <
              SPAM_WINDOW
          );

        if (
          genTimes.length >=
          SPAM_MAX
        ) {
          coolUntil =
            now + COOL_MS;

          store.set(
            'dxm_cool',
            coolUntil
          );

          showErr(
            'Phát hiện spam — bạn tạo mã quá nhanh, vui lòng chờ 30 giây.'
          );

          startCooldown(
            COOL_MS
          );

          return;
        }

        genTimes.push(now);

        store.set(
          'dxm_qrgen',
          genTimes
        );

        const name =
          nameInput &&
          nameInput.value.trim()
            ? nameInput.value.trim()
            : 'Người ẩn danh';

        const msg =
          msgInput
            ? msgInput.value.trim()
            : '';

        const code =
          'DXM-' +
          String(now).slice(-6);

        const date =
          new Date();

        paid = false;

        const psName = $('#psName');
        const psCode = $('#psCode');
        const psStk = $('#psStk');
        const psTime = $('#psTime');

        if (psName) {
          psName.textContent =
            name;
        }

        if (psCode) {
          psCode.textContent =
            code;
        }

        if (psStk) {
          psStk.textContent =
            BANK.stk;
        }

        if (psTime) {
          psTime.textContent =
            date.toLocaleTimeString(
              'vi-VN',
              {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }
            ) +
            ' · ' +
            date.toLocaleDateString(
              'vi-VN'
            );
        }

        const bankRow =
          $('#psBankRow');

        if (bankRow) {
          if (BANK.name) {
            bankRow.hidden = false;

            const psBank =
              $('#psBank');

            if (psBank) {
              psBank.textContent =
                BANK.name;
            }
          } else {
            bankRow.hidden = true;
          }
        }

        const msgRow =
          $('#psMsgRow');

        if (msgRow) {
          if (msg) {
            msgRow.hidden = false;

            const psMsg =
              $('#psMsg');

            if (psMsg) {
              psMsg.textContent =
                msg;
            }
          } else {
            msgRow.hidden = true;
          }
        }

        if (pForm) {
          pForm.hidden = true;
        }

        if (pNotice) {
          pNotice.hidden = true;
        }

        if (pSuccess) {
          pSuccess.hidden = false;
        }

        /* =====================================================
           VIETQR MB BANK
        ===================================================== */

        const qrUrl =
          'https://img.vietqr.io/image/970422-' +
          encodeURIComponent(BANK.stk) +
          '-qr_only.png' +
          '?amount=' +
          encodeURIComponent(amt) +
          '&addInfo=' +
          encodeURIComponent(code);

        if (qrImage) {
          qrImage.src = qrUrl;
        }

        countUp(
          $('#psAmount'),
          0,
          amt,
          1000,
          '₫'
        );

        setPayStatus(
          'wait',
          'Đang chờ chuyển khoản…'
        );

        startExpiry();

        startPayWatch({
          amount: amt,
          code: code,
          name: name,
          message: msg
        });
      }
    );
  }

  /* =========================================================
     COUNT UP
  ========================================================= */

  function countUp(
    element,
    from,
    to,
    duration,
    suffix
  ) {
    if (!element) {
      return;
    }

    const start =
      performance.now();

    function animate(time) {
      const progress =
        Math.min(
          1,
          (time - start) /
          duration
        );

      const easing =
        1 -
        Math.pow(
          1 - progress,
          3
        );

      const value =
        from +
        (to - from) *
        easing;

      element.textContent =
        fmt(value) +
        (suffix || '');

      if (progress < 1) {
        requestAnimationFrame(
          animate
        );
      }
    }

    requestAnimationFrame(
      animate
    );
  }

  /* =========================================================
     AVATAR
  ========================================================= */

  function getInitial(name) {
    const value =
      String(name || '')
        .trim();

    if (!value) {
      return 'Đ';
    }

    return value
      .charAt(0)
      .toUpperCase();
  }

  /* =========================================================
     FORMAT THỜI GIAN
  ========================================================= */

  function formatHistoryTime(value) {
    if (!value) {
      return '';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '';
    }

    return (
      date.toLocaleDateString(
        'vi-VN',
        {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }
      ) +
      ' • ' +
      date.toLocaleTimeString(
        'vi-VN',
        {
          hour: '2-digit',
          minute: '2-digit'
        }
      )
    );
  }

  /* =========================================================
     LẤY DỮ LIỆU LỊCH SỬ
  ========================================================= */

  async function fetchHistory() {
    const response =
      await fetch(
        HISTORY_API,
        {
          method: 'GET',
          cache: 'no-store'
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    if (
      !data ||
      data.ok !== true ||
      !Array.isArray(data.history)
    ) {
      throw new Error(
        'Dữ liệu lịch sử không hợp lệ'
      );
    }

    return data;
  }

  /* =========================================================
     TIẾN ĐỘ ỦNG HỘ
  ========================================================= */

  async function loadDonationProgress() {
    const totalEl =
      document.getElementById(
        'totalDonated'
      );

    const percentEl =
      document.getElementById(
        'donationPercent'
      );

    const fillEl =
      document.getElementById(
        'progressFill'
      );

    const remainingEl =
      document.getElementById(
        'remainingDonated'
      );

    if (
      !totalEl ||
      !percentEl ||
      !fillEl ||
      !remainingEl
    ) {
      return;
    }

    try {
      const data =
        await fetchHistory();

      /*
       * ƯU TIÊN:
       * Nếu Worker trả về tổng tiền thật
       * bằng data.total thì dùng trực tiếp.
       *
       * Ví dụ:
       * {
       *   ok: true,
       *   total: 3207777,
       *   history: [...]
       * }
       */

      let total;

      if (
        data.total !== undefined &&
        data.total !== null &&
        Number.isFinite(
          Number(data.total)
        )
      ) {
        total =
          Number(data.total);
      } else {

        /*
         * Fallback:
         * Nếu API chưa có total,
         * cộng những giao dịch DXM
         * mà API trả về.
         */

        const history =
          data.history.filter((item) => {
            const code =
              String(
                item.code || ''
              )
                .trim()
                .toUpperCase();

            return code.startsWith('DXM');
          });

        total =
          history.reduce(
            (sum, item) => {
              return (
                sum +
                (Number(item.amount) || 0)
              );
            },
            0
          );
      }

      /*
       * Không cho tổng âm.
       */

      total =
        Math.max(
          0,
          total
        );

      /*
       * Tính còn lại.
       */

      const remaining =
        Math.max(
          0,
          DONATION_TARGET - total
        );

      /*
       * Tính phần trăm.
       */

      const percent =
        Math.min(
          100,
          (total / DONATION_TARGET) * 100
        );

      /*
       * Hiển thị tổng tiền.
       */

      totalEl.textContent =
        `${fmt(total)} ₫`;

      /*
       * Hiển thị tiền còn thiếu.
       */

      remainingEl.textContent =
        `${fmt(remaining)} ₫`;

      /*
       * Hiển thị phần trăm.
       */

      percentEl.textContent =
        `${percent.toLocaleString('vi-VN', {
          minimumFractionDigits:
            percent % 1 === 0 ? 0 : 1,
          maximumFractionDigits: 1
        })}%`;

      /*
       * Thanh tiến độ.
       */

      requestAnimationFrame(() => {
        fillEl.style.width =
          `${percent}%`;
      });

    } catch (error) {

      console.warn(
        'LOAD DONATION PROGRESS ERROR:',
        error
      );
    }
  }

  /* =========================================================
     LỊCH SỬ 5 NGƯỜI GẦN NHẤT
  ========================================================= */

  async function loadSupporters() {
    const list =
      document.getElementById(
        'supportersList'
      );

    if (!list) {
      return;
    }

    try {

      const data =
        await fetchHistory();

      const history =
        data.history
          .filter((item) => {

            const code =
              String(
                item.code || ''
              )
                .trim()
                .toUpperCase();

            return code.startsWith(
              'DXM'
            );
          })
          .slice(0, 5);

      list.replaceChildren();

      if (!history.length) {
        return;
      }

      history.forEach((item) => {

        const donorName =
          String(
            item.name ||
            'Người ẩn danh'
          ).trim() ||
          'Người ẩn danh';

        const initial =
          getInitial(
            donorName
          );

        const timeText =
          formatHistoryTime(
            item.when
          );

        const amount =
          Number(
            item.amount || 0
          );

        const row =
          document.createElement(
            'div'
          );

        row.className =
          'supporter-row';

        const avatar =
          document.createElement(
            'div'
          );

        avatar.className =
          'supporter-avatar';

        avatar.textContent =
          initial;

        const info =
          document.createElement(
            'div'
          );

        info.className =
          'supporter-info';

        const name =
          document.createElement(
            'strong'
          );

        name.className =
          'supporter-name';

        name.textContent =
          donorName;

        const time =
          document.createElement(
            'span'
          );

        time.className =
          'supporter-time';

        time.textContent =
          timeText;

        info.appendChild(name);
        info.appendChild(time);

        const money =
          document.createElement(
            'b'
          );

        money.className =
          'supporter-amount';

        money.textContent =
          `+${fmt(amount)}₫`;

        row.append(
          avatar,
          info,
          money
        );

        list.appendChild(
          row
        );
      });

    } catch (error) {

      console.warn(
        'LOAD SUPPORTERS ERROR:',
        error
      );
    }
  }

  /* =========================================================
     LOAD DỮ LIỆU BAN ĐẦU
  ========================================================= */

  loadSupporters();
  loadDonationProgress();

  /* =========================================================
     TỰ CẬP NHẬT MỖI 30 GIÂY
  ========================================================= */

  setInterval(
    () => {
      loadSupporters();
      loadDonationProgress();
    },
    30000
  );

  /* =========================================================
     HIỆU ỨNG CAPYBARA
  ========================================================= */

  const cv = $('#fx');

  if (!cv) {
    const initialStk =
      $('#psStk');

    if (initialStk) {
      initialStk.textContent =
        BANK.stk;
    }

    return;
  }

  const cx =
    cv.getContext('2d');

  if (!cx) {
    const initialStk =
      $('#psStk');

    if (initialStk) {
      initialStk.textContent =
        BANK.stk;
    }

    return;
  }

  let caps = [];

  let rafId = null;

  function fit() {
    cv.width =
      window.innerWidth;

    cv.height =
      window.innerHeight;
  }

  fit();

  window.addEventListener(
    'resize',
    fit
  );

  window.addEventListener(
    'orientationchange',
    () => {
      setTimeout(
        fit,
        250
      );
    }
  );

  const CAPY_PAIRS = [
    ['#A9744F', '#7E5233'],
    ['#96633F', '#6E4426'],
    ['#B98357', '#8A5A38']
  ];

  const pick = (array) =>
    array[
      Math.floor(
        Math.random() *
        array.length
      )
    ];

  function rr(
    context,
    x,
    y,
    w,
    h,
    r
  ) {
    context.beginPath();

    if (context.roundRect) {
      context.roundRect(
        x,
        y,
        w,
        h,
        r
      );

      return;
    }

    context.moveTo(
      x + r,
      y
    );

    context.arcTo(
      x + w,
      y,
      x + w,
      y + h,
      r
    );

    context.arcTo(
      x + w,
      y + h,
      x,
      y + h,
      r
    );

    context.arcTo(
      x,
      y + h,
      x,
      y,
      r
    );

    context.arcTo(
      x,
      y,
      x + w,
      y,
      r
    );

    context.closePath();
  }

  function capyRain() {
    const small =
      Math.min(
        cv.width,
        cv.height
      ) < 700;

    const count =
      reduceMotion
        ? 30
        : small
          ? 70
          : 120;

    for (
      let i = 0;
      i < count;
      i++
    ) {
      const pair =
        pick(CAPY_PAIRS);

      caps.push({
        x:
          Math.random() *
          cv.width,

        y:
          -30 -
          Math.random() *
          cv.height *
          0.6,

        vy:
          2.2 +
          Math.random() *
          3.4,

        vx:
          -1 +
          Math.random() *
          2,

        r:
          4.5 +
          Math.random() *
          7,

        ph:
          Math.random() *
          Math.PI *
          2,

        phv:
          0.12 +
          Math.random() *
          0.22,

        tilt:
          Math.random() *
          Math.PI *
          2,

        tv:
          (-0.5 +
          Math.random()) *
          0.12,

        kind:
          Math.random() < 0.72
            ? 'capy'
            : 'orange',

        tint:
          pair[0],

        dark:
          pair[1]
      });
    }

    if (!rafId) {
      tick();
    }
  }

  function tick() {
    rafId =
      requestAnimationFrame(
        tick
      );

    cx.clearRect(
      0,
      0,
      cv.width,
      cv.height
    );

    caps =
      caps.filter(
        (cap) =>
          cap.y <
          cv.height + 40
      );

    if (!caps.length) {
      cancelAnimationFrame(
        rafId
      );

      rafId = null;

      return;
    }

    for (const cap of caps) {
      cap.x += cap.vx;
      cap.y += cap.vy;

      cap.vy =
        Math.min(
          cap.vy + 0.045,
          7
        );

      cap.ph += cap.phv;
      cap.tilt += cap.tv;

      const r =
        cap.r;

      cx.save();

      cx.translate(
        cap.x,
        cap.y
      );

      cx.rotate(
        cap.tilt * 0.25
      );

      /* =====================================================
         CAPYBARA
      ===================================================== */

      if (cap.kind === 'capy') {

        const bw =
          r * 2.4;

        const bh =
          r * 1.9;

        cx.fillStyle =
          cap.dark;

        cx.beginPath();

        cx.arc(
          -bw * 0.32,
          -bh * 0.42,
          r * 0.3,
          0,
          Math.PI * 2
        );

        cx.fill();

        cx.beginPath();

        cx.arc(
          bw * 0.32,
          -bh * 0.42,
          r * 0.3,
          0,
          Math.PI * 2
        );

        cx.fill();

        cx.fillStyle =
          cap.tint;

        rr(
          cx,
          -bw / 2,
          -bh / 2,
          bw,
          bh,
          bh * 0.45
        );

        cx.fill();

        cx.fillStyle =
          '#C79A6B';

        rr(
          cx,
          -bw * 0.28,
          bh * 0.08,
          bw * 0.56,
          bh * 0.5,
          bh * 0.25
        );

        cx.fill();

        cx.fillStyle =
          '#2B1B0E';

        cx.beginPath();

        cx.arc(
          -bw * 0.18,
          -bh * 0.12,
          r * 0.11,
          0,
          Math.PI * 2
        );

        cx.fill();

        cx.beginPath();

        cx.arc(
          bw * 0.18,
          -bh * 0.12,
          r * 0.11,
          0,
          Math.PI * 2
        );

        cx.fill();

        cx.beginPath();

        cx.arc(
          -bw * 0.1,
          bh * 0.26,
          r * 0.08,
          0,
          Math.PI * 2
        );

        cx.fill();

        cx.beginPath();

        cx.arc(
          bw * 0.1,
          bh * 0.26,
          r * 0.08,
          0,
          Math.PI * 2
        );

        cx.fill();

      }

      /* =====================================================
         CAM
      ===================================================== */

      else {

        cx.fillStyle =
          '#F79420';

        cx.beginPath();

        cx.arc(
          0,
          0,
          r * 0.95,
          0,
          Math.PI * 2
        );

        cx.fill();

        cx.lineWidth = 1.2;

        cx.strokeStyle =
          '#C96F0A';

        cx.stroke();

        cx.save();

        cx.rotate(-0.5);

        cx.fillStyle =
          '#4C7A3F';

        cx.beginPath();

        cx.ellipse(
          r * 0.45,
          -r * 0.75,
          r * 0.42,
          r * 0.18,
          0,
          0,
          Math.PI * 2
        );

        cx.fill();

        cx.restore();

        cx.fillStyle =
          'rgba(255,255,255,.55)';

        cx.beginPath();

        cx.arc(
          -r * 0.3,
          -r * 0.3,
          r * 0.22,
          0,
          Math.PI * 2
        );

        cx.fill();
      }

      cx.restore();
    }
  }

  /* =========================================================
     HIỂN THỊ STK BAN ĐẦU
  ========================================================= */

  const initialStk =
    $('#psStk');

  if (initialStk) {
    initialStk.textContent =
      BANK.stk;
  }

})();