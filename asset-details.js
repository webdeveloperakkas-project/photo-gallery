
(()=>{
const URL="https://hguwdcmwqcpswyxtskcb.supabase.co",KEY="sb_publishable_NLm2aSYg_j-zzRNSU-86gQ_Oj-xyHr2",client=window.nexaSupabaseClient||(window.nexaSupabaseClient=window.supabase.createClient(URL,KEY));
const $=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const id=new URLSearchParams(location.search).get("id"),loading=$("asset-detail-loading"),errorBox=$("asset-detail-error"),content=$("asset-detail-content");
let currentItem=null,currentUser=null,activeConversationId=null,messageTimer=null;
const notice=message=>{const n=$("detail-notice");n.textContent=message;n.hidden=false;};
const imageUrl=path=>path?client.storage.from("asset-listing-media").getPublicUrl(path).data.publicUrl:"";
const money=(currency,value)=>currency+" "+Number(value||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const payoutLogo=method=>{const key=String(method||"").toLowerCase();const map={"bank transfer":["logo-bank","▤"],"payoneer":["logo-payoneer","P"],"wise":["logo-wise","W"],"paypal":["logo-paypal","P"],"bkash":["logo-bkash","bKash"],"nagad":["logo-nagad","N"],"rocket":["logo-rocket","R"]};const item=map[key]||["logo-bank","▤"];return "<i class=\"payout-brand-logo "+item[0]+"\" aria-hidden=\"true\">"+item[1]+"</i>";};
const detailRows=details=>(Array.isArray(details)?details:[]).filter(x=>{if(!x||x.value==null||String(x.value).trim()==="")return false;const key=String(x.key||"").toLowerCase().replace(/[^a-z]/g,""),label=String(x.label||"").toLowerCase().replace(/[^a-z]/g,"");return !["assettitle","title","shortsummary","summary","fulldescription","description"].includes(key)&&!["assettitle","title","shortsummary","summary","fulldescription","description"].includes(label);}).map(x=>"<div><small>"+esc(x.label||x.key)+"</small><strong>"+esc(x.value)+"</strong></div>").join("");
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


const imageLightbox=$("image-lightbox"),lightboxImage=$("image-lightbox-image");
function openImageLightbox(src,alt){lightboxImage.src=src;lightboxImage.alt=alt||"Enlarged product image";imageLightbox.hidden=false;document.body.classList.add("image-lightbox-open");$("image-lightbox-close").focus();}
function closeImageLightbox(){imageLightbox.hidden=true;lightboxImage.removeAttribute("src");document.body.classList.remove("image-lightbox-open");}
$("image-lightbox-close")?.addEventListener("click",closeImageLightbox);
imageLightbox?.addEventListener("click",event=>{if(event.target===imageLightbox)closeImageLightbox();});
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&imageLightbox&&!imageLightbox.hidden)closeImageLightbox();});

