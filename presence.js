(()=> {
  const SUPABASE_URL="https://hguwdcmwqcpswyxtskcb.supabase.co";
  const SUPABASE_KEY="sb_publishable_NLm2aSYg_j-zzRNSU-86gQ_Oj-xyHr2";
  if(!window.supabase?.createClient)return;
  const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  const HEARTBEAT_MS=60000;
  let userId=null,busy=false,timer=null;
  const beat=async()=>{
    if(!userId||busy||document.visibilityState!=="visible")return;
    busy=true;
    try{
      const {error}=await client.from("user_presence").upsert(
        {user_id:userId,last_seen_at:new Date().toISOString()},
        {onConflict:"user_id"}
      );
      if(error)console.warn("Nexa presence heartbeat:",error.message);
    }finally{busy=false;}
  };
  const start=()=>{
    if(timer)clearInterval(timer);
    beat();
    timer=setInterval(beat,HEARTBEAT_MS);
  };
  client.auth.getSession().then(({data,error})=>{
    if(error||!data?.session?.user)return;
    userId=data.session.user.id;
    start();
  });
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible")beat();
  });
  window.addEventListener("pageshow",()=>{if(document.visibilityState==="visible")beat();});
  window.addEventListener("pagehide",()=>{if(timer)clearInterval(timer);timer=null;});
  client.auth.onAuthStateChange((event,session)=>{
    if(event==="SIGNED_OUT"||!session?.user){userId=null;if(timer)clearInterval(timer);timer=null;return;}
    userId=session.user.id;if(document.visibilityState==="visible")start();
  });
})();