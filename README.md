# Обычный японский словарь — сайт

Статический сайт-визитка приложения **«Обычный японский словарь»** (普通の辞書) — японско-русского словаря,
плюс публичный трекер обращений (GitHub Issues).

Живёт на **GitHub Pages** по адресу **https://dict.notononoto.com**.

Исходники приложения — в отдельном приватном репозитории; здесь только сайт и issue-трекер.

## Структура

Трёхъязычный сайт: `/ru/`, `/en/`, `/ja/`; корень — распределитель.

```
index.html        — КОРЕНЬ: авто-определение языка (JS → /ru/, /en/ или /ja/) + ручной выбор (no-JS)
styles.css        — общие стили (без сборки)
analytics.js      — Cloudflare Web Analytics (cookieless); токен в одном месте
assets/           — иконка, og-картинка (общие для всех языков)
screenshots/      — скриншоты для лендинга
CNAME .nojekyll   — для GitHub Pages
.github/ISSUE_TEMPLATE/ — баг / идея + редирект на Вародай/JMdict для ошибок контента
STORE-DATA.md     — шпаргалка для форм Data Safety / App Privacy (не публикуется)

ru/   index.html · privacy.html (хаб) · privacy-{play,appstore,rustore}.html · support.html · format.html
en/   index.html · privacy.html (хаб) · privacy-{play,appstore}.html · support.html · format.html
ja/   index.html · privacy.html (хаб) · privacy-{play,appstore}.html · support.html · format.html
```

- Имя: RU/EN — полное **«Обычный японский словарь» / Ordinary Japanese Dictionary**; JA — **普通の辞書** + дескриптор **和露・和英辞典** (НЕ 普通の日本語辞書 — для японца звучит как толковый словарь японского). В шапке-логотипе везде короткое имя.
- EN/JA отличаются: позиционирование (EN Japanese–English, JA 和露・和英), политики RuStore нет (РФ-канал). Источники те же — Вародай в сборке есть, поэтому кредитнут во всех языках.
- Ассеты ссылаются абсолютно (`/styles.css`, `/assets/…`); внутренние ссылки — относительные внутри своего языка; `hreflang` + переключатель языка (две другие версии) в шапке.

Чистый HTML + CSS, никакой сборки. Правите файл — он сразу публикуется.

## Деплой на GitHub Pages (один раз)

1. Создать **публичный** репозиторий `dancing-elf/ordinary-jp-dict-site` на GitHub и запушить эту папку
   (см. ниже).
2. **Settings → Pages**: Source = «Deploy from a branch», branch = `main`, папка = `/ (root)`.
3. **Settings → Pages → Custom domain** = `dict.notononoto.com` → Save. Файл `CNAME` уже в репо.
4. В DNS домена `notononoto.com` добавить запись:
   ```
   CNAME   dict   →   dancing-elf.github.io.
   ```
   (если DNS на Cloudflare — только «DNS only» / серое облако, не проксировать).
5. Дождаться зелёной галки проверки домена → включить **Enforce HTTPS**
   (сертификат Let's Encrypt выпустится автоматически, иногда до часа).

Поддомен не требует apex A-записей и переноса nameserver'ов.

## Перед публикацией — проверить

- [ ] заменить заглушки ссылок на магазины в `index.html` (блок `.stores`);
- [ ] положить скриншоты в `screenshots/` и иконку/og в `assets/` (см. `screenshots/README.md`);
- [ ] **сверить §4 каждой `privacy-*.html` с фактической сборкой соответствующего стора** — это
      юридически значимые страницы; добавить/убрать сервисы по факту релиза;
- [ ] вписать в консоль каждого стора СВОЙ URL политики (таблица в `STORE-DATA.md`);
- [ ] заполнить формы Data Safety (Play) и App Privacy (Apple) по `STORE-DATA.md`;
- [ ] проверить дату «действует с …» во всех `privacy-*.html`;
- [ ] контакт в политиках = `notononoto@gmail.com` (баг-репорты идут только через GitHub Issues).
- [ ] вставить токен Cloudflare Web Analytics в `analytics.js` (dash.cloudflare.com → Web Analytics →
      Add a site, метод JS beacon, DNS переносить не нужно). Cookieless → баннер согласия не нужен.

URL политики по магазинам (язык = язык листинга):

| Листинг | URL |
|---|---|
| Google Play (RU / EN / JA) | `.../ru/privacy-play.html` · `.../en/privacy-play.html` · `.../ja/privacy-play.html` |
| App Store (RU / EN / JA) | `.../ru/privacy-appstore.html` · `.../en/privacy-appstore.html` · `.../ja/privacy-appstore.html` |
| RuStore | `https://dict.notononoto.com/ru/privacy-rustore.html` |

(база — `https://dict.notononoto.com`)

(Play даёт ОДНО поле privacy-URL на приложение → бери язык основного листинга; на странице есть переключатель. Apple позволяет локализованный privacy-URL по локали.)

## Первый пуш

```sh
cd ~/ordinary-dict-site
git init
git add .
git commit -m "site: лендинг, политика конфиденциальности, поддержка"
git branch -M main
git remote add origin git@github.com:dancing-elf/ordinary-jp-dict-site.git
git push -u origin main
```
