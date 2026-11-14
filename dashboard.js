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

  const openSection = (id) => {
    const target=document.getElementById(id);
    if(!target) return;
    document.querySelectorAll(".page-section").forEach(s=>s.classList.toggle("active",s.id===id));
    document.querySelectorAll(".sidebar-navigation .nav-link").forEach(a=>a.classList.toggle("active",a.dataset.section===id));
    history.replaceState(null,"","#"+id);
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
  // Step-by-step Nexa listing wizard with editable final preview.
  const listingForm=document.getElementById("nexa-listing-form");
  if(listingForm){
    const sections=[...listingForm.querySelectorAll("[data-listing-section]")],count=document.getElementById("listing-progress-count"),bar=document.getElementById("listing-progress-bar"),stepLabels=[...listingForm.querySelectorAll(".listing-progress-steps span")],feedback=document.getElementById("listing-form-feedback"),category=document.getElementById("listing-category"),dynamic=document.getElementById("listing-category-fields"),cover=document.getElementById("listing-cover-image"),extras=document.getElementById("listing-extra-images"),previews=document.getElementById("listing-image-previews"),key="nexa_listing_draft_v1";
    const stepNav=document.getElementById("listing-step-navigation"),backBtn=document.getElementById("listing-back-button"),nextBtn=document.getElementById("listing-next-button"),previewScreen=document.getElementById("listing-preview-screen"),previewContent=document.getElementById("listing-preview-content"),submitBtn=document.getElementById("submit-listing-button");
    let currentStep=0,previewMode=false;
    const isFilled=el=>el.type==="checkbox"||el.type==="radio"?el.checked:el.type==="file"?el.files.length>0:String(el.value||"").trim()!=="";
    const sectionRequiredValid=s=>[...s.querySelectorAll("[required]")].every(el=>el.type==="radio"?s.querySelector('input[name="'+CSS.escape(el.name)+'"]:checked')!==null:isFilled(el)&&el.checkValidity());
    const sectionComplete=s=>{const req=[...s.querySelectorAll("[required]")];return req.length?sectionRequiredValid(s):true};
    const updateProgress=()=>{let done=0;sections.forEach((s,i)=>{const ok=sectionComplete(s);if(ok)done++;s.classList.toggle("is-complete",ok);const status=s.querySelector(".listing-section-status");if(status)status.textContent=ok?"Completed":s.querySelector("[required]")?"Incomplete":"Optional";if(stepLabels[i]){stepLabels[i].classList.toggle("is-complete",ok);stepLabels[i].classList.toggle("is-current",i===currentStep&&!previewMode)}});if(count)count.textContent=done+" / 9 sections complete";if(bar)bar.style.width=(done/9*100)+"%"};
    const showStep=index=>{currentStep=Math.max(0,Math.min(index,sections.length-1));previewMode=false;previewScreen.hidden=true;stepNav.hidden=false;sections.forEach((s,i)=>s.classList.toggle("is-current",i===currentStep));backBtn.disabled=currentStep===0;nextBtn.textContent=currentStep===sections.length-1?"Preview Listing →":"Next →";updateProgress();window.scrollTo({top:listingForm.getBoundingClientRect().top+window.scrollY-90,behavior:"smooth"})};
    const prompts={"Website":["Monthly organic visitors","Main traffic source"],"SaaS":["Monthly active users","Subscription model"],"E-commerce":["Monthly orders","Main sales channel"],"Domain":["Domain extension","Registrar"],"YouTube Channel":["Subscribers","Average monthly views"],"Facebook Page":["Followers","Average monthly reach"],"Instagram Account":["Followers","Average monthly reach"],"TikTok Account":["Followers","Average monthly video views"],"Other Digital Asset":["Audience / user count","Main asset metric"]};
    const renderDynamic=()=>{const p=prompts[category.value];dynamic.hidden=!p;if(p)dynamic.innerHTML="<h3>"+category.value+" — additional details (optional)</h3><div class='listing-fields-grid'>"+p.map((x,i)=>"<label class='listing-field'>"+x+"<input name='category_extra_"+i+"' placeholder='Enter "+x.toLowerCase()+"'></label>").join("")+"</div>";updateProgress()};
    const renderImages=()=>{previews.innerHTML="";[...(cover.files||[]),...(extras.files||[])].forEach(f=>{if(!f.type.startsWith("image/"))return;const box=document.createElement("div");box.className="listing-preview-item";const img=document.createElement("img");img.alt=f.name;img.src=URL.createObjectURL(f);box.append(img);previews.append(box)});updateProgress()};
    const valueFor=el=>{if(el.type==="file")return [...(el.files||[])].map(f=>f.name).join(", ");if(el.type==="checkbox"||el.type==="radio")return el.checked?(el.value||"Yes"):"";return String(el.value||"").trim()};
    const escapeHtml=str=>String(str).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
    const buildPreview=()=>{const groups=sections.map((section,index)=>{const heading=section.querySelector("h2")?.textContent||("Section "+(index+1));const controls=[...section.querySelectorAll("input,select,textarea")].filter(el=>el.type!=="button"&&el.type!=="submit");const rows=[];const seen=new Set();controls.forEach(el=>{if(el.type==="radio"&&!el.checked)return;if(el.type==="checkbox"&&!el.checked)return;if(el.name==="cover_image"||el.name==="additional_images"||el.name==="proof_files")return;if(seen.has(el.name)&&el.type!=="checkbox")return;seen.add(el.name);const label=el.closest("label")?.childNodes[0]?.textContent?.replace("*","").trim()||el.name.replace(/_/g," ");const val=valueFor(el);if(val)rows.push("<div><small>"+escapeHtml(label)+"</small><strong>"+escapeHtml(val)+"</strong></div>")});if(section.dataset.listingSection==="transfer"){const methods=[...section.querySelectorAll('[name="payout_methods"]:checked')].map(x=>x.value);if(methods.length)rows.push("<div class='wide'><small>Preferred Payment Methods</small><strong>"+escapeHtml(methods.join(", "))+"</strong></div>")}let media="";if(index===1){const files=[...(cover.files||[]),...(extras.files||[])].filter(f=>f.type.startsWith("image/"));if(files.length)media="<div class='listing-preview-gallery'>"+files.map(f=>"<img alt='"+escapeHtml(f.name)+"' src='"+URL.createObjectURL(f)+"'>").join("")+"</div>"}return "<article class='listing-preview-card'><button type='button' class='listing-preview-edit-section' data-edit-step='"+index+"'>Edit</button><h3>"+escapeHtml(heading)+"</h3><div class='listing-preview-data'>"+(rows.join("")||"<div><small>Details</small><strong>Not provided</strong></div>")+"</div>"+media+"</article>"});previewContent.innerHTML=groups.join("");previewContent.querySelectorAll("[data-edit-step]").forEach(btn=>btn.addEventListener("click",()=>showStep(Number(btn.dataset.editStep))))};
    const openPreview=()=>{if(!sections.every(sectionComplete)||!listingForm.checkValidity()){const first=sections.findIndex(s=>!sectionComplete(s));showStep(first<0?0:first);const invalid=sections[currentStep].querySelector(":invalid");invalid?.reportValidity();feedback.textContent="Please complete the required fields before previewing.";return}previewMode=true;sections.forEach(s=>s.classList.remove("is-current"));stepNav.hidden=true;previewScreen.hidden=false;buildPreview();updateProgress();window.scrollTo({top:listingForm.getBoundingClientRect().top+window.scrollY-90,behavior:"smooth"})};
    listingForm.addEventListener("input",updateProgress);listingForm.addEventListener("change",e=>{if(e.target===category)renderDynamic();if(e.target===cover||e.target===extras)renderImages();updateProgress()});
    backBtn.addEventListener("click",()=>showStep(currentStep-1));
    nextBtn.addEventListener("click",()=>{const section=sections[currentStep];if(!sectionRequiredValid(section)){const invalid=section.querySelector(":invalid");invalid?.reportValidity();feedback.textContent="Please complete the required fields in this step before continuing.";return}if(currentStep===sections.length-1){openPreview();return}showStep(currentStep+1)});
    document.getElementById("listing-preview-close").addEventListener("click",()=>showStep(sections.length-1));
    document.getElementById("listing-preview-edit").addEventListener("click",()=>showStep(0));
    document.getElementById("save-listing-draft").addEventListener("click",()=>{const data={};[...listingForm.elements].forEach(el=>{if(!el.name||["file","submit","button"].includes(el.type))return;if(["checkbox","radio"].includes(el.type)){data[el.name]??=[];if(el.checked)data[el.name].push(el.value||"on")}else data[el.name]=el.value});try{localStorage.setItem(key,JSON.stringify(data));feedback.textContent="Draft saved in this browser. Uploaded files are not included; select them again when you resume."}catch(e){feedback.textContent="Could not save draft in this browser."}});
    try{const data=JSON.parse(localStorage.getItem(key)||"null");if(data)Object.entries(data).forEach(([name,val])=>[...listingForm.querySelectorAll('[name="'+CSS.escape(name)+'"]')].forEach(el=>{if(["checkbox","radio"].includes(el.type))el.checked=Array.isArray(val)&&val.includes(el.value||"on");else if(typeof val==="string")el.value=val}))}catch(e){}
    renderDynamic();renderImages();submitBtn.addEventListener("click",()=>{if(!listingForm.checkValidity()){const invalid=sections.findIndex(s=>!sectionRequiredValid(s));showStep(Math.max(0,invalid));listingForm.querySelector(":invalid")?.reportValidity();return}feedback.textContent="Your preview is ready, but online submission is not active yet. Secure database storage, image upload and admin review must be connected before a listing can be submitted.";});
    listingForm.addEventListener("submit",e=>e.preventDefault());showStep(0);updateProgress();
  }

})();