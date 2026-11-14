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
})();