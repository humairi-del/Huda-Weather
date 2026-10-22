# Preview-only review

This branch is refactor-weather-blocks. Its only deployment target is hada-weather-blocks-preview, without custom routes, cron schedules or notification sending. The asset build rejects settings that change these restrictions. There is no deployment or owner-password endpoint in the public site. Secrets must never be embedded in HTML, JavaScript, browser storage, this repository or downloaded images.

A production release requires the owner's separate explicit approval and verification of the owner's confirmation code through an authenticated server or secure approval flow. No code has been received or invented in this update. A client-side comparison or localStorage switch must never authorize publishing. Existing production services and morning-notification settings must remain unchanged while reviewing this branch.

The calendar consumes HadaStarCalendar directly from the existing page. Annual star-date updates therefore have one source. The morning notification formatter, sender identity, enable switches, recipients, and 07:00 Yemen schedule are preserved; no notification is sent by viewing this preview.
