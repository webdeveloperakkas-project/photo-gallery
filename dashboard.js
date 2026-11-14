(() => {
  const SUPABASE_URL = "https://hguwdcmwqcpswyxtskcb.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_NLm2aSYg_j-zzRNSU-86gQ_Oj-xyHr2";
  const client = window.supabase?.createClient ? window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY) : null;
  const home = "https://webdeveloperakkas-project.github.io/photo-gallery/";
  const logout = document.getElementById("logout-button");
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
    document.getElementById("avatar-initial").textContent = displayName.trim().charAt(0).toUpperCase() || "N";
  });
  logout?.addEventListener("click", async () => {
    logout.disabled = true;
    const {error} = await client.auth.signOut();
    if (error) { logout.disabled = false; alert("Could not log out. Please try again."); return; }
    window.location.replace(home);
  });
})();