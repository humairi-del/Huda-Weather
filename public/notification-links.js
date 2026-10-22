// User-initiated notification links open their corresponding existing view.
(()=>{'use strict';const query=new URLSearchParams(location.search);

 if(query.get('map')==='rain')document.getElementById('weatherMapHub')?.scrollIntoView({behavior:'smooth'});
})();
