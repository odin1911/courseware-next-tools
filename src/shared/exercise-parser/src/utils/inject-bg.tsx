export default function injectBgToBody(bgUrl: string): void {
  const styleId = 'injected-bg-style';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!bgUrl) {
    styleEl?.remove();
    return;
  }
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  styleEl.innerHTML = `
        html,
        body,
        #app {
            min-width: 100%;
            min-height: 100%;
        }

        body,
        #app {
            min-height: 100vh;
            background-image: url(${bgUrl});
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
        }
    `;
}
