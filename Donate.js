/*=========================================
CẤUHÌNHDONATE
=========================================*/

constBANK_ID="970422";
constACCOUNT_NO="09637164106868";
constBANK_NAME="MBBank";

constPROJECT_TARGET=1000000;

letreceived=0;
letcurrentContent="";

letcountdownInterval=null;
letpaymentCheckInterval=null;
letcountdownEndTime=null;


/*=========================================
API
=========================================*/

constAPI_BASE=
"https://doante-api.tnt300709.workers.dev";

constCHECK_API=
`${API_BASE}/check`;

constHISTORY_API=
`${API_BASE}/history`;


/*=========================================
FORMATTIỀN
=========================================*/

functionformatMoney(number){

returnnewIntl.NumberFormat("vi-VN")
.format(Number(number)||0)+"₫";

}


/*=========================================
LẤYDANHSÁCHLỊCHSỬ
=========================================*/

asyncfunctiongetHistory(){

constresponse=
awaitfetch(HISTORY_API,{
method:"GET",
cache:"no-store"
});

if(!response.ok){

thrownewError(
`HTTP${response.status}`
);

}

constdata=
awaitresponse.json();

if(Array.isArray(data)){
returndata;
}

if(data&&Array.isArray(data.history)){
returndata.history;
}

if(data&&Array.isArray(data.data)){
returndata.data;
}

if(data&&Array.isArray(data.transactions)){
returndata.transactions;
}

return[];

}


/*=========================================
LẤYTHỜIGIANGIAODỊCH
=========================================*/

functiongetDonationTime(item){

if(!item){
returnnull;
}

constpossibleTimes=[

item.time,
item.timestamp,
item.datetime,
item.date,
item.createdAt,
item.created_at,
item.transactionTime,
item.transaction_time,
item.paymentTime,
item.payment_time

];


for(constvalueofpossibleTimes){

if(
value===undefined||
value===null||
value===""
){

continue;

}


/*Timestampdạngsố*/

if(
typeofvalue==="number"||
/^\d+$/.test(String(value))
){

letnumber=
Number(value);

/*Unixtimestampgiây*/

if(number<100000000000){

number*=1000;

}

constdate=
newDate(number);

if(!isNaN(date.getTime())){

returndate;

}

}


/*Chuỗingàygiờ*/

constdate=
newDate(value);

if(!isNaN(date.getTime())){

returndate;

}

}


returnnull;

}


/*=========================================
THỜIGIANTƯƠNGĐỐI
=========================================*/

functionrelativeTime(date){

if(!date){

return"vừaxong";

}


constnow=
Date.now();

consttime=
date.getTime();


letdiff=
Math.floor(
(now-time)/1000
);


/*
NếuAPItrảtimestamphơilệch
trongtươnglaithìvẫncho
hiểnthị"vừaxong".
*/

if(diff<60){

return"vừaxong";

}


constminutes=
Math.floor(diff/60);


if(minutes<60){

return`${minutes}phúttrước`;

}


consthours=
Math.floor(minutes/60);


if(hours<24){

return`${hours}giờtrước`;

}


constdays=
Math.floor(hours/24);


return`${days}ngàytrước`;

}


/*=========================================
LẤYTÊNNGƯỜIỦNGHỘ
=========================================*/

functiongetDonorName(item){

if(!item){
return"Ẩndanh";
}


constpossibleNames=[

item.name,
item.donorName,
item.donor_name,
item.username,
item.user,
item.displayName,
item.display_name

];


for(constnameofpossibleNames){

if(
name!==undefined&&
name!==null&&
String(name).trim()!==""
){

returnString(name).trim();

}

}


return"Ẩndanh";

}


/*=========================================
AVATAR
=========================================*/

functiongetAvatar(name){

consttext=
String(name||"A")
.trim()
.charAt(0)
.toUpperCase();


returntext||"A";

}


/*=========================================
SẮPXẾPLỊCHSỬ
=========================================*/

functionsortHistory(history){

return[...history].sort(
(a,b)=>{

constdateA=
getDonationTime(a);

constdateB=
getDonationTime(b);


if(dateA&&dateB){

return(
dateB.getTime()-
dateA.getTime()
);

}


if(dateB){

return-1;

}


if(dateA){

return1;

}


return0;

}
);

}


