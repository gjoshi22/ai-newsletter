import { useRef, useState, useCallback, useEffect } from "react";

/* ────────────────────────────────────────────
   The canonical XD AI JOURNAL ASCII block art.
   Chars scramble toward cursor, resolve away.
──────────────────────────────────────────── */

const LOGO = `╦ ╦╔╦╗  ╔═╗╦
╔╩╣ ║║  ╠═╣║
╚═╩╩╝   ╩ ╩╩╝

╦╔═╗╦ ╦╦═╗╔╗╔╔═╗╦
║║ ║║ ║╠╦╝║║║╠═╣║
╚╝╚═╝╚═╝╩╚═╝╚╝╩ ╩╩═╝`;

/* Character pool — box-drawing + block + braille */
const POOL = "░▒▓█▀▄▌▐╔╗╚╝═║╠╣╦╩╬┌┐└┘─│├┤┬┴┼▪▫■□◈◉●○◆◇▸▾⌬⌭⌮⊞⊟⊠⊡⋮⋯⌀⌁⌂⌃⌄⌅⌆";

interface Props {
  /** scale 0.7–1 for card panels */
  scale?: number;
  className?: string;
}

export function InteractiveAsciiLogo({ scale = 1, className = "" }: Props) {
  const base = LOGO.split("");
  const [chars, setChars] = useState<string[]>(base);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameRef    = useRef(0);
  const isScrambling = useRef(false);

  const clear = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  /* full scramble → sequential left-to-right resolve */
  const trigger = useCallback(() => {
    if (isScrambling.current) return;
    isScrambling.current = true;
    clear();
    frameRef.current = 0;

    /* Phase 1: chaos — randomize everything briefly */
    let chaosFrames = 0;
    intervalRef.current = setInterval(() => {
      setChars(base.map(ch => {
        if (ch === "\n" || ch === " ") return ch;
        return POOL[Math.floor(Math.random() * POOL.length)];
      }));
      chaosFrames++;
      if (chaosFrames >= 5) {
        clear();
        /* Phase 2: resolve left → right */
        let resolved = 0;
        intervalRef.current = setInterval(() => {
          setChars(base.map((ch, i) => {
            if (ch === "\n" || ch === " ") return ch;
            if (i <= resolved) return ch;
            return POOL[Math.floor(Math.random() * POOL.length)];
          }));
          resolved += 3;
          if (resolved >= base.length) {
            clear();
            setChars(base);
            isScrambling.current = false;
          }
        }, 28);
      }
    }, 32);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clear(), []);

  return (
    <pre
      className={`ascii-art select-none ${className}`}
      style={{
        fontSize: `${0.68 * scale}rem`,
        lineHeight: 1.5,
        cursor: "none",
      }}
      onMouseEnter={trigger}
    >
      {chars.join("")}
    </pre>
  );
}
