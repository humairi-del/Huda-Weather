/* Conservative report interpretation. Only current forecast sections, never climatology/verification. */
export function analyseReports(daily='',extended=''){
 const d=daily.replace(/\s+/g,' '),e=extended.replace(/\s+/g,' ');
 const arab=d.split(/ARABIAN SEA\s*:/i)[1]?.split(/Remarks|Cloud distribution/i)[0]||'';
 const operational=e.split(/Operational extended range forecast for the next two weeks\s*:/i)[1]?.split(/Verification of forecast/i)[0]||'';
 const sentences=operational.split(/\([a-z]\)/i);
 const relevant=sentences.filter(s=>/Arabian Sea|\bAS\b|Gulf of Aden/i.test(s));
 const active=/\b(?:a|the)\s+(?:(?:very|extremely|severe|super)\s+)*(?:cyclonic storm|deep depression|depression)\b[^.]{0,140}\b(?:lay|lies|centred|centered|located|moved)\b/i.test(arab);
 const storm=active&&/cyclonic storm/i.test(arab);
 const low=relevant.some(s=>/low[ -]pressure area/i.test(s));
 const circulation=/cyclonic circulation/i.test(arab)||relevant.some(s=>/cyclonic circulation/i.test(s));
 const nil=!!arab&&/NIL\s+NIL\s+NIL\s+NIL\s+NIL\s+NIL\s+NIL/.test(arab);
 const disagreement=/large variation|large uncertainty|significant divergence/i.test(e.split(/Operational extended range forecast/i)[0]||'');
 let state=active?(storm?'إعصار مداري قيد المتابعة':'منخفض مداري قيد المتابعة'):low?'احتمال تشكّل منطقة ضغط منخفض':circulation?'دوران جوي قيد المتابعة':'لم يتضح التصنيف من النشرة';
 let detail=active?'تُتابع الحالة وفق أحدث نشرة ومسار رسمي.':low?'تشير نشرة الأسبوعين إلى احتمال تشكّل منطقة ضغط منخفض في بحر العرب؛ لم يُثبت تطورها إلى إعصار.':circulation?'تذكر النشرة دورانًا جويًا في بحر العرب؛ لا يكفي ذلك لتسميته منخفضًا مداريًا أو إعصارًا.':'افتح النشرة للاطلاع على تفاصيل الحالة.';
 // A circulation's destination must never become the separate low's track.
 const adenCirculation=relevant.some(s=>/circulation/i.test(s)&&!/low[ -]pressure area/i.test(s)&&/Gulf of Aden/i.test(s)&&/\b(?:move|moves|moving|westwards|westward)\b/i.test(s));
 const direction=low&&!active?'مسار المنخفض المحتمل: لم يتحدد من البيانات المقروءة؛ لا يُنسب إليه اتجاه الدوران الجوي الآخر.':'المسار لم يتحدد من البيانات المقروءة؛ راجع الخريطة الرسمية.';
 const circulationNote=!active&&adenCirculation?(low?'بشكل منفصل، تذكر النشرة دورانًا جويًا آخر يتحرك نحو خليج عدن؛ هذا ليس مسار المنخفض المحتمل.':'تذكر النشرة حركة دوران جوي نحو خليج عدن؛ هذا ليس مسار إعصار مؤكد.'):null;
 return {state,detail,direction,circulationNote,active,storm,low,circulation,nil,disagreement,evidence:relevant.join(' ').trim(),impact:'أمطار شبوة وهدى: التأثير والتوقيت لم يتأكدا بعد.',nearTerm:nil?'النشرة اليومية لا تتوقع تشكّل منخفض مداري خلال ٧ أيام؛ مؤشرات الأسبوع الثاني أولية.':null};
}
