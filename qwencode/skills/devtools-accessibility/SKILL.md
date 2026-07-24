---
name: devtools-accessibility
description: "Проводить accessibility-аудит живой отрендеренной страницы Chromium или пользовательского flow через локальный Chrome DevTools MCP. Использовать для accessible names и semantics, accessibility tree, keyboard navigation, focus order/visibility, keyboard traps, ARIA, forms/errors, dialogs/dynamic widgets, contrast signals, zoom/reflow и Lighthouse accessibility findings. Не активировать для общего визуального обзора без вопроса о доступности."
---

# DevTools Accessibility

Аудировать текущую страницу или flow через MCP-сервер `devtools`. Считать соседний
скилл `devtools` контрактом подключения, управления страницей, snapshot, screenshot,
Console, Network и безопасности; не дублировать его настройку.

## Область и входные данные

Зафиксировать страницу и состояние, ключевой flow, desktop/mobile, viewport,
авторизацию и состояния компонентов в scope. Определить, охватывает ли запрос одну
страницу, flow или названные состояния: default, hover, focus, error, disabled,
modal, high contrast. Выбирать безопасные значения, только если они не меняют смысл
теста, и указывать их в отчёте.

## Рабочий процесс

1. Открыть нужное состояние и сделать свежий snapshot с accessibility information,
   а при важном визуальном состоянии — screenshot.
2. Запустить `lighthouse_audit` как автоматический baseline и изучить конкретные
   accessibility audits вместо одного category score.
3. Проверить structure, roles, states и accessible names интерактивных и контентных
   элементов по snapshot/AX evidence.
4. Пройти ключевой flow только keyboard input: проверить достижимость, порядок,
   видимый focus, активацию, выход из overlays, восстановление focus и отсутствие
   keyboard trap.
5. Проверить forms: labels, instructions, required/invalid states и программную
   связь ошибок с controls.
6. Проверить dialogs, menus, tabs, disclosures, toasts и live regions во всех
   scoped states.
7. Проверить доступные инструментам visual conditions: contrast findings,
   zoom/reflow, viewport/orientation, focus visibility и потерю/перекрытие контента.
8. Использовать `evaluate_script`, emulation, Console и Network только для
   подтверждения semantics/state или ошибки, блокирующей доступное поведение.

## Правила интерпретации

- Не заявлять полное WCAG conformance по автоматическому аудиту.
- Не считать правильную DOM semantics доказательством доступного поведения custom
  control.
- Предпочитать native semantics; ARIA сама по себе не исправляет поведение.
- Не заявлять screen-reader testing без реального screen reader. При AX evidence
  писать «проверено по accessibility tree и semantics».
- Screenshot не доказывает корректную работу screen reader.
- Оценивать contrast и focus в конкретном состоянии; не переносить результат на
  hover, error, disabled, high-contrast и другие состояния вне scope.
- Описывать затронутую группу пользователей и функциональное влияние, а не только
  нарушенный attribute/audit.

## Формат результата

Вернуть:

1. **Scope** — страница, flow, viewport/device, auth и component states.
2. **Summary** — главные барьеры и проверенные пути без conformance claim.
3. **Findings** — по убыванию `critical`, `high`, `medium`, `low`, `info`.
4. **Evidence** — audit ID, element/state, role/name, focus sequence, screenshot,
   AX/DOM observation и reproduction steps.
5. **Recommendations** — конкретное semantic/behavioral исправление и повторный тест.
6. **Limitations** — непроверенные assistive technology, states, pages или сбои.

Для каждого finding указать наблюдение, затронутых пользователей и влияние,
evidence, confidence (`high`, `medium`, `low`), рекомендацию и проверку. Использовать
`critical` только когда ключевой scoped flow или контент фактически недоступны
затронутым пользователям.

## Ограничения и остановка

При сбое Lighthouse сохранить ручные keyboard, AX, DOM и visual findings и
пометить аудит частичным. Вернуть частичный отчёт, если целевое состояние
недостижимо, отсутствует авторизация, взаимодействие заблокировано или нет нужных
инструментов. Указать выполненные проверки, точное ограничение и минимальный
следующий шаг. Завершать аудит после автоматического baseline и ручного ключевого
flow с воспроизводимым evidence для каждого существенного finding.

