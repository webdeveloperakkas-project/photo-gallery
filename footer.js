(function(){
  "use strict";
  async function mountNexaFooter(){
    if(document.querySelector(".nexa-footer"))return;
    const host=document.querySelector(".nexa-main-area");
    if(!host)return;
    try{
      const response=await fetch("footer.html",{cache:"no-cache"});
      if(!response.ok)throw new Error("Footer template unavailable");
      const markup=await response.text();
      const template=document.createElement("template");
      template.innerHTML=markup.trim();
      const footer=template.content.querySelector(".nexa-footer");
      if(!footer)return;
      const year=footer.querySelector("[data-nexa-year]");
      if(year)year.textContent=String(new Date().getFullYear());
      host.appendChild(footer);
    }catch(error){console.warn("Nexa footer could not be loaded:",error.message);}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountNexaFooter,{once:true});
  else mountNexaFooter();
})();