'use strict';
// Five-stage WhatsApp flow. Meta-approved templates and published WhatsApp Flow required.
const crypto=require('node:crypto');
function initWhatsApp({db,getOrder,setOrderStatus,siteBase}){
 const env=process.env;
 const enabled=env.WHATSAPP_AUTOMATION_ENABLED==='1';
 const token=env.WHATSAPP_ACCESS_TOKEN||'';
 const sender=env.WHATSAPP_PHONE_NUMBER_ID||'';
 const admin=(env.WHATSAPP_ADMIN_NUMBER||'').replace(/\D/g,'');
 const secret=env.META_APP_SECRET||'';
 const verifyToken=env.META_WEBHOOK_VERIFY_TOKEN||'';
 const flowId=env.WHATSAPP_FLOW_ID||'';
 const version=env.WHATSAPP_GRAPH_VERSION||'v23.0';
 const base=(env.PUBLIC_BASE_URL||siteBase||'').replace(/\/$/,'');
 const lang=env.WHATSAPP_TEMPLATE_LANGUAGE||'en_US';
 const templateNames={first_customer:env.WA_TEMPLATE_ORDER_CUSTOMER||'hss_order_received',first_admin:env.WA_TEMPLATE_ORDER_ADMIN||'hss_order_alert',hour:env.WA_TEMPLATE_CONFIRMATION||'hss_order_confirmation',dispatched:env.WA_TEMPLATE_DISPATCH||'hss_order_dispatched'};
 db.exec(`CREATE TABLE IF NOT EXISTS wa_orders (order_id TEXT PRIMARY KEY REFERENCES orders(id), stage TEXT NOT NULL DEFAULT 'awaiting_confirmation', due_at TEXT NOT NULL, phone TEXT NOT NULL, address TEXT NOT NULL, courier TEXT NOT NULL DEFAULT '', tracking TEXT NOT NULL DEFAULT '', tracking_link TEXT NOT NULL DEFAULT '', dispatch_date TEXT NOT NULL DEFAULT '', dispatched_at TEXT, updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS wa_events (id TEXT PRIMARY KEY,order_id TEXT NOT NULL, event TEXT NOT NULL, payload TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS idx_wa_due ON wa_orders(stage,due_at);
 CREATE TABLE IF NOT EXISTS wa_outbox (id TEXT PRIMARY KEY,order_id TEXT NOT NULL, kind TEXT NOT NULL, destination TEXT NOT NULL, payload TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending', tries INTEGER NOT NULL DEFAULT 0, next_attempt TEXT NOT NULL, last_error TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, UNIQUE(order_id,kind,destination));`);
 const now=()=>new Date().toISOString();
 const makeId=()=>crypto.randomUUID();
 const orderPhone=p=>{let x=String(p||'').replace(/\D/g,'');if(/^03\d{9}$/.test(x))x='92'+x.slice(1);if(!/^\d{10,15}$/.test(x))throw new Error('Invalid WhatsApp recipient number');return x;};
 function event(id,ev,data={}){db.prepare('INSERT INTO wa_events VALUES (?,?,?,?,?)').run(makeId(),id,ev,JSON.stringify(data),now());}
 function queue(id,kind,destination,payload,due=now()){
  db.prepare(`INSERT INTO wa_outbox(id,order_id,kind,destination,payload,next_attempt,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(order_id,kind,destination) DO NOTHING`).run(makeId(),id,kind,orderPhone(destination),JSON.stringify(payload),due,now());
 }
 function money(n){return 'Rs. '+Number(n||0).toLocaleString('en-PK');}
 function itemText(o){return o.items.map(i=>`${i.product_name} | ${i.sku} | ${i.color} | ${i.size} | Qty ${i.quantity} | ${money(i.unitPrice)}`).join('\n');}
 function publicImage(o){
  const i=o.items[0];if(!i)return '';
  const row=db.prepare('SELECT image_url FROM product_images WHERE product_id=? ORDER BY is_primary DESC,sort_order LIMIT 1').get(i.product_id)||db.prepare('SELECT image_url FROM products WHERE id=?').get(i.product_id);
  const u=row?.image_url||'';if(!u)return '';
  if(u.startsWith('/')&&base.startsWith('https://'))return base+u;
  if(/^https:\/\//.test(u))return u;
  return '';
 }
 function template(name,params,imageUrl,orderNo){const components=[];if(imageUrl)components.push({type:'header',parameters:[{type:'image',image:{link:imageUrl}}]});components.push({type:'body',parameters:params.map(x=>({type:'text',text:String(x).slice(0,900)}))});if(name==='hour'&&orderNo){components.push({type:'button',sub_type:'quick_reply',index:'0',parameters:[{type:'payload',payload:'HSS_CONFIRM:'+orderNo}]},{type:'button',sub_type:'quick_reply',index:'1',parameters:[{type:'payload',payload:'HSS_CANCEL:'+orderNo}]});}return {type:'template',template:{name:templateNames[name],language:{code:lang},components}};}
 function textMsg(body){return {type:'text',text:{preview_url:false,body:body.slice(0,4096)}};}
 function buttons(body,options){return {type:'interactive',interactive:{type:'button',body:{text:body.slice(0,1024)},action:{buttons:options.map(([id,title])=>({type:'reply',reply:{id,title}}))}}};}
 function line(o){return `${o.order_number}\n${itemText(o)}\nDelivery: ${money(o.deliveryFee)}\nTotal: ${money(o.total)}`;}
 function bilingual(english,urdu){return english+'\n\n━━━━━━━━━━━━━━\n\n'+urdu;}
 function adminNotice(o,final){const name=o.customer_name;const head=final?'ORDER FULLY CONFIRMED — READY TO PACK':'NEW ORDER RECEIVED — DO NOT DISPATCH';const ar=final?'آرڈر کی تصدیق مکمل — پیکنگ کے لیے تیار':'نیا آرڈر موصول ہوا — ابھی ڈسپیچ نہ کریں';const state=db.prepare('SELECT * FROM wa_orders WHERE order_id=?').get(o.id);return bilingual(`HER SECOND SKIN PK\n${head}\nOrder ID: ${o.order_number}\nARTICLE DETAILS\n${itemText(o)}\nDelivery Charges: ${money(o.deliveryFee)}\nOrder Total: ${money(o.total)}\nCUSTOMER DETAILS\nName: ${name}\nPhone: ${state?.phone||o.phone}\nAddress: ${state?.address||o.address}\nPayment: Cash on Delivery\nStatus: ${final?'Ready to Pack':'Confirmation Pending'}`,`ہر سیکنڈ اسکن پی کے\n${ar}\nآرڈر نمبر: ${o.order_number}\nآرٹیکل کی تفصیلات\n${itemText(o)}\nڈیلیوری چارجز: ${money(o.deliveryFee)}\nکل رقم: ${money(o.total)}\nکسٹمر کا نام: ${name}\nفون نمبر: ${state?.phone||o.phone}\nپتہ: ${state?.address||o.address}\nادائیگی: کیش آن ڈیلیوری\nاسٹیٹس: ${final?'پیکنگ کے لیے تیار':'تصدیق باقی ہے'}`);}
 function scheduleInitial(o){
  const existing=db.prepare('SELECT order_id FROM wa_orders WHERE order_id=?').get(o.id);if(existing)return;
  const due=new Date(Date.now()+3600000).toISOString();
  db.prepare('INSERT INTO wa_orders(order_id,stage,due_at,phone,address,updated_at) VALUES(?,?,?,?,?,?)').run(o.id,'awaiting_confirmation',due,o.phone,o.address,now());
  event(o.id,'order_received');
  queue(o.id,'step1_customer',o.phone,template('first_customer',[o.customer_name,o.order_number,itemText(o),money(o.deliveryFee),money(o.total)]));
  if(admin){queue(o.id,'step1_admin_template',admin,template('first_admin',[o.order_number,itemText(o),o.customer_name,o.phone,o.address,money(o.total)],publicImage(o)));}
  // Initial alert image follows the approved template, in a separate message only while a customer-service window allows it.
  // For business initiated media, configure an approved media-header template externally.
 }
 async function send(to,payload){if(!enabled)throw new Error('WHATSAPP_AUTOMATION_ENABLED is not 1');if(!token||!sender)throw new Error('Missing WhatsApp credentials');
  const r=await fetch(`https://graph.facebook.com/${version}/${sender}/messages`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to,...payload}),signal:AbortSignal.timeout(15000)});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`Meta HTTP ${r.status}: ${JSON.stringify(data).slice(0,400)}`);return data;
 }
 let busy=false;
 async function pump(){if(busy||!enabled)return;busy=true;try{
  // Only one reminder is queued per order; durable across process restarts.
  const due=db.prepare("SELECT w.order_id FROM wa_orders w JOIN orders o ON o.id=w.order_id WHERE w.stage='awaiting_confirmation' AND w.due_at<=? AND o.status NOT IN ('cancelled','delivered') LIMIT 30").all(now());
  for(const row of due){const o=getOrder(row.order_id);if(!o)continue;queue(o.id,'step2_hour',o.phone,template('hour',[o.customer_name,o.order_number,itemText(o),money(o.deliveryFee),money(o.total)],null,o.order_number));db.prepare("UPDATE wa_orders SET stage='confirmation_requested',updated_at=? WHERE order_id=? AND stage='awaiting_confirmation'").run(now(),o.id);event(o.id,'confirmation_requested');}
  const jobs=db.prepare("SELECT * FROM wa_outbox WHERE state='pending' AND next_attempt<=? ORDER BY created_at LIMIT 12").all(now());
  for(const job of jobs){try{await send(job.destination,JSON.parse(job.payload));db.prepare("UPDATE wa_outbox SET state='sent',last_error='',tries=tries+1 WHERE id=?").run(job.id);event(job.order_id,job.kind+'_sent');}catch(e){const tries=job.tries+1;db.prepare("UPDATE wa_outbox SET tries=?,state=?,next_attempt=?,last_error=? WHERE id=?").run(tries,tries>=6?'failed':'pending',new Date(Date.now()+Math.min(3600000,30000*Math.pow(2,tries))).toISOString(),String(e.message).slice(0,1000),job.id);console.error('[WhatsApp]',job.kind,String(e.message).slice(0,220));}}
 }finally{busy=false;}}
 // Meta button replies require approved button-template quick-replies with payload IDs matching below.
 function orderForReply(value,from){const orderNo=/HSS-\d{8}-\d{4}/.exec(String(value||''));if(!orderNo)return null;const o=getOrder(orderNo[0]);if(!o)return null;const state=db.prepare('SELECT * FROM wa_orders WHERE order_id=?').get(o.id);if(!state||orderPhone(state.phone)!==orderPhone(from))return null;return {o,state};}
 function changeStage(id,stage){db.prepare('UPDATE wa_orders SET stage=?,updated_at=? WHERE order_id=?').run(stage,now(),id);event(id,stage);}
 function verifyMessage(o,state){return bilingual(`HER SECOND SKIN PK\nORDER CONFIRMED\nOrder: ${o.order_number}\nCurrent Phone: ${state.phone}\nCurrent Address: ${state.address}\nAre these correct?`,`ہر سیکنڈ اسکن پی کے\nآرڈر کی تصدیق ہو گئی ہے\nآرڈر نمبر: ${o.order_number}\nموجودہ فون: ${state.phone}\nموجودہ پتہ: ${state.address}\nکیا دونوں معلومات درست ہیں؟`);}
 function finalReview(o,state){return bilingual(`Review your delivery details for ${o.order_number}:\nPhone: ${state.phone}\nAddress: ${state.address}\nPlease approve or edit again.`,`آرڈر ${o.order_number} کی معلومات دوبارہ چیک کریں:\nفون: ${state.phone}\nپتہ: ${state.address}\nبراہِ کرم تصدیق کریں یا دوبارہ تبدیل کریں۔`);}
 function enqueueReply(id,kind,to,payload){queue(id,kind,to,payload);setImmediate(pump);}
 function confirmVerified(o){changeStage(o.id,'ready_to_pack');const t=now();db.prepare('UPDATE orders SET phone=(SELECT phone FROM wa_orders WHERE order_id=?),address=(SELECT address FROM wa_orders WHERE order_id=?),updated_at=? WHERE id=?').run(o.id,o.id,t,o.id);event(o.id,'delivery_details_verified');if(admin){queue(o.id,'step4_admin_template',admin,template('first_admin',[o.order_number,itemText(o),o.customer_name,db.prepare('SELECT phone FROM wa_orders WHERE order_id=?').get(o.id).phone,db.prepare('SELECT address FROM wa_orders WHERE order_id=?').get(o.id).address,money(o.total)],publicImage(o)));}setImmediate(pump);}
 function processWebhook(payload){const entries=payload.entry||[];for(const entry of entries)for(const change of entry.changes||[]){const val=change.value||{};if(val.metadata?.phone_number_id && val.metadata.phone_number_id!==sender)continue;for(const m of val.messages||[]){try{
   const from=m.from;const key=m.interactive?.button_reply?.id||m.button?.payload||m.interactive?.nfm_reply?.response_json&&(JSON.parse(m.interactive.nfm_reply.response_json).order_id||m.interactive.nfm_reply.flow_token||'');
   const ref=orderForReply(key,from);if(!ref)continue;let {o,state}=ref;
   if(m.interactive?.nfm_reply&&state.stage==='updating_details'){
    const data=JSON.parse(m.interactive.nfm_reply.response_json||'{}');const phone=String(data.phone||data.phone_number||state.phone);const addr=String(data.address||data.delivery_address||state.address).trim();if(!/^03\d{9}$/.test(phone)||addr.length<10||addr.length>1000)continue;
    db.prepare('UPDATE wa_orders SET phone=?,address=?,updated_at=? WHERE order_id=?').run(phone,addr,now(),o.id);state={...state,phone,address:addr};changeStage(o.id,'review_details');enqueueReply(o.id,'step3_review',from,buttons(finalReview(o,state),[[`HSS_REVIEW_OK:${o.order_number}`,'Confirm Details'],[`HSS_REVIEW_EDIT:${o.order_number}`,'Edit Again']]));continue;
   }
   if(key.startsWith('HSS_CONFIRM:')&&['confirmation_requested','awaiting_confirmation'].includes(state.stage)){
    changeStage(o.id,'verifying_details');enqueueReply(o.id,'step3_verify',from,buttons(verifyMessage(o,state),[[`HSS_DETAILS_OK:${o.order_number}`,'All Details Correct'],[`HSS_DETAILS_EDIT:${o.order_number}`,'Update Details']]));
   }else if(key.startsWith('HSS_CANCEL:')&&['confirmation_requested','awaiting_confirmation'].includes(state.stage)){
    setOrderStatus(o.id,'cancelled','Cancelled by customer on WhatsApp');changeStage(o.id,'cancelled');
   }else if(key.startsWith('HSS_DETAILS_OK:')&&state.stage==='verifying_details'||key.startsWith('HSS_REVIEW_OK:')&&state.stage==='review_details'){
    confirmVerified(o);
   }else if((key.startsWith('HSS_DETAILS_EDIT:')&&state.stage==='verifying_details'||key.startsWith('HSS_REVIEW_EDIT:')&&state.stage==='review_details')&&flowId){
    changeStage(o.id,'updating_details');enqueueReply(o.id,'step3_flow_'+(state.stage==='review_details'?'again':'first'),from,{type:'interactive',interactive:{type:'flow',header:{type:'text',text:'Her Second Skin PK'},body:{text:'Update your phone number and delivery address / فون نمبر اور پتہ تبدیل کریں'},footer:{text:'Her Second Skin PK'},action:{name:'flow',parameters:{flow_message_version:'3',flow_token:o.order_number,flow_id:flowId,flow_cta:'Update Details',flow_action:'navigate',flow_action_payload:{screen:'DETAILS',data:{order_id:o.order_number,phone:state.phone,address:state.address}}}}}});
   }
  }catch(e){console.error('[WhatsApp webhook]',String(e.message).slice(0,150));}}}}
 function webhookGet(url,res){if(url.searchParams.get('hub.mode')==='subscribe'&&verifyToken&&url.searchParams.get('hub.verify_token')===verifyToken){res.writeHead(200,{'Content-Type':'text/plain'});res.end(url.searchParams.get('hub.challenge')||'');}else{res.writeHead(403);res.end('Forbidden');}}
 function verifySignature(raw,signature){if(!secret||!signature)return false;const expected='sha256='+crypto.createHmac('sha256',secret).update(raw).digest('hex');const a=Buffer.from(expected),b=Buffer.from(signature);return a.length===b.length&&crypto.timingSafeEqual(a,b);}
 async function webhookPost(req,res){const chunks=[];let n=0;for await(const c of req){n+=c.length;if(n>1024*1024){res.writeHead(413);res.end();return;}chunks.push(c);}const raw=Buffer.concat(chunks);if(!verifySignature(raw,req.headers['x-hub-signature-256'])){res.writeHead(403);res.end('Forbidden');return;}let body;try{body=JSON.parse(raw.toString('utf8'));}catch{res.writeHead(400);res.end('Bad JSON');return;}processWebhook(body);res.writeHead(200);res.end('EVENT_RECEIVED');}
 function courierDispatch(orderId,data){const o=getOrder(orderId);if(!o)throw Object.assign(new Error('Order not found'),{status:404});const st=db.prepare('SELECT * FROM wa_orders WHERE order_id=?').get(o.id);if(!st||st.stage!=='ready_to_pack')throw Object.assign(new Error('Order must be verified and ready to pack'),{status:409});const courier=String(data.courier||'').trim().slice(0,80),tracking=String(data.tracking||'').trim().slice(0,120),link=String(data.trackingLink||'').trim().slice(0,500),date=String(data.dispatchDate||'').trim();if(!courier||!tracking||!/^https:\/\//.test(link)||!/\d{4}-\d{2}-\d{2}/.test(date))throw Object.assign(new Error('Courier, tracking ID, official HTTPS tracking link and dispatch date required'),{status:400});db.prepare('UPDATE wa_orders SET courier=?,tracking=?,tracking_link=?,dispatch_date=?,stage=?,dispatched_at=?,updated_at=? WHERE order_id=?').run(courier,tracking,link,date,'dispatched',now(),now(),o.id);event(o.id,'dispatched',{courier,tracking,date});queue(o.id,'step5_dispatched',st.phone,template('dispatched',[o.customer_name,o.order_number,courier,tracking,date,link]));setImmediate(pump);return {stage:'dispatched',courier,tracking,trackingLink:link,dispatchDate:date};}
 function detail(id){const o=getOrder(id);if(!o)return null;return {workflow:db.prepare('SELECT * FROM wa_orders WHERE order_id=?').get(o.id),events:db.prepare('SELECT event,created_at FROM wa_events WHERE order_id=? ORDER BY created_at DESC LIMIT 50').all(o.id),messages:db.prepare('SELECT kind,state,tries,last_error,created_at FROM wa_outbox WHERE order_id=? ORDER BY created_at DESC').all(o.id)};}
 const interval=setInterval(()=>pump().catch(e=>console.error('[WhatsApp pump]',e.message)),15000);interval.unref();
 return {enabled,scheduleInitial,webhookGet,webhookPost,courierDispatch,detail,pump};
}
module.exports={initWhatsApp};
