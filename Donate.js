// Donate.js

const BANK = {
  stk: '0963716410',
  name: ''
};

const MIN = 1000;
const EXPIRY_MS = 10 * 60 * 1000;
const POLL_MS = 1500;
const SPAM_MAX = 3;
const SPAM_WINDOW = 60 * 1000;
const COOL_MS = 30 * 1000;

const $ = s => document.querySelector(s);

const fmt = n =>
  Math.round(n).toLocaleString('vi-VN');

const store = {
  get(k, fallback){
    try {
      const v = localStorage.getItem(k);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },

  set(k, v){
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  }
};

const popup = $('#popup');
const openBtn = $('#donateBtn');
const closeBtn = $('#closePopup');

const pForm = $('#pForm');
const pNotice = $('#pNotice');
const pSuccess = $('#pSuccess');

const nameInput = $('#name');
const amtInput = $('#amount');
const msgInput = $('#message');

const submitBtn = $('#submitBtn');
const copyBtn = $('#copyBtn');

const amtWrap = $('#amtWrap');
const errBox = $('#errBox');

const qrBox = $('#qrBox');
const qrCanvas = $('#qrCanvas');

const psNote = $('#psNote');
const psAmount = $('#psAmount');

const payStatus = $('#payStatus');
const payStatusText = $('#payStatusText');

const doneBtn = $('#doneBtn');
const retryBtn = $('#retryBtn');
const cancelBtn = $('#cancelBtn');

let paid = false;
let paidAt = 0;

let expTimer = null;
let payTimer = null;

let cancelArmed = false;
let cancelArmTimer = null;

let genTimes = store.get('dxm_qrgen', []);
let coolUntil = store.get('dxm_cool', 0);

let amt = 0;

/* =========================
   POPUP
========================= */

function openPopup(){
  if(!popup) return;

  popup.hidden = false;
  document.body.classList.add('popup-open');

  pForm.hidden = false;
  pNotice.hidden = true;
  pSuccess.hidden = true;

  qrBox.classList.remove('expired', 'paid');

  doneBtn.hidden = false;
  doneBtn.disabled = true;
  doneBtn.textContent = 'Chưa nhận được tiền';

  retryBtn.hidden = true;
  cancelBtn.hidden = false;

  setPayStatus('wait', 'Đang chờ chuyển khoản…');

  syncCooldownUI();

  setTimeout(() => {
    nameInput?.focus();
  }, 100);
}

function closePopup(){
  if(!popup) return;

  stopExpiry();
  stopPayWatch();
  disarmCancel();

  popup.hidden = true;
  document.body.classList.remove('popup-open');
}

openBtn?.addEventListener('click', openPopup);

closeBtn?.addEventListener('click', closePopup);

popup?.addEventListener('click', e => {
  if(e.target === popup){
    closePopup();
  }
});

document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && popup && !popup.hidden){
    closePopup();
  }
});

/* =========================
   COPY
========================= */

function copyText(text){
  if(navigator.clipboard){
    return navigator.clipboard.writeText(text);
  }

  return new Promise(resolve => {
    const ta = document.createElement('textarea');

    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';

    document.body.appendChild(ta);

    ta.select();
    document.execCommand('copy');

    ta.remove();

    resolve();
  });
}

copyBtn?.addEventListener('click', () => {
  copyText(BANK.stk).then(() => {

    copyBtn.textContent = 'Đã copy';
    copyBtn.classList.add('ok');

    setTimeout(() => {
      copyBtn.textContent = 'Copy';
      copyBtn.classList.remove('ok');
    }, 1600);

  });
});

/* =========================
   FORMAT MONEY
========================= */

amtInput?.addEventListener('input', () => {

  const digits =
    amtInput.value.replace(/\D/g, '');

  amt = Number(digits || 0);

  if(digits){
    amtInput.value =
      Number(digits).toLocaleString('vi-VN');
  }

  hideErr();
});

amtInput?.addEventListener('blur', () => {

  if(amtInput.value && amt < MIN){
    showErr(
      `Số tiền tối thiểu là ${fmt(MIN)}₫ nhé.`
    );
  }

});

/* =========================
   ERROR
========================= */

function showErr(text){

  if(!errBox) return;

  errBox.textContent = text;
  errBox.hidden = false;

}

function hideErr(){

  if(!errBox) return;

  errBox.hidden = true;

}

/* =========================
   COOLDOWN
========================= */

