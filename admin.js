(() => {
  const URL="https://hguwdcmwqcpswyxtskcb.supabase.co";
  const KEY="sb_publishable_NLm2aSYg_j-zzRNSU-86gQ_Oj-xyHr2";
  const db=window.supabase?.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.localStorage,storageKey:"nexa-admin-auth"}});
  const $=id=>document.getElementById(id);
  const login=$("admin-login"),app=$("admin-app"),modal=$("review-modal");
  let listings=[],selected=null,currentView="overview",verificationRows=[],selectedVerification=null,currentVerificationType="identity";
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
  let loadedUserId=null;
  function showSignedInUser(user){
    if(!user){login.hidden=false;app.hidden=true;loadedUserId=null;return;}
    const email=user.email||"Admin account";
    $("sidebar-email").textContent=email;$("header-admin-email").textContent=email;
    const initial=(email[0]||"A").toUpperCase();
    ["sidebar-avatar","header-avatar","dropdown-avatar"].forEach(id=>$(id).textContent=initial);
    login.hidden=true;app.hidden=false;
    if(loadedUserId!==user.id){loadedUserId=user.id;load();}
  }
  async function session(){
    if(!db){login.hidden=false;message("login-message","Supabase could not be initialized. Please refresh the page.");return;}
    const {data,error}=await db.auth.getSession();
    if(error){login.hidden=false;app.hidden=true;message("login-message","Could not restore your admin session: "+error.message);return;}
    showSignedInUser(data.session?.user||null);
  }
  db?.auth.onAuthStateChange((event,session)=>{
    if(event==="SIGNED_OUT"){showSignedInUser(null);return;}
    if(session?.user)showSignedInUser(session.user);
  });
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
    const q=($("listing-search")?.value||"").trim().toLowerCase();
    const rows=listings.filter(x=>(filter==="all"||x.status===filter)&&(!q||[x.title,x.category,x.summary,x.user_id].some(v=>String(v||"").toLowerCase().includes(q))));
    $("listing-list").innerHTML=rows.length?rows.map(x=>"<article class='listing-row'><div class='listing-copy'><span class='status "+esc(x.status)+"'>"+esc(label(x.status))+"</span><h3>"+esc(x.title)+"</h3><p>"+esc(x.category)+" · "+esc(x.price_currency)+" "+esc(x.asking_price)+"</p><small>Submitted "+esc(new Date(x.submitted_at).toLocaleString())+"</small></div><button type='button' class='button button-primary' data-review='"+esc(x.id)+"'>Review details →</button></article>").join(""):"<div class='empty-state'>No listings found in this section.</div>";
  }
  function openReview(id){
    selected=listings.find(x=>x.id===id);if(!selected)return;
    $("review-title").textContent=selected.title;
    const rows=selected.listing_data?.details||[];
    $("review-details").innerHTML="<div class='review-meta'><span>Category<strong>"+esc(selected.category)+"</strong></span><span>Asking price<strong>"+esc(selected.price_currency)+" "+esc(selected.asking_price)+"</strong></span><span>Status<strong>"+esc(label(selected.status))+"</strong></span><span>Seller ID<strong>"+esc(selected.user_id)+"</strong></span><span>Submitted<strong>"+esc(new Date(selected.submitted_at).toLocaleString())+"</strong></span></div><p class='summary'>"+esc(selected.summary)+"</p><div class='detail-grid'>"+rows.filter(x=>x.value).map(x=>"<div><small>"+esc(x.label)+"</small><strong>"+esc(x.value)+"</strong></div>").join("")+"</div><p class='file-note'>Submitted file names: "+esc((selected.listing_data?.submitted_file_names||[]).join(", ")||"No file names recorded")+"</p>";
    $("edit-title").value=selected.title||"";
    $("edit-category").value=selected.category||"";
    $("edit-price").value=selected.asking_price??"";
    $("edit-currency").value=selected.price_currency||"";
    $("edit-summary").value=selected.summary||"";
    $("admin-note").value=selected.admin_note||"";
    $("listing-edit-form").hidden=true;
    $("approve-listing").textContent=selected.status==="approved"?"Keep Approved":"Approve listing";
    $("reject-listing").textContent=selected.status==="rejected"?"Keep Rejected":"Reject listing";
    modal.hidden=false;
  }
  async function review(status){
    if(!selected)return;
    const button=status==="approved"?$("approve-listing"):$("reject-listing");button.disabled=true;
    const {data:auth}=await db.auth.getUser();
    const {error}=await db.from("asset_listings").update({status,admin_note:$("admin-note").value.trim()||null,reviewed_by:auth.user?.id||null,reviewed_at:new Date().toISOString()}).eq("id",selected.id);
    button.disabled=false;
    if(error){alert("Could not update listing: "+error.message);return;}
    modal.hidden=true;selected=null;await load();
  }
  async function saveListingEdits(){
    if(!selected)return;
    const button=$("save-listing-edits");button.disabled=true;
    const title=$("edit-title").value.trim();
    const category=$("edit-category").value.trim();
    const price=$("edit-price").value.trim();
    const currency=$("edit-currency").value.trim().toUpperCase();
    const summary=$("edit-summary").value.trim();
    if(!title||!category||!price||!currency||!Number.isFinite(Number(price))||Number(price)<0){
      alert("Please enter a title, category, valid asking price and currency.");
      button.disabled=false;return;
    }
    const {error}=await db.rpc("admin_update_asset_listing",{
      p_listing_id:selected.id,
      p_title:title,
      p_category:category,
      p_asking_price:Number(price),
      p_price_currency:currency,
      p_summary:summary,
      p_admin_note:$("admin-note").value.trim()||null
    });
    button.disabled=false;
    if(error){alert("Could not save listing edits: "+error.message);return;}
    const id=selected.id;
    await load();
    const refreshed=listings.find(x=>x.id===id);
    if(refreshed){openReview(id);$("listing-edit-form").hidden=true;}
    alert("Listing details updated successfully.");
  }
  async function deleteListing(){
    if(!selected)return;
    if(!confirm("Permanently delete this listing? This action cannot be undone.\n\n"+selected.title))return;
    const button=$("delete-listing");button.disabled=true;
    const {error}=await db.rpc("admin_delete_asset_listing",{p_listing_id:selected.id});
    button.disabled=false;
    if(error){alert("Could not delete listing: "+error.message);return;}
    modal.hidden=true;selected=null;await load();
    alert("Listing deleted successfully.");
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
  $("status-filter").addEventListener("change",()=>{const f=$("status-filter").value;const title=({pending:"Pending Approval",approved:"Approved Listings",rejected:"Rejected Listings",all:"All Listings"})[f];showView("marketplace",title,f);});
  $("listing-list").addEventListener("click",e=>{const b=e.target.closest("[data-review]");if(b)openReview(b.dataset.review);});
  $("close-review").addEventListener("click",()=>{modal.hidden=true;selected=null;});
  modal.addEventListener("click",e=>{if(e.target===modal){modal.hidden=true;selected=null;}});
  $("approve-listing").addEventListener("click",()=>review("approved"));
  $("reject-listing").addEventListener("click",()=>review("rejected"));
  $("edit-listing").addEventListener("click",()=>{$("listing-edit-form").hidden=false;$("edit-title").focus();});
  $("cancel-listing-edits").addEventListener("click",()=>{$("listing-edit-form").hidden=true;});
  $("save-listing-edits").addEventListener("click",saveListingEdits);
  $("delete-listing").addEventListener("click",deleteListing);
  const viewCopy={
    "finance-transactions":["All Transactions","A complete ledger of buyer payments, seller payouts, refunds and transaction statuses will appear here after the finance database and payment integrations are configured."],
    "finance-buyer-payments":["Buyer Payments","Review buyer checkout payments, payment methods, currencies, provider references and payment outcomes. This view requires the finance schema and payment integration."],
    "finance-history":["Payment History","Searchable payment history with dates, amounts, currencies, payment references and status will be connected after the finance database is ready."],
    "finance-currency":["Currency-wise Transactions","This view will group and summarize transactions by currency, with original amounts retained for accurate reporting."],
    "finance-payouts":["Seller Payouts","Manage seller payout requests, payout methods, settlement status and payment references after payout workflows are implemented."],
    "finance-fees":["Platform Fees & Revenue","View the marketplace fee breakdown, provider costs and platform revenue after transaction records and fee calculations are connected."],
    "finance-refunds":["Refunds & Disputes","Track buyer refund requests, disputes, decisions and supporting records after the dispute workflow is created."],
    "seller-all":["All Sellers","Seller directory, account status and listing activity will be connected to the Nexa profile and verification tables."],
    "seller-account":["Account Verification","Review seller profile completeness and verification status. Full seller verification is not yet connected to this admin panel."],
    "buyer-all":["All Buyers","Buyer directory and account status will be connected after the buyer profile and account-management workflow is prepared."],
    "buyer-details":["Buyer Account Details","Buyer profile information and account history will be shown here after the relevant profile data is connected."],
    "buyer-activity":["Buyer Activity","Buyer browsing, purchase and account activity will be available after activity tracking is implemented."],
    "support":["Support Tickets","Customer support conversations and ticket status management will be added when the support workflow is ready."],
    "reports":["User Reports","Reported listings and user complaints will be connected after reporting and moderation tables are created."],
    "logs":["Admin Activity Logs","A secure audit trail of administrator actions will be added before operational launch."],
    "settings":["Platform Settings","Marketplace-wide settings will be added after the settings schema and safe update controls are prepared."]
  };
  async function loadVerifications(type){currentVerificationType=type;$("verification-section-title").textContent=type==="identity"?"ID Verification":"Address Verification";message("verification-message","Loading private submissions…");const {data,error}=await db.from("user_verification_submissions").select("*").eq("verification_type",type).order("submitted_at",{ascending:false});if(error){verificationRows=[];message("verification-message","Could not load submissions: "+error.message+" — check the Nexa verification table and admin access.");$("verification-list").innerHTML="<div class='empty-state'>Verification records are unavailable.</div>";return;}verificationRows=data||[];await renderVerifications();}
  async function renderVerifications(){const filter=$("verification-filter").value,rows=verificationRows.filter(r=>filter==="all"||r.status===filter);message("verification-message",rows.length+" submission(s) shown · "+verificationRows.length+" total");if(!rows.length){$("verification-list").innerHTML="<div class='empty-state'>No verification submissions in this status.</div>";return;}const cards=await Promise.all(rows.map(async row=>{const links=[],fields=currentVerificationType==="identity"?[["Front of ID",row.front_path],["Back of ID",row.back_path],["Live selfie",row.selfie_path]]:[["Proof of address",row.address_document_path]];for(const [label,path] of fields){if(!path)continue;const {data,error}=await db.storage.from("nexa-private-verification").createSignedUrl(path,600);if(!error&&data?.signedUrl)links.push("<a class='verification-file-link' href='"+esc(data.signedUrl)+"' target='_blank' rel='noopener noreferrer'>"+esc(label)+" ↗</a>");}const details=currentVerificationType==="identity"?"Document: "+esc(row.document_type||"—")+" · Country: "+esc(row.country||"—"):"Address: "+esc([row.address_line,row.city,row.region,row.postal_code,row.address_country].filter(Boolean).join(", "))+" · Proof: "+esc(row.address_document_type||"—");const statusText=({pending_review:"Pending review",approved:"Verified",rejected:"Needs resubmission"})[row.status]||esc(row.status);return "<article class='listing-row verification-admin-card'><div class='listing-copy'><span class='status "+(row.status==="approved"?"approved":row.status==="rejected"?"rejected":"")+"'>"+statusText+"</span><h3>"+(currentVerificationType==="identity"?"Identity submission":"Address submission")+"</h3><p>"+details+"</p><small>User ID: "+esc(row.user_id)+"</small><small>Submitted: "+esc(new Date(row.submitted_at).toLocaleString())+"</small><div class='verification-file-links'>"+(links.join("")||"<span class='file-note'>No document files found</span>")+"</div></div><button type='button' class='button button-primary' data-verification-review='"+esc(row.id)+"'>Review submission →</button></article>";}));$("verification-list").innerHTML=cards.join();}
  async function openVerificationReview(id){selectedVerification=verificationRows.find(r=>r.id===id);if(!selectedVerification)return;const row=selectedVerification,type=row.verification_type;$("verification-review-title").textContent=type==="identity"?"Review ID verification":"Review address verification";$("verification-admin-note").value=row.admin_note||"";const fields=type==="identity"?[["Document type",row.document_type],["Issuing country",row.country],["Submitted",new Date(row.submitted_at).toLocaleString()],["User ID",row.user_id]]:[["Street address",row.address_line],["City",row.city],["Region",row.region],["Postal code",row.postal_code],["Country",row.address_country],["Proof type",row.address_document_type],["Submitted",new Date(row.submitted_at).toLocaleString()],["User ID",row.user_id]];const paths=type==="identity"?[["Front of ID",row.front_path],["Back of ID",row.back_path],["Live selfie",row.selfie_path]]:[["Proof of address",row.address_document_path]],links=[];for(const [label,path] of paths){if(!path)continue;const {data,error}=await db.storage.from("nexa-private-verification").createSignedUrl(path,600);if(!error&&data?.signedUrl)links.push("<a class='verification-file-link' href='"+esc(data.signedUrl)+"' target='_blank' rel='noopener noreferrer'>"+esc(label)+" ↗</a>");}$("verification-review-details").innerHTML="<div class='review-meta'>"+fields.map(([k,v])=>"<span>"+esc(k)+"<strong>"+esc(v||"—")+"</strong></span>").join("")+"</div><div class='verification-file-links verification-modal-files'>"+(links.join("")||"<span class='file-note'>No private documents were found.</span>")+"</div><p class='file-note'>Document links are private and expire after 10 minutes.</p>";$("request-verification-again").textContent=row.status==="rejected"?"Keep request for changes":"Need more information";$("approve-verification").textContent=row.status==="approved"?"Keep Verified":"Approve verification";$("verification-review-modal").hidden=false;}
  async function updateVerification(status){if(!selectedVerification)return;const note=$("verification-admin-note").value.trim();if(status==="rejected"&&!note){alert("Please explain what the user needs to correct before requesting resubmission.");$("verification-admin-note").focus();return;}const buttons=[$("approve-verification"),$("request-verification-again")];buttons.forEach(b=>b.disabled=true);const {error}=await db.from("user_verification_submissions").update({status,admin_note:note||null,updated_at:new Date().toISOString()}).eq("id",selectedVerification.id);buttons.forEach(b=>b.disabled=false);if(error){alert("Could not update verification: "+error.message);return;}$("verification-review-modal").hidden=true;selectedVerification=null;await loadVerifications(currentVerificationType);}
  function showView(view,title,filter="all"){
    currentView=view;
    document.querySelectorAll(".admin-nav-link[data-view]").forEach(a=>a.classList.toggle("active",a.dataset.view===view&&a.dataset.title===title));
    $("current-page-title").textContent=title;
    $("page-heading-title").textContent=title;
    const isListingView=view==="overview"||view==="marketplace",isVerificationView=view==="seller-id"||view==="seller-address";
    $("admin-dashboard").querySelector(".page-heading").hidden=!isListingView;
    $("stats-grid").hidden=view!=="overview";
    $("listing-workspace").hidden=!isListingView;
    $("verification-workspace").hidden=!isVerificationView;
    $("coming-soon-view").hidden=isVerificationView||!Boolean(viewCopy[view]);
    if(viewCopy[view]){$("coming-soon-title").textContent=viewCopy[view][0];$("coming-soon-description").textContent=viewCopy[view][1];}
    if(isVerificationView){$("verification-filter").value="pending_review";loadVerifications(view==="seller-id"?"identity":"address");}
    if(isListingView){
      $("listing-section-title").textContent=view==="overview"?"Recent Listing Submissions":title;
      $("status-filter").value=filter;
      render();
    }
    closeSidebar();
  }
  document.querySelectorAll(".admin-nav-link[data-view]").forEach(link=>link.addEventListener("click",e=>{
    e.preventDefault();
    showView(link.dataset.view,link.dataset.title,link.dataset.filter||"all");
  }));
  $("listing-search").addEventListener("input",render);
  $("verification-filter").addEventListener("change",renderVerifications);
  $("refresh-verifications").addEventListener("click",()=>loadVerifications(currentVerificationType));
  $("verification-list").addEventListener("click",e=>{const b=e.target.closest("[data-verification-review]");if(b)openVerificationReview(b.dataset.verificationReview);});
  $("close-verification-review").addEventListener("click",()=>{$("verification-review-modal").hidden=true;selectedVerification=null;});
  $("verification-review-modal").addEventListener("click",e=>{if(e.target===$("verification-review-modal")){$("verification-review-modal").hidden=true;selectedVerification=null;}});
  $("approve-verification").addEventListener("click",()=>updateVerification("approved"));
  $("request-verification-again").addEventListener("click",()=>updateVerification("rejected"));


  $("menu-toggle").addEventListener("click",()=>{const open=!$("admin-sidebar").classList.contains("open");$("admin-sidebar").classList.toggle("open",open);$("admin-overlay").classList.toggle("show",open);$("menu-toggle").setAttribute("aria-expanded",String(open));});
  $("sidebar-close").addEventListener("click",closeSidebar);$("admin-overlay").addEventListener("click",closeSidebar);
  $("admin-profile-toggle").addEventListener("click",()=>{const opening=$("admin-profile-dropdown").hidden;$("admin-profile-dropdown").hidden=!opening;$("admin-profile-toggle").setAttribute("aria-expanded",String(opening));});
  document.addEventListener("click",e=>{const wrap=$("admin-profile-wrap");if(!wrap.contains(e.target)){$("admin-profile-dropdown").hidden=true;$("admin-profile-toggle").setAttribute("aria-expanded","false");}});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeSidebar();modal.hidden=true;$("verification-review-modal").hidden=true;$("admin-profile-dropdown").hidden=true;}});
  session();
})();