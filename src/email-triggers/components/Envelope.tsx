import { color, font } from "../theme";
import { clamp, ease, mix } from "../lib/anim";

export const ENV_W = 220;
export const ENV_H = 146;
export const LETTER_W = 188;
export const LETTER_H = 134;
export const TAG = { right: -20, bottom: -10, w: 134, h: 30 };
/** Tag centre relative to the envelope centre (unscaled). */
export const TAG_OFFSET = {
  x: ENV_W - TAG.right - TAG.w / 2 - ENV_W / 2,
  y: ENV_H - TAG.bottom - TAG.h / 2 - ENV_H / 2,
};
/** Letter centre (fully out) relative to the envelope centre (unscaled). */
export const LETTER_OUT_OFFSET = { x: 0, y: -86 + LETTER_H / 2 - ENV_H / 2 };

/**
 * Envelope at 1x (220 x 146). `open` 0..1 lifts the flap in 3D,
 * `letter` 0..1 slides the letter out, `glow` adds the pink halo.
 */
export const Envelope: React.FC<{
  open?: number;
  letter?: number;
  glow?: number;
  attachment?: number; // 0..1 visibility of the paperclip tag
}> = ({ open = 0, letter = 0, glow = 0, attachment = 1 }) => {
  const flapAngle = mix(0, 178, ease.inOut(clamp(open)));
  const flapFront = flapAngle < 90;
  const letterY = mix(10, -86, ease.out(clamp(letter)));
  return (
    <div style={{ position: "relative", width: ENV_W, height: ENV_H, perspective: 700 }}>
      {/* halo */}
      <div
        style={{
          position: "absolute",
          left: -60,
          top: -60,
          width: ENV_W + 120,
          height: ENV_H + 120,
          borderRadius: 60,
          background: "radial-gradient(ellipse at center, rgba(253,54,110,0.55) 0%, rgba(253,54,110,0) 65%)",
          opacity: glow,
        }}
      />
      {/* back of envelope */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 14,
          backgroundColor: "#2a2a30",
          border: "1.5px solid rgba(255,255,255,0.16)",
        }}
      />
      {/* flap when opened (behind the letter) */}
      {!flapFront ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: ENV_W,
            height: ENV_H * 0.62,
            transformOrigin: "50% 0%",
            transform: `rotateX(${flapAngle}deg)`,
            clipPath: "polygon(0 0, 100% 0, 50% 100%)",
            backgroundColor: "#35353c",
          }}
        />
      ) : null}
      {/* letter */}
      <div
        style={{
          position: "absolute",
          left: 16,
          width: LETTER_W,
          top: letterY,
          height: LETTER_H,
          borderRadius: 8,
          backgroundColor: "#f4f4f6",
          padding: "14px 14px",
          boxSizing: "border-box",
          opacity: letter > 0 ? 1 : 0,
        }}
      >
        {[0.9, 0.7, 0.8, 0.5].map((w, i) => (
          <div
            key={i}
            style={{
              height: 7,
              width: `${w * 100}%`,
              borderRadius: 4,
              backgroundColor: i === 0 ? "#fd366e" : "#c9c9d1",
              marginBottom: 9,
            }}
          />
        ))}
      </div>
      {/* front pocket */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 14,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: `polygon(0 22%, 50% 64%, 100% 22%, 100% 100%, 0 100%)`,
            background: "linear-gradient(180deg, #34343b 0%, #2c2c32 100%)",
          }}
        />
        <svg width={ENV_W} height={ENV_H} style={{ position: "absolute", inset: 0 }}>
          <path
            d={`M 0 ${ENV_H * 0.22} L ${ENV_W / 2} ${ENV_H * 0.64} L ${ENV_W} ${ENV_H * 0.22}`}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1.5}
          />
          <path d={`M 0 ${ENV_H} L ${ENV_W * 0.4} ${ENV_H * 0.56}`} stroke="rgba(255,255,255,0.06)" strokeWidth={1.5} />
          <path d={`M ${ENV_W} ${ENV_H} L ${ENV_W * 0.6} ${ENV_H * 0.56}`} stroke="rgba(255,255,255,0.06)" strokeWidth={1.5} />
        </svg>
      </div>
      {/* flap closed (in front) */}
      {flapFront ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: ENV_W,
            height: ENV_H * 0.62,
            transformOrigin: "50% 0%",
            transform: `rotateX(${flapAngle}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              background: "linear-gradient(180deg, #414149 0%, #34343b 100%)",
            }}
          />
          {/* seal */}
          <div
            style={{
              position: "absolute",
              left: ENV_W / 2 - 17,
              top: ENV_H * 0.62 - 38,
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: color.pink,
              boxShadow: `0 0 ${18 + glow * 20}px rgba(253,54,110,${0.5 + glow * 0.4})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontFamily: font.display,
              fontWeight: 500,
              fontSize: 21,
              lineHeight: "34px",
            }}
          >
            @
          </div>
        </div>
      ) : null}
      {/* paperclip tag */}
      <div
        style={{
          position: "absolute",
          right: TAG.right,
          bottom: TAG.bottom,
          width: TAG.w,
          height: TAG.h,
          justifyContent: "center",
          boxSizing: "border-box",
          padding: "0 10px",
          borderRadius: 9,
          backgroundColor: "#3a3a42",
          border: "1px solid rgba(255,255,255,0.14)",
          color: color.foreground,
          fontFamily: font.mono,
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          gap: 5,
          opacity: attachment,
          transform: `scale(${mix(0.6, 1, attachment)})`,
        }}
      >
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
        receipt.pdf
      </div>
    </div>
  );
};
