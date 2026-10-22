# Release policy

Production release 3.1.0 was explicitly approved by the owner on 2026-10-22 after preview review and confirmation. Never store the confirmation value or credentials in this repository, browser code or generated images. Future production releases require new explicit owner authorization.

The production target is hada-weather-web-v3 on hada-weather.com. Preserve the existing secret bindings, PUBLIC_BULLETINS namespace, notification switches and cron schedules. Do not send manual test notifications or widen recipients.

The independent refactor-weather-blocks preview keeps its own configuration without production routes, schedules or notification sending. Its configuration must never replace the production configuration. Agricultural calendar tables remain the single source for the daily card.
