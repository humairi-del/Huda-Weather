(()=>{'use strict';
const root=()=>document.getElementById('seaLiveBulletin');
function render(){const box=root();if(box)box.replaceChildren(window.HadaOfficialCyclone.renderCard());}
function isOpen(){return !!root()?.isConnected&&document.getElementById('infoModal')?.style.display==='block';}
function mount(box){const content=document.createElement('div');content.id='seaLiveBulletin';content.setAttribute('aria-live','polite');box.replaceChildren(content);render();window.HadaOfficialCyclone.refresh();}
window.addEventListener('hada:official-cyclone',()=>{if(isOpen())render();});
window.HadaSeaBulletin={mount,render,isOpen};
})();
