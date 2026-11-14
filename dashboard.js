(() => {
  const SUPABASE_URL = "https://hguwdcmwqcpswyxtskcb.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_NLm2aSYg_j-zzRNSU-86gQ_Oj-xyHr2";
  const client = window.supabase?.createClient ? window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY) : null;
  const home = "https://webdeveloperakkas-project.github.io/photo-gallery/";
  const logout = document.getElementById("logout-button");
  const sidebar = document.getElementById("nexa-sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const menuToggle = document.getElementById("menu-toggle");
  const sidebarClose = document.getElementById("sidebar-close");
  const profileWrap = document.getElementById("dash-profile-menu-wrap");
  const profileToggle = document.getElementById("dash-profile-toggle");
  const profileDropdown = document.getElementById("dash-profile-dropdown");
  const walletWrap = document.getElementById("dash-wallet-menu-wrap");
  const walletToggle = document.getElementById("dash-wallet-toggle");
  const walletDropdown = document.getElementById("dash-wallet-dropdown");

  if (!client) { window.location.replace(home + "#auth-login"); return; }
  client.auth.getSession().then(({data,error}) => {
    if (error || !data?.session?.user) { window.location.replace(home + "#auth-login"); return; }
    const user = data.session.user;
    const meta = user.user_metadata || {};
    const displayName = meta.display_name || [meta.first_name,meta.last_name].filter(Boolean).join(" ") || "Nexa member";
    const initial = displayName.trim().charAt(0).toUpperCase() || "N";
    const setText = (id,value) => { const el=document.getElementById(id); if(el) el.textContent=value; };
    setText("dash-avatar-initial",initial);
    setText("dash-dropdown-avatar",initial);
    setText("dash-dropdown-name",displayName);
    setText("dash-dropdown-email",user.email || "");
  });

  const closeSidebar = () => { sidebar?.classList.remove("open"); overlay?.classList.remove("show"); menuToggle?.setAttribute("aria-expanded","false"); };
  menuToggle?.addEventListener("click",()=>{ const open=!sidebar?.classList.contains("open"); sidebar?.classList.toggle("open",open); overlay?.classList.toggle("show",open); menuToggle.setAttribute("aria-expanded",String(open)); });
  sidebarClose?.addEventListener("click",closeSidebar);
  overlay?.addEventListener("click",closeSidebar);

  // Supabase-backed My Listings.
  const listingsHost=document.getElementById("my-listings-content"),manageModal=document.getElementById("listing-manage-modal"),manageDetails=document.getElementById("listing-manage-details");
  let managingListingId=null;
  const safeText=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const statusLabel=status=>({pending:"Waiting for Approval",approved:"Approved",rejected:"Rejected"}[status]||"Waiting for Approval");
  const loadMyListings=async()=>{
    if(!listingsHost)return;
    listingsHost.innerHTML="<div class='marketplace-empty'><b>Loading your listings…</b></div>";
    const {data,error}=await client.from("asset_listings").select("*").order("submitted_at",{ascending:false});
    if(error){listingsHost.innerHTML="<div class='marketplace-empty'><b>Could not load listings</b><p>"+safeText(error.message)+"</p><p>Run the Nexa listing SQL migration in Supabase.</p></div>";return;}
    if(!data?.length){listingsHost.innerHTML="<div class='marketplace-empty'><span>▤</span><b>You have no listings yet</b><p>After you submit an advertisement, it will appear here with its review status.</p></div>";return;}
    listingsHost.innerHTML=data.map(item=>{const cls=item.status==="approved"?"approved":item.status==="rejected"?"rejected":"pending";return "<article class='my-listing-card'><div class='my-listing-main'><div class='my-listing-category'>"+safeText(item.category)+"</div><h2>"+safeText(item.title)+"</h2><p>"+safeText(item.summary)+"</p><div class='my-listing-meta'><span>Asking Price <strong>"+safeText(item.price_currency)+" "+safeText(item.asking_price)+"</strong></span><span>Submitted <strong>"+safeText(new Date(item.submitted_at).toLocaleDateString())+"</strong></span></div></div><div class='my-listing-side'><span class='my-listing-status "+cls+"'>"+safeText(statusLabel(item.status))+"</span><button type='button' class='primary-button my-listing-edit' data-manage-listing='"+safeText(item.id)+"'>Edit / Manage</button></div></article>";}).join("");
  };
  const openManageListing=async id=>{const {data:item,error}=await client.from("asset_listings").select("*").eq("id",id).single();if(error||!item)return;managingListingId=id;const rows=(item.listing_data?.details||[]).filter(x=>x.value).map(x=>"<div><small>"+safeText(x.label)+"</small><strong>"+safeText(x.value)+"</strong></div>").join("");manageDetails.innerHTML="<div class='listing-manage-status'>Status: <strong>"+safeText(statusLabel(item.status))+"</strong></div>"+(item.admin_note?"<p>"+safeText(item.admin_note)+"</p>":"")+"<div class='listing-manage-readonly'>"+(rows||"<p>No saved details.</p>")+"</div>";document.getElementById("listing-manage-title").textContent=item.title;document.getElementById("listing-manage-price").value=item.asking_price;document.getElementById("listing-manage-currency").textContent=item.price_currency;document.getElementById("listing-manage-price").disabled=item.status!=="pending";document.getElementById("listing-manage-save").hidden=item.status!=="pending";manageModal.hidden=false;};
  const closeManageListing=()=>{manageModal.hidden=true;managingListingId=null;};
  listingsHost?.addEventListener("click",e=>{const btn=e.target.closest("[data-manage-listing]");if(btn)openManageListing(btn.dataset.manageListing);});
  document.getElementById("listing-manage-close")?.addEventListener("click",closeManageListing);
  document.getElementById("listing-manage-cancel")?.addEventListener("click",closeManageListing);
  document.getElementById("listing-manage-save")?.addEventListener("click",async()=>{const input=document.getElementById("listing-manage-price"),price=Number(input.value);if(!input.value||!Number.isFinite(price)||price<=0){input.reportValidity();return;}const {error}=await client.from("asset_listings").update({asking_price:price}).eq("id",managingListingId);if(error){alert("Price update failed: "+error.message);return;}await loadMyListings();closeManageListing();});
  document.getElementById("listing-manage-delete")?.addEventListener("click",async()=>{if(!managingListingId||!confirm("Delete this listing permanently?"))return;const {error}=await client.from("asset_listings").delete().eq("id",managingListingId);if(error){alert("Delete failed: "+error.message);return;}await loadMyListings();closeManageListing();});
  manageModal?.addEventListener("click",e=>{if(e.target===manageModal)closeManageListing();});
  window.nexaRenderMyListings=loadMyListings;loadMyListings();
  const openSection = (id) => {
    const target=document.getElementById(id);
    if(!target) return;
    document.querySelectorAll(".page-section").forEach(s=>s.classList.toggle("active",s.id===id));
    document.querySelectorAll(".sidebar-navigation .nav-link").forEach(a=>a.classList.toggle("active",a.dataset.section===id));
    history.replaceState(null,"","#"+id);
    if(id==="my-listings-section") window.nexaRenderMyListings?.();
    closeSidebar();
    window.scrollTo({top:0,behavior:"smooth"});
  };
  document.querySelectorAll("[data-section]").forEach(link=>link.addEventListener("click",event=>{
    const id=link.dataset.section;
    if(document.getElementById(id)){event.preventDefault();openSection(id);}
  }));
  const initialSection=location.hash.slice(1);
  if(initialSection && document.getElementById(initialSection) && document.getElementById(initialSection).classList.contains("page-section")) openSection(initialSection);

  profileToggle?.addEventListener("click",()=>{const opening=profileDropdown?.hidden??true;if(profileDropdown)profileDropdown.hidden=!opening;profileToggle.setAttribute("aria-expanded",String(opening));});
  walletToggle?.addEventListener("click",()=>{const opening=walletDropdown?.hidden??true;if(walletDropdown)walletDropdown.hidden=!opening;walletToggle.setAttribute("aria-expanded",String(opening));});
  document.addEventListener("click",event=>{
    if(profileWrap&&!profileWrap.contains(event.target)&&profileDropdown&&!profileDropdown.hidden){profileDropdown.hidden=true;profileToggle?.setAttribute("aria-expanded","false");}
    if(walletWrap&&!walletWrap.contains(event.target)&&walletDropdown&&!walletDropdown.hidden){walletDropdown.hidden=true;walletToggle?.setAttribute("aria-expanded","false");}
  });
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"){closeSidebar();if(profileDropdown&&!profileDropdown.hidden){profileDropdown.hidden=true;profileToggle?.setAttribute("aria-expanded","false");}if(walletDropdown&&!walletDropdown.hidden){walletDropdown.hidden=true;walletToggle?.setAttribute("aria-expanded","false");}}
  });
  logout?.addEventListener("click",async()=>{logout.disabled=true;const {error}=await client.auth.signOut();if(error){logout.disabled=false;alert("Could not log out. Please try again.");return;}window.location.replace(home);});
  // Nexa listing wizard: four data steps, a complete preview, and a separate verification submission.
  const listingForm=document.getElementById("nexa-listing-form");
  if(listingForm){
    const sections=[...listingForm.querySelectorAll("[data-listing-section]")],count=document.getElementById("listing-progress-count"),bar=document.getElementById("listing-progress-bar"),stepLabels=[...listingForm.querySelectorAll(".listing-progress-steps span")],feedback=document.getElementById("listing-form-feedback"),category=document.getElementById("listing-category"),dynamic=document.getElementById("listing-category-fields"),cover=document.getElementById("listing-cover-image"),extras=document.getElementById("listing-extra-images"),previews=document.getElementById("listing-image-previews");
    const stepNav=document.getElementById("listing-step-navigation"),backBtn=document.getElementById("listing-back-button"),nextBtn=document.getElementById("listing-next-button"),previewScreen=document.getElementById("listing-preview-screen"),previewContent=document.getElementById("listing-preview-content"),submitScreen=document.getElementById("listing-submit-screen"),statusScreen=document.getElementById("listing-status-screen"),confirmModal=document.getElementById("listing-confirm-modal");
    let currentStep=0,view="form";
    const isFilled=el=>el.type==="checkbox"||el.type==="radio"?el.checked:el.type==="file"?el.files.length>0:String(el.value||"").trim()!=="";
    const sectionRequiredValid=s=>[...s.querySelectorAll("[required]")].every(el=>el.type==="radio"?s.querySelector('input[name="'+CSS.escape(el.name)+'"]:checked')!==null:isFilled(el)&&el.checkValidity());
    const sectionComplete=s=>{const req=[...s.querySelectorAll("[required]")];return req.length?sectionRequiredValid(s):true};
    const updateProgress=()=>{let done=0;sections.forEach((s,i)=>{const ok=sectionComplete(s);if(ok)done++;s.classList.toggle("is-complete",ok);const status=s.querySelector(".listing-section-status");if(status)status.textContent=ok?"Completed":s.querySelector("[required]")?"Incomplete":"Optional";if(stepLabels[i]){stepLabels[i].classList.toggle("is-complete",ok);stepLabels[i].classList.toggle("is-current",view==="form"&&i===currentStep)}});stepLabels[4]?.classList.toggle("is-current",view==="preview");if(count)count.textContent=done+" / 4 steps complete";if(bar)bar.style.width=(done/4*100)+"%"};
    const scrollTop=()=>window.scrollTo({top:listingForm.getBoundingClientRect().top+window.scrollY-90,behavior:"smooth"});
    const hideScreens=()=>{sections.forEach(s=>s.classList.remove("is-current"));stepNav.hidden=true;previewScreen.hidden=true;submitScreen.hidden=true;statusScreen.hidden=true};
    const showStep=index=>{currentStep=Math.max(0,Math.min(index,sections.length-1));view="form";hideScreens();stepNav.hidden=false;sections.forEach((s,i)=>s.classList.toggle("is-current",i===currentStep));backBtn.disabled=currentStep===0;nextBtn.textContent=currentStep===sections.length-1?"Preview Listing →":"Next →";updateProgress();scrollTop()};
    const showPreview=()=>{view="preview";hideScreens();previewScreen.hidden=false;buildPreview();updateProgress();scrollTop()};
    const showSubmit=()=>{view="submit";hideScreens();submitScreen.hidden=false;updateProgress();scrollTop()};
    const prompts={"Website":["Monthly organic visitors","Main traffic source"],"SaaS":["Monthly active users","Subscription model"],"E-commerce":["Monthly orders","Main sales channel"],"Domain":["Domain extension","Registrar"],"YouTube Channel":["Subscribers","Average monthly views"],"Facebook Page":["Followers","Average monthly reach"],"Instagram Account":["Followers","Average monthly reach"],"TikTok Account":["Followers","Average monthly video views"],"Other Digital Asset":["Audience / user count","Main asset metric"]};
    const renderDynamic=()=>{const p=prompts[category.value];dynamic.hidden=!p;if(p)dynamic.innerHTML="<h3>"+category.value+" — additional details (optional)</h3><div class='listing-fields-grid'>"+p.map((x,i)=>"<label class='listing-field'>"+x+"<input name='category_extra_"+i+"' placeholder='Enter "+x.toLowerCase()+"'></label>").join("")+"</div>";updateProgress()};
    const renderImages=()=>{previews.innerHTML="";[...(cover.files||[]),...(extras.files||[])].forEach(f=>{if(!f.type.startsWith("image/"))return;const box=document.createElement("div");box.className="listing-preview-item";const img=document.createElement("img");img.alt=f.name;img.src=URL.createObjectURL(f);box.append(img);previews.append(box)});updateProgress()};
    const valueFor=el=>{if(el.type==="file")return [...(el.files||[])].map(f=>f.name).join(", ");if(el.type==="checkbox"||el.type==="radio")return el.checked?(el.value||"Yes"):"";return String(el.value||"").trim()};
    const escapeHtml=str=>String(str).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
    function buildPreview(){const groups=sections.map((section,index)=>{const heading=section.querySelector("h2")?.textContent||("Section "+(index+1));const controls=[...section.querySelectorAll("input,select,textarea")];const rows=[],seen=new Set();controls.forEach(el=>{if(["button","submit"].includes(el.type)||el.type==="radio"&&!el.checked||el.type==="checkbox"&&!el.checked)return;if(seen.has(el.name)&&el.type!=="checkbox")return;seen.add(el.name);const label=el.closest("label")?.childNodes[0]?.textContent?.replace("*","").trim()||el.name.replace(/_/g," ");const val=valueFor(el);if(val)rows.push("<div><small>"+escapeHtml(label)+"</small><strong>"+escapeHtml(val)+"</strong></div>")});if(index===3){const methods=[...section.querySelectorAll('[name="payout_methods"]:checked')].map(x=>x.value);if(methods.length)rows.push("<div class='wide'><small>Preferred Payment Methods</small><strong>"+escapeHtml(methods.join(", "))+"</strong></div>")}let media="";if(index===0){const files=[...(cover.files||[]),...(extras.files||[])].filter(f=>f.type.startsWith("image/"));if(files.length)media="<div class='listing-preview-gallery'>"+files.map(f=>"<img alt='"+escapeHtml(f.name)+"' src='"+URL.createObjectURL(f)+"'>").join("")+"</div>"}return "<article class='listing-preview-card'><button type='button' class='listing-preview-edit-section' data-edit-step='"+index+"'>Edit</button><h3>"+escapeHtml(heading)+"</h3><div class='listing-preview-data'>"+(rows.join("")||"<div><small>Details</small><strong>Not provided</strong></div>")+"</div>"+media+"</article>"});previewContent.innerHTML=groups.join("");previewContent.querySelectorAll("[data-edit-step]").forEach(btn=>btn.addEventListener("click",()=>showStep(Number(btn.dataset.editStep))))}
    const openConfirmation=()=>{confirmModal.hidden=false;document.getElementById("listing-confirm-accept").focus()};
    const closeConfirmation=()=>{confirmModal.hidden=true;document.getElementById("listing-submit-open-confirm").focus()};
    listingForm.addEventListener("input",updateProgress);listingForm.addEventListener("change",e=>{if(e.target===category)renderDynamic();if(e.target===cover||e.target===extras)renderImages();updateProgress()});
    backBtn.addEventListener("click",()=>showStep(currentStep-1));
    nextBtn.addEventListener("click",()=>{const section=sections[currentStep];if(!sectionRequiredValid(section)){const invalid=section.querySelector(":invalid");invalid?.reportValidity();feedback.hidden=false;feedback.textContent="Please complete the required fields in this step before continuing.";return}feedback.hidden=true;if(currentStep===sections.length-1){if(!listingForm.checkValidity()){const first=sections.findIndex(s=>!sectionRequiredValid(s));showStep(Math.max(0,first));sections[currentStep].querySelector(":invalid")?.reportValidity();return}showPreview();return}showStep(currentStep+1)});
    document.getElementById("listing-preview-back").addEventListener("click",()=>showStep(3));
    document.getElementById("listing-preview-next").addEventListener("click",showSubmit);
    document.getElementById("listing-submit-back").addEventListener("click",showPreview);
    document.getElementById("listing-submit-open-confirm").addEventListener("click",openConfirmation);
    document.getElementById("listing-confirm-cancel").addEventListener("click",closeConfirmation);
    document.getElementById("listing-confirm-accept").addEventListener("click",async()=>{
      const details=[],seen=new Set();
      [...listingForm.querySelectorAll("input,select,textarea")].forEach(el=>{
        if(el.type==="button"||el.type==="submit"||el.type==="radio"&&!el.checked)return;
        const key=el.name||el.id||"field"; if(el.type!=="checkbox"&&seen.has(key))return; seen.add(key);
        let value=el.type==="file"?[...(el.files||[])].map(file=>file.name).join(", "):String(el.value||"").trim();
        if(el.type==="checkbox"){if(!el.checked)return;const existing=details.find(row=>row.key===key);if(existing){existing.value+=", "+value;return;}}
        if(value){const label=el.closest("label")?.childNodes[0]?.textContent?.replace("*","").trim()||key.replace(/_/g," ");details.push({key,label,value});}
      });
      const submitButton=document.getElementById("listing-confirm-accept");submitButton.disabled=true;submitButton.textContent="Submitting…";
      try {
        const {data:authData,error:authError}=await client.auth.getUser();if(authError||!authData?.user)throw new Error("Please log in again.");
        const payload={user_id:authData.user.id,title:listingForm.elements.title.value,category:listingForm.elements.category.value,summary:listingForm.elements.summary.value,asking_price:Number(listingForm.elements.asking_price.value),price_currency:listingForm.elements.price_currency.value,status:"pending",listing_data:{details,submitted_file_names:[...(cover.files||[]),...(extras.files||[]),...(document.getElementById("listing-proof-files")?.files||[])].map(file=>file.name)}};
        const {error}=await client.from("asset_listings").insert(payload);if(error)throw error;
        confirmModal.hidden=true;hideScreens();view="status";statusScreen.hidden=false;const note=statusScreen.querySelector(".listing-status-note");if(note)note.hidden=true;await window.nexaRenderMyListings?.();listingForm.reset();renderDynamic();renderImages();
      } catch(error) {feedback.hidden=false;feedback.textContent="Could not submit listing: "+(error.message||"Please try again.");}
      finally {submitButton.disabled=false;submitButton.textContent="Confirm";}
      updateProgress();scrollTop();
    });
    confirmModal.addEventListener("click",e=>{if(e.target===confirmModal)closeConfirmation()});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!confirmModal.hidden)closeConfirmation()});
    listingForm.addEventListener("submit",e=>e.preventDefault());
    renderDynamic();renderImages();showStep(0);updateProgress();
  }

})();