function syncCooldownUI(){

  const now = Date.now();

  if(now < coolUntil){
    startCooldown(coolUntil - now);
  }else{
    coolUntil = 0;
    store.set('dxm_cool', 0);

    if(submitBtn){
      submitBtn.disabled = false;
      submitBtn.textContent = 'Tạo mã ủng hộ';
    }
  }

}

function startCooldown(ms){

  if(!submitBtn) return;

  submitBtn.disabled = true;

  const end = Date.now() + ms;

  const timer = setInterval(() => {

    const left = end - Date.now();

    if(left <= 0){

      clearInterval(timer);

      submitBtn.disabled = false;
      submitBtn.textContent = 'Tạo mã ủng hộ';

      coolUntil = 0;
      store.set('dxm_cool', 0);

      return;
    }

    submitBtn.textContent =
      `Chờ ${Math.ceil(left / 1000)}s`;

  }, 250);

}

/* =========================
   CREATE DONATION CODE
========================= */

submitBtn?.addEventListener('click', () => {

  const now = Date.now();

  if(now < coolUntil) return;

  if(amt < MIN){

    hideErr();

    if(amtWrap){
      void amtWrap.offsetWidth;
      amtWrap.classList.add('shake');

      setTimeout(() => {
        amtWrap.classList.remove('shake');
      }, 500);
    }

    showErr(
      `Số tiền tối thiểu là ${fmt(MIN)}₫ nhé.`
    );

    amtInput?.focus();

    return;
  }

  genTimes =
    genTimes.filter(
      t => now - t < SPAM_WINDOW
    );

  if(genTimes.length >= SPAM_MAX){

    coolUntil = now + COOL_MS;

    store.set('dxm_cool', coolUntil);

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
    nameInput?.value.trim() ||
    'Người ẩn danh';

  const msg =
    msgInput?.value.trim() || '';

  const code =
    'DXM-' + String(now).slice(-6);

  const d = new Date();

  paid = false;

  $('#psName').textContent = name;
  $('#psCode').textContent = code;
  $('#psStk').textContent = BANK.stk;

  $('#psTime').textContent =
    d.toLocaleTimeString(
      'vi-VN',
      {
        hour:'2-digit',
        minute:'2-digit',
        second:'2-digit'
      }
    )
    + ' · '
    + d.toLocaleDateString('vi-VN');

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

  drawQR(
    qrCanvas,
    [name, amt, code, msg].join('|')
  );

  countUp(
    psAmount,
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

/* =========================
   COUNT UP
========================= */

function countUp(
  el,
  from,
  to,
  dur,
  suffix
){

  if(!el) return;

  const t0 = performance.now();

  (function f(t){

    const p =
      Math.min(
        1,
        (t - t0) / dur
      );

    const e =
      1 -
      Math.pow(
        1 - p,
        3
      );

    el.textContent =
      fmt(
        from +
        (to - from) * e
      )
      +
      (suffix || '');

    if(p < 1){
      requestAnimationFrame(f);
    }

  })(t0);

}

/* =========================
   PAYMENT STATUS
========================= */

function setPayStatus(
  kind,
  text
){

  if(!payStatus) return;

  payStatus.classList.remove(
    'ok',
    'dead'
  );

  if(kind !== 'wait'){
    payStatus.classList.add(kind);
  }

  payStatusText.textContent =
    text;

}

/* =========================
   EXPIRY
========================= */

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

  const end =
    Date.now() +
    EXPIRY_MS;

  expTimer =
    setInterval(() => {

      const left =
        end - Date.now();

      if(left <= 0){

        stopExpiry();

        stopPayWatch();

        qrBox.classList.add(
          'expired'
        );

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

      const s =
        Math.ceil(
          left / 1000
        );

      const cnt =
        $('#psCount');

      if(cnt){

        cnt.textContent =
          String(
            Math.floor(s / 60)
          ).padStart(2,'0')
          +
          ':'
          +
          String(
            s % 60
          ).padStart(2,'0');

      }

    }, 250);

}

/* =========================
   PAYMENT WATCH
========================= */

function stopPayWatch(){

  if(payTimer){

    clearInterval(payTimer);

    payTimer = null;

  }

}

function startPayWatch(payment){

  stopPayWatch();

  paidAt =
    Date.now()
    +
    8000
    +
    Math.random() * 14000;

  let checks = 0;

  payTimer =
    setInterval(() => {

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

/* =========================
   MARK PAID
========================= */

function markPaid(payment){

  paid = true;

  qrBox.classList.add('paid');

  psNote.textContent =
    'Giao dịch hoàn tất · '
    +
    new Date().toLocaleTimeString(
      'vi-VN',
      {
        hour:'2-digit',
        minute:'2-digit'
      }
    );

  setPayStatus(
    'ok',
    `Đã nhận được ${fmt(payment.amount)}₫ — cảm ơn bạn nhiều!`
  );

  doneBtn.disabled = false;

  doneBtn.textContent =
    'Hoàn tất';

  cancelBtn.hidden = true;

  disarmCancel();

  capyRain();

}

/* =========================
   DONE
========================= */

doneBtn?.addEventListener(
  'click',
  () => {

    if(paid){
      closePopup();
    }

  }
);

/* =========================
   RETRY
========================= */

retryBtn?.addEventListener(
  'click',
  () => {

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

  }
);

/* =========================
   CANCEL
========================= */

function disarmCancel(){

  cancelArmed = false;

  cancelBtn.classList.remove(
    'armed'
  );

  cancelBtn.textContent =
    'Huỷ giao dịch';

  if(cancelArmTimer){

    clearTimeout(
      cancelArmTimer
    );

    cancelArmTimer = null;

  }

}

cancelBtn?.addEventListener(
  'click',
  () => {

    if(!cancelArmed){

      cancelArmed = true;

      cancelBtn.classList.add(
        'armed'
      );

      cancelBtn.textContent =
        'Bấm lần nữa để huỷ';

      cancelArmTimer =
        setTimeout(
          disarmCancel,
          2500
        );

      return;
    }

    stopExpiry();
    stopPayWatch();

    disarmCancel();

    pSuccess.hidden = true;
    pForm.hidden = false;

    pNotice.hidden = true;

    qrBox.classList.remove(
      'expired',
      'paid'
    );

    doneBtn.hidden = false;
    doneBtn.disabled = true;
    doneBtn.textContent =
      'Chưa nhận được tiền';

    retryBtn.hidden = true;

  }
);

/* =========================
   QR DEMO
========================= */

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

  let h =
    2166136261;

  for(const ch of seedStr){

    h ^= ch.codePointAt(0);

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
      )
      +
      1013904223
    ) >>> 0
    / 4294967296;

  const dark = [];

  const inFinder =
    (r,c) =>
      (
        r < 8 &&
        c < 8
      )
      ||
      (
        r < 8 &&
        c >= N - 8
      )
      ||
      (
        r >= N - 8 &&
        c < 8
      );

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
          (r+c) % 2 === 0
        ){
          dark.push([
            r,
            c
          ]);
        }

        continue;
      }

      if(rnd() < .45){

        dark.push([
          r,
          c
        ]);

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
              fr+r,
              fc+c
            ]);

          }

        }

      }

    };

  finder(0,0);
  finder(0,N-7);
  finder(N-7,0);

  (
    function align(ar,ac){

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
            (
              r === 2 &&
              c === 2
            )
          ){

            dark.push([
              ar+r,
              ac+c
            ]);

          }

        }

      }

    }
  )(16,16);

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
        (c+QZ)*S,
        (r+QZ)*S,
        S,
        S
      );

    }

  }

  let k = 0;

  function animate(){

    paint(k);

    k += Math.max(
      1,
      Math.ceil(total / 80)
    );

    if(k < total){

      requestAnimationFrame(
        animate
      );

    }else{

      paint(total);

    }

  }

  animate();

}

/* =========================
   CAPY RAIN
========================= */

function capyRain(){

  const layer =
    document.createElement('div');

  layer.className =
    'capy-rain';

  document.body.appendChild(
    layer
  );

  for(
    let i = 0;
    i < 24;
    i++
  ){

    const item =
      document.createElement('span');

    item.textContent =
      ['🍊','✨','💛','🐹'][
        Math.floor(
          Math.random() * 4
        )
      ];

    item.style.left =
      Math.random() * 100 +
      '%';

    item.style.animationDelay =
      Math.random() * .8 +
      's';

    item.style.fontSize =
      (
        18 +
        Math.random() * 20
      )
      +
      'px';

    layer.appendChild(
      item
    );

  }

  setTimeout(
    () => layer.remove(),
    4000
  );

}

/* =========================
   INIT
========================= */

syncCooldownUI();