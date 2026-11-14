(() => {
  const URL="https://hguwdcmwqcpswyxtskcb.supabase.co";
  const KEY="sb_publishable_NLm2aSYg_j-zzRNSU-86gQ_Oj-xyHr2";
  const db=window.supabase?.createClient(URL,KEY);
  const $=id=>document.getElementById(id);
  const login=$("admin-login"),dashboard=$("admin-dashboard"),modal=$("review-modal");
  let listings=[],selected=null;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const label=s=>({pending:"Waiting for Approval",approved:"Approved",rejected:"Rejected"}[s]||s);
  const message=(id,text)=>$(id).textContent=text||"";
  const session=async()=>{
    if(!db){message("login-message","Supabase could not be initialized.");return;}
    const {data,error}=await db.auth.getSession();
    if(error||!data.session){login.hidden=false;dashboard.hidden=true;return;}
    $("admin-email").textContent=data.session.user.email||"";
    $("admin-logout").hidden=false;login.hidden=true;dashboard.hidden=false;await load();
  };
  async function load(){
    message("list-message","Loading…");
    const {data,error}=await db.from("asset_listings").select("*").order("submitted_at",{ascending:false});
    if(error){message("list-message","Could not load listings: "+error.message+" — check SQL migration and admin role.");$("listing-list").innerHTML="<div class='empty'>Admin access or database setup is not ready.</div>";return;}
    listings=data||[];
    $("pending-count").textContent=listings.filter(x=>x.status==="pending").length;
    $("approved-count").textContent=listings.filter(x=>x.status==="approved").length;
    $("rejected-count").textContent=listings.filter(x=>x.status==="rejected").length;
    message("list-message",listings.length+" listing(s)");
    render();
  }
  function render(){
    const filter=$("status-filter").value,rows=listings.filter(x=>filter==="all"||x.status===filter);
    $("listing-list").innerHTML=rows.length?rows.map(x=>"<article class='listing-row'><div class='listing-copy'><span class='status "+esc(x.status)+"'>"+esc(label(x.status))+"</span><h3>"+esc(x.title)+"</h3><p>"+esc(x.category)+" · "+esc(x.price_currency)+" "+esc(x.asking_price)+"</p><small>Submitted "+esc(new Date(x.submitted_at).toLocaleString())+"</small></div><button class='button button-primary' data-review='"+esc(x.id)+"'>View details</button></article>").join(""):"<div class='empty'>No listings in this status.</div>";
  }
  function openReview(id){
    selected=listings.find(x=>x.id===id);if(!selected)return;
    $("review-title").textContent=selected.title;
    const rows=selected.listing_data?.details||[];
    $("review-details").innerHTML="<div class='review-meta'><span>Category<strong>"+esc(selected.category)+"</strong></span><span>Asking price<strong>"+esc(selected.price_currency)+" "+esc(selected.asking_price)+"</strong></span><span>Status<strong>"+esc(label(selected.status))+"</strong></span><span>Seller ID<strong>"+esc(selected.user_id)+"</strong></span></div><p class='summary'>"+esc(selected.summary)+"</p><div class='detail-grid'>"+rows.filter(x=>x.value).map(x=>"<div><small>"+esc(x.label)+"</small><strong>"+esc(x.value)+"</strong></div>").join("")+"</div><p class='file-note'>Uploaded file names: "+esc((selected.listing_data?.submitted_file_names||[]).join(", ")||"None recorded")+"</p>";
    $("admin-note").value=selected.admin_note||"";
    $("approve-listing").hidden=selected.status!=="pending";$("reject-listing").hidden=selected.status!=="pending";
    modal.hidden=false;
  }
  async function review(status){
    if(!selected)return;
    const btn=status==="approved"?$("approve-listing"):$("reject-listing");btn.disabled=true;
    const {data:auth}=await db.auth.getUser();
    const {error}=await db.from("asset_listings").update({status,admin_note:$("admin-note").value.trim()||null,reviewed_by:auth.user.id,reviewed_at:new Date().toISOString()}).eq("id",selected.id);
    btn.disabled=false;
    if(error){alert("Could not update listing: "+error.message);return;}
    modal.hidden=true;selected=null;await load();
  }
  $("admin-login-form").addEventListener("submit",async e=>{
    e.preventDefault();const form=new FormData(e.currentTarget);
    const {error}=await db.auth.signInWithPassword({email:form.get("email"),password:form.get("password")});
    if(error){message("login-message",error.message);return;}message("login-message","");await session();
  });
  $("admin-logout").addEventListener("click",async()=>{await db.auth.signOut();location.reload();});
  $("refresh-listings").addEventListener("click",load);$("status-filter").addEventListener("change",render);
  $("listing-list").addEventListener("click",e=>{const b=e.target.closest("[data-review]");if(b)openReview(b.dataset.review);});
  $("close-review").addEventListener("click",()=>{modal.hidden=true;selected=null;});
  modal.addEventListener("click",e=>{if(e.target===modal){modal.hidden=true;selected=null;}});
  $("approve-listing").addEventListener("click",()=>review("approved"));
  $("reject-listing").addEventListener("click",()=>review("rejected"));
  session();
})();