(function(){
"use strict";
let policyCache=null,modal=null,lastFocus=null;
async function loadPolicies(){
 if(policyCache)return policyCache;
 const response=await fetch("policies.html",{cache:"no-cache"});
 if(!response.ok)throw new Error("Policies could not be loaded");
 const html=await response.text();
 const doc=new DOMParser().parseFromString(html,"text/html");
 policyCache=doc.querySelector("main.policy-page");
 if(!policyCache)throw new Error("Policy content was not found");
 return policyCache;
}
function closePolicyModal(){
 if(!modal)return;
 modal.remove();modal=null;document.body.classList.remove("nexa-policy-open");
 if(lastFocus&&typeof lastFocus.focus==="function")lastFocus.focus();
}
async function openPolicyModal(sectionId,trigger){
 lastFocus=trigger;
 try{
  const source=await loadPolicies();
  if(modal)closePolicyModal();
  modal=document.createElement("div");modal.className="nexa-policy-modal";modal.setAttribute("role","presentation");
  const dialog=document.createElement("section");dialog.className="nexa-policy-dialog";dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");dialog.setAttribute("aria-label","Nexa policies");
  const top=document.createElement("header");top.className="nexa-policy-modal-head";
  const heading=document.createElement("div");heading.innerHTML='<span> NEXA · TRUST & TRANSPARENCY</span><h2>Policies &amp; guidelines</h2>';
  const close=document.createElement("button");close.type="button";close.className="nexa-policy-close";close.setAttribute("aria-label","Close policies");close.innerHTML="&times;";
  top.append(heading,close);
  const body=document.createElement("div");body.className="nexa-policy-modal-body";
  const content=source.cloneNode(true);content.classList.add("nexa-policy-modal-content");body.appendChild(content);
  dialog.append(top,body);modal.appendChild(dialog);document.body.appendChild(modal);document.body.classList.add("nexa-policy-open");
  close.addEventListener("click",closePolicyModal);
  modal.addEventListener("click",e=>{if(e.target===modal)closePolicyModal();});
  const target=sectionId&&content.querySelector("#"+CSS.escape(sectionId));
  if(target)requestAnimationFrame(()=>{body.scrollTop=Math.max(0,target.offsetTop-content.offsetTop-8);});
  else body.scrollTop=0;
  close.focus();
 }catch(error){console.warn("Nexa policy modal:",error.message);window.location.href="policies.html"+(sectionId?"#"+encodeURIComponent(sectionId):"");}
}
document.addEventListener("click",event=>{
 const link=event.target.closest('a[href*="policies.html"]');
 if(!link)return;
 const url=new URL(link.href,window.location.href);
 if(url.origin!==window.location.origin)return;
 event.preventDefault();openPolicyModal(decodeURIComponent(url.hash.slice(1)),link);
});
document.addEventListener("keydown",event=>{
 if(!modal)return;
 if(event.key==="Escape"){event.preventDefault();closePolicyModal();return;}
 if(event.key==="Tab"){
  const items=modal.querySelectorAll("button,[href],input,select,textarea,[tabindex]:not([tabindex='-1'])");
  if(!items.length)return;
  const first=items[0],last=items[items.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }
});
async function mountNexaFooter(){
 if(document.querySelector(".site-footer"))return;
 const host=document.querySelector(".nexa-main-area")||document.body;if(!host)return;
 try{
  const response=await fetch("footer.html",{cache:"no-cache"});if(!response.ok)throw new Error("Shared footer source unavailable");
  const parsed=new DOMParser().parseFromString(await response.text(),"text/html");
  const source=parsed.querySelector("footer.site-footer");if(!source)throw new Error("Shared footer markup was not found");
  const footer=document.importNode(source,true);const year=footer.querySelector("[data-nexa-year],#year");
  if(year)year.textContent=String(new Date().getFullYear());host.appendChild(footer);
 }catch(error){console.warn("Nexa footer could not be loaded:",error.message);}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountNexaFooter,{once:true});else mountNexaFooter();
})();