const messageModal=$("message-modal"),messageThread=$("message-thread"),messageFeedback=$("message-feedback"),sellerConversationList=$("seller-conversation-list");
const stopMessagePolling=()=>{if(messageTimer)clearInterval(messageTimer);messageTimer=null;};
const closeMessages=()=>{messageModal.hidden=true;stopMessagePolling();activeConversationId=null;};
const showMessageFeedback=text=>{messageFeedback.textContent=text||"";};
const renderMessages=async()=>{
 if(!activeConversationId)return;
 const {data,error}=await client.from("nexa_messages").select("id,sender_id,body,created_at").eq("conversation_id",activeConversationId).order("created_at",{ascending:true});
 if(error){showMessageFeedback("Messages could not be loaded: "+error.message);return;}
 if(!data?.length){messageThread.innerHTML="<div class='message-empty'>No messages yet. Start the conversation below.</div>";return;}
 messageThread.innerHTML=data.map(m=>"<div class='message-bubble "+(m.sender_id===currentUser.id?"mine":"")+"'><p>"+esc(m.body)+"</p><small>"+new Date(m.created_at).toLocaleString()+"</small></div>").join("");
 messageThread.scrollTop=messageThread.scrollHeight;
};
const selectConversation=async conversationId=>{
 activeConversationId=conversationId;
 sellerConversationList.querySelectorAll(".seller-conversation-item").forEach(el=>el.classList.toggle("active",el.dataset.conversation===conversationId));
 await renderMessages();stopMessagePolling();messageTimer=setInterval(renderMessages,5000);
};
const openBuyerConversation=async()=>{
 const {data:existing,error:findError}=await client.from("nexa_conversations").select("id").eq("listing_id",currentItem.id).eq("buyer_id",currentUser.id).maybeSingle();
 if(findError)throw findError;
 let conversation=existing;
 if(!conversation){
  const {data:created,error:createError}=await client.from("nexa_conversations").insert({listing_id:currentItem.id,buyer_id:currentUser.id,seller_id:currentItem.seller_id,listing_title:currentItem.title}).select("id").single();
  if(createError)throw createError;conversation=created;
 }
 $("message-title").textContent="Contact Seller";$("message-subtitle").textContent="Conversation about: "+currentItem.title;
 sellerConversationList.hidden=true;messageThread.hidden=false;$("message-form").hidden=false;
 messageModal.hidden=false;showMessageFeedback("");await selectConversation(conversation.id);
};
const openSellerInbox=async()=>{
 $("message-title").textContent="Buyer Messages";$("message-subtitle").textContent="Conversations about your listing: "+currentItem.title;
 messageModal.hidden=false;messageThread.hidden=false;$("message-form").hidden=true;sellerConversationList.hidden=false;
 sellerConversationList.innerHTML="<div class='message-empty'>Loading buyer conversations…</div>";
 const {data:conversations,error}=await client.from("nexa_conversations").select("id,buyer_id,listing_title,created_at").eq("listing_id",currentItem.id).eq("seller_id",currentUser.id).order("created_at",{ascending:false});
 if(error){sellerConversationList.innerHTML="<div class='message-empty'>Could not load conversations: "+esc(error.message)+"</div>";return;}
 if(!conversations?.length){sellerConversationList.innerHTML="<div class='message-empty'>No buyer messages yet.</div>";messageThread.innerHTML="<div class='message-empty'>New buyer conversations will appear here.</div>";return;}
 sellerConversationList.innerHTML=conversations.map(c=>"<button type='button' class='seller-conversation-item' data-conversation='"+esc(c.id)+"'><span>Buyer conversation</span><small>"+new Date(c.created_at).toLocaleDateString()+"</small></button>").join("");
 sellerConversationList.querySelectorAll("[data-conversation]").forEach(btn=>btn.addEventListener("click",async()=>{$("message-form").hidden=false;await selectConversation(btn.dataset.conversation);}));
 await selectConversation(conversations[0].id);
};
$("message-close")?.addEventListener("click",closeMessages);
messageModal?.addEventListener("click",e=>{if(e.target===messageModal)closeMessages();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!messageModal.hidden)closeMessages();});
$("message-form")?.addEventListener("submit",async e=>{
 e.preventDefault();const input=$("message-input"),body=input.value.trim();if(!body||!activeConversationId)return;
 const send=$("message-send");send.disabled=true;showMessageFeedback("");
 const {error}=await client.from("nexa_messages").insert({conversation_id:activeConversationId,sender_id:currentUser.id,body});
 send.disabled=false;if(error){showMessageFeedback("Message was not sent: "+error.message);return;}
 input.value="";await renderMessages();
});
$("checkout-back")?.addEventListener("click",()=>{content.classList.remove("checkout-active");$("checkout-view").hidden=true;});
let selectedCheckoutMethod="";
const syncCheckoutSelection=()=>{
 const selected=$("checkout-methods")?.querySelector("input[name='checkout-method']:checked");
 selectedCheckoutMethod=selected?.value||"";
 const continueButton=$("checkout-continue");
 if(continueButton){continueButton.hidden=false;continueButton.disabled=!selectedCheckoutMethod;}
};
$("checkout-methods")?.addEventListener("change",syncCheckoutSelection);
$("checkout-continue")?.addEventListener("click",()=>{
 if(!selectedCheckoutMethod){notice("Please select a payment method first.");return;}
 const heading=document.querySelector(".checkout-heading"),layout=document.querySelector(".checkout-layout");
 if(heading)heading.hidden=true;
 if(layout)layout.hidden=true;
 $("checkout-payment-page").hidden=false;
 $("checkout-payment-amount").textContent=money(currentItem.price_currency,currentItem.asking_price);
 $("checkout-payment-method").textContent="Selected payment method: "+selectedCheckoutMethod;
 const method=selectedCheckoutMethod.toLowerCase(),isBkash=method==="bkash",isBank=method==="bank transfer";
 $("checkout-bkash-destination").hidden=!isBkash;
 $("checkout-bank-destination").hidden=!isBank;
 $("checkout-payment-placeholder").hidden=isBkash||isBank;
 $("checkout-placeholder-method").textContent=selectedCheckoutMethod+" receiving details";
 $("checkout-transaction-id").value="";
 $("checkout-transaction-id").disabled=false;
 $("checkout-submit-payment").disabled=false;
 $("checkout-submit-payment").textContent="Submit Payment";
 $("checkout-payment-status").hidden=true;
 window.scrollTo({top:0,behavior:"smooth"});
});
$("checkout-payment-back")?.addEventListener("click",()=>{
 $("checkout-payment-page").hidden=true;
 const heading=document.querySelector(".checkout-heading"),layout=document.querySelector(".checkout-layout");
 if(heading)heading.hidden=false;
 if(layout)layout.hidden=false;
 window.scrollTo({top:0,behavior:"smooth"});
});
$("checkout-payment-form")?.addEventListener("submit",event=>{
 event.preventDefault();
 const transactionId=$("checkout-transaction-id").value.trim();
 if(!transactionId){$("checkout-transaction-id").focus();return;}
 const status=$("checkout-payment-status");
 status.textContent="Your payment is being processed. Nexa will verify the transaction before the seller's wallet is credited.";
 status.hidden=false;
 $("checkout-transaction-id").disabled=true;
 $("checkout-submit-payment").disabled=true;
 $("checkout-submit-payment").textContent="Payment Submitted";
});
$("checkout-copy-bank")?.addEventListener("click",async()=>{
 try{await navigator.clipboard.writeText("0000");$("checkout-copy-bank").textContent="Copied";}
 catch(_){notice("Please copy the bank account number manually: 0000");}
});
$("checkout-copy-bkash")?.addEventListener("click",async()=>{
 try{await navigator.clipboard.writeText("01840398000");$("checkout-copy-bkash").textContent="Copied";}catch(_){notice("Please copy the bKash number manually: 01840398000");}
});

