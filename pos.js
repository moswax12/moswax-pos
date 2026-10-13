async function oPay(){
  if(!cart.length){
    toast('Add products first');
    return;
  }

  const settings=await gA('settings');
  const taxRate=Number(settings[0]?.taxRate||0);
  const subtotal=cartSubtotal();
  const tax=subtotal*taxRate/100;
  const total=subtotal+tax;

  window.currentPaymentMethod='Cash';

  oM(
    '💳 Payment',
    `
    <div style="text-align:center;margin-bottom:12px">
      <div style="font-size:12px;color:var(--tx2)">Total Amount</div>
      <div style="font-size:27px;font-weight:800;color:var(--ac)">
        ${fmt(total)}
      </div>
    </div>

    <div class="pms">
      <div class="sel" onclick="sPM(this,'Cash')">
        <div class="ic">💵</div>
        <div class="lb">Cash</div>
      </div>

      <div onclick="sPM(this,'Card')">
        <div class="ic">💳</div>
        <div class="lb">Card</div>
      </div>

      <div onclick="sPM(this,'M-Pesa')">
        <div class="ic">📱</div>
        <div class="lb">M-Pesa</div>
      </div>
    </div>

    <div id="cashPaymentBox">
      <div class="f">
        <label>Amount Given by Customer (KSh)</label>
        <input
          id="cashReceived"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.01"
          placeholder="Enter amount given"
          oninput="showChange(${total})"
          autofocus
        >
      </div>

      <div id="changeText"
        style="padding:12px;text-align:center;border-radius:8px;background:var(--b3);font-size:17px;font-weight:700;color:var(--or)">
        Enter amount given
      </div>
    </div>

    <div id="externalPaymentText"
      style="display:none;padding:10px;text-align:center;color:var(--gn);background:rgba(34,197,94,.12);border-radius:8px">
      Mark payment as paid after confirming external payment.
    </div>

    <div class="f" style="margin-top:10px">
      <label>Customer Name (optional)</label>
      <input id="customerName" placeholder="Walk-in customer">
    </div>
    `,
    `<button class="bs" style="width:100%;padding:12px" onclick="completePayment()">✅ Complete Sale</button>`
  );

  setTimeout(()=>{
    const cashInput=document.getElementById('cashReceived');
    if(cashInput) cashInput.focus();
  },200);
}

function sPM(element,method){
  document.querySelectorAll('.pms div').forEach(x=>x.classList.remove('sel'));
  element.classList.add('sel');

  window.currentPaymentMethod=method;

  const cashBox=document.getElementById('cashPaymentBox');
  const externalBox=document.getElementById('externalPaymentText');

  if(method==='Cash'){
    if(cashBox) cashBox.style.display='block';
    if(externalBox) externalBox.style.display='none';

    setTimeout(()=>{
      const cashInput=document.getElementById('cashReceived');
      if(cashInput) cashInput.focus();
    },100);
  }else{
    if(cashBox) cashBox.style.display='none';
    if(externalBox) externalBox.style.display='block';
  }
}

function showChange(total){
  const input=document.getElementById('cashReceived');
  const output=document.getElementById('changeText');

  if(!input||!output) return;

  const given=Number(input.value||0);

  if(!input.value){
    output.textContent='Enter amount given';
    output.style.color='var(--or)';
    return;
  }

  if(given<total){
    const balance=total-given;
    output.textContent='Balance remaining: '+fmt(balance);
    output.style.color='var(--rd)';
    return;
  }

  const change=given-total;
  output.textContent='Change: '+fmt(change);
  output.style.color='var(--gn)';
}

async function completePayment(){
  try{
    if(!cart.length){
      toast('Cart is empty');
      return;
    }

    const settings=await gA('settings');
    const taxRate=Number(settings[0]?.taxRate||0);
    const subtotal=cartSubtotal();
    const tax=subtotal*taxRate/100;
    const total=subtotal+tax;

    let paymentMethod=window.currentPaymentMethod||'Cash';
    let amountGiven=0;
    let changeAmount=0;

    if(paymentMethod==='Cash'){
      const cashInput=document.getElementById('cashReceived');

      if(!cashInput||cashInput.value===''){
        toast('Enter amount given by customer');
        return;
      }

      amountGiven=Number(cashInput.value||0);

      if(amountGiven<total){
        toast('Amount given is less than total');
        return;
      }

      changeAmount=amountGiven-total;
    }else{
      amountGiven=total;
      changeAmount=0;

      if(paymentMethod==='Card'){
        paymentMethod='Card (External)';
      }
    }

    const receiptNo='RCP-'+Date.now().toString(36).toUpperCase();
    const customer=document.getElementById('customerName')?.value.trim()||'Walk-in';

    const saleId=await aO('sales',{
      rn:receiptNo,
      date:new Date().toISOString(),
      cashier:CU.name,
      customer:customer,
      subtotal:subtotal,
      tax:tax,
      total:total,
      pm:paymentMethod,
      amountGiven:amountGiven,
      changeAmount:changeAmount,
      ic:cart.length
    });

    for(const item of cart){
      await aO('saleItems',{
        saleId:saleId,
        productId:item.pid,
        name:item.name,
        price:item.price,
        qty:item.qty,
        total:item.price*item.qty
      });

      const product=await gO('products',item.pid);

      if(product){
        product.stock=Math.max(0,Number(product.stock)-Number(item.qty));
        await pO('products',product);
      }

      await aO('invLog',{
        productId:item.pid,
        pn:item.name,
        type:'sale',
        qty:-item.qty,
        date:new Date().toISOString(),
        user:CU.name,
        ref:receiptNo
      });
    }

    cart=[];
    cM();
    toast('✅ Sale completed');

    go('pos');

    showReceiptWithCashDetails({
      id:saleId,
      rn:receiptNo,
      date:new Date().toISOString(),
      cashier:CU.name,
      customer:customer,
      subtotal:subtotal,
      tax:tax,
      total:total,
      pm:paymentMethod,
      amountGiven:amountGiven,
      changeAmount:changeAmount
    });

  }catch(error){
    console.error(error);
    toast('Payment error');
  }
}