/*=========================================
HIỂNTHỊLỊCHSỬ
=========================================*/

functionrenderHistory(history){

constlist=
document.getElementById(
"supporterList"
);


if(!list){

return;

}


/*
Chỉlấy5giaodịchmớinhất.
*/

constlatest=
sortHistory(history)
.slice(0,5);


if(latest.length===0){

list.innerHTML=`
<divclass="supporter">
<divclass="avatar">♡</div>

<divclass="supporter-info">
<divclass="supporter-name">
Chưacóngườiủnghộ
</div>

<divclass="supporter-time">
Hãylàngườiđầutiên!
</div>
</div>

<divclass="amount">
—
</div>
</div>
`;

return;

}


list.innerHTML=
latest.map(item=>{

constname=
getDonorName(item);

constamount=
Number(item.amount)||0;

constdate=
getDonationTime(item);

consttime=
relativeTime(date);

constavatar=
getAvatar(name);


/*
CỐTÌNHKHÔNGRENDER:
item.code
item.transactionCode
item.transaction_id
...

Vìlịchsửchỉđượcphéphiện:
tên+thờigian+sốtiền.
*/

return`
<divclass="supporter">

<divclass="avatar">
${escapeHTML(avatar)}
</div>

<divclass="supporter-info">

<divclass="supporter-name">
${escapeHTML(name)}
</div>

<divclass="supporter-time">
${escapeHTML(time)}
</div>

</div>

<divclass="amount">
${formatMoney(amount)}
</div>

</div>
`;

}).join("");

}


/*=========================================
CHỐNGHTMLINJECTION
=========================================*/

