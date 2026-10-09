/**
 * Ícones SVG do Preço Perto — traço consistente (24x24), cor via currentColor.
 * Ícones decorativos recebem aria-hidden/focusable="false" automaticamente.
 */
import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
  title?: string; // quando presente, o ícone deixa de ser decorativo
}

const base = (size = 20, strokeWidth = 1.8, title?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': title ? undefined : true,
  focusable: title ? undefined : ('false' as const),
  role: title ? ('img' as const) : undefined,
});

const Label = ({ title }: { title?: string }) => (title ? <title>{title}</title> : null);

export const IconHome = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z"/></svg>
);

export const IconStore = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><path d="M3 9l1.5-5h15L21 9M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9M3 9h18M9 21V14h6v7"/><path d="M8 9V5M12 9V5M16 9V5"/></svg>
);

export const IconMap = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
);

export const IconCart = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
);

export const IconUser = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

export const IconSearch = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
);

export const IconBell = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
);

export const IconHeart = ({ className, size, filled, title }: IconProps & { filled?: boolean }) => (
  <svg {...base(size, 1.8, title)} className={className} fill={filled ? 'currentColor' : 'none'}><Label title={title} /><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
);

export const IconCheck = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><polyline points="20 6 9 17 4 12"/></svg>
);

export const IconPlus = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);

export const IconMinus = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><line x1="5" y1="12" x2="19" y2="12"/></svg>
);

export const IconClose = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

export const IconArrowLeft = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
);

export const IconArrowRight = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
);

export const IconShare = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
);

export const IconStar = ({ className, size, filled, title }: IconProps & { filled?: boolean }) => (
  <svg {...base(size, 1.8, title)} className={className} fill={filled ? 'currentColor' : 'none'}><Label title={title} /><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
);

export const IconLocation = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
);

export const IconClock = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

export const IconTag = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
);

export const IconTrending = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
);

export const IconWallet = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><path d="M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12a2 2 0 002 2h14v-4"/><path d="M18 12a2 2 0 000 4h4v-4h-4z"/></svg>
);

export const IconGift = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
);

export const IconCamera = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
);

export const IconTruck = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
);

export const IconChef = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><path d="M6 13.87A4 4 0 017.41 6a5.11 5.11 0 011.05-1.54 5 5 0 017.08 0A5.11 5.11 0 0116.59 6 4 4 0 0118 13.87V21H6z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
);

export const IconCalendar = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
);

export const IconBook = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
);

export const IconChart = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
);

export const IconList = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
);

export const IconShield = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);

export const IconLogout = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);

export const IconSettings = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
);

export const IconSparkles = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><path d="M12 3l1.9 5.8L20 10l-5.8 1.9L12 18l-1.9-5.8L4 10l5.8-1.9L12 3z"/></svg>
);

export const IconMail = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
);

export const IconLock = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
);

export const IconEye = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
);

export const IconEyeOff = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
);

export const IconFilter = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
);

export const IconPercent = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
);

export const IconCopy = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
);

export const IconPhone = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
);

export const IconChevronRight = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 2, title)} className={className}><Label title={title} /><polyline points="9 18 15 12 9 6"/></svg>
);

export const IconChevronDown = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 2, title)} className={className}><Label title={title} /><polyline points="6 9 12 15 18 9"/></svg>
);

export const IconMenu = ({ className, size, title }: IconProps) => (
  <svg {...base(size, 1.8, title)} className={className}><Label title={title} /><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
);

/* Marcas — não herdam currentColor (cores oficiais) */

export const IconGoogle = ({ className, size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export const IconApple = ({ className, size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" focusable="false">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);
