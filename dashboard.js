(() => {
  const SUPABASE_URL = "https://hguwdcmwqcpswyxtskcb.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_NLm2aSYg_j-zzRNSU-86gQ_Oj-xyHr2";
  const client = window.supabase?.createClient ? window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY) : null;
  const home = "https://webdeveloperakkas-project.github.io/photo-gallery/";
  const logout = document.getElementById("logout-button");
  const profileWrap = document.getElementById("dash-profile-menu-wrap");
  const profileToggle = document.getElementById("dash-profile-toggle");
  const profileDropdown = document.getElementById("dash-profile-dropdown");
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
  logout?.addEventListener("click", async () => {
    logout.disabled = true;
    const {error} = await client.auth.signOut();
    if (error) { logout.disabled = false; alert("Could not log out. Please try again."); return; }
    window.location.replace(home);
  });
})();