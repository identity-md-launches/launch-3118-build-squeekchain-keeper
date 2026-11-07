import type { CSSProperties } from 'react';
const paths = {
  arrow: 'M5 12h14m-5-5 5 5-5 5', external: 'M14 4h6v6M20 4l-9 9M10 4H4v16h16v-6',
  refresh: 'M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.6-2L20 8M4 16l2.3 3A7 7 0 0 0 18 17',
  wallet: 'M4 5h15v3H4a2 2 0 0 1 0-4h13M3 8v12h18V8H3m12 4h6v4h-6z',
  bolt: 'm13 2-9 12h7l-1 8 10-13h-8z', check: 'm5 12 4 4L19 6', close: 'm6 6 12 12M18 6 6 18',
  info: 'M12 10v6M12 7v.1', seed: 'M18 3C8 2 2 8 4 15s11 7 15 0 2-9-1-12ZM5 19 17 7',
  book: 'M12 5c-4-3-8-2-9-1v15c3-2 6-1 9 1 3-2 6-3 9-1V4c-3-2-6-1-9 1Zm0 0v15',
  lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5zm7 4v3',
  cube: 'm12 3 9 5v9l-9 5-9-5V8zm0 19V12m9-4-9 4-9-4m4.5-2.5 9 5',
  clock: 'M12 7v5l4 2', sliders: 'M5 4v16M12 4v16M19 4v16M2 8h6M9 16h6M16 9h6',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', chevron: 'm9 5 7 7-7 7',
};
export function Icon({ name, size = 20, style }: { name: keyof typeof paths; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{(name === 'info' || name === 'clock') && <circle cx="12" cy="12" r="9" />}<path d={paths[name]} /></svg>;
}
