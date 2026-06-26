/* Cloudflare Web Analytics — cookieless, баннер согласия не нужен.
   Токен — публичный клиентский id (виден в исходнике любого сайта), поэтому лежит здесь открыто.
   Где взять: dash.cloudflare.com → Analytics & Logs → Web Analytics → Add a site
   (метод JS beacon, переносить DNS НЕ нужно) → скопировать token и вставить ниже. */
(function () {
  var TOKEN = "CF_TOKEN_HERE"; // ← вставь сюда токен из Cloudflare Web Analytics
  if (TOKEN === "CF_TOKEN_HERE") return; // пока токен не задан — ничего не грузим
  var s = document.createElement("script");
  s.defer = true;
  s.src = "https://static.cloudflareinsights.com/beacon.min.js";
  s.setAttribute("data-cf-beacon", '{"token": "' + TOKEN + '"}');
  (document.head || document.documentElement).appendChild(s);
})();
