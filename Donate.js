(function(){
  'use strict';

  /* ===== Tiện ích chung ===== */
  const $ = s => document.querySelector(s);
  const fmt = n => Math.round(n).toLocaleString('vi-VN');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k, d){ try{ const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } },
    set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  };

  /* ===== Thông tin tài khoản nhận ủng hộ ===== */
  const BANK = { stk: '0963716410', name: '' };

  /* ===== Băng chữ chạy ===== */
  document.querySelectorAll('.mq-track').forEach(tr => {
    const html = tr.dataset.text.replaceAll('◆', '<b>◆</b>');
    tr.innerHTML = `<span>${html.repeat(4)}</span><span aria-hidden="true">${html.repeat(4)}</span>`;
  });

  /* ===== Popup ủng hộ ===== */
  const MIN = 10000, EXPIRY_MS = 10 * 60 * 1000;
  const SPAM_WINDOW = 60000, SPAM_MAX = 3, COOL_MS = 30000;
  const POLL_MS = 3000;

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

  const chips = [...document.querySelectorAll('.p-chips button')];
  const pErr = $('#pErr');
  const qrBox = $('#qrBox');
  const psNote = $('#psNote');

  const payStatus = $('#payStatus');
  const payStatusText = $('#payStatusText');

  const doneBtn = $('#pDone');
  const retryBtn = $('#pRetry');
  const cancelBtn = $('#pCancel');

  let amt = 0;
  let expTimer = null;
  let coolTimer = null;
  let payTimer = null;
  let paidAt = 0;
  let paid = false;
  let cancelArmed = false;
  let cancelArmTimer = null;

  /* --- Chống spam tạo QR --- */
  let genTimes = store.get('dxm_qrgen', [])
    .filter(t => Date.now() - t < SPAM_WINDOW);

  let coolUntil = +store.get('dxm_cool', 0) || 0;

  if(coolUntil <= Date.now()) coolUntil = 0;

  function startCooldown(ms){
    clearInterval(coolTimer);

    const end = Date.now() + ms;

    const tickFn = () => {
      const left = Math.max(
        0,
        Math.ceil((end - Date.now()) / 1000)
      );

      submitBtn.disabled = left > 0;
      submitBtn.textContent =
        left > 0 ? `Chờ ${left}s…` : 'Tạo mã ủng hộ';

      if(left <= 0){
        clearInterval(coolTimer);
        coolTimer = null;
        hideErr();
      }
    };

    tickFn();
    coolTimer = setInterval(tickFn, 250);
  }

  function syncCooldownUI(){
    if(coolUntil > Date.now() && !coolTimer){
      startCooldown(coolUntil - Date.now());
    }
  }

  function openPopup(){
    ov.hidden = false;

    requestAnimationFrame(() => {
      ov.classList.add('show');
    });

    document.body.style.overflow = 'hidden';

    syncCooldownUI();

    setTimeout(() => {
      nameInput.focus();
    }, 320);
  }

  function closePopup(){
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

  function resetForm(){
    pSuccess.hidden = true;
    pForm.hidden = false;

    pNotice.hidden = true;

    amt = 0;

    amtInput.value = '';
    msgInput.value = '';

    chips.forEach(c => c.classList.remove('on'));

    qrBox.classList.remove('expired', 'paid');

    psNote.innerHTML =
      'Mã hết hạn sau <b id="psCount">10:00</b>';

    setPayStatus(
      'wait',
      'Đang chờ chuyển khoản…'
    );

    hideErr();

    doneBtn.hidden = false;
    doneBtn.disabled = true;
    doneBtn.textContent = 'Chưa nhận được tiền';

    retryBtn.hidden = true;

    cancelBtn.hidden = false;

    disarmCancel();

    submitBtn.disabled = false;
    submitBtn.textContent = 'Tạo mã ủng hộ';

    syncCooldownUI();
  }

  /* ===== NÚT ỦNG HỘ NGAY ===== */

  if(openBtn){
    openBtn.addEventListener('click', openPopup);
  }

  if(closeBtn){
    closeBtn.addEventListener('click', closePopup);
  }

  if(ov){
    ov.addEventListener('click', e => {
      if(e.target === ov){
        closePopup();
      }
    });
  }

  addEventListener('keydown', e => {
    if(e.key === 'Escape' && !ov.hidden){
      closePopup();
    }
  });

  /* ===== Mobile keyboard ===== */

  if(ov){
    ov.addEventListener('focusin', e => {
      if(
        e.target.classList &&
        e.target.classList.contains('p-input')
      ){
        setTimeout(() => {
          e.target.scrollIntoView({
            block: 'center',
            behavior: 'smooth'
          });
        }, 280);
      }
    });
  }

  /* ===== Số tiền ===== */

  function showErr(msg){
    pErr.textContent = msg;
    pErr.hidden = false;
    amtWrap.classList.add('err');
  }

  function hideErr(){
    pErr.hidden = true;
    amtWrap.classList.remove('err');
  }

  function setAmount(v, fromChip){
    amt = v;

    amtInput.value = v ? fmt(v) : '';

    chips.forEach(c => {
      c.classList.toggle(
        'on',
        +c.dataset.amount === v
      );
    });

    if(!fromChip){
      hideErr();
    }
  }

  chips.forEach(c => {
    c.addEventListener('click', () => {
      setAmount(+c.dataset.amount, true);
      hideErr();
      amtInput.focus();
    });
  });

  amtInput.addEventListener('input', () => {
    const digits = amtInput.value
      .replace(/\D/g, '')
      .slice(0, 9);

    setAmount(
      digits ? +digits : 0
    );
  });

  amtInput.addEventListener('blur', () => {
    if(
      amtInput.value &&
      amt < MIN
    ){
      showErr(
        `Số tiền tối thiểu là ${fmt(MIN)}₫ nhé.`
      );
    }
  });

  /* ===== Trạng thái thanh toán ===== */

  function setPayStatus(kind, text){
    payStatus.classList.remove(
      'ok',
      'dead'
    );

    if(kind !== 'wait'){
      payStatus.classList.add(kind);
    }

    payStatusText.textContent = text;
  }

  /* ===== QR hết hạn ===== */

  function stopExpiry(){
    if(expTimer){
      clearInterval(expTimer);
      expTimer = null;
    }
  }

  function startExpiry(){
    stopExpiry();

    qrBox.classList.remove(
      'expired',
      'paid'
    );

    psNote.innerHTML =
      'Mã hết hạn sau <b id="psCount">10:00</b>';

    const end = Date.now() + EXPIRY_MS;

    expTimer = setInterval(() => {

      const left = end - Date.now();

      if(left <= 0){

        stopExpiry();
        stopPayWatch();

        qrBox.classList.add('expired');

        psNote.textContent =
          'Mã đã hết hạn — tạo mã mới để ủng hộ tiếp nhé.';

        setPayStatus(
          'dead',
          'Hết thời gian chờ — chưa nhận được tiền.'
        );

        doneBtn.hidden = true;
        retryBtn.hidden = false;
        cancelBtn.hidden = true;

        disarmCancel();

        return;
      }

      const s = Math.ceil(left / 1000);

      const cnt = $('#psCount');

      if(cnt){
        cnt.textContent =
          String(Math.floor(s / 60)).padStart(2, '0') +
          ':' +
          String(s % 60).padStart(2, '0');
      }

    }, 250);
  }

  /* ===== Kiểm tra thanh toán ===== */

  function stopPayWatch(){
    if(payTimer){
      clearInterval(payTimer);
      payTimer = null;
    }
  }

  function startPayWatch(payment){

    stopPayWatch();

    /* Demo giả lập tiền về */
    paidAt =
      Date.now() +
      8000 +
      Math.random() * 14000;

    let checks = 0;

    payTimer = setInterval(() => {

      checks++;

      if(Date.now() >= paidAt){

        stopPayWatch();

        markPaid(payment);

        return;
      }

      setPayStatus(
        'wait',
        `Đang chờ chuyển khoản… (đã quét ${checks} lần)`
      );

    }, POLL_MS);
  }

  function markPaid(payment){

    paid = true;

    qrBox.classList.add('paid');

    psNote.textContent =
      'Giao dịch hoàn tất · ' +
      new Date().toLocaleTimeString(
        'vi-VN',
        {
          hour: '2-digit',
          minute: '2-digit'
        }
      );

    setPayStatus(
      'ok',
      `Đã nhận được ${fmt(payment.amount)}₫ — cảm ơn bạn nhiều!`
    );

    doneBtn.disabled = false;
    doneBtn.textContent = 'Hoàn tất';

    cancelBtn.hidden = true;

    disarmCancel();

    capyRain();
  }

  /* ===== Hoàn tất ===== */

  doneBtn.addEventListener('click', () => {
    if(paid){
      closePopup();
    }
  });

  /* ===== Tạo mã mới ===== */

  retryBtn.addEventListener('click', () => {

    pSuccess.hidden = true;
    pForm.hidden = false;

    pNotice.hidden = true;

    qrBox.classList.remove(
      'expired',
      'paid'
    );

    setPayStatus(
      'wait',
      'Đang chờ chuyển khoản…'
    );

    doneBtn.hidden = false;
    doneBtn.disabled = true;
    doneBtn.textContent =
      'Chưa nhận được tiền';

    retryBtn.hidden = true;
    cancelBtn.hidden = false;

    syncCooldownUI();
  });

  /* ===== Huỷ giao dịch ===== */

  function disarmCancel(){

    cancelArmed = false;

    cancelBtn.classList.remove('armed');

    cancelBtn.textContent =
      'Huỷ giao dịch';

    if(cancelArmTimer){
      clearTimeout(cancelArmTimer);
      cancelArmTimer = null;
    }
  }

  cancelBtn.addEventListener('click', () => {

    if(!cancelArmed){

      cancelArmed = true;

      cancelBtn.classList.add('armed');

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
    disarmCancel();

    pSuccess.hidden = true;
    pForm.hidden = false;

    pNotice.textContent =
      'Đã huỷ giao dịch — chưa có khoản nào được ghi nhận. Bạn có thể tạo mã mới bất cứ lúc nào.';

    pNotice.hidden = false;

    qrBox.classList.remove(
      'expired',
      'paid'
    );

    setPayStatus(
      'wait',
      'Đang chờ chuyển khoản…'
    );

    doneBtn.hidden = false;
    doneBtn.disabled = true;
    doneBtn.textContent =
      'Chưa nhận được tiền';

    retryBtn.hidden = true;
    cancelBtn.hidden = false;

    submitBtn.disabled = false;
    submitBtn.textContent =
      'Tạo mã ủng hộ';

    syncCooldownUI();
  });

  /* ===== Copy STK ===== */

  function copyText(t){

    if(
      navigator.clipboard &&
      window.isSecureContext
    ){
      return navigator.clipboard.writeText(t);
    }

    const ta =
      document.createElement('textarea');

    ta.value = t;

    ta.style.position = 'fixed';
    ta.style.opacity = '0';

    document.body.appendChild(ta);

    ta.select();

    try{
      document.execCommand('copy');
    }catch(e){}

    ta.remove();

    return Promise.resolve();
  }

  const copyBtn = $('#copyStk');

  copyBtn.addEventListener('click', () => {

    copyText(BANK.stk).then(() => {

      copyBtn.textContent = 'Đã copy';

      copyBtn.classList.add('ok');

      setTimeout(() => {

        copyBtn.textContent = 'Copy';

        copyBtn.classList.remove('ok');

      }, 1600);

    });

  });

  /* ===== Tạo mã ủng hộ ===== */

  submitBtn.addEventListener('click', () => {

    const now = Date.now();

    if(now < coolUntil){
      return;
    }

    if(amt < MIN){

      hideErr();

      void amtWrap.offsetWidth;

      showErr(
        `Số tiền tối thiểu là ${fmt(MIN)}₫ nhé.`
      );

      amtInput.focus();

      return;
    }

    genTimes =
      genTimes.filter(
        t => now - t < SPAM_WINDOW
      );

    if(genTimes.length >= SPAM_MAX){

      coolUntil =
        now + COOL_MS;

      store.set(
        'dxm_cool',
        coolUntil
      );

      showErr(
        'Phát hiện spam — bạn tạo mã quá nhanh, vui lòng chờ 30 giây.'
      );

      startCooldown(COOL_MS);

      return;
    }

    genTimes.push(now);

    store.set(
      'dxm_qrgen',
      genTimes
    );

    const name =
      nameInput.value.trim() ||
      'Người ẩn danh';

    const msg =
      msgInput.value.trim();

    const code =
      'DXM-' +
      String(now).slice(-6);

    const d = new Date();

    paid = false;

    $('#psName').textContent =
      name;

    $('#psCode').textContent =
      code;

    $('#psStk').textContent =
      BANK.stk;

    $('#psTime').textContent =
      d.toLocaleTimeString(
        'vi-VN',
        {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }
      ) +
      ' · ' +
      d.toLocaleDateString('vi-VN');

    const bankRow =
      $('#psBankRow');

    if(BANK.name){

      bankRow.hidden = false;

      $('#psBank').textContent =
        BANK.name;

    }else{

      bankRow.hidden = true;

    }

    const msgRow =
      $('#psMsgRow');

    if(msg){

      msgRow.hidden = false;

      $('#psMsg').textContent =
        msg;

    }else{

      msgRow.hidden = true;

    }

    pForm.hidden = true;
    pNotice.hidden = true;
    pSuccess.hidden = false;

    const qrUrl =
  'https://vietqr.app/img?' +
  'acc=' + encodeURIComponent(BANK.stk) +
  '&bank=Techcombank' +
  '&amount=' + encodeURIComponent(amt) +
  '&des=' + encodeURIComponent(code) +
  '&template=compact';

  $('#qrImage').src = qrUrl;

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
      code
    });

  });

  /* ===== Count up ===== */

  function countUp(
    el,
    from,
    to,
    dur,
    suffix
  ){

    const t0 =
      performance.now();

    (function f(t){

      const p =
        Math.min(
          1,
          (t - t0) / dur
        );

      const e =
        1 - Math.pow(
          1 - p,
          3
        );

      el.textContent =
        fmt(
          from +
          (to - from) * e
        ) +
        (suffix || '');

      if(p < 1){
        requestAnimationFrame(f);
      }

    })(t0);

  }

  /* ===== QR ===== */

  function drawQR(
    canvas,
    seedStr
  ){

    const N = 25;
    const QZ = 2;
    const S = 6;

    const SIZE =
      (N + QZ * 2) * S;

    canvas.width =
      canvas.height =
      SIZE;

    const g =
      canvas.getContext('2d');

    let h = 2166136261;

    for(const ch of seedStr){

      h ^=
        ch.codePointAt(0);

      h =
        Math.imul(
          h,
          16777619
        ) >>> 0;

    }

    let s = h || 1;

    const rnd = () =>
      (
        s =
          Math.imul(
            s,
            1664525
          ) +
          1013904223
      ) >>> 0;

    const dark = [];

    const inFinder =
      (r,c) =>
        (r < 8 && c < 8) ||
        (r < 8 && c >= N - 8) ||
        (r >= N - 8 && c < 8);

    const inAlign =
      (r,c) =>
        r >= 16 &&
        r <= 20 &&
        c >= 16 &&
        c <= 20;

    for(
      let r = 0;
      r < N;
      r++
    ){

      for(
        let c = 0;
        c < N;
        c++
      ){

        if(
          inFinder(r,c) ||
          inAlign(r,c)
        ){
          continue;
        }

        if(
          r === 6 ||
          c === 6
        ){

          if(
            (r + c) % 2 === 0
          ){
            dark.push([r,c]);
          }

          continue;
        }

        if(
          rnd() <
          .45
        ){
          dark.push([r,c]);
        }

      }

    }

    const finder =
      (fr,fc) => {

        for(
          let r = 0;
          r < 7;
          r++
        ){

          for(
            let c = 0;
            c < 7;
            c++
          ){

            const edge =
              r === 0 ||
              r === 6 ||
              c === 0 ||
              c === 6;

            const core =
              r >= 2 &&
              r <= 4 &&
              c >= 2 &&
              c <= 4;

            if(edge || core){
              dark.push([
                fr + r,
                fc + c
              ]);
            }

          }

        }

      };

    finder(0,0);
    finder(0,N - 7);
    finder(N - 7,0);

    (function align(ar,ac){

      for(
        let r = 0;
        r < 5;
        r++
      ){

        for(
          let c = 0;
          c < 5;
          c++
        ){

          const edge =
            r === 0 ||
            r === 4 ||
            c === 0 ||
            c === 4;

          if(
            edge ||
            (r === 2 && c === 2)
          ){

            dark.push([
              ar + r,
              ac + c
            ]);

          }

        }

      }

    })(16,16);

    dark.sort(
      (a,b) =>
        a[0] - b[0] ||
        a[1] - b[1]
    );

    const total =
      dark.length;

    function paint(k){

      g.fillStyle =
        '#FFFFFF';

      g.fillRect(
        0,
        0,
        SIZE,
        SIZE
      );

      g.fillStyle =
        '#17140E';

      for(
        let i = 0;
        i < k;
        i++
      ){

        const [r,c] =
          dark[i];

        g.fillRect(
          (c + QZ) * S,
          (r + QZ) * S,
          S,
          S
        );

      }

    }

    if(reduceMotion){

      paint(total);

      return;

    }

    const t0 =
      performance.now();

    const dur = 900;

    (function frame(t){

      const p =
        Math.min(
          1,
          (t - t0) / dur
        );

      const e =
        1 - Math.pow(
          1 - p,
          3
        );

      paint(
        Math.floor(
          e * total
        )
      );

      if(p < 1){
        requestAnimationFrame(frame);
      }

    })(t0);

  }

  /* ===== Hiệu ứng capybara ===== */

  const cv = $('#fx');
  const cx = cv.getContext('2d');

  let caps = [];
  let rafId = null;

  function fit(){

    cv.width =
      innerWidth;

    cv.height =
      innerHeight;

  }

  fit();

  addEventListener(
    'resize',
    fit
  );

  addEventListener(
    'orientationchange',
    () =>
      setTimeout(
        fit,
        250
      )
  );

  const CAPY_PAIRS = [
    ['#A9744F','#7E5233'],
    ['#96633F','#6E4426'],
    ['#B98357','#8A5A38']
  ];

  const pick =
    a =>
      a[
        Math.floor(
          Math.random() *
          a.length
        )
      ];

  function rr(
    g,
    x,
    y,
    w,
    h,
    r
  ){

    g.beginPath();

    if(g.roundRect){

      g.roundRect(
        x,
        y,
        w,
        h,
        r
      );

      return;

    }

    g.moveTo(
      x + r,
      y
    );

    g.arcTo(
      x + w,
      y,
      x + w,
      y + h,
      r
    );

    g.arcTo(
      x + w,
      y + h,
      x,
      y + h,
      r
    );

    g.arcTo(
      x,
      y + h,
      x,
      y,
      r
    );

    g.arcTo(
      x,
      y,
      x + w,
      y,
      r
    );

    g.closePath();

  }

  function capyRain(){

    const small =
      Math.min(
        cv.width,
        cv.height
      ) < 700;

    const n =
      reduceMotion
        ? 30
        : (small ? 70 : 120);

    for(
      let i = 0;
      i < n;
      i++
    ){

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
          .6,

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
          .12 +
          Math.random() *
          .22,

        tilt:
          Math.random() *
          Math.PI *
          2,

        tv:
          (-.5 +
          Math.random()) *
          .12,

        kind:
          Math.random() <
          .72
            ? 'capy'
            : 'orange',

        tint:
          pair[0],

        dark:
          pair[1]

      });

    }

    if(!rafId){
      tick();
    }

  }

  function tick(){

    rafId =
      requestAnimationFrame(tick);

    cx.clearRect(
      0,
      0,
      cv.width,
      cv.height
    );

    caps =
      caps.filter(
        c =>
          c.y <
          cv.height + 40
      );

    if(!caps.length){

      cancelAnimationFrame(
        rafId
      );

      rafId = null;

      return;

    }

    for(const c of caps){

      c.x += c.vx;
      c.y += c.vy;

      c.vy =
        Math.min(
          c.vy + .045,
          7
        );

      c.ph += c.phv;
      c.tilt += c.tv;

      const r = c.r;

      cx.save();

      cx.translate(
        c.x,
        c.y
      );

      cx.rotate(
        c.tilt * .25
      );

      if(c.kind === 'capy'){

        const bw =
          r * 2.4;

        const bh =
          r * 1.9;

        cx.fillStyle =
          c.dark;

        cx.beginPath();

        cx.arc(
          -bw * .32,
          -bh * .42,
          r * .3,
          0,
          Math.PI * 2
        );

        cx.fill();

        cx.beginPath();

        cx.arc(
          bw * .32,
          -bh * .42,
          r * .3,
          0,
          Math.PI * 2
        );

        cx.fill();

        cx.fillStyle =
          c.tint;

        rr(
          cx,
          -bw / 2,
          -bh / 2,
          bw,
          bh,
          bh * .45
        );

        cx.fill();

        cx.fillStyle =
          '#C79A6B';

        rr(
          cx,
          -bw * .28,
          bh * .08,
          bw * .56,
          bh * .5,
          bh * .25
        );

        cx.fill();

        cx.fillStyle =
          '#2B1B0E';

        cx.beginPath();

        cx.arc(
          -bw * .18,
          -bh * .12,
          r * .11,
          0,
          Math.PI * 2
        );

        cx.fill();

        cx.beginPath();

        cx.arc(
          bw * .18,
          -bh * .12,
          r * .11,
          0,
          Math.PI * 2
        );

        cx.fill();

        cx.beginPath();

        cx.arc(
          -bw * .1,
          bh * .26,
          r * .08,
          0,
          Math.PI * 2
        );

        cx.fill();

        cx.beginPath();

        cx.arc(
          bw * .1,
          bh * .26,
          r * .08,
          0,
          Math.PI * 2
        );

        cx.fill();

      }else{

        cx.fillStyle =
          '#F79420';

        cx.beginPath();

        cx.arc(
          0,
          0,
          r * .95,
          0,
          Math.PI * 2
        );

        cx.fill();

        cx.lineWidth = 1.2;
        cx.strokeStyle =
          '#C96F0A';

        cx.stroke();

        cx.save();

        cx.rotate(-.5);

        cx.fillStyle =
          '#4C7A3F';

        cx.beginPath();

        cx.ellipse(
          r * .45,
          -r * .75,
          r * .42,
          r * .18,
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
          -r * .3,
          -r * .3,
          r * .22,
          0,
          Math.PI * 2
        );

        cx.fill();

      }

      cx.restore();

    }

  }

  $('#psStk').textContent =
    BANK.stk;

})();