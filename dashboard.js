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
  const walletWrap = document.getElementById("dash-wallet-menu-wrap");
  const walletToggle = document.getElementById("dash-wallet-toggle");
  const walletDropdown = document.getElementById("dash-wallet-dropdown");
  if (!client) { window.location.replace(home + "#auth-login"); return; }
  client.auth.getSession().then(({data,error}) => {
    if (error || !data?.session?.user) { window.location.replace(home + "#auth-login"); return; }
    const user = data.session.user;
    const meta = user.user_metadata || {};
    const displayName = meta.display_name || [meta.first_name,meta.last_name].filter(Boolean).join(" ") || "Nexa member";
    document.getElementById("user-name").textContent = displayName;
    document.getElementById("user-email").textContent = user.email || "";
    document.getElementById("profile-email").textContent = user.email || "—";
    document.getElementById("profile-id").textContent = user.id;
    document.getElementById("email-status").textContent = user.email_confirmed_at ? "Verified" : "Not verified";
    const initial = displayName.trim().charAt(0).toUpperCase() || "N";
    document.getElementById("avatar-initial").textContent = initial;
    document.getElementById("dash-avatar-initial").textContent = initial;
    document.getElementById("dash-dropdown-avatar").textContent = initial;
    document.getElementById("dash-dropdown-name").textContent = displayName;
    document.getElementById("dash-dropdown-email").textContent = user.email || "";
  });
  menuToggle?.addEventListener("click", () => {
    const opening = !mainMenu?.classList.contains("open");
    mainMenu?.classList.toggle("open", opening);
    menuToggle.setAttribute("aria-expanded", String(opening));
    menuToggle.setAttribute("aria-label", opening ? "Close dashboard menu" : "Open dashboard menu");
  });
  mainMenu?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    mainMenu.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  }));
  document.addEventListener("click", event => {
    if (mainMenu && menuToggle && !mainMenu.contains(event.target) && !menuToggle.contains(event.target)) {
      mainMenu.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && mainMenu?.classList.contains("open")) {
      mainMenu.classList.remove("open");
      menuToggle?.setAttribute("aria-expanded", "false");
      menuToggle?.focus();
    }
  });
  profileToggle?.addEventListener("click", () => {
    const opening = profileDropdown?.hidden ?? true;
    if (profileDropdown) profileDropdown.hidden = !opening;
    profileToggle.setAttribute("aria-expanded", String(opening));
  });
  document.addEventListener("click", event => {
    if (profileWrap && !profileWrap.contains(event.target) && profileDropdown && !profileDropdown.hidden) {
      profileDropdown.hidden = true;
      profileToggle?.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && profileDropdown && !profileDropdown.hidden) {
      profileDropdown.hidden = true;
      profileToggle?.setAttribute("aria-expanded", "false");
      profileToggle?.focus();
    }
  });

  walletToggle?.addEventListener("click", () => {
    const opening = walletDropdown?.hidden ?? true;
    if (walletDropdown) walletDropdown.hidden = !opening;
    walletToggle.setAttribute("aria-expanded", String(opening));
  });
  document.addEventListener("click", event => {
    if (walletWrap && !walletWrap.contains(event.target) && walletDropdown && !walletDropdown.hidden) {
      walletDropdown.hidden = true;
      walletToggle?.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && walletDropdown && !walletDropdown.hidden) {
      walletDropdown.hidden = true;
      walletToggle?.setAttribute("aria-expanded", "false");
      walletToggle?.focus();
    }
  });
  logout?.addEventListener("click", async () => {
    logout.disabled = true;
    const {error} = await client.auth.signOut();
    if (error) { logout.disabled = false; alert("Could not log out. Please try again."); return; }
    window.location.replace(home);
  });
})();