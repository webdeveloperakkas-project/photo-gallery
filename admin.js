(() => {
  const URL="https://hguwdcmwqcpswyxtskcb.supabase.co";
  const KEY="sb_publishable_NLm2aSYg_j-zzRNSU-86gQ_Oj-xyHr2";
  const db=window.supabase?.createClient(URL,KEY);
  const $=id=>document.getElementById(id);
  const login=$("admin-login"),app=$("admin-app"),modal=$("review-modal");
  let listings=[],selected=null;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const label=s=>({pending:"Pending review",approved:"Approved",rejected:"Rejected"}[s]||s);
  const message=(id,value)=>$(id).textContent=value||"";
  const setFilter=(filter,title)=>{
    $("status-filter").value=filter;
    $("current-page-title").textContent=title;
    $("page-heading-title").textContent=title;
    $("listing-section-title").textContent=filter==="all"?"All Listings":title;
    document.querySelectorAll(".admin-nav-link[data-filter]").forEach(a=>a.classList.toggle("active",a.dataset.filter===filter&&a.dataset.title===title));
    render();
  };
  const closeSidebar=()=>{$("admin-sidebar").classList.remove("open");$("admin-overlay").classList.remove("show");$("menu-toggle").setAttribute("aria-expanded","false");};
  async function session(){
    if(!db){login.hidden=false;message("login-message","Supabase could not be initialized. Please refresh the page.");return;}
    const {data,error}=await db.auth.getSession();
    if(error||!data.session){login.hidden=false;app.hidden=true;return;}
    const email=data.session.user.email||"Admin account";
    $("sidebar-email").textContent=email;$("header-admin-email").textContent=email;
    const initial=(email[0]||"A").toUpperCase();
    ["sidebar-avatar","header-avatar","dropdown-avatar"].forEach(id=>$(id).textContent=initial);
    login.hidden=true;app.hidden=false;
    await load();
  }
  async function load(){
    message("list-message","Loading listings…");
    const {data,error}=await db.from("asset_listings").select("*").order("submitted_at",{ascending:false});
    if(error){
      message("list-message","Could not load listings: "+error.message+" — check the Nexa admin role and listing SQL setup.");
      $("listing-list").innerHTML="<div class='empty-state'>Admin access or database setup is not ready. Confirm that this account has the Nexa admin role.</div>";
      return;
    }
    listings=data||[];
    $("total-count").textContent=listings.length;
    $("pending-count").textContent=listings.filter(x=>x.status==="pending").length;
    $("approved-count").textContent=listings.filter(x=>x.status==="approved").length;
    $("rejected-count").textContent=listings.filter(x=>x.status==="rejected").length;
    $("nav-pending-count").textContent=listings.filter(x=>x.status==="pending").length;
    message("list-message",listings.length+" listing(s) found");
    render();
  }
  function render(){
    if(!$("status-filter"))return;
    const filter=$("status-filter").value;
    const rows=listings.filter(x=>filter==="all"||x.status===filter);
    $("listing-list").innerHTML=rows.length?rows.map(x=>"<article class='listing-row'><div class='listing-copy'><span class='status "+esc(x.status)+"'>"+esc(label(x.status))+"</span><h3>"+esc(x.title)+"</h3><p>"+esc(x.category)+" · "+esc(x.price_currency)+" "+esc(x.asking_price)+"</p><small>Submitted "+esc(new Date(x.submitted_at).toLocaleString())+"</small></div><button type='button' class='button button-primary' data-review='"+esc(x.id)+"'>Review details →</button></article>").join(""):"<div class='empty-state'>No listings found in this section.</div>";
  }
  function openReview(id){
    selected=listings.find(x=>x.id===id);if(!selected)return;
    $("review-title").textContent=selected.title;
    const rows=selected.listing_data?.details||[];
    $("review-details").innerHTML="<div class='review-meta'><span>Category<strong>"+esc(selected.category)+"</strong></span><span>Asking price<strong>"+esc(selected.price_currency)+" "+esc(selected.asking_price)+"</strong></span><span>Status<strong>"+esc(label(selected.status))+"</strong></span><span>Seller ID<strong>"+esc(selected.user_id)+"</strong></span><span>Submitted<strong>"+esc(new Date(selected.submitted_at).toLocaleString())+"</strong></span></div><p class='summary'>"+esc(selected.summary)+"</p><div class='detail-grid'>"+rows.filter(x=>x.value).map(x=>"<div><small>"+esc(x.label)+"</small><strong>"+esc(x.value)+"</strong></div>").join("")+"</div><p class='file-note'>Submitted file names: "+esc((selected.listing_data?.submitted_file_names||[]).join(", ")||"No file names recorded")+"</p>";
    $("admin-note").value=selected.admin_note||"";
    $("approve-listing").hidden=selected.status!=="pending";$("reject-listing").hidden=selected.status!=="pending";
    modal.hidden=false;
  }
  async function review(status){
    if(!selected)return;
    const button=status==="approved"?$("approve-listing"):$("reject-listing");button.disabled=true;
    const {data:auth}=await db.auth.getUser();
    const {error}=await db.from("asset_listings").update({status,admin_note:$("admin-note").value.trim()||null,reviewed_by:auth.user.id,reviewed_at:new Date().toISOString()}).eq("id",selected.id);
    button.disabled=false;
    if(error){alert("Could not update listing: "+error.message);return;}
    modal.hidden=true;selected=null;await load();
  }
  $("admin-login-form").addEventListener("submit",async e=>{
    e.preventDefault();if(!db){message("login-message","Supabase is unavailable.");return;}
    const form=new FormData(e.currentTarget),button=e.submitter;
    button.disabled=true;button.textContent="Signing in…";
    const {error}=await db.auth.signInWithPassword({email:form.get("email"),password:form.get("password")});
    button.disabled=false;button.textContent="Sign in to Admin";
    if(error){message("login-message",error.message);return;}
    message("login-message","");await session();
  });
  async function logout(){if(!db)return;const {error}=await db.auth.signOut();if(error){alert("Could not sign out. Please try again.");return;}location.reload();}
  $("sidebar-logout").addEventListener("click",logout);$("header-logout").addEventListener("click",logout);
  $("refresh-listings").addEventListener("click",load);
  $("status-filter").addEventListener("change",()=>{const f=$("status-filter").value;const title=f==="all"?"All Listings":f[0].toUpperCase()+f.slice(1)+" Listings";setFilter(f,title);});
  $("listing-list").addEventListener("click",e=>{const b=e.target.closest("[data-review]");if(b)openReview(b.dataset.review);});
  $("close-review").addEventListener("click",()=>{modal.hidden=true;selected=null;});
  modal.addEventListener("click",e=>{if(e.target===modal){modal.hidden=true;selected=null;}});
  $("approve-listing").addEventListener("click",()=>review("approved"));
  $("reject-listing").addEventListener("click",()=>review("rejected"));
  document.querySelectorAll(".admin-nav-link[data-filter]").forEach(link=>link.addEventListener("click",e=>{e.preventDefault();setFilter(link.dataset.filter,link.dataset.title);closeSidebar();}));
  $("menu-toggle").addEventListener("click",()=>{const open=!$("admin-sidebar").classList.contains("open");$("admin-sidebar").classList.toggle("open",open);$("admin-overlay").classList.toggle("show",open);$("menu-toggle").setAttribute("aria-expanded",String(open));});
  $("sidebar-close").addEventListener("click",closeSidebar);$("admin-overlay").addEventListener("click",closeSidebar);
  $("admin-profile-toggle").addEventListener("click",()=>{const opening=$("admin-profile-dropdown").hidden;$("admin-profile-dropdown").hidden=!opening;$("admin-profile-toggle").setAttribute("aria-expanded",String(opening));});
  document.addEventListener("click",e=>{const wrap=$("admin-profile-wrap");if(!wrap.contains(e.target)){$("admin-profile-dropdown").hidden=true;$("admin-profile-toggle").setAttribute("aria-expanded","false");}});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeSidebar();modal.hidden=true;$("admin-profile-dropdown").hidden=true;}});
  session();
})();