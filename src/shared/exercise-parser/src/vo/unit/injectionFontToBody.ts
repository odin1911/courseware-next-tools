const FontFamilyMap: Record<string, string> = {
  default: 'arial',
  'Primer Print': 'Primer Print',
  heiti: 'heiti',
};

const STYLE_ID = 'injected-font-style';

function injectionFontToBody(font_family: string): void {
  const fontName = FontFamilyMap[font_family] || FontFamilyMap['default'];
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.innerHTML = `body {
        font-family: ${fontName} !important;
    }`;
}

export default injectionFontToBody;
