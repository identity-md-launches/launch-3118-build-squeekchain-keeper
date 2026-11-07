export function Hamster({ className = '', helmet = false }: { className?: string; helmet?: boolean }) {
  return <svg className={className} viewBox="0 0 160 150" fill="none" aria-hidden="true">
    {helmet && <><circle cx="80" cy="74" r="67" stroke="#44463b" strokeWidth="2" /><circle cx="80" cy="74" r="59" stroke="#34362e" strokeWidth="1" strokeDasharray="3 7" /><path d="m26 118-8 17m116-17 8 17M17 136h126" stroke="#666950" strokeWidth="4" strokeLinecap="round" /></>}
    <ellipse cx="80" cy="120" rx="41" ry="7" fill="#11120f" />
    <circle cx="46" cy="43" r="21" fill="#bb8046" /><circle cx="114" cy="43" r="21" fill="#bb8046" />
    <circle cx="46" cy="43" r="12" fill="#e8b590" /><circle cx="114" cy="43" r="12" fill="#e8b590" />
    <path d="M31 82c0-32 18-53 49-53s49 21 49 53c0 28-20 43-49 43S31 110 31 82Z" fill="#d99e58" />
    <path d="M65 32c5 12 6 23 3 34h24c-3-11-2-22 3-34a61 61 0 0 0-30 0Z" fill="#f4d7a3" />
    <path d="M36 85c16-16 25-9 44 0 19-9 28-16 44 0-1 25-16 39-44 39S37 110 36 85Z" fill="#f4d7a3" />
    <ellipse cx="56" cy="72" rx="5" ry="7" fill="#24231e" /><ellipse cx="104" cy="72" rx="5" ry="7" fill="#24231e" />
    <circle cx="57" cy="70" r="1.7" fill="#fff4db" /><circle cx="105" cy="70" r="1.7" fill="#fff4db" />
    <ellipse cx="46" cy="88" rx="8" ry="5" fill="#e8aa84" /><ellipse cx="114" cy="88" rx="8" ry="5" fill="#e8aa84" />
    <path d="M74 87q6-5 12 0-6 10-12 0Z" fill="#8f5c4c" /><path d="M80 92v5m-8 0q8 8 16 0" stroke="#7c543c" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="76" y="100" width="8" height="8" rx="2" fill="#fff6e3" />
    <path d="m34 91-13-3m14 10-12 3m103-12 13-3m-14 10 12 3" stroke="#ba8d5d" strokeWidth="2" strokeLinecap="round" />
    <ellipse cx="54" cy="119" rx="13" ry="6" fill="#bb8046" /><ellipse cx="106" cy="119" rx="13" ry="6" fill="#bb8046" />
    {helmet && <><path d="m111 16 3 9 9 3-9 3-3 9-3-9-9-3 9-3 3-9Z" fill="#edc47a" /><circle cx="27" cy="36" r="3" fill="#edc47a" /></>}
  </svg>;
}
