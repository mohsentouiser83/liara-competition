import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 18, children, ...props }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>;
}

export const Icons = {
  plus: (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>,
  moon: (p: IconProps) => <Icon {...p}><path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a7 7 0 0 0 10.7 10.7Z" /></Icon>,
  sun: (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Icon>,
  menu: (p: IconProps) => <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>,
  send: (p: IconProps) => <Icon {...p}><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></Icon>,
  stop: (p: IconProps) => <Icon {...p}><rect x="7" y="7" width="10" height="10" rx="1" /></Icon>,
  spark: (p: IconProps) => <Icon {...p}><path d="m12 3 1.2 4.1L17 9l-3.8 1.9L12 15l-1.2-4.1L7 9l3.8-1.9Z" /><path d="m19 15 .7 2.3L22 18.5l-2.3 1.2L19 22l-.7-2.3-2.3-1.2 2.3-1.2Z" /></Icon>,
  bug: (p: IconProps) => <Icon {...p}><path d="M8 6h8M9 3h6M12 6v15M6 13h12M5 9l3 2M19 9l-3 2M5 17l3-2M19 17l-3-2" /><rect x="8" y="6" width="8" height="15" rx="4" /></Icon>,
  rocket: (p: IconProps) => <Icon {...p}><path d="M14 5c3-3 6-3 6-3s0 3-3 6l-5 5-4-4Z" /><path d="m9 12-4 1-3 3 6 1 1 5 3-3 1-5M15 7h.01" /></Icon>,
  database: (p: IconProps) => <Icon {...p}><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></Icon>,
  book: (p: IconProps) => <Icon {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5Z" /><path d="M4 6.5v13" /></Icon>,
  external: (p: IconProps) => <Icon {...p}><path d="M15 4h5v5M20 4l-9 9" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></Icon>,
  arrow: (p: IconProps) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>,
  copy: (p: IconProps) => <Icon {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Icon>,
  up: (p: IconProps) => <Icon {...p}><path d="m18 15-6-6-6 6" /></Icon>,
  down: (p: IconProps) => <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>
};

export function LiaraMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="Liara">
      <path d="M7 7.5a4.5 4.5 0 0 1 4.5-4.5h9A4.5 4.5 0 0 1 25 7.5v17a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 7 24.5v-17Z" fill="var(--primary)"/>
      <path d="M12 9v10.2c0 2.1 1.5 3.8 3.5 3.8H20" stroke="white" strokeWidth="2.6" strokeLinecap="round"/>
    </svg>
  );
}
