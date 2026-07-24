---
name: devtools-seo
description: "Проводить технический SEO-аудит живой отрендеренной страницы Chromium через локальный Chrome DevTools MCP. Использовать для indexability, title и metadata, canonical и robots directives, structured data, headings, crawlable links/content, статуса документа, redirects, Lighthouse SEO findings и сравнения desktop/mobile состояний. Не активировать для ranking strategy, keyword research или общей UI-ошибки."
---

# DevTools SEO

Аудировать отрендеренную страницу через MCP-сервер `devtools`. Считать соседний
скилл `devtools` контрактом подключения, навигации, snapshot, Network, Console и
безопасности; не повторять его настройку.

## Область и входные данные

Зафиксировать запрошенный и final URL, публичное или авторизованное состояние,
состояние страницы, desktop/mobile, viewport и scope: одна страница, названный
набор страниц или flow. Не подменять молча недоступную авторизованную цель публичной.

Разделять page-level и site-level аудит. Не утверждать, что одна отрендеренная
страница покрывает site-wide robots, sitemap, crawl paths или internal linking.

## Рабочий процесс

1. Открыть нужное состояние и сделать свежий snapshot. Зафиксировать final URL,
   статус основного документа и наблюдаемую redirect chain.
2. Запустить `lighthouse_audit` с явными device и mode. Использовать `navigation`
   для reload и аудита URL, `snapshot` — для текущего SPA/post-interaction состояния.
3. Изучить failed SEO audits по audit ID, не ограничиваясь category score.
4. Проверить snapshot и при необходимости `evaluate_script`: title, meta
   description, canonical, robots directives, `lang`, headings, link destinations,
   image alternatives и structured data.
5. По Network и Console исследовать document status, redirects, blocked resources,
   rendering failures и различия initial response/client-rendered state.
6. Связать finding с crawlability, indexability, content understanding или
   search-result presentation. При совместном аудите оставить accessibility impact
   скиллу `devtools-accessibility`.

## Правила интерпретации

- Считать Lighthouse источником сигналов, а не окончательным заключением.
- Не трактовать Lighthouse SEO score как прогноз ranking.
- Не утверждать, что поисковая система выберет объявленный canonical.
- Не утверждать, что валидный structured data гарантирует rich result.
- Не считать авторизованное или персонализированное состояние crawler-visible без
  дополнительных доказательств.
- Не переносить одну страницу на весь сайт.
- Непроверенную причину обозначать гипотезой и называть следующую проверку.
- Определять severity по влиянию на scoped page/flow, а не только по score.

## Формат результата

Вернуть:

1. **Scope** — requested/final URL, состояние, device, viewport, Lighthouse mode и
   page/site границы.
2. **Summary** — основные технические SEO-риски без ranking promises.
3. **Findings** — по убыванию `critical`, `high`, `medium`, `low`, `info`.
4. **Evidence** — audit ID, DOM value, directive, response status, redirect,
   request или reproduction step.
5. **Recommendations** — конкретное исправление и способ повторного аудита.
6. **Limitations** — невыполненные site-level проверки, недоступные состояния,
   Lighthouse failure или непроверенный initial response.

Для каждого finding указать наблюдение, search impact, evidence, confidence
(`high`, `medium`, `low`), рекомендацию и проверку. Использовать `critical` только
когда ключевая scoped page или её контент фактически недоступны целевому crawler.

## Ограничения и остановка

При сбое Lighthouse сохранить ручные DOM/Network findings и пометить аудит
частичным. Вернуть частичный отчёт, а не выдуманные результаты, если недоступны
страница, авторизация, initial response или инструменты. Указать выполненные
проверки, точное ограничение и минимальный следующий шаг. Завершать аудит после
фиксации final URL, device/mode, конкретных failed audits, проверенных document
signals и невыполненных site-level проверок.

