(function(){
  "use strict";
  async function mountNexaFooter(){
    if(document.querySelector(".site-footer"))return;
    const host=document.querySelector(".nexa-main-area")||document.body;
    if(!host)return;
    try{
      const response=await fetch("footer.html",{cache:"no-cache"});
      if(!response.ok)throw new Error("Footer template unavailable");
      const template=document.createElement("template");
      template.innerHTML=(await response.text()).trim();
      const footer=template.content.querySelector(".site-footer");
      if(!footer)return;
      const year=footer.querySelector("[data-nexa-year]");
      if(year)year.textContent=String(new Date().getFullYear());
      host.appendChild(footer);
    }catch(error){console.warn("Nexa footer could not be loaded:",error.message);}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountNexaFooter,{once:true});
  else mountNexaFooter();
})();