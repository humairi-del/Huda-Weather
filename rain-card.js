/* UI-only hourly rain card. Open-Meteo hourly rain covers the preceding hour. */
(function () {
  'use strict';
  const HOUR = 3600000;
  let latest = null;
  const valid = (v, max = Infinity) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
  function timeMs(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return NaN;
    // API timezone is Asia/Aden, UTC+03:00; never use the phone's timezone.
    return Date.parse(value + '+03:00');
  }
  function select(data, now) {
    const h = data && data.hourly;
    if (!h || !Array.isArray(h.time)) return { state: 'missing' };
    const dates = data.daily && data.daily.time;
    const allowed = Array.isArray(dates) ? new Set(dates.slice(0, 7)) : null;
    let best = null, available = 0, missing = 0;
    h.time.forEach((time, i) => {
      const end = timeMs(time), start = end - HOUR;
      if (!Number.isFinite(end) || end <= now || start >= now + 7 * 24 * HOUR) return;
      // The hour ending at midnight belongs to the preceding forecast day.
      const day = new Date(start + 3 * HOUR).toISOString().slice(0, 10);
      if (allowed && !allowed.has(day)) return;
      const chance = h.precipitation_probability && h.precipitation_probability[i];
      if (!valid(chance, 100)) { missing++; return; }
      available++;
      const amount = h.precipitation && h.precipitation[i];
      if (!best || chance > best.chance || (chance === best.chance && end < best.end)) {
        best = { start, end, chance, amount: valid(amount) ? amount : null };
      }
    });
    if (!available) return { state: 'missing' };
    if (!best.chance) return { state: missing ? 'missing' : 'none' };
    return { state: 'chance', ...best, incomplete: missing > 0 };
  }
  const date = ms => new Intl.DateTimeFormat('ar-YE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Aden' }).format(ms);
  const clock = ms => new Intl.DateTimeFormat('ar-YE', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Aden' }).format(ms);
  function render(data) {
    if (data) latest = data;
    const main = document.getElementById('bestRain'), detail = document.getElementById('bestRainDetails');
    if (!main || !detail) return;
    const title = main.parentElement.querySelector('.card-title');
    if (title) title.textContent = '🌧️ أفضل فرصة مطر قادمة على هدى';
    const now = Date.now(), result = select(latest, now);
    detail.replaceChildren();
    if (result.state !== 'chance') {
      main.textContent = result.state === 'none' ? 'لا تظهر فرصة مطر واضحة في التوقعات القادمة' : 'بيانات فرصة المطر القادمة غير متاحة';
      detail.textContent = 'توقع قابل للتغيّر';
      return;
    }
    main.textContent = `${date(result.start)} • ${Math.round(result.chance)}٪`;
    const period = document.createElement('div');
    const sameDay = date(result.start) === date(result.end);
    period.textContent = `${result.start < now ? 'الفترة جارية' : 'الفترة القادمة'}: من ${clock(result.start)} إلى ${sameDay ? '' : date(result.end) + '، '}${clock(result.end)}`;
    const amount = document.createElement('div');
    amount.textContent = result.amount === null ? 'كمية المطر المتوقعة غير متاحة' : `كمية متوقعة للساعة كاملة: ${result.amount.toFixed(1)} ملم`;
    const note = document.createElement('div');
    note.className = 'source-note';
    note.textContent = 'توقع قابل للتغيّر' + (result.start < now ? ' • كمية الساعة تشمل الجزء الذي مضى منها' : '') + (result.incomplete ? ' • بعض الفترات غير متاحة؛ المقارنة حسب البيانات المتوفرة' : '');
    detail.append(period, amount, note);
  }
  window.showBestRain = render;
  function initial() {
    render(window.weatherData || (typeof weatherData !== 'undefined' ? weatherData : null));
    setInterval(() => {
      const main = document.getElementById('bestRain');
      if (main && main.querySelector('.error')) {
        const detail = document.getElementById('bestRainDetails');
        if (detail) detail.replaceChildren();
        return;
      }
      render();
    }, 60000);
    document.addEventListener('visibilitychange', () => {
      const main = document.getElementById('bestRain');
      if (!document.hidden && main && !main.querySelector('.error')) render();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initial, { once: true });
  else initial();
})();
