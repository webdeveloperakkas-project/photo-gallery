(function(){
  const $=id=>document.getElementById(id);
  const URL="https://hguwdcmwqcpswyxtskcb.supabase.co",KEY="sb_publishable_NLm2aSYg_j-zzRNSU-86gQ_Oj-xyHr2";
  const client=window.supabase?.createClient(URL,KEY);
  const label=$("header-wallet-currency"),rowsHost=$("header-wallet-balance-rows");
  if(!client||!label||!rowsHost)return;
  const isBD=v=>/bangladesh/i.test(String(v||""))||/^BD$/i.test(String(v||"").trim());
  const money=(v,c)=>new Intl.NumberFormat(undefined,{style:"currency",currency:c,minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0);
  async function init(){
    const {data:sd,error:se}=await client.auth.getSession(),user=sd?.session?.user;
    if(se||!user)return;
    let country="";
    try{const {data,error}=await client.from("user_verification_submissions").select("verification_type,status,country,address_country,submitted_at").eq("user_id",user.id).order("submitted_at",{ascending:false});if(!error&&data?.length){const id=data.find(r=>r.verification_type==="identity"&&r.status==="approved")||data.find(r=>r.verification_type==="identity");const ad=data.find(r=>r.verification_type==="address"&&r.status==="approved")||data.find(r=>r.verification_type==="address");country=id?.country||ad?.address_country||"";}}catch(e){}
    if(!country){try{const {data,error}=await client.from("user_profiles").select("country").eq("user_id",user.id).maybeSingle();if(!error)country=data?.country||"";}catch(e){}}
    let code=country?(isBD(country)?"BD":"US"):"";
    if(!code){try{const res=await fetch("https://ipapi.co/json/");if(res.ok){const geo=await res.json();code=String(geo.country_code||"").toUpperCase()==="BD"?"BD":"US";}}catch(e){code="US";}}
    const currency=code==="BD"?"BDT":"USD";label.textContent=currency;
    try{const {data,error}=await client.from("wallet_accounts").select("currency,available_balance,pending_balance").eq("user_id",user.id);if(error)throw error;const total=(data||[]).filter(r=>String(r.currency||"").toUpperCase()===currency).reduce((a,r)=>({available:a.available+Number(r.available_balance||0),pending:a.pending+Number(r.pending_balance||0)}),{available:0,pending:0});rowsHost.innerHTML='<div class="wallet-dropdown-balance-row"><span>Available · '+currency+'</span><b>'+money(total.available,currency)+'</b></div><div class="wallet-dropdown-balance-row"><span>Pending · '+currency+'</span><b>'+money(total.pending,currency)+'</b></div>';}catch(e){rowsHost.innerHTML='<div class="wallet-dropdown-balance-row"><span>Available · '+currency+'</span><b>'+money(0,currency)+'</b></div><div class="wallet-dropdown-balance-row"><span>Pending · '+currency+'</span><b>'+money(0,currency)+'</b></div>';}
  }
  init();
})();