functionescapeHTML(value){

returnString(value)
.replace(/&/g,"&amp;")
.replace(/</g,"&lt;")
.replace(/>/g,"&gt;")
.replace(/"/g,"&quot;")
.replace(/'/g,"&#039;");

}


/*=========================================
CẬPNHẬTPROGRESS+HISTORY
=========================================*/

asyncfunctionupdateProgress(){

try{

consthistory=
awaitgetHistory();


/*
HIỂNTHỊLỊCHSỬ
*/

renderHistory(history);


/*
TÍNHTỔNGTIỀN
*/

lettotal=null;


/*
NếuAPIcótotalthìưutiêntotal.
*/

try{

constresponse=
awaitfetch(
HISTORY_API,
{
method:"GET",
cache:"no-store"
}
);


if(response.ok){

constdata=
awaitresponse.json();


if(
data&&
data.total!==undefined&&
data.total!==null&&
Number.isFinite(
Number(data.total)
)
){

total=
Number(data.total);

}

}

}catch(error){

console.warn(
"Khôngđọcđượctotal:",
error
);

}


/*
NếuAPIkhôngcótotal,
tínhtừlịchsử.
*/

if(total===null){

total=
history
.reduce(
(sum,item)=>{

constamount=
Number(
item.amount
)||0;

returnsum+amount;

},
0
);

}


/*
QUANTRỌNG:
Khôngchotổngtiềntụtvề0
chỉvìAPIlỗi/trảdữliệu
tạmthờithiếu.
*/

if(
Number.isFinite(total)&&
total>=received
){

received=
total;

}elseif(
Number.isFinite(total)&&
received===0
){

received=
total;

}


}catch(error){

console.warn(
"Khônglấyđượclịchsửdonate:",
error
);

}


/*
HIỂNTHỊPROGRESS
*/

constpercent=
Math.min(
(received/PROJECT_TARGET)*100,
100
);


constreceivedElement=
document.getElementById(
"received"
);

constremainingElement=
document.getElementById(
"remaining"
);

constpercentElement=
document.getElementById(
"percent"
);

constprogressBar=
document.getElementById(
"progressBar"
);


if(receivedElement){

receivedElement.textContent=
formatMoney(received);

}


if(remainingElement){

remainingElement.textContent=
formatMoney(
Math.max(
PROJECT_TARGET-received,
0
)
);

}


if(percentElement){

percentElement.textContent=
percent
.toFixed(1)
.replace(".",",")+
"%";

}


if(progressBar){

progressBar.style.width=
percent+"%";

}

}


/*=========================================
TỰĐỘNGCẬPNHẬT
=========================================*/

updateProgress();


setInterval(
updateProgress,
15000
);


/*=========================================
MỞMODAL
=========================================*/

functionopenModal(){

constmodal=
document.getElementById("modal");


if(modal){

modal.classList.add("show");

}

}


/*=========================================
ĐÓNGMODAL
=========================================*/

functioncloseModal(){

constmodal=
document.getElementById("modal");


if(modal){

modal.classList.remove("show");

}

}


/*=========================================
CLICKRANGOÀIMODAL
=========================================*/

functionoutsideClose(event){

if(
event.target&&
event.target.id==="modal"
){

closeModal();

}

}


/*=========================================
CHỌNNHANHSỐTIỀN
=========================================*/

functionsetAmount(amount){

constinput=
document.getElementById(
"donationAmount"
);


if(!input){

return;

}


input.value=
Number(amount)
.toLocaleString("vi-VN");

}


/*=========================================
FORMATINPUT
=========================================*/

constdonationInput=
document.getElementById(
"donationAmount"
);


if(donationInput){

donationInput.addEventListener(
"input",
function(){

letvalue=
this.value.replace(
/\D/g,
""
);


if(!value){

this.value="";

return;

}


this.value=
Number(value)
.toLocaleString("vi-VN");

}
);

}


/*=========================================
TẠOQR
=========================================*/

functiongenerateQR(){

constnameElement=
document.getElementById(
"donorName"
);

constamountElement=
document.getElementById(
"donationAmount"
);


if(!nameElement||!amountElement){

return;

}


constname=
nameElement.value.trim();


constamount=
Number(
amountElement.value
.replace(/\./g,"")
.replace(/,/g,"")
);


if(!name){

alert(
"Vuilòngnhậptênhiểnthị."
);

return;

}


if(
!amount||
amount<10000
){

alert(
"Sốtiềntốithiểulà10.000đ."
);

return;

}


clearInterval(
countdownInterval
);

clearInterval(
paymentCheckInterval
);


countdownInterval=null;
paymentCheckInterval=null;
countdownEndTime=null;


constrandomCode=
Math.floor(
100000+
Math.random()*900000
);


currentContent=
"DXM-"+randomCode;


constqrAmount=
document.getElementById(
"qrAmount"
);

constqrName=
document.getElementById(
"qrName"
);

constqrContent=
document.getElementById(
"qrContent"
);

constqrStk=
document.getElementById(
"qrStk"
);

constqrTime=
document.getElementById(
"qrTime"
);


if(qrAmount){

qrAmount.textContent=
formatMoney(amount);

}


if(qrName){

qrName.textContent=
name;

}


if(qrContent){

qrContent.textContent=
currentContent;

}


if(qrStk){

qrStk.textContent=
ACCOUNT_NO;

}


if(qrTime){

qrTime.textContent=
newDate()
.toLocaleString("vi-VN");

}


constqrURL=
"https://img.vietqr.io/image/"+
BANK_ID+
"-"+
ACCOUNT_NO+
"-qr_only.png"+
"?amount="+
encodeURIComponent(amount)+
"&addInfo="+
encodeURIComponent(
currentContent
);


constqrImage=
document.getElementById(
"qrImage"
);


if(qrImage){

qrImage.src=
qrURL;

}


conststatus=
document.getElementById(
"paymentStatus"
);


if(status){

status.classList.remove(
"paid",
"expired"
);

status.textContent=
"●Đangchờchuyểnkhoản…";

}


constformArea=
document.getElementById(
"formArea"
);

constqrResult=
document.getElementById(
"qrResult"
);


if(formArea){

formArea.style.display=
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


/*=========================================
COPYSỐTÀIKHOẢN
=========================================*/

functioncopyStk(){

navigator.clipboard
.writeText(ACCOUNT_NO)
.then(()=>{

constbutton=
document.querySelector(
".copy-btn"
);


if(!button){

return;

}


constoldText=
button.textContent;


button.textContent=
"Đãsaochép";


setTimeout(()=>{

button.textContent=
oldText;

},1500);

});

}


/*=========================================
KIỂMTRATHANHTOÁN
=========================================*/

functioncheckPayment(
amount,
name,
code
){

clearInterval(
paymentCheckInterval
);


constcheck=
async()=>{

try{

constresponse=
awaitfetch(
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


constdata=
awaitresponse.json();


if(
data&&
data.ok===true&&
data.paid===true
){

clearInterval(
paymentCheckInterval
);

paymentCheckInterval=null;


clearInterval(
countdownInterval
);

countdownInterval=null;


conststatus=
document.getElementById(
"paymentStatus"
);


if(status){

status.textContent=
`✓Đãnhận${formatMoney(amount)}—cảmơnbạn!`;

status.classList.remove(
"expired"
);

status.classList.add(
"paid"
);

}


/*
Ngaykhithanhtoánthànhcông,
cộngtiềnngayởgiaodiện.

KhôngchờAPIhistorycậpnhật
đểtránhhiệntượngsốtiềntụt.
*/

received=
Math.max(
received,
0
)+amount;


/*
Cậpnhậtgiaodiệnngay.
*/

updateProgressDisplay();


/*
Sauđólấydữliệuthật
từserver.
*/

setTimeout(()=>{

updateProgress();

},1500);

}

}catch(error){

console.warn(
"Paymentcheckerror:",
error
);

}

};


check();


paymentCheckInterval=
setInterval(
check,
3000
);

}


/*=========================================
CHỈCẬPNHẬTGIAODIỆNPROGRESS
=========================================*/

functionupdateProgressDisplay(){

constpercent=
Math.min(
(received/PROJECT_TARGET)*100,
100
);


constreceivedElement=
document.getElementById(
"received"
);

constremainingElement=
document.getElementById(
"remaining"
);

constpercentElement=
document.getElementById(
"percent"
);

constprogressBar=
document.getElementById(
"progressBar"
);


if(receivedElement){

receivedElement.textContent=
formatMoney(received);

}


if(remainingElement){

remainingElement.textContent=
formatMoney(
Math.max(
PROJECT_TARGET-received,
0
)
);

}


if(percentElement){

percentElement.textContent=
percent
.toFixed(1)
.replace(".",",")+
"%";

}


if(progressBar){

progressBar.style.width=
percent+"%";

}

}


/*=========================================
TIMER
=========================================*/

functionstartTimer(){

clearInterval(
countdownInterval
);


countdownInterval=null;


constTEN_MINUTES=
10*60*1000;


countdownEndTime=
Date.now()+
TEN_MINUTES;


consttimer=
document.getElementById(
"timer"
);

conststatus=
document.getElementById(
"paymentStatus"
);


functionupdateCountdown(){

if(!countdownEndTime){

return;

}


constnow=
Date.now();


constremaining=
Math.max(
0,
countdownEndTime-now
);


consttotalSeconds=
Math.ceil(
remaining/1000
);


constminutes=
Math.floor(
totalSeconds/60
);


constseconds=
totalSeconds%60;


if(timer){

timer.textContent=
String(minutes)
.padStart(2,"0")+
":"+
String(seconds)
.padStart(2,"0");

}


if(remaining<=0){

clearInterval(
countdownInterval
);

countdownInterval=null;


countdownEndTime=null;


clearInterval(
paymentCheckInterval
);

paymentCheckInterval=null;


if(timer){

timer.textContent=
"Hếthạn";

}


if(status){

status.classList.remove(
"paid"
);

status.classList.add(
"expired"
);

status.textContent=
"Mãđãhếthạn.";

}

}

}


updateCountdown();


countdownInterval=
setInterval(
updateCountdown,
250
);

}


/*=========================================
TẠOMÃMỚI
=========================================*/

functionnewCode(){

clearInterval(
countdownInterval
);

clearInterval(
paymentCheckInterval
);


countdownInterval=null;
paymentCheckInterval=null;
countdownEndTime=null;


constqrResult=
document.getElementById(
"qrResult"
);


if(qrResult){

qrResult.classList.remove(
"show"
);

}


constformArea=
document.getElementById(
"formArea"
);


if(formArea){

formArea.style.display=
"";

}


conststatus=
document.getElementById(
"paymentStatus"
);


if(status){

status.classList.remove(
"paid",
"expired"
);

status.textContent=
"●Đangchờchuyểnkhoản…";

}


consttimer=
document.getElementById(
"timer"
);


if(timer){

timer.textContent=
"10:00";

}

}