(function(){
  const $=id=>document.getElementById(id);
  const client=window.supabaseClient||window.supabase;
  const currencyLabel=$("header-wallet-currency");
  const balanceRows=$("header-wallet-balance-rows");
  if(!client||!currencyLabel||!balanceRows)return;
  const isBD=value=>/bangladesh/i.test(String(value||""))||/^BD$/i.test(String(value||"").trim());
  const money=(value,currency)=>new Intl.NumberFormat(undefined,{style:"currency",currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0);
  async function init(){
    const {data:sessionData,error:sessionError}=await client.auth.getSession();
    const user=sessionData?.session?.user;
    if(sessionError||!user)return;
    let country="";
    try{
      const {data:rows,error}=await client.from("user_verification_submissions").select("verification_type,status,country,address_country,submitted_at").eq("user_id",user.id).order("submitted_at",{ascending:false});
      if(!error&&rows?.length){
        const identity=rows.find(r=>r.verification_type==="identity"&&r.status==="approved")||rows.find(r=>r.verification_type==="identity");
        const address=rows.find(r=>r.verification_type==="address"&&r.status==="approved")||rows.find(r=>r.verification_type==="address");
        country=identity?.country||address?.address_country||"";
      }
    }catch(e){}
    if(!country){
      try{const {data,error}=await client.from("user_profiles").select("country").eq("user_id",user.id).maybeSingle();if(!error)country=data?.country||"";}catch(e){}
    }
    let code=country?(isBD(country)?"BD":"US"):"";
    if(!code){
      try{const response=await fetch("https://ipapi.co/json/");if(response.ok){const geo=await response.json();code=String(geo.country_code||"").toUpperCase()==="BD"?"BD":"US";}}catch(e){}
    }
    const currency=code==="BD"?"BDT":"USD";
    currencyLabel.textContent=currency;
    try{
      const {data:wallets,error}=await client.from("wallet_accounts").select("currency,available_balance,pending_balance").eq("user_id",user.id);
      if(error)throw error;
      const totals=(wallets||[]).filter(row=>String(row.currency||"").toUpperCase()===currency).reduce((sum,row)=>({available:sum.available+Number(row.available_balance||0),pending:sum.pending+Number(row.pending_balance||0)}),{available:0,pending:0});
      balanceRows.innerHTML='<div class="wallet-dropdown-balance-row"><span>Available · '+currency+'</span><b>'+money(totals.available,currency)+'</b></div><div class="wallet-dropdown-balance-row"><span>Pending · '+currency+'</span><b>'+money(totals.pending,currency)+'</b></div>';
    }catch(e){
      balanceRows.innerHTML='<div class="wallet-dropdown-balance-row"><span>Available · '+currency+'</span><b>'+money(0,currency)+'</b></div><div class="wallet-dropdown-balance-row"><span>Pending · '+currency+'</span><b>'+money(0,currency)+'</b></div>';
    }
  }
  init();
})();