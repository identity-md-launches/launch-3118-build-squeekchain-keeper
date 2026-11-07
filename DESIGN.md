# Squeek Keeper design

## Overview

A compact dashboard for Sepolia keepers and people comparing staking scenarios. A small original hamster is the recurring visual idea. Charcoal surfaces, warm amber actions and quiet green comparison results keep the tool readable without a marketing hero. The keeper precedes the optimizer in DOM order. The checkpoint is the one filled primary action; the wallet control is outlined.

Source of truth: `src/styles.css`, followed by `src/components/` and `src/App.tsx`. The rules below describe the final source. The revision was rendered in local Playwright Chromium at 320, 360, 361, 390, 780, 1040 and 1440px; the supplied browser connector could not launch. See `artifacts/validation.md` for evidence and remaining limitations.

## Colors

All values are hex CSS custom properties in `src/styles.css:2`.

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#141513` | Page |
| `--surface` | `#1d1e1a` | Main panels and modal |
| `--surface-raised` | `#252720` | Hover and status surface |
| `--input` | `#151612` | Input/select fill |
| `--line` | `#393c32` | Dividers and chart guides |
| `--control-border` | `#777c68` | Visible interactive boundaries |
| `--text` | `#f1f1e7` | Primary text |
| `--muted` | `#adb1a1` | Supporting text |
| `--accent` | `#edc47a` | Primary button fill |
| `--accent-hover`, `--focus` | `#f5d697` | Button hover, focus outline |
| `--accent-ink` | `#282116` | Text on the amber button |
| `--warm-surface` | `#302a1e` | Checkpoint area |
| `--success` | `#b4cfa0` | Gain and confirmed-state text |
| `--danger` | `#ffb4a5` | Errors and warnings |
| `--chart` | `#c7d899` | Illustrative fee curve |

Computed **declared solid-color** contrast: primary text/surface 14.75:1, muted/surface 7.65:1, muted/checkpoint surface 6.49:1, action ink/accent 9.68:1, focus/surface 11.93:1. These are source-pair calculations, not rendered measurements. Disabled composites and actual native controls remain unmeasured. Status always includes text, not color alone. There is one dark theme.

## Typography

Local `public/fonts/dm-sans-latin.woff2` supplies DM Sans, with Segoe UI and sans-serif fallbacks. The declared variable weight range is 400–600; the interface uses 400 and 600. Chromium's font loading check passed after `document.fonts.ready`. Code uses the system monospace stack only for formulas and method names.

Exactly six size tokens: 13px captions, 14px dense labels/supporting copy, 16px body/inputs, 20px panel headings/brand, 28px section headings/numeric results, 40px desktop headline/issuance. Mobile inputs remain 16px. Desktop h1 becomes 28px below 780px. Body line height is 1.5; h1 1.15; h2 and large figures 1.2; h3 1.3. Heading tracking ranges from −0.015em to −0.035em; ordinary text has natural spacing. Changing numbers use tabular numerals. Addresses and amounts wrap instead of clipping. Paragraphs use pretty wrapping, headings balanced wrapping, and explanatory paragraphs stay within 65ch where applicable.

## Layout

`.container` is at most 1184px including 32px inline padding. The header can grow to 1320px. Shared spacing uses 4, 8, 12, 16, 20, 24, 28 and 32px, with 48–64px between major explanatory groups. Input groups use 8px internally and 20–24px between groups. Layout is ordinary document flow with no sticky overlay.

- Above 1040px: keeper metrics and checkpoint occupy two columns; optimizer position and merge panels are equal columns; exit comparison and chart share a row.
- At 1040px: header and panel padding tighten; the decorative caption disappears.
- At 780px: navigation and intro artwork disappear; keeper/checkpoint and optimizer panels stack. The checkpoint amount and button share a compact row. Exit comparison and chart stack. Inline margins become 20px.
- At 640px: the dialog becomes a full-width bottom sheet, with safe-area bottom padding and constrained viewport height.
- At 540px: inline margins are 16px; panel padding 20px; exit input-source control gets its own row; custom inputs and explanations stack. The brand is compact and the header network label is removed; Sepolia remains explicit in the transaction and wallet flows.
- At 360px and below: the wallet button's decorative icon disappears to leave room for a connected address. The merge illustration gap becomes 8px and each paired hamster becomes 56×58px; together with the overlapping pair, arrow and 108px survivor, the row fits the 248px content width at a 320px viewport (`src/styles.css:290`).

