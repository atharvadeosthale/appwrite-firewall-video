import { C, EASE } from "../theme";
import { lerp, prog } from "../lib/anim";

// UI zoom and world layout (1x console px inside, world px outside).
export const Z = 1.85;
export const CARD_X = 790;
export const CARD_Y = 170;
export const CARD_W = 600;
export const IMPACT_X = CARD_X + CARD_W * Z + 64;
export const IMPACT_W = 340;

// 1x offsets inside the Configure card.
export const HEADER_H = 49;
export const PAD = 20;
export const RAIL = 48;
export const GAP = 12;
export const ROW_H = 104;
export const PLUS_H = 40;
export const BOX_PAD = 10;
export const SELECT_H = 36;
export const MENU_ITEM = 32;

export const THEN_Y = HEADER_H + PAD + ROW_H + GAP + ROW_H + GAP + PLUS_H + GAP; // top of Then box (1x)
export const CONTENT_X = PAD + RAIL + GAP; // left of condition boxes (1x)

export const T = {
  attrClick: 44,
  attrScan: 54,
  attrPick: 122,
  operator: 130,
  typeStart: 138,
  plusClick: 184,
  andIn: 186,
  headB: 214,
  headC: 300,
  actionClick: 300,
  actionScan: 312,
  handoff: 396,
};

/** The action list morph starts in S3 and finishes in S4 (S3 is 432 frames). */
export const HANDOFF_START = 408;
export const HANDOFF_DUR = 64;
/** Frames of the morph that play inside S4. */
export const HANDOFF_IN_S4 = HANDOFF_START + HANDOFF_DUR - 432;

export const ACTION_ITEMS = [
  { label: "Deny", color: C.deny },
  { label: "Bypass", color: C.bypass },
  { label: "Challenge", color: C.challenge },
  { label: "Rate limit", color: C.rateLimit },
  { label: "Redirect", color: C.redirect },
];

/** Camera: world translate and scale, keyed on the timeline. */
export const s3Camera = (frame: number) => {
  const toImpact = prog(frame, 206, 58, EASE.inOut);
  const toThen = prog(frame, 286, 52, EASE.inOut);
  const intro = prog(frame, 0, 60, EASE.out);
  const camX = lerp(120, 0, intro) - 840 * toImpact + 840 * toThen * toImpact - 40 * toThen;
  const camY = lerp(40, 0, intro) - 20 * toImpact + 20 * toImpact * toThen - 300 * toThen;
  return { camX, camY };
};

/** Screen-space geometry of the action menu at the handoff (tilt is flat by then). */
export const menuGeometry = () => {
  const { camX, camY } = s3Camera(T.handoff);
  const left = CARD_X + (CONTENT_X + BOX_PAD) * Z + camX;
  const top = CARD_Y + (THEN_Y + BOX_PAD + SELECT_H + 6) * Z + camY;
  return {
    left,
    top,
    width: 320 * Z,
    height: (ACTION_ITEMS.length * MENU_ITEM + 10) * Z,
    z: Z,
    items: ACTION_ITEMS.map((_, i) => ({
      dotX: left + 13 * Z,
      textX: left + 29 * Z,
      cy: top + (5 + i * MENU_ITEM + MENU_ITEM / 2) * Z,
      rowTop: top + (5 + i * MENU_ITEM) * Z,
    })),
    fontSize: 14 * Z,
    dot: 8 * Z,
  };
};

