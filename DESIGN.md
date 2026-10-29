---
name: "طقس هدى وما جاورها"
description: "Calm Arabic night almanac; isolated preview with partial desktop verification"
colors:
  bg: "#0b1119"
  card: "#141e2a"
  raised: "#1c2937"
  line: "#334354"
  muted: "#b6c1cd"
  blue: "#a8d2ed"
  cyan: "#b9d7ce"
  white: "#f4f2eb"
  gold: "#dcc39a"
  alert-bg: "#352b20"
  alert-text: "#fff1da"
typography:
  display:
    fontFamily: "Tajawal, Tahoma, Arial, sans-serif"
    fontSize: "108px"
    fontWeight: 500
    lineHeight: 1.12
    letterSpacing: "-3px"
  headline:
    fontFamily: "Tajawal, Tahoma, Arial, sans-serif"
    fontSize: "clamp(20px, 2.2vw, 28px)"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "0"
  title:
    fontFamily: "Tajawal, Tahoma, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.6
    letterSpacing: "0"
  body:
    fontFamily: "Tajawal, Tahoma, Arial, sans-serif"
    fontSize: "16px"
    lineHeight: 1.8
  label:
    fontFamily: "Tajawal, Tahoma, Arial, sans-serif"
    fontSize: "14px"
rounded:
  card: "16px"
  control: "9px"
  nav: "8px"
  media: "12px"
spacing:
  gap: "20px"
  gap-mobile: "16px"
  card-pad: "28px"
  gutter: "28px"
  gutter-mobile: "16px"
components:
  button-primary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.bg}"
    rounded: "{rounded.control}"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.white}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-pad}"
  nav-active:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.white}"
    rounded: "{rounded.nav}"
---

# Design System: طقس هدى وما جاورها

## Overview

**Creative North Star: "Hada night almanac"**

This documents the calm luxury Arabic redesign deployed to an isolated preview with explicit authorization on 2026-10-29. Actual browser evidence is limited to a 1363 × 988 viewport; mobile verification and visual approval remain pending. The durable identity is Arabic, local, readable on a phone, and economical on weak connections. The existing logo and Albaqira sponsor image remain identity assets.

The implementation adapts a flat dark reference while intentionally retaining the brand's navy palette and Tajawal. The reference's true-black colors and Inter font are not the implemented system. The metaphor and descriptive language here are session direction, not newly confirmed user preferences.

**Key Characteristics:**

- Quiet navy tonal planes and restrained warm highlights.
- Arabic-first reading order with stable numerical alignment.
- Two independent agricultural calendars: Al-Tuhaybi (الطهيبي) on the right, Qashar (قشعر) on the left.
- Visible source, missing-data and uncertainty language.

## Colors

### Primary

Gold marks weather icons, calendar names, the clock and focus. Blue marks rain values and source links. These are descriptive roles; use the exact frontmatter values rather than the generic reference palette.

### Neutral

The background, card and raised tokens form three navy planes. White is the main text color; muted supports dates, labels and sources; line separates information within a plane. Cyan remains a compatibility token used by incumbent styles. An active alert uses its own warm background and text pair.

Measured contrast for three actual pairs was muted-on-card (9.21:1), main-text-on-card (15.01:1) and primary text/background (16.91:1). These measurements do not establish contrast for every element or state.

**The Data Truth Rule.** Do not use a reassuring appearance to erase partial, stale or missing data.

## Typography

Tajawal is the shared Arabic display and body family with Tahoma, Arial and sans-serif fallbacks. The override self-hosts Regular (400) and Bold (700), both registered with `font-display: swap`. CSS requests weights 400, 500, 600 and 700; intermediate weights may be synthesized. Desktop screenshots exist; a separate font-loading audit and mobile typography review are not recorded.

The frontmatter records desktop roles. Temperature becomes (84px), tracking (-2px), below the mobile breakpoint. Brand title becomes (21px), then (19px) below (360px). Secondary text is generally (13–15px); sources are (12–13px) on phones. Calendar names use (34px) desktop and (28px) mobile. Main numeric weather, star counts and prayer values use tabular numerals. Temperature retains an LTR number run inside RTL text.

**The Arabic Readability Rule.** Keep Arabic letter spacing neutral except the isolated temperature number; do not apply Latin uppercase or wide tracking conventions.

## Layout

The HTML root is `lang="ar" dir="rtl"`. The centered wrapper has a maximum outer width of (1180px), border-box sizing, and horizontal padding from the gutter tokens. Main content is a single vertical flow. Header is a two-column grid; navigation is a horizontally scrollable row with nonshrinking links. Logical borders and padding preserve RTL behavior.

At `max-width: 760px`, the header becomes one column, main gap and gutters use mobile tokens, card padding becomes (22px 20px), weather statistics change from four columns to two, and prayers change from six columns to three. The star pair remains two equal columns, explicitly RTL, with a (10px) phone gap and (16px) default gap. Do not merge their calculations or swap their placement.

The weekly forecast changes from seven columns to horizontal scroll with (114px) items. Hourly items are horizontally scrollable with a (105px) mobile minimum, (116px) default. Map height changes from (430px) to (360px). Card actions stack to full width on phones. At `max-width: 359px`, gutters become (12px), star internals tighten, and map actions become a grid. At `min-width: 900px`, the main weather text uses an internal grid. Thus a (768px) viewport uses the default rules and needs its own review.

These responsive rules come from source. Actual browser measurement was limited to 1363 × 988; requested window sizes were ignored and the browser surface supplied no resize API. Reviews at 360, 390 and 768 remain pending. Desktop hourly scrolling was exercised successfully (scrollLeft reached -1065).

## Elevation & Depth

Cards use tonal layering with no shadow or border. Their inner divisions use the line token. The modal box alone has `0 16px 60px #0005`; modal and card-zoom backdrops are dark translucent fills without blur. The override removes the old hero gradients and icon glow. Legacy inline CSS remains in index.html, so static detectors can still report old effects. Desktop render evidence now exists, but the detector has not been certified clean and its findings must not be presented as resolved across all viewports.

## Shapes

Card curvature uses the frontmatter radius. Controls predominantly use the control radius; navigation uses the nav radius, media and maps use the media radius. Installation controls use (10px). Cards share one plane rather than nested bordered mini-cards. Forecast columns use fine inline rules.

## Components

Buttons use a pale inverted primary surface or a raised navy secondary surface. Main actions are typically at least (44–48px) high; star table buttons are (46px). The alert details summary currently has a smaller (36px) minimum and needs a touch review. Focus uses a (3px) gold outline with (4px) offset. Disabled buttons use opacity (.5) and a not-allowed cursor. Hover behavior is only specified where source provides it; do not infer a new primary hover color.

Navigation uses muted labels, a raised first item and pale active text. Its first-item styling is positional, not verified scroll tracking. Hover uses the card plane. Cards use source padding from the frontmatter; star cards and hero have their own responsive padding.

The paired star cards retain separate table/detail dialogs. Daily card and earthquake sections use native disclosure controls. Daily canvas remains (1080 × 1920); zoom creates a native dialog with an image from the canvas. Desktop browser checks passed for both 28-star tables, detail opening, closing, Escape and focus return after a WeakMap correction. Card zoom, closing and focus return passed; a PNG (1080 × 1920) was downloaded. Mobile fit and remaining input paths still need review. Star-heading emoji were replaced with inline SVG in the current source after reviewer feedback; capture the final version at missing widths.

Alerts preserve engine results. Dust appears only when a qualifying event exists, as one concise item with estimated timing, visibility and limited confidence. Missing-data details preserve disclosure state and focus when refreshed. The observed dust state was no_signal, with no independent dust section. Partial, stale, failed, expiry and changed-response behavior has simulation coverage within the 103-test suite, not exhaustive browser coverage. The existing alerts-view button was wired and tested to close the installation modal and focus weatherAlerts. Activation stayed disabled in simulate mode; no live notification was sent.

Map content stays on demand. The earthquake map rendered a USGS event of magnitude 4.9 dated 2026-10-24. Cloud imagery did not render: WebGL was unsupported in the preview and failed on Windy itself. The fallback message remains truthful; imagery capture time is unverified. Weather and earthquakes continued working. Existing sponsor content remains unaltered. Source and status text are part of the visible component, not optional decoration. The 15-minute refresh has source/simulation coverage; a full automatic fetch cycle was not observed.

Transitions use (.16s ease) for background, color and transform; pressed buttons/summaries shift (1px). Reduced-motion disables transitions/animations and smooth scrolling.

## Do's and Don'ts

### Do:

- **Do** preserve Arabic labels, logical RTL spacing and separate star calendars.
- **Do** keep loading, partial, missing and outdated states distinguishable.
- **Do** retain visible focus and respect reduced motion.
- **Do** verify the final cascade and phone interactions before calling this design complete.

### Don't:

- **Don't** replace retained brand navy and Tajawal with the unadapted reference preset.
- **Don't** add atmospheric images, glow or decorative remote assets.
- **Don't** expand dust into a standalone promotional section or imply calibrated certainty.
- **Don't** report screenshots, deployment or visual approval that did not occur.
