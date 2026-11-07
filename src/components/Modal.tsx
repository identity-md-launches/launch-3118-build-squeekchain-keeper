import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
export function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; const dialog = ref.current!; dialog.showModal(); const original = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { dialog.close(); document.body.style.overflow = original; previous?.focus(); }; }, []);
  return <dialog ref={ref} className="modal" aria-labelledby="modal-title" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === ref.current) { const r = ref.current.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); } }}>
    <div className="modal-head"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={close}><Icon name="close" /></button></div>{children}
  </dialog>;
}
