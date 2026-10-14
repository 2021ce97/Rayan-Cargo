import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-staff-session',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
};
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false }
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' } });
const BRANCH_COLUMNS='id,name,name_fa,name_ps,code,province,city,address,phone,email,manager_name,tazkira_number,is_head_office,active_shipments_count,total_parcels_dispatched,total_parcels_received,total_revenue_afn,created_at,updated_at';
const USER_COLUMNS='id,branch_id,name,email,phone,role,password_changed_by_branch,last_password_change,status,avatar,preferences,last_login_at,created_at,updated_at';
const SHIPMENT_LIST_COLUMNS='id,cn_number,origin_branch_id,destination_branch_id,current_branch_id,sender,receiver,package_info,financials,status,status_history,booked_at,estimated_delivery,actual_delivery,delivery_notes,booked_by_user_id,booked_by_user_name,is_customer_prebooked,is_pre_booking,customer_user_id,dest_branch_commission,remittance_status,origin_remittance_due,seller_payout_status,seller_payout_disbursed_at,seller_payout_method,seller_payout_voucher_ref,seller_payout_disbursed_by_branch_id,seller_payout_disbursed_by_user_name,seller_payout_confirmed_at,seller_payout_dispute_reason,seller_payout_notes,updated_at';
const SHIPMENT_CORE_COLUMNS='id,cn_number,origin_branch_id,destination_branch_id,current_branch_id,sender,receiver,package_info,financials,status,status_history,booked_at,estimated_delivery,actual_delivery,delivery_notes,booked_by_user_id,booked_by_user_name,is_customer_prebooked,is_pre_booking,customer_user_id,dest_branch_commission,remittance_status,origin_remittance_due,updated_at';
const SHIPMENT_DETAIL_COLUMNS=SHIPMENT_LIST_COLUMNS+',pod_signature,receiver_id_proof';
const EXPENSE_COLUMNS='id,branch_id,category,amount,description,expense_date,paid_to,receipt_number,created_by_name,created_at,updated_at';
const SETTLEMENT_COLUMNS='id,shipment_id,parcel_ids,cn_number,origin_branch_id,destination_branch_id,gross_collected_amount,dest_branch_commission,transportation_fee,origin_branch_commission,total_commission_kept,net_remitted_amount,settled_by_user_name,sarafi_reference_no,settlement_channel,settlement_status,settled_at,notes,created_at,updated_at';
const pageSize=(url:URL,maximum=100)=>Math.min(Math.max(Number(url.searchParams.get('limit'))||50,1),maximum);
const normalizeCn=(value:string)=>{
  const compact=value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  const match=compact.match(/^(?:ARM)?(\d+)$/);
  return match?`ARM-${match[1]}`:compact;
};
const hash = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};
const credentialKey = async () => {
  const source = Deno.env.get('BRANCH_CREDENTIALS_ENCRYPTION_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('rayan-cargo:branch-credentials:v1:' + source));
  return crypto.subtle.importKey('raw', raw, {name:'AES-GCM'}, false, ['encrypt','decrypt']);
};
const encryptCredential = async (value:string) => {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await credentialKey(),new TextEncoder().encode(value)));
  return btoa(String.fromCharCode(...iv,...encrypted));
};
const decryptCredential = async (value:string) => {
  const packed=Uint8Array.from(atob(value),c=>c.charCodeAt(0));
  const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv:packed.slice(0,12)},await credentialKey(),packed.slice(12));
  return new TextDecoder().decode(decrypted);
};
const safeUser = (r: any) => ({
  id:r.id,name:r.name,email:r.email||'',phone:r.phone||'',role:r.role,branchId:r.branch_id||'customer',
  passwordChangedByBranch:r.password_changed_by_branch||false,lastPasswordChange:r.last_password_change||undefined,
  status:r.status||'active',avatar:r.avatar||undefined,preferences:r.preferences||{},createdAt:r.created_at,
  lastLogin:r.last_login_at||'Never'
});
const mapBranch = (r:any) => ({
  id:r.id,name:r.name,nameFa:r.name_fa||r.name,namePs:r.name_ps||r.name,code:r.code,province:r.province,
  city:r.city,address:r.address,phone:r.phone,email:r.email,managerName:r.manager_name,
  tazkiraNumber:r.tazkira_number||'',isHeadOffice:!!r.is_head_office,
  activeShipmentsCount:r.active_shipments_count||0,totalParcelsDispatched:r.total_parcels_dispatched||0,
  totalParcelsReceived:r.total_parcels_received||0,totalRevenueAfn:Number(r.total_revenue_afn||0),createdAt:r.created_at
});
const mapShipment = (r:any) => ({
  id:r.id,cnNumber:r.cn_number,originBranchId:r.origin_branch_id,destinationBranchId:r.destination_branch_id,
  currentBranchId:r.current_branch_id,sender:r.sender,receiver:r.receiver,packageInfo:r.package_info,
  financials:r.financials,status:r.status,statusHistory:r.status_history||[],bookedAt:r.booked_at,
  estimatedDelivery:r.estimated_delivery,actualDelivery:r.actual_delivery,podSignature:r.pod_signature,
  receiverIdProof:r.receiver_id_proof,deliveryNotes:r.delivery_notes,bookedByUserId:r.booked_by_user_id,
  bookedByUserName:r.booked_by_user_name,isCustomerPrebooked:r.is_customer_prebooked,
  isPreBooking:r.is_pre_booking,customerUserId:r.customer_user_id,destBranchCommission:r.dest_branch_commission,
  remittanceStatus:r.remittance_status,originRemittanceDue:r.origin_remittance_due,
  sellerPayoutStatus:r.seller_payout_status,sellerPayoutDisbursedAt:r.seller_payout_disbursed_at,
  sellerPayoutMethod:r.seller_payout_method,sellerPayoutVoucherRef:r.seller_payout_voucher_ref,
  sellerPayoutDisbursedByBranchId:r.seller_payout_disbursed_by_branch_id,
  sellerPayoutDisbursedByUserName:r.seller_payout_disbursed_by_user_name,
  sellerPayoutConfirmedAt:r.seller_payout_confirmed_at,sellerPayoutDisputeReason:r.seller_payout_dispute_reason,
  sellerPayoutNotes:r.seller_payout_notes
});
const mapExpense = (r:any) => ({
  id:r.id,branchId:r.branch_id,category:r.category,amount:Number(r.amount),description:r.description,
  expenseDate:r.expense_date,paidTo:r.paid_to,receiptNumber:r.receipt_number,
  createdByName:r.created_by_name,createdAt:r.created_at
});
const mapSettlement = (r:any) => ({
  id:r.id,batchNumber:r.cn_number||('REM-'+r.id),fromBranchId:r.destination_branch_id||r.branch_id,
  originBranchId:r.origin_branch_id,toBranchId:'br_admin_hq',
  parcelIds:r.parcel_ids||(r.shipment_id?[r.shipment_id]:[]),parcelCount:(r.parcel_ids||[]).length,
  totalCollectedAfn:Number(r.gross_collected_amount||0),destCommissionAfn:Number(r.dest_branch_commission||0),
  transportationFeeAfn:Number(r.transportation_fee||0),originCommissionAfn:Number(r.origin_branch_commission||0),
  totalCommissionKeptAfn:Number(r.total_commission_kept||0),netRemittanceAmountAfn:Number(r.net_remitted_amount||0),
  commissionAdjustmentType:r.commission_adjustment_type||'exact',
  commissionAdjustmentAmount:Number(r.commission_adjustment_amount||0),
  commissionAdjustmentReason:r.commission_adjustment_reason||'',transportAdjustmentType:r.transport_adjustment_type||'exact',
  transportAdjustmentAmount:Number(r.transport_adjustment_amount||0),transportAdjustmentReason:r.transport_adjustment_reason||'',
  paymentMethod:r.settlement_channel==='sarafi_hawala'?'hawala':r.settlement_channel,
  referenceNumber:r.sarafi_reference_no||'',transferAgentName:r.settled_by_user_name||'',notes:r.notes||'',
  status:r.settlement_status==='settled'?'confirmed_by_headoffice':'submitted_to_headoffice',
  submittedByUserName:r.settled_by_user_name||'Staff',submittedAt:r.settled_at||r.created_at
});
type Actor={id:string;role:'super_admin'|'branch_manager'|'customer';branchId:string};
async function getActor(req:Request):Promise<Actor|null>{
  const staffToken=req.headers.get('x-staff-session');
  if(staffToken){
    const {data:s}=await db.from('staff_sessions').select('staff_user_id').eq('token_hash',await hash(staffToken))
      .is('revoked_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();
    if(!s)return null;
    const {data:u}=await db.from('staff_users').select('id,role,branch_id').eq('id',s.staff_user_id).eq('status','active').maybeSingle();
    return u?{id:u.id,role:u.role,branchId:u.branch_id||'customer'}:null;
  }
  const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(!token)return null;
  const {data:a}=await db.auth.getUser(token);
  if(!a.user)return null;
  const {data:p}=await db.from('super_admin_profiles').select('legacy_user_id').eq('auth_user_id',a.user.id).eq('status','active').maybeSingle();
  return p?{id:p.legacy_user_id||a.user.id,role:'super_admin',branchId:'all'}:null;
}
const branchRow=(b:any)=>({
  id:b.id,name:b.name,name_fa:b.nameFa||b.name,name_ps:b.namePs||b.name,code:b.code,province:b.province,
  city:b.city,address:b.address,phone:b.phone,email:b.email,manager_name:b.managerName,tazkira_number:b.tazkiraNumber||'',
  is_head_office:!!b.isHeadOffice,active_shipments_count:b.activeShipmentsCount||0,
  total_parcels_dispatched:b.totalParcelsDispatched||0,total_parcels_received:b.totalParcelsReceived||0,
  total_revenue_afn:b.totalRevenueAfn||0,created_at:b.createdAt||new Date().toISOString()
});
const shipmentRow=(s:any)=>({
  id:s.id,cn_number:s.cnNumber,origin_branch_id:s.originBranchId,destination_branch_id:s.destinationBranchId,
  current_branch_id:s.currentBranchId,sender:s.sender,receiver:s.receiver,package_info:s.packageInfo||s.packageDetails,
  financials:s.financials,status:s.status,status_history:s.statusHistory||[],booked_at:s.bookedAt||new Date().toISOString(),
  estimated_delivery:s.estimatedDelivery||null,actual_delivery:s.actualDelivery||null,pod_signature:s.podSignature||null,
  receiver_id_proof:s.receiverIdProof||null,delivery_notes:s.deliveryNotes||'',booked_by_user_id:s.bookedByUserId||null,
  booked_by_user_name:s.bookedByUserName||null,is_customer_prebooked:!!(s.isCustomerPrebooked||s.isPreBooking),
  is_pre_booking:!!(s.isCustomerPrebooked||s.isPreBooking),customer_user_id:s.customerUserId||null,
  dest_branch_commission:s.destBranchCommission||0,remittance_status:s.remittanceStatus||'pending',
  origin_remittance_due:s.originRemittanceDue||0,seller_payout_status:s.sellerPayoutStatus||null,
  seller_payout_disbursed_at:s.sellerPayoutDisbursedAt||null,seller_payout_method:s.sellerPayoutMethod||null,
  seller_payout_voucher_ref:s.sellerPayoutVoucherRef||null,
  seller_payout_disbursed_by_branch_id:s.sellerPayoutDisbursedByBranchId||null,
  seller_payout_disbursed_by_user_name:s.sellerPayoutDisbursedByUserName||null,
  seller_payout_confirmed_at:s.sellerPayoutConfirmedAt||null,
  seller_payout_dispute_reason:s.sellerPayoutDisputeReason||null,seller_payout_notes:s.sellerPayoutNotes||null,
  created_at:s.createdAt||s.bookedAt||new Date().toISOString()
});
const shipmentPatch=(s:any)=>{
  const pairs:Record<string,string>={
    cnNumber:'cn_number',originBranchId:'origin_branch_id',destinationBranchId:'destination_branch_id',currentBranchId:'current_branch_id',
    sender:'sender',receiver:'receiver',packageInfo:'package_info',packageDetails:'package_info',financials:'financials',status:'status',
    statusHistory:'status_history',estimatedDelivery:'estimated_delivery',actualDelivery:'actual_delivery',podSignature:'pod_signature',
    receiverIdProof:'receiver_id_proof',deliveryNotes:'delivery_notes',destBranchCommission:'dest_branch_commission',
    remittanceStatus:'remittance_status',originRemittanceDue:'origin_remittance_due',customerSubmissionAt:'customer_submission_at',
    customerSubmissionReference:'customer_submission_reference',customerSubmissionBy:'customer_submission_by',
    sellerPayoutStatus:'seller_payout_status',sellerPayoutDisbursedAt:'seller_payout_disbursed_at',sellerPayoutMethod:'seller_payout_method',
    sellerPayoutVoucherRef:'seller_payout_voucher_ref',sellerPayoutDisbursedByBranchId:'seller_payout_disbursed_by_branch_id',
    sellerPayoutDisbursedByUserName:'seller_payout_disbursed_by_user_name',sellerPayoutConfirmedAt:'seller_payout_confirmed_at',
    sellerPayoutDisputeReason:'seller_payout_dispute_reason',sellerPayoutNotes:'seller_payout_notes'
  };
  const result:Record<string,unknown>={};
  for(const [source,target] of Object.entries(pairs))if(Object.prototype.hasOwnProperty.call(s,source))result[target]=s[source];
  return result;
};

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  const path=new URL(req.url).pathname.replace(/^\/backend/,'')||'/';
  const body=['POST','PUT','PATCH'].includes(req.method)?await req.json().catch(()=>({})):{};
  try{
    if(path==='/auth/login'&&req.method==='POST'){
      const token=crypto.randomUUID()+crypto.randomUUID();
      const expiresAt=new Date(Date.now()+12*60*60*1000).toISOString();
      const {data,error}=await db.rpc('create_staff_session',{p_identifier:String(body.identifier||''),p_password:String(body.password||''),p_token_hash:await hash(token),p_expires_at:expiresAt});
      if(error)throw error;
      return data?json({success:true,user:data,sessionToken:token,expiresAt}):json({success:false,error:'Invalid credentials.'},401);
    }
    if(path==='/auth/customer-signup'&&req.method==='POST'){
      if(!body.name||!body.phone||!body.password||!body.tazkiraNumber)return json({success:false,error:'Name, phone, Tazkira number, and password are required.'},400);
      const id='usr_customer_'+crypto.randomUUID();
      const token=crypto.randomUUID()+crypto.randomUUID();
      const expiresAt=new Date(Date.now()+12*60*60*1000).toISOString();
      const {data,error}=await db.rpc('register_customer_and_create_session',{
        p_id:id,p_name:String(body.name).trim(),p_email:String(body.email||'').trim(),
        p_phone:String(body.phone).trim(),p_password:String(body.password),
        p_tazkira:String(body.tazkiraNumber).trim(),p_city:String(body.city||'').trim(),
        p_token_hash:await hash(token),p_expires_at:expiresAt
      });
      if(error)return json({success:false,error:error.message},400);
      if(!data?.success){
        const messages:any={
          phone_exists:'An account already exists for this phone number. Please sign in instead.',
          email_exists:'An account already exists for this email address. Please sign in instead.',
          invalid_phone:'Enter a valid Afghan mobile number such as 0799 123 456 or +93 799 123 456.',
          invalid_name:'Enter your full name.',
          weak_password:'Password must contain at least 6 characters.',
          invalid_tazkira:'Tazkira number must contain exactly 13 digits.'
        };
        return json({success:false,error:messages[data?.reason]||'Customer registration failed.'},409);
      }
      return json({success:true,user:data.user,sessionToken:token,expiresAt},201);
    }
    if(path.startsWith('/track/')&&req.method==='GET'){
      const cn=normalizeCn(decodeURIComponent(path.slice(7)));
      if(!cn)return json({success:false,error:'A consignment number is required.'},400);
      const {data,error}=await db.from('shipments').select(SHIPMENT_DETAIL_COLUMNS).eq('cn_number',cn).limit(1).maybeSingle();
      if(error)throw error;
      return data?json({success:true,shipment:mapShipment(data)}):json({success:false,error:'Shipment not found.'},404);
    }
    const actor=await getActor(req);
    if(!actor)return json({success:false,error:'Authentication required.'},401);
    const admin=actor.role==='super_admin';
    if(path==='/auth/logout'&&req.method==='POST'){
      const staffToken=req.headers.get('x-staff-session');
      if(staffToken)await db.from('staff_sessions').update({revoked_at:new Date().toISOString()}).eq('token_hash',await hash(staffToken));
      return json({success:true});
    }
    if(path==='/health'&&req.method==='GET'){
      return json({status:'online',connected:true,database:'Supabase Edge Functions',serverTime:new Date().toISOString()});
    }
    if(path==='/sync'&&req.method==='GET'){
      const url=new URL(req.url),since=url.searchParams.get('since'),limit=pageSize(url,100);
      let b:any=db.from('branches').select(BRANCH_COLUMNS).order('created_at');
      let u:any=db.from('staff_users').select(USER_COLUMNS).order('created_at');
      let s:any=db.from('shipments').select(SHIPMENT_LIST_COLUMNS).order('booked_at',{ascending:false}).limit(limit);
      let e:any=db.from('branch_expenses').select(EXPENSE_COLUMNS).order('created_at',{ascending:false}).limit(limit);
      let t:any=db.from('branch_settlements').select(SETTLEMENT_COLUMNS).order('created_at',{ascending:false}).limit(limit);
      if(since){b=b.gt('updated_at',since);u=u.gt('updated_at',since);s=s.gt('updated_at',since);e=e.gt('updated_at',since);t=t.gt('updated_at',since)}
      if(!admin)u=u.eq('id',actor.id);
      if(actor.role==='branch_manager'){
        s=s.or('origin_branch_id.eq.'+actor.branchId+',destination_branch_id.eq.'+actor.branchId+',current_branch_id.eq.'+actor.branchId);
        e=e.eq('branch_id',actor.branchId);
        t=t.or('branch_id.eq.'+actor.branchId+',origin_branch_id.eq.'+actor.branchId+',destination_branch_id.eq.'+actor.branchId);
      }else if(actor.role==='customer'){
        s=s.eq('customer_user_id',actor.id);e=e.limit(0);t=t.limit(0);
      }
      const [br,us,sh,ex,se]=await Promise.all([b,u,s,e,t]);
      let shipmentResult:any=sh;
      if(sh.error){
        console.warn('Full shipment sync failed; retrying core columns:',sh.error.message);
        let fallback:any=db.from('shipments').select(SHIPMENT_CORE_COLUMNS).order('booked_at',{ascending:false}).limit(limit);
        if(since)fallback=fallback.gt('updated_at',since);
        if(actor.role==='branch_manager')fallback=fallback.or('origin_branch_id.eq.'+actor.branchId+',destination_branch_id.eq.'+actor.branchId+',current_branch_id.eq.'+actor.branchId);
        else if(actor.role==='customer')fallback=fallback.eq('customer_user_id',actor.id);
        shipmentResult=await fallback;
      }
      const coreFailed=[br,us,shipmentResult].find((result:any)=>result.error);
      if(coreFailed?.error)throw coreFailed.error;
      if(ex.error)console.warn('Optional branch_expenses sync failed:',ex.error.message);
      if(se.error)console.warn('Optional branch_settlements sync failed:',se.error.message);
      return json({
        success:true,serverTime:new Date().toISOString(),incremental:!!since,
        branches:(br.data||[]).map(mapBranch),
        users:(us.data||[]).map(safeUser),
        shipments:(shipmentResult.data||[]).map(mapShipment),
        expenses:(ex.error?[]:(ex.data||[])).map(mapExpense),
        remittances:(se.error?[]:(se.data||[])).map(mapSettlement),
        warnings:[
          ...(ex.error?['branch_expenses: '+ex.error.message]:[]),
          ...(se.error?['branch_settlements: '+se.error.message]:[])
        ]
      });
    }
    if(path==='/branches'&&req.method==='GET'){
      const {data,error}=await db.from('branches').select(BRANCH_COLUMNS).order('created_at');if(error)throw error;
      return json({success:true,branches:(data||[]).map(mapBranch)});
    }
    if(path==='/branches'&&req.method==='POST'){
      if(!admin)return json({success:false,error:'Super Admin required.'},403);
      const {error}=await db.from('branches').upsert(branchRow(body),{onConflict:'id'});if(error)throw error;
      return json({success:true,branch:body});
    }
    const credentialPathParts=path.split('/').filter(Boolean);
    if(credentialPathParts.length===3&&credentialPathParts[0]==='branches'&&credentialPathParts[2]==='credentials'&&req.method==='GET'){
      if(!admin)return json({success:false,error:'Super Admin required.'},403);
      const branchId=decodeURIComponent(credentialPathParts[1]);
      const {data:secret,error}=await db.from('branch_credential_secrets')
        .select('staff_user_id,encrypted_password,updated_at').eq('branch_id',branchId).maybeSingle();
      if(error)throw error;
      if(!secret)return json({success:false,error:'No displayable password is stored yet. Save this branch credential once to add it to the secure vault.'},404);
      const {data:user,error:userError}=await db.from('staff_users').select('email').eq('id',secret.staff_user_id).single();
      if(userError)throw userError;
      return json({success:true,credentials:{email:user.email,password:await decryptCredential(secret.encrypted_password),updatedAt:secret.updated_at}});
    }
    if(/^\/branches\/[^/]+$/.test(path)&&req.method==='DELETE'){
      if(!admin)return json({success:false,error:'Super Admin required.'},403);
      const id=path.split('/')[2];const {data:t}=await db.from('branches').select('is_head_office').eq('id',id).maybeSingle();
      if(t?.is_head_office)return json({success:false,error:'Head Office cannot be deleted.'},400);
      const {error}=await db.from('branches').delete().eq('id',id);if(error)throw error;return json({success:true});
    }
    if(path==='/users'&&req.method==='GET'){
      let q=db.from('staff_users').select(USER_COLUMNS).order('created_at');
      if(!admin)q=q.eq('id',actor.id);const {data,error}=await q;if(error)throw error;
      return json({success:true,users:(data||[]).map(safeUser)});
    }
    if(path==='/users/preferences'&&req.method==='POST'){
      if(!admin&&body.userId!==actor.id)return json({success:false,error:'Forbidden.'},403);
      const {error}=await db.from('staff_users').update({preferences:body.preferences||{}}).eq('id',body.userId);if(error)throw error;return json({success:true});
    }
    if(path==='/users/change-password'&&req.method==='POST'){
      if(!admin&&body.userId!==actor.id)return json({success:false,error:'Forbidden.'},403);
      const {error}=await db.rpc('set_staff_password',{p_user_id:body.userId,p_password:body.newPassword});if(error)throw error;return json({success:true});
    }
    if(path==='/users/credentials'&&req.method==='POST'){
      if(!admin)return json({success:false,error:'Super Admin required.'},403);
      const requestedId=String(body.userId||'').trim();
      const branchId=String(body.branchId||'').trim();
      const email=String(body.email||'').trim().toLowerCase();
      const password=String(body.password||'');
      if(!requestedId||!branchId||!email.includes('@')||password.length<6){
        return json({success:false,error:'User, branch, valid email, and a password of at least 6 characters are required.'},400);
      }

      let {data:existing,error:lookupError}=await db.from('staff_users').select('id').eq('id',requestedId).maybeSingle();
      if(lookupError)throw lookupError;
      if(!existing){
        const byBranch=await db.from('staff_users').select('id').eq('branch_id',branchId).eq('role','branch_manager').maybeSingle();
        if(byBranch.error)throw byBranch.error;
        existing=byBranch.data;
      }
      const targetId=existing?.id||requestedId;
      const row={id:targetId,branch_id:branchId,name:String(body.name||'Branch Manager').trim(),email,phone:String(body.phone||'').trim(),role:'branch_manager',status:'active'};
      const result=existing
        ?await db.from('staff_users').update(row).eq('id',targetId)
        :await db.from('staff_users').insert({...row,password_hash:'pending'});
      if(result.error)throw result.error;
      const {error}=await db.rpc('set_staff_password',{p_user_id:targetId,p_password:password});
      if(error)throw error;
      const stored=await db.from('branch_credential_secrets').upsert({
        branch_id:branchId,staff_user_id:targetId,encrypted_password:await encryptCredential(password),updated_at:new Date().toISOString()
      },{onConflict:'branch_id'});
      if(stored.error)throw stored.error;
      const updated=await db.from('staff_users')
        .update({password_changed_by_branch:false})
        .eq('id',targetId)
        .select('id,branch_id,name,email,phone,role,password_changed_by_branch,last_password_change,status,avatar,preferences,last_login_at,created_at')
        .single();
      if(updated.error)throw updated.error;
      const revoked=await db.from('staff_sessions').update({revoked_at:new Date().toISOString()}).eq('staff_user_id',targetId).is('revoked_at',null);
      if(revoked.error)throw revoked.error;
      return json({success:true,user:safeUser(updated.data)});
    }
    if(path==='/shipments'&&req.method==='GET'){
      const url=new URL(req.url),limit=pageSize(url),offset=Math.max(Number(url.searchParams.get('offset'))||0,0);
      let q=db.from('shipments').select(SHIPMENT_LIST_COLUMNS,{count:'exact'}).order('booked_at',{ascending:false}).range(offset,offset+limit-1);
      if(actor.role==='branch_manager')q=q.or('origin_branch_id.eq.'+actor.branchId+',destination_branch_id.eq.'+actor.branchId+',current_branch_id.eq.'+actor.branchId);
      if(actor.role==='customer')q=q.eq('customer_user_id',actor.id);
      const {data,error,count}=await q;if(error)throw error;return json({success:true,shipments:(data||[]).map(mapShipment),page:{offset,limit,total:count||0,hasMore:offset+(data?.length||0)<(count||0)}});
    }
    if(path==='/shipments'&&req.method==='POST'){
      const row=shipmentRow(body);
      if(!admin&&actor.role==='branch_manager'&&row.origin_branch_id!==actor.branchId)return json({success:false,error:'Forbidden branch.'},403);
      if(actor.role==='customer'){
        row.customer_user_id=actor.id;
        row.booked_by_user_id=actor.id;
        row.is_customer_prebooked=true;
        row.is_pre_booking=true;
        row.status='pre_booked';
        let lastError:any=null;
        for(let attempt=0;attempt<5;attempt++){
          const generated=await db.rpc('next_shipment_cn');
          if(generated.error)throw generated.error;
          row.cn_number=generated.data;
          const inserted=await db.from('shipments').insert(row).select(SHIPMENT_DETAIL_COLUMNS).single();
          if(!inserted.error)return json({success:true,shipment:mapShipment(inserted.data)},201);
          lastError=inserted.error;
          if(inserted.error.code!=='23505')throw inserted.error;
        }
        throw lastError||new Error('Could not allocate a unique consignment number.');
      }
      const {data,error}=await db.from('shipments').upsert(row,{onConflict:'id'}).select(SHIPMENT_DETAIL_COLUMNS).single();
      if(error)throw error;
      return json({success:true,shipment:mapShipment(data)});
    }
    const sm=path.match(/^\/shipments\/([^/]+)(?:\/(status|print))?$/);
    if(sm&&['PUT','PATCH','DELETE','POST'].includes(req.method)){
      const id=sm[1],action=sm[2];
      let target:any=null;
      if(!admin){
        const {data:resolvedTarget,error:targetError}=await db.from('shipments').select('customer_user_id,origin_branch_id,destination_branch_id,current_branch_id').eq('id',id).maybeSingle();
        target=resolvedTarget;
        if(targetError)throw targetError;if(!target)return json({success:false,error:'Shipment not found.'},404);
        const allowed=actor.role==='customer'
          ? target.customer_user_id===actor.id
          : [target.origin_branch_id,target.destination_branch_id,target.current_branch_id].includes(actor.branchId);
        if(!allowed)return json({success:false,error:'This parcel is not assigned to your branch.'},403);
      }
      if(req.method==='DELETE'){if(!admin)return json({success:false,error:'Super Admin required.'},403);const {error}=await db.from('shipments').delete().eq('id',id);if(error)throw error}
      else if(action==='status'){
        if(!admin){
          if(actor.role!=='branch_manager')return json({success:false,error:'Only branch staff can update parcel status.'},403);
          const nextStatus=String(body.status||'');
          const atOrigin=target.origin_branch_id===actor.branchId;
          const atDestination=target.destination_branch_id===actor.branchId;
          const originStatuses=['verified','booked','in_transit'];
          const destinationStatuses=['received_at_branch','out_for_delivery','delivered','returned','cancelled'];
          const statusAllowed=(atOrigin&&originStatuses.includes(nextStatus))||(atDestination&&destinationStatuses.includes(nextStatus));
          if(!statusAllowed){
            return json({success:false,error:atDestination
              ?'The destination branch can set Received, Out for Delivery, Delivered, Returned, or Cancelled.'
              :'The origin branch can set Verified, Booked, or In Transit.'},403);
          }
        }
        const update:any=shipmentPatch({...body,...(body.extraFields||{})});
        const {error}=await db.from('shipments').update(update).eq('id',id);if(error)throw error
      }
      else if(action==='print'){const {data:c}=await db.from('shipments').select('print_count').eq('id',id).maybeSingle();const {error}=await db.from('shipments').update({print_count:Number(c?.print_count||0)+1,last_printed_at:new Date().toISOString(),last_printed_by:actor.id}).eq('id',id);if(error)throw error}
      else if(req.method==='PATCH'){
        const {error}=await db.from('shipments').update(shipmentPatch(body)).eq('id',id);if(error)throw error
      }
      else{const {error}=await db.from('shipments').upsert(shipmentRow({...body,id}),{onConflict:'id'});if(error)throw error}
      return json({success:true});
    }
    if(path==='/expenses'&&req.method==='GET'){
      if(actor.role==='customer')return json({success:false,error:'Forbidden.'},403);
      const url=new URL(req.url),limit=pageSize(url),offset=Math.max(Number(url.searchParams.get('offset'))||0,0);
      let q=db.from('branch_expenses').select(EXPENSE_COLUMNS,{count:'exact'}).order('created_at',{ascending:false}).range(offset,offset+limit-1);if(!admin)q=q.eq('branch_id',actor.branchId);
      const {data,error,count}=await q;if(error)throw error;return json({success:true,expenses:(data||[]).map(mapExpense),page:{offset,limit,total:count||0}});
    }
    if(path==='/expenses'&&req.method==='POST'){
      if(actor.role==='customer')return json({success:false,error:'Forbidden.'},403);
      if(!admin&&body.branchId!==actor.branchId)return json({success:false,error:'Forbidden branch.'},403);
      const row={id:body.id,branch_id:body.branchId,category:body.category,amount:body.amount,description:body.description,expense_date:body.expenseDate,paid_to:body.paidTo||'',receipt_number:body.receiptNumber||'',created_by_name:body.createdByName||'',created_at:body.createdAt||new Date().toISOString()};
      const {error}=await db.from('branch_expenses').upsert(row,{onConflict:'id'});if(error)throw error;return json({success:true,expense:body});
    }
    if(/^\/expenses\/[^/]+$/.test(path)&&req.method==='DELETE'){
      if(actor.role==='customer')return json({success:false,error:'Forbidden.'},403);
      let q=db.from('branch_expenses').delete().eq('id',path.split('/')[2]);if(!admin)q=q.eq('branch_id',actor.branchId);
      const {error}=await q;if(error)throw error;return json({success:true})
    }
    if((path==='/settlements'||path==='/remittances')&&req.method==='GET'){
      if(actor.role==='customer')return json({success:false,error:'Forbidden.'},403);
      const url=new URL(req.url),limit=pageSize(url),offset=Math.max(Number(url.searchParams.get('offset'))||0,0);
      let q=db.from('branch_settlements').select(SETTLEMENT_COLUMNS,{count:'exact'}).order('created_at',{ascending:false}).range(offset,offset+limit-1);
      if(!admin)q=q.or('branch_id.eq.'+actor.branchId+',origin_branch_id.eq.'+actor.branchId+',destination_branch_id.eq.'+actor.branchId);
      const {data,error,count}=await q;if(error)throw error;
      const rows=(data||[]).map(mapSettlement);return json({success:true,settlements:rows,remittances:rows,page:{offset,limit,total:count||0}});
    }
    if((path==='/settlements'||path==='/remittances')&&req.method==='POST'){
      if(actor.role==='customer')return json({success:false,error:'Forbidden.'},403);
      if(!admin&&body.fromBranchId!==actor.branchId&&body.destinationBranchId!==actor.branchId)return json({success:false,error:'Forbidden branch.'},403);
      const row={id:body.id,branch_id:body.fromBranchId||body.destinationBranchId||actor.branchId,shipment_id:body.shipmentId||null,parcel_ids:body.parcelIds||[],cn_number:body.batchNumber||body.cnNumber||('REM-'+body.id),origin_branch_id:body.originBranchId||actor.branchId,destination_branch_id:body.fromBranchId||body.destinationBranchId||actor.branchId,gross_collected_amount:body.totalCollectedAfn||0,dest_branch_commission:body.destCommissionAfn||0,transportation_fee:body.transportationFeeAfn||0,origin_branch_commission:body.originCommissionAfn||0,total_commission_kept:body.totalCommissionKeptAfn||0,net_remitted_amount:body.netRemittanceAmountAfn||0,settlement_channel:body.paymentMethod==='hawala'?'sarafi_hawala':body.paymentMethod||'sarafi_hawala',sarafi_reference_no:body.referenceNumber||'',settlement_status:body.status==='confirmed_by_headoffice'?'settled':'pending',settled_by_user_name:body.submittedByUserName||'Staff',settled_at:body.submittedAt||new Date().toISOString(),notes:body.notes||'',created_at:body.createdAt||body.submittedAt||new Date().toISOString()};
      const {error}=await db.from('branch_settlements').upsert(row,{onConflict:'id'});if(error)throw error;return json({success:true});
    }
    const rm=path.match(/^\/remittances\/([^/]+)\/(confirm|reject)$/);
    if(rm&&req.method==='PATCH'){if(!admin)return json({success:false,error:'Super Admin required.'},403);const status=rm[2]==='confirm'?'settled':'rejected';const {error}=await db.from('branch_settlements').update({settlement_status:status,notes:body.notes||body.reason||''}).eq('id',rm[1]);if(error)throw error;return json({success:true})}
    if(path==='/analytics/revenue-overview'&&req.method==='GET'){
      if(!admin)return json({success:false,error:'Super Admin required.'},403);
      const {data,error}=await db.rpc('get_revenue_overview');if(error)throw error;
      return json({success:true,...data});
    }
    if(path==='/system/reset-clean-slate'&&req.method==='POST'){if(!admin)return json({success:false,error:'Super Admin required.'},403);await Promise.all([db.from('branch_settlements').delete().neq('id',''),db.from('branch_expenses').delete().neq('id',''),db.from('shipments').delete().neq('id','')]);return json({success:true})}
    return json({success:false,error:'Edge route not found.'},404);
  }catch(error){
    console.error(error);
    const detail=typeof error==='object'&&error&&'message' in error?String((error as {message:unknown}).message):String(error||'Unexpected Edge Function error.');
    return json({success:false,error:detail},500);
  }
});
