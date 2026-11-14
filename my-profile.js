(() => {
  const SUPABASE_URL = "https://hguwdcmwqcpswyxtskcb.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_NLm2aSYg_j-zzRNSU-86gQ_Oj-xyHr2";
  const client = window.supabase?.createClient ? window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY) : null;
  const home = "https://webdeveloperakkas-project.github.io/photo-gallery/";
  const logout = document.getElementById("logout-button");
  const menuToggle = document.getElementById("dash-menu-toggle");
  const mainMenu = document.getElementById("dash-main-menu");
  const profileWrap = document.getElementById("dash-profile-menu-wrap");
  const profileToggle = document.getElementById("dash-profile-toggle");
  const profileDropdown = document.getElementById("dash-profile-dropdown");
  if (!client) { window.location.replace(home + "#auth-login"); return; }
  client.auth.getSession().then(({data,error}) => {
    if (error || !data?.session?.user) { window.location.replace(home + "#auth-login"); return; }
    const user = data.session.user;
    const meta = user.user_metadata || {};
    const displayName = meta.display_name || [meta.first_name,meta.last_name].filter(Boolean).join(" ") || "Nexa member";
    const initial = displayName.trim().charAt(0).toUpperCase() || "N";
    ["user-name","dash-dropdown-name","profile-name"].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=displayName; });
    ["user-email","profile-email","dash-dropdown-email"].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=user.email || "—"; });
    const idEl=document.getElementById("profile-id"); if(idEl) idEl.textContent=user.id;
    const statusEl=document.getElementById("email-status"); if(statusEl) statusEl.textContent=user.email_confirmed_at ? "Verified" : "Not verified";
    ["avatar-initial","dash-avatar-initial","dash-dropdown-avatar"].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=initial; });
  });
  menuToggle?.addEventListener("click", () => {
    const opening = !mainMenu?.classList.contains("open");
    mainMenu?.classList.toggle("open", opening);
    menuToggle.setAttribute("aria-expanded", String(opening));
    menuToggle.setAttribute("aria-label", opening ? "Close dashboard menu" : "Open dashboard menu");
  });
  mainMenu?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    mainMenu.classList.remove("open"); menuToggle?.setAttribute("aria-expanded","false");
  }));
  document.addEventListener("click", event => {
    if (mainMenu && menuToggle && !mainMenu.contains(event.target) && !menuToggle.contains(event.target)) {
      mainMenu.classList.remove("open"); menuToggle.setAttribute("aria-expanded","false");
    }
    if (profileWrap && !profileWrap.contains(event.target) && profileDropdown && !profileDropdown.hidden) {
      profileDropdown.hidden=true; profileToggle?.setAttribute("aria-expanded","false");
    }
  });
  document.addEventListener("keydown", event => {
    if(event.key==="Escape"){
      if(mainMenu?.classList.contains("open")){mainMenu.classList.remove("open");menuToggle?.setAttribute("aria-expanded","false");menuToggle?.focus();}
      if(profileDropdown && !profileDropdown.hidden){profileDropdown.hidden=true;profileToggle?.setAttribute("aria-expanded","false");profileToggle?.focus();}
    }
  });
  profileToggle?.addEventListener("click", () => {
    const opening=profileDropdown?.hidden ?? true;
    if(profileDropdown) profileDropdown.hidden=!opening;
    profileToggle.setAttribute("aria-expanded",String(opening));
  });
  logout?.addEventListener("click", async () => {
    logout.disabled=true;
    const {error}=await client.auth.signOut();
    if(error){logout.disabled=false;alert("Could not log out. Please try again.");return;}
    window.location.replace(home);
  });
})();