async function load(){
 if(!id){loading.hidden=true;errorBox.hidden=false;errorBox.textContent="No asset was selected. Return to the Marketplace and choose a listing.";return;}
 const {data:item,error}=await client.from("marketplace_public_listings").select("*").eq("id",id).maybeSingle();
 if(error||!item){loading.hidden=true;errorBox.hidden=false;errorBox.textContent="This listing could not be found or is no longer available.";return;}
 currentItem=item;const {data:auth}=await client.auth.getUser();currentUser=auth?.user;if(!currentUser){location.replace("index.html#auth-login");return;}$("contact-seller").textContent=currentUser.id===item.seller_id?"View Buyer Messages":"Contact Seller";
$("detail-category-pill").textContent=item.subcategory||item.category||"Digital Asset";
  const monetization=$("detail-monetization-status");if(item.monetization_status==="monetized"||item.monetization_status==="not_monetized"){monetization.hidden=false;monetization.textContent=item.monetization_status==="monetized"?"Monetized":"Not Monetized";monetization.className="detail-monetization-status "+(item.monetization_status==="monetized"?"is-monetized":"is-not-monetized");}else{monetization.hidden=true;}
 $("detail-price").textContent=money(item.price_currency,item.asking_price);$("detail-date").textContent="Listed "+new Date(item.submitted_at).toLocaleDateString();
 const cover=imageUrl(item.cover_image_path),coverEl=$("detail-cover"),coverFrame=$("detail-cover-frame");if(cover){coverEl.src=cover;coverEl.alt=(item.title||"Digital asset")+" preview";coverFrame.hidden=false;}else{coverFrame.hidden=true;}coverEl.onerror=()=>{coverFrame.hidden=true;};
 $("detail-overview").innerHTML=detailRows(item.public_details)||"<div><small>Listing information</small><strong>Additional details were not provided.</strong></div>";
 const description=item.full_description||"The seller has not provided a full description.";$("detail-description").textContent=description;
 const galleryPaths=[item.logo_image_path,...(Array.isArray(item.gallery_image_paths)?item.gallery_image_paths:[])].filter(Boolean);
 const gallery=$("detail-image-gallery"),galleryGrid=$("detail-image-gallery-grid");
 galleryGrid.innerHTML="";
 galleryPaths.forEach((path,index)=>{
   const src=imageUrl(path);if(!src)return;
   const card=document.createElement("button");card.type="button";card.className="detail-image-gallery-card";card.setAttribute("aria-label","View product image "+(index+1));
   const img=document.createElement("img");img.src=src;img.alt=(item.title||"Product")+" image "+(index+1);img.loading="lazy";
   card.append(img);card.addEventListener("click",()=>openImageLightbox(src,img.alt));galleryGrid.append(card);
 });
 gallery.hidden=galleryPaths.length===0;

 const seller=item.seller_name||"Nexa Seller";$("seller-name").textContent=seller;$("seller-avatar").textContent=seller.trim().charAt(0).toUpperCase()||"N";$("seller-member-since").textContent=item.seller_member_since?new Date(item.seller_member_since).toLocaleDateString():"—";$("seller-stats").innerHTML="<div class=\"seller-stat-box\"><b>"+Number(item.seller_all_listings||0)+"</b><span>Total listings</span></div><div class=\"seller-stat-box\"><b>—</b><span>Successful sales</span></div><div class=\"seller-stat-box\"><b>"+Number(item.seller_total_listings||0)+"</b><span>Approved listings</span></div>";
 $("seller-rating-value").textContent="—";$("seller-rating-note").textContent="No verified reviews yet";
 const presenceText=$("user-presence-text"),presenceDot=$("user-presence")?.querySelector(".presence-dot");
 const renderPresence=async()=>{
   if(!item.seller_id||!presenceText)return;
   const {data:presence,error:presenceError}=await client.from("user_presence").select("last_seen_at").eq("user_id",item.seller_id).maybeSingle();
   if(presenceError||!presence?.last_seen_at){presenceText.textContent="No recent activity";$("user-presence")?.classList.remove("is-online");return;}
   const lastSeen=new Date(presence.last_seen_at),minutes=Math.max(0,Math.floor((Date.now()-lastSeen.getTime())/60000));
   if(Date.now()-lastSeen.getTime()<=120000){presenceText.textContent="Online";$("user-presence")?.classList.add("is-online");}
   else{
     $("user-presence")?.classList.remove("is-online");
     let label;
     if(minutes<60)label=minutes<=1?"1 minute ago":minutes+" minutes ago";
     else if(minutes<1440){const hours=Math.floor(minutes/60);label=hours===1?"1 hour ago":hours+" hours ago";}
     else{const days=Math.floor(minutes/1440);label=days===1?"1 day ago":days+" days ago";}
     presenceText.textContent="Last active "+label;
   }
 };
 renderPresence();
 setInterval(renderPresence,30000);
 loading.hidden=true;content.hidden=false;
}

$("contact-seller").addEventListener("click",async()=>{
 try{if(currentUser.id===currentItem.seller_id)await openSellerInbox();else await openBuyerConversation();}
 catch(error){notice("Could not open messages: "+(error.message||"Please try again."));}
});
$("buy-now").addEventListener("click",()=>{
 const methods=String(currentItem.preferred_payment_methods||"").split(",").map(x=>x.trim()).filter(Boolean);
 $("checkout-title").textContent=currentItem.title||"Digital asset";
 $("checkout-category").textContent=currentItem.subcategory||currentItem.category||"Digital Asset";
 $("checkout-price").textContent=money(currentItem.price_currency,currentItem.asking_price);
 const host=$("checkout-methods");host.innerHTML="";$("checkout-no-methods").hidden=methods.length>0;selectedCheckoutMethod="";
 methods.forEach(method=>{
   const card=document.createElement("label");card.className="checkout-method-option";
   const radio=document.createElement("input");radio.type="radio";radio.name="checkout-method";radio.value=method;radio.setAttribute("aria-label","Select "+method);
   const logo=document.createElement("span");logo.innerHTML=payoutLogo(method);
   const name=document.createElement("span");name.className="checkout-method-name";name.textContent=method;
   const mark=document.createElement("span");mark.className="checkout-method-check";mark.setAttribute("aria-hidden","true");
   card.addEventListener("click",event=>{
     event.preventDefault();
     const wasSelected=radio.checked;
     host.querySelectorAll("input[name='checkout-method']").forEach(input=>{input.checked=false;});
     radio.checked=!wasSelected;
     syncCheckoutSelection();
   });
   card.append(radio,logo.firstElementChild,name,mark);host.append(card);
 });
 syncCheckoutSelection();
 content.classList.add("checkout-active");$("checkout-view").hidden=false;window.scrollTo({top:0,behavior:"smooth"});
});

load();
})();
