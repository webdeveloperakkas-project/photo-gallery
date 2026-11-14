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
  // Listing form interactions; drafts are local until secure listing storage is connected.
  const listingForm=document.getElementById("nexa-listing-form");
  if(listingForm){
    const sections=[...listingForm.querySelectorAll("[data-listing-section]")],count=document.getElementById("listing-progress-count"),bar=document.getElementById("listing-progress-bar"),submit=document.getElementById("submit-listing-button"),feedback=document.getElementById("listing-form-feedback"),category=document.getElementById("listing-category"),dynamic=document.getElementById("listing-category-fields"),cover=document.getElementById("listing-cover-image"),extras=document.getElementById("listing-extra-images"),previews=document.getElementById("listing-image-previews"),key="nexa_listing_draft_v1";
    const values=el=>el.type==="checkbox"||el.type==="radio"?el.checked:el.type==="file"?el.files.length>0:String(el.value||"").trim()!=="";
    const complete=s=>{const req=[...s.querySelectorAll("[required]")];return req.length?req.every(el=>el.type==="radio"?s.querySelector('input[name="'+CSS.escape(el.name)+'"]:checked'):values(el)&&el.checkValidity()):true};
    const update=()=>{let n=0;sections.forEach(s=>{const ok=complete(s);if(ok)n++;s.classList.toggle("is-complete",ok);const st=s.querySelector(".listing-section-status");if(st)st.textContent=ok?"Completed":s.querySelector("[required]")?"Incomplete":"Optional"});if(count)count.textContent=n+" / 9 sections complete";if(bar)bar.style.width=(n/9*100)+"%";if(submit)submit.disabled=n!==9||!listingForm.checkValidity()};
    const prompts={"Website":["Monthly organic visitors","Main traffic source"],"SaaS":["Monthly active users","Subscription model"],"E-commerce":["Monthly orders","Main sales channel"],"Domain":["Domain extension","Registrar"],"YouTube Channel":["Subscribers","Average monthly views"],"Facebook Page":["Followers","Average monthly reach"],"Instagram Account":["Followers","Average monthly reach"],"TikTok Account":["Followers","Average monthly video views"],"Other Digital Asset":["Audience / user count","Main asset metric"]};
    const renderDynamic=()=>{const p=prompts[category.value];dynamic.hidden=!p;if(p)dynamic.innerHTML="<h3>"+category.value+" — additional details (optional)</h3><div class='listing-fields-grid'>"+p.map((x,i)=>"<label class='listing-field'>"+x+"<input name='category_extra_"+i+"' placeholder='Enter "+x.toLowerCase()+"'></label>").join("")+"</div>";update()};
    const renderImages=()=>{previews.innerHTML="";[...(cover.files||[]),...(extras.files||[])].forEach(f=>{if(!f.type.startsWith("image/"))return;const box=document.createElement("div");box.className="listing-preview-item";const img=document.createElement("img");img.alt=f.name;img.src=URL.createObjectURL(f);box.append(img);previews.append(box)});update()};
    listingForm.addEventListener("input",update);listingForm.addEventListener("change",e=>{if(e.target===category)renderDynamic();if(e.target===cover||e.target===extras)renderImages();update()});
    document.getElementById("save-listing-draft").addEventListener("click",()=>{const data={};[...listingForm.elements].forEach(el=>{if(!el.name||["file","submit","button"].includes(el.type))return;if(["checkbox","radio"].includes(el.type)){data[el.name]??=[];if(el.checked)data[el.name].push(el.value||"on")}else data[el.name]=el.value});try{localStorage.setItem(key,JSON.stringify(data));feedback.textContent="Draft saved in this browser. Uploaded files are not included and must be selected again."; }catch(e){feedback.textContent="Could not save draft in this browser."}});
    try{const data=JSON.parse(localStorage.getItem(key)||"null");if(data)Object.entries(data).forEach(([name,val])=>[...listingForm.querySelectorAll('[name="'+CSS.escape(name)+'"]')].forEach(el=>{if(["checkbox","radio"].includes(el.type))el.checked=Array.isArray(val)&&val.includes(el.value||"on");else if(typeof val==="string")el.value=val}))}catch(e){}
    renderDynamic();renderImages();listingForm.addEventListener("submit",e=>{e.preventDefault();if(!listingForm.checkValidity()){listingForm.reportValidity();return}feedback.textContent="Form complete. Online submission is not active yet; the listing database, secure file storage and admin review workflow still need to be connected."});update();
  }

})();