The 390×844px Chromium first screen includes brand, product heading, keeper metrics and Checkpoint; the button spans approximately y=584–632px in the disconnected, unavailable-data state. No horizontal overflow was measured at 320, 360, 361, 390, 780, 1040 or 1440px. Native 200% zoom, RTL and translated-string layouts remain unverified. Grid children use `minmax(0, 1fr)` or `min-width: 0`; critical hashes and quantities have `overflow-wrap: anywhere`.

The optimizer heading leads directly into its panels, without a promotional subtitle. Its comparison is labeled “Compare a merge” (`src/components/Optimizer.tsx:38`). The paper-mode notice and illustrative-input explanation remain next to the calculator. Removing the subtitle moves the panels up 29px at 390px and 1440px without leaving an empty row.

## Elevation & depth

Flat tonal panels, without drop shadows. Dividers communicate grouping; input borders communicate interactivity. The checkpoint uses a warm tonal division in the keeper panel, not a nested floating card. The native dialog's dark backdrop is `#000a` (`#000b` on the phone sheet). There is no gradient text, ticker, grain layer or decorative animation.

## Shapes

Panels use `--radius: 16px`; inputs and buttons use 8px. The modal uses 20px; on mobile only its top corners are rounded. Icons have a common 1.7px rounded stroke. Original mascot curves are filled SVG; branded wallet marks retain their official colors. No critical text is masked by rounded clipping.

## Components

| Source | Pattern and states |
| --- | --- |
| `components/Keeper.tsx` | Settled metrics, availability text, refresh, checkpoint review and transaction status. Unknown, paused, preparing, signing, pending, confirmed, reverted and unconfirmed states have explicit copy. Full hashes remain accessible. |
| `components/Optimizer.tsx` | Native labeled level select and amount/count inputs; inline validation; result definitions; one-pair merge comparison; maximum-level/insufficient-pair states; native details for formulas. |
| `components/ExitFees.tsx` | Same-column now/later comparison, explicit public/custom input source, quiet/bank-run presets, labeled illustrative SVG curve, assumptions and fee explanation. |
| `components/Wallet.tsx` | One header control, named EIP-6963 rows with icons, mobile app links, Coinbase row, short connected address with full address in the dialog, switch/disconnect and recoverable failures. |
| `components/Modal.tsx` | Native `dialog.showModal()`, labeled heading, close control, Escape/backdrop dismissal, scroll lock and restoration of the triggering element. Chromium confirmed focus enters the wallet sheet, Escape closes it and focus returns to Checkpoint. Full focus-trap cycling and screen-reader behavior remain unverified. |
| `components/Icon.tsx` | Decorative `currentColor` stroke SVG, normally 16–20px. Buttons retain visible names or accessible labels. |
| `components/Hamster.tsx` | Original hamster vector; optional wheel frame for intro artwork. Decorative and hidden from accessibility APIs. |
| `src/styles.css` | `.primary`, `.secondary`, `.text-button`, `.icon-button`, `.field`, `.panel`, `.status-badge`, `.paper-label` are the shared styling patterns. |

Controls have a minimum height of 44px, primary actions and fields 48px, and wallet rows 56px. Focus is a 2px perimeter offset by 4px, with a system Highlight fallback in forced colors. Under no-preference motion only, color/background/press transitions last 120ms, with a `.96` press scale. There are no automatic or infinite animations. Error feedback is next to its input or action; power updates and transaction messages use live regions.

## Do's and don'ts

Start new content inside `.container` using the existing semantic tokens and type scale. Use spacing before adding separators. Keep one filled action per active view. Reuse native form and disclosure controls, keep labels visible, and show unavailable data as unknown. Additional explanatory content belongs below the usable tool or in an explicit disclosure.

Preserve full transaction values, the Sepolia chain restriction and the difference between illustrative inputs and public snapshots. Do not turn the mascot into a live-looking meter or use wheel measurements to fill missing settled values. Do not add another type family, card nesting, glow or sticky control to solve ordinary grouping problems.
