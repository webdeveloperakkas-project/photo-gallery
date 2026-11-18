(function(){
  "use strict";
  async function mountNexaFooter(){
    if(document.querySelector(".site-footer"))return;
    const host=document.querySelector(".nexa-main-area")||document.body;
    if(!host)return;
    try{
      // Load the single shared footer fragment.
      const response=await fetch("footer.html",{cache:"no-cache"});
      if(!response.ok)throw new Error("Shared footer source unavailable");
      const html=await response.text();
      const parsed=new DOMParser().parseFromString(html,"text/html");
      const source=parsed.querySelector("footer.site-footer");
      if(!source)throw new Error("Shared footer markup was not found");
      const footer=document.importNode(source,true);
      const year=footer.querySelector("[data-nexa-year],#year");
      if(year)year.textContent=String(new Date().getFullYear());
      host.appendChild(footer);
    }catch(error){console.warn("Nexa footer could not be loaded:",error.message);}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountNexaFooter,{once:true});
  else mountNexaFooter();
})();