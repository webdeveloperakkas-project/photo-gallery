(()=>{
const URL="https://hguwdcmwqcpswyxtskcb.supabase.co",KEY="sb_publishable_NLm2aSYg_j-zzRNSU-86gQ_Oj-xyHr2",client=window.supabase.createClient(URL,KEY);
const $=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const id=new URLSearchParams(location.search).get("id"),loading=$("asset-detail-loading"),errorBox=$("asset-detail-error"),content=$("asset-detail-content");
const notice=message=>{const n=$("detail-notice");n.textContent=message;n.hidden=false;};
const imageUrl=path=>path?client.storage.from("asset-listing-media").getPublicUrl(path).data.publicUrl:"";
const money=(currency,value)=>currency+" "+Number(value||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const detailRows=details=>(Array.isArray(details)?details:[]).filter(x=>x&&x.value).map(x=>"<div><small>"+esc(x.label||x.key)+"</small><strong>"+esc(x.value)+"</strong></div>").join("");
const sidebar=$("nexa-sidebar"),overlay=$("sidebar-overlay"),menu=$("menu-toggle"),close=$("sidebar-close");
const closeSidebar=()=>{sidebar?.classList.remove("open");overlay?.classList.remove("show");menu?.setAttribute("aria-expanded","false");};
menu?.addEventListener("click",()=>{const open=!sidebar.classList.contains("open");sidebar.classList.toggle("open",open);overlay.classList.toggle("show",open);menu.setAttribute("aria-expanded",String(open));});
close?.addEventListener("click",closeSidebar);overlay?.addEventListener("click",closeSidebar);
const profileToggle=$("dash-profile-toggle"),profileDropdown=$("dash-profile-dropdown"),walletToggle=$("dash-wallet-toggle"),walletDropdown=$("dash-wallet-dropdown");
profileToggle?.addEventListener("click",()=>{profileDropdown.hidden=!profileDropdown.hidden;profileToggle.setAttribute("aria-expanded",String(!profileDropdown.hidden));});
walletToggle?.addEventListener("click",()=>{walletDropdown.hidden=!walletDropdown.hidden;walletToggle.setAttribute("aria-expanded",String(!walletDropdown.hidden));});
document.addEventListener("click",e=>{if(!$("dash-profile-menu-wrap")?.contains(e.target)&&profileDropdown&&!profileDropdown.hidden){profileDropdown.hidden=true;profileToggle?.setAttribute("aria-expanded","false");}if(!$("dash-wallet-menu-wrap")?.contains(e.target)&&walletDropdown&&!walletDropdown.hidden){walletDropdown.hidden=true;walletToggle?.setAttribute("aria-expanded","false");}});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSidebar();});
client.auth.getSession().then(({data,error})=>{if(error||!data?.session?.user){location.replace("index.html#auth-login");return;}const u=data.session.user,m=u.user_metadata||{},name=m.display_name||[m.first_name,m.last_name].filter(Boolean).join(" ")||"Nexa member",initial=name.trim().charAt(0).toUpperCase()||"N";$("dash-avatar-initial").textContent=initial;$("dash-dropdown-avatar").textContent=initial;$("dash-dropdown-name").textContent=name;$("dash-dropdown-email").textContent=u.email||"";});
$("logout-button")?.addEventListener("click",async()=>{const {error}=await client.auth.signOut();if(error){alert("Could not log out. Please try again.");return;}location.replace("index.html");});
async function load(){
 if(!id){loading.hidden=true;errorBox.hidden=false;errorBox.textContent="No asset was selected. Return to the Marketplace and choose a listing.";return;}
 const {data:item,error}=await client.from("marketplace_public_listings").select("*").eq("id",id).maybeSingle();
 if(error||!item){loading.hidden=true;errorBox.hidden=false;errorBox.textContent="This listing could not be found or is no longer available.";return;}
$("detail-category-pill").textContent=item.subcategory||item.category||"Digital Asset";
 $("detail-title").textContent=item.title||"Digital Asset";$("detail-summary").textContent=item.summary||"Explore this digital asset.";
 $("detail-price").textContent=money(item.price_currency,item.asking_price);$("detail-date").textContent="Listed "+new Date(item.submitted_at).toLocaleDateString();
 const cover=imageUrl(item.cover_image_path),coverEl=$("detail-cover");if(cover){coverEl.src=cover;coverEl.alt=(item.title||"Asset")+" preview";}else{coverEl.hidden=true;}
 const thumbs=$("detail-gallery-thumbs"),paths=[item.logo_image_path,...(Array.isArray(item.gallery_image_paths)?item.gallery_image_paths:[])].filter(Boolean);
 thumbs.innerHTML=paths.map(p=>"<img src='"+esc(imageUrl(p))+"' alt='Additional asset image' loading='lazy'>").join("");thumbs.hidden=paths.length===0;
 $("detail-overview").innerHTML=detailRows(item.public_details)||"<div><small>Listing information</small><strong>Additional details were not provided.</strong></div>";
 $("detail-description").textContent=item.full_description||"";
 const stats=[];if(item.monthly_visitors!=null)stats.push(["Monthly Visitors",Number(item.monthly_visitors).toLocaleString()]);if(item.total_subscribers!=null)stats.push(["Subscribers",Number(item.total_subscribers).toLocaleString()]);if(item.total_followers!=null)stats.push(["Followers",Number(item.total_followers).toLocaleString()]);if(item.monthly_revenue!=null)stats.push(["Monthly Revenue",money(item.financial_currency||item.price_currency,item.monthly_revenue)]);if(item.monthly_expenses!=null)stats.push(["Monthly Expenses",money(item.financial_currency||item.price_currency,item.monthly_expenses)]);if(item.monthly_profit!=null)stats.push(["Net Monthly Profit",money(item.financial_currency||item.price_currency,item.monthly_profit)]);
 $("detail-performance").innerHTML=stats.map(([label,value])=>"<div class='detail-stat'><small>"+esc(label)+"</small><strong>"+esc(value)+"</strong></div>").join("")||"<div class='detail-stat'><small>Performance</small><strong>Not provided</strong></div>";
 const seller=item.seller_name||"Nexa Seller";$("seller-name").textContent=seller;$("seller-avatar").textContent=seller.trim().charAt(0).toUpperCase()||"N";$("seller-member-since").textContent=item.seller_member_since?"Member since "+new Date(item.seller_member_since).toLocaleDateString():"Nexa marketplace seller";$("seller-stats").innerHTML="<span><b>"+Number(item.seller_total_listings||0)+"</b> approved listings</span><span><b>—</b> successful sales (not available yet)</span>";
 $("seller-rating-value").textContent="—";$("seller-rating-note").textContent="No verified reviews yet";
 loading.hidden=true;content.hidden=false;
}
$("contact-seller").addEventListener("click",()=>notice("Nexa messaging is not connected yet. Seller chat will be enabled when the messaging service is ready."));
$("buy-now").addEventListener("click",()=>notice("Secure checkout is not connected yet. No payment has been taken."));
load();
})();