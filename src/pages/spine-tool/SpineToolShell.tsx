import type { CSSProperties, ReactNode } from 'react';

interface SpineToolShellLink {
  href: string;
  label: string;
}

interface SpineToolShellProps {
  title: string;
  description: string;
  visibleCount: number;
  links: readonly SpineToolShellLink[];
  children: ReactNode;
}

export default function SpineToolShell({
  title,
  description,
  visibleCount,
  links,
  children,
}: SpineToolShellProps) {
  return (
    <div style={rootStyle}>
      <h1 style={titleStyle}>{title}</h1>
      <div style={descriptionStyle}>{description}</div>

      <div style={summaryStyle}>
        <div>动画数量：{visibleCount}</div>
        <div>新增方式：将新的 `.zip` 文件放入 `src/pages/spine-tool/assets/`</div>
        <div>runtime：spine-webgl.js (3.8)</div>
        {links.map((link) => (
          <a key={`${link.href}-${link.label}`} href={link.href} style={summaryLinkStyle}>
            {link.label}
          </a>
        ))}
      </div>

      <section style={gridStyle}>{children}</section>
    </div>
  );
}

const rootStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #fffaf4 35%, #ffe8dd 100%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: '36px 20px 44px',
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 28,
  color: '#5a2508',
};

const descriptionStyle: CSSProperties = {
  marginTop: 10,
  marginBottom: 16,
  color: '#7b3412',
};

const summaryStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  marginBottom: 18,
  fontSize: 13,
  color: 'rgba(90, 37, 8, 0.82)',
};

const summaryLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  padding: '6px 12px',
  background: '#7b3412',
  color: '#ffffff',
  textDecoration: 'none',
  fontWeight: 700,
};

const gridStyle: CSSProperties = {
  width: '100%',
  maxWidth: 1200,
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(560px, 1fr))',
  gap: 18,
};
