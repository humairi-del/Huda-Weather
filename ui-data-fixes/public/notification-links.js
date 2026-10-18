// User-initiated notification links open their corresponding existing view.
(()=>{'use strict';const query=new URLSearchParams(location.search);
 if(query.get('sea')==='tracking')document.querySelector('[data-open="sea"]')?.click();
 if(query.get('map')==='rain')document.getElementById('mapTabRain')?.click();
})();
