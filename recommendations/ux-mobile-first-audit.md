# Quote Automator Front-End UX Audit (Mobile-First)

## Scope reviewed
- `backup/html-reference.html` (Webflow Embed HTML backup).
- `webflow/css.css` (Head-injected stylesheet).
- `webflow/javascript.js` (Head/Footer-injected JS logic).

## Who this is designed for
Tradies on the go (phone first), then laptop/desktop as secondary context.

---

## Priority UX recommendations

### P0 (Ship first)
1. **Increase tap target sizes and text legibility on mobile**
   - Several controls are currently very small (`10px`–`12px` buttons/text in critical areas like edit/delete/actions).
   - Set a global minimum tap target of `44px` height for interactive controls.
   - Raise minimum body/support text to `14px` and key labels/buttons to `15px`–`16px`.

2. **Convert template action rows to a stacked mobile layout**
   - `template-item` actions are inline and compact; on smaller screens this creates dense UI and tap errors.
   - On mobile, stack action buttons vertically with full-width `View`, `Edit`, and `Delete` controls.

3. **Make sticky primary action available while scrolling forms**
   - “Generate Quote” is at the form bottom; on long form content this causes extra scrolling and drop-off.
   - Add a sticky action bar at viewport bottom on mobile with primary action + progress state.

4. **Fix file upload interaction consistency**
   - UI says “drag and drop,” but mobile users mostly need strong “tap to select” flow.
   - Add dedicated “Choose Files” button styling and selected-file chips with larger remove targets.
   - Re-bind `change` listeners after dynamic file input replacement (currently easy to break after clear/reset).

5. **Improve modal usability for one-handed use**
   - Large modals with dense forms can exceed comfortable thumb zones.
   - Use bottom-sheet modal behavior on mobile (`align-items: flex-end`, full-width, rounded top corners, max-height + internal scroll).

### P1 (Next sprint)
6. **Replace emoji-only cues with explicit labels/icons**
   - Emoji are quick but can reduce scannability and look inconsistent across devices.
   - Keep icons, but pair with short text labels and consistent icon style.

7. **Add clear completion states + progress checkpoints**
   - Generating quote and refinement tasks are asynchronous.
   - Add “Step 1/3, Step 2/3…” status indicator and persistent success panel with clear next action.

8. **Improve empty/error states for field users**
   - Keep support phone/email, but include a one-tap “Retry” and “Copy error ID” option.
   - Add offline/network hint when fetch fails.

9. **Accessibility + keyboard upgrades**
   - Add `aria-live="polite"` for feedback regions.
   - Ensure modal trap focus + Escape close.
   - Add visible `:focus-visible` styles for keyboard/laptop use.

### P2 (Optimization)
10. **Reduce cognitive load with progressive disclosure**
    - Move advanced settings (manual placeholder config) behind “Advanced” toggles by default.

11. **Persist draft inputs locally**
    - Save in-progress quote form fields/files metadata to `localStorage` session key (non-sensitive only).

12. **Add fast repeat workflow**
    - “Use last template + last instruction set” quick-start chip for repeat jobs.

---

## Quick implementation plan

### Sprint A (1–2 days)
- Add mobile typography and touch target overrides.
- Stack template action buttons on mobile.
- Introduce sticky mobile submit area.
- Bottom-sheet modal behavior for `#refine-modal` and register/delete flows.

### Sprint B (2–3 days)
- Add accessibility attributes and focus handling.
- Add task progress component for long-running quote generation.
- Improve upload experience and listener rebinding robustness.

### Sprint C (future)
- Draft persistence, quick-start presets, and onboarding polish.

---

## Included in this repo (proposed implementation files)
- `recommendations/webflow-mobile-overrides.css`
  - Drop-in CSS overrides to improve mobile readability/touch ergonomics.
- `recommendations/webflow-ux-enhancements.js`
  - Progressive enhancement JS helpers for accessibility, upload listener stability, and sticky action UX.

These are intentionally additive so you can test in Webflow safely before merging into your production head/embed code.
