async function rPOS(el){
  const products=await gA('products');
  const categories=await gA('categories');
  const settings=await gA('settings');
  const taxRate=Number(settings[0]?.taxRate||0);

  el.innerHTML=`
  <div class="pos">
    <div style="display:flex;flex-direction:column;overflow:hidden">
      <div class="psch">
        <input id="ps" placeholder="Search or scan barcode..." oninput="fP()">
        <select id="pc" onchange="fP()" style="width:90px">
          <option value="">All</option>
          ${categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>

      <div class="pgr">
        ${products.map(p=>`
          <div class="pi ${p.stock<=0?'out':''}"
               data-n="${String(p.name||'').toLowerCase()}"
               data-b="${p.barcode||''}"
               data-c="${p.catId||''}"
               onclick="aC(${p.id})">
            <div class="pn">${p.name}</div>
            <div class="pp">${fmt(p.price)}</div>
            <div class="ps">Stock: ${p.stock}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="crt">
      <div class="crt-h">
        <span>Cart (${cart.length})</span>
        <button class="bw sm" onclick="cart=[];uC()">Clear</button>
      </div>

      <div class="crt-i" id="ci">${rCI()}</div>

      <div class="crt-f">
        <div class="ctot">
          <div><span>Subtotal</span><span id="cS">${fmt(cartSubtotal())}</span></div>
          <div><span>VAT (${taxRate}%)</span><span id="cT">${fmt(cartTax(taxRate))}</span></div>
          <div class="gt"><span>Total</span><span id="cTo">${fmt(cartTotal(taxRate))}</span></div>
        </div>

        <div class="cact">
          <button class="bd" onclick="cart=[];uC()">Clear</button>
          <button class="bs" onclick="oPay()" ${cart.length?'':'disabled'}>Pay</button>
        </div>
      </div>
    </div>
  </div>`;
}

function cartSubtotal(){
  return cart.reduce((sum,item)=>sum+(Number(item.price||0)*Number(item.qty||0)),0);
}

function cartTax(taxRate){
  return cartSubtotal()*Number(taxRate||0)/100;
}

function cartTotal(taxRate){
  return cartSubtotal()+cartTax(taxRate);
}

function rCI(){
  if(!cart.length){
    return `<div style="text-align:center;padding:18px;color:var(--tx2)">Cart is empty</div>`;
  }

  return cart.map((item,index)=>`
    <div class="cr">
      <span class="cn">${item.name}</span>
      <div class="cq">
        <button onclick="cQ(${index},-1)">−</button>
        <span>${item.qty}</span>
        <button onclick="cQ(${index},1)">+</button>
      </div>
      <span class="ct">${fmt(item.price*item.qty)}</span>
      <span class="cx" onclick="cart.splice(${index},1);uC()">✕</span>
    </div>
  `).join('');
}

async function aC(productId){
  const product=await gO('products',productId);

  if(!product){
    toast('Product not found');
    return;
  }

  if(Number(product.stock)<=0){
    toast('Out of stock');
    return;
  }

  const found=cart.find(x=>x.pid===productId);

  if(found){
    if(found.qty>=Number(product.stock)){
      toast('Not enough stock');
      return;
    }
    found.qty++;
  }else{
    cart.push({
      pid:product.id,
      name:product.name,
      price:Number(product.price||0),
      qty:1,
      maxStock:Number(product.stock||0)
    });
  }

  uC();
}

function cQ(index,change){
  if(!cart[index]) return;

  cart[index].qty+=change;

  if(cart[index].qty<=0){
    cart.splice(index,1);
  }else if(cart[index].qty>cart[index].maxStock){
    cart[index].qty=cart[index].maxStock;
    toast('Maximum available stock reached');
  }

  uC();
}

async function uC(){
  const cartBox=document.getElementById('ci');
  if(!cartBox) return;

  const settings=await gA('settings');
  const taxRate=Number(settings[0]?.taxRate||0);

  cartBox.innerHTML=rCI();

  const sub=document.getElementById('cS');
  const tax=document.getElementById('cT');
  const total=document.getElementById('cTo');
  const header=document.querySelector('.crt-h span');
  const payButton=document.querySelector('.cact .bs');

  if(sub) sub.textContent=fmt(cartSubtotal());
  if(tax) tax.textContent=fmt(cartTax(taxRate));
  if(total) total.textContent=fmt(cartTotal(taxRate));
  if(header) header.textContent=`Cart (${cart.length})`;

  if(payButton){
    payButton.disabled=!cart.length;
    payButton.style.opacity=cart.length?'1':'.45';
  }
}

function fP(){
  const query=(document.getElementById('ps')?.value||'').toLowerCase();
  const category=document.getElementById('pc')?.value||'';

  document.querySelectorAll('.pi').forEach(item=>{
    const name=item.dataset.n||'';
    const barcode=item.dataset.b||'';
    const cat=item.dataset.c||'';

    const found=name.includes(query)||barcode.includes(query);
    const categoryOk=!category||cat===category;

    item.style.display=(found&&categoryOk)?'':'none';
  });
}

/* PAYMENT WINDOW */
async function oPay(){
  if(!cart.length){
    toast('Add products first');
    return;
  }

  const settings=await gA('settings');
  const taxRate=Number(settings[0]?.taxRate||0);
  const total=cartTotal(taxRate);

  window.currentPaymentMethod='Cash';

  oM(
    'Payment',
    `
    <div style="text-align:center;margin-bottom:10px">
      <div style="font-size:11px;color:var(--tx2)">Total to Pay</div>
      <div style="font-size:26px;font-weight:800;color:var(--ac)">${fmt(total)}</div>
    </div>

    <div class="pms">
      <div class="sel" onclick="sPM(this,'Cash')">
        <div class="ic">💵</div><div class="lb">Cash</div>
      </div>
      <div onclick="sPM(this,'Card')">
        <div class="ic">💳</div><div class="lb">Card</div>
      </div>
      <div onclick="sPM(this,'M-Pesa')">
        <div class="ic">📱</div><div class="lb">M-Pesa</div>
      </div>
    </div>

    <div id="cashPaymentBox">
      <div class="f">
        <label>Cash Received</label>
        <input type="number" id="cashReceived" value="${total.toFixed(2)}"
          oninput="showChange(${total})">
      </div>
      <div id="changeText" style="text-align:center;color:var(--gn);font-weight:700">
        Change: ${fmt(0)}
      </div>
    </div>

    <div class="f" style="margin-top:8px">
      <label>Customer Name (optional)</label>
      <input id="customerName" placeholder="Walk-in customer">
    </div>
    `,
    `<button class="bs" style="width:100%;padding:11px" onclick="completePayment()">Complete Sale</button>`
  );
}

function sPM(element,method){
  document.querySelectorAll('.pms div').forEach(x=>x.classList.remove('sel'));
  element.classList.add('sel');

  window.currentPaymentMethod=method;

  const cashBox=document.getElementById('cashPaymentBox');
  if(cashBox){
    cashBox.style.display=method==='Cash'?'block':'none';
  }
}

function showChange(total){
  const received=Number(document.getElementById('cashReceived')?.value||0);
  const change=Math.max(0,received-total);

  const output=document.getElementById('changeText');
  if(output) output.textContent='Change: '+fmt(change);
}

/* COMPLETE PAYMENT */
async function completePayment(){
  try{
    if(!cart.length){
      toast('Cart is empty');
      return;
    }

    const settings=await gA('settings');
    const taxRate=Number(settings[0]?.taxRate||0);
    const subtotal=cartSubtotal();
    const tax=cartTax(taxRate);
    const total=cartTotal(taxRate);

    let method=window.currentPaymentMethod||'Cash';

    if(method==='Cash'){
      const received=Number(document.getElementById('cashReceived')?.value||0);
      if(received<total){
        toast('Cash received is less than total');
        return;
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
      pm:method==='Card'?'Card (External)':method,
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
    toast('Sale completed');

    go('pos');

  }catch(error){
    console.error(error);
    toast('Payment error. Check app files.');
  }
}
