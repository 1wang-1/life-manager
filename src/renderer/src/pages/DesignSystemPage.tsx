import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import design from '../../../../pencil.design.json';
import './DesignSystemPage.css';
import { Play, Pause } from 'lucide-react';

type DesignTokens = typeof design.tokens;

export default function DesignSystemPage() {
  const tokens = design.tokens as DesignTokens;
  const hasApi = typeof (window as unknown as { api?: { design?: unknown } }).api?.design !== 'undefined';
  const ROOT = 'd:\\My_code\\life-manager-desktop -copy';
  const DESIGN_PATH = `${ROOT}\\pencil.design.json`;
  const TOKENS_PATH = `${ROOT}\\src\\renderer\\src\\styles\\tokens.css`;
  const HOME_PEN_PATH = `${ROOT}\\pencil.home.pen`;

  const openVsCodeFile = (absPath: string) => {
    const url = 'vscode://file/' + absPath.replace(/\\/g, '/');
    window.open(encodeURI(url), '_blank');
  };

  const normalizeTypography = (conf: unknown) => {
    if (!conf || typeof conf !== 'object') return null;
    const rec = conf as Record<string, unknown>;

    const readPx = (v: unknown) => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const m = /^(-?\d+(?:\.\d+)?)px$/i.exec(v.trim());
        if (m) return Number(m[1]);
      }
      return null;
    };

    const size = readPx(rec.size ?? rec.fontSize);
    const line = readPx(rec.line ?? rec.lineHeight);
    const weight = typeof rec.weight === 'number' || typeof rec.weight === 'string'
      ? rec.weight
      : (typeof rec.fontWeight === 'number' || typeof rec.fontWeight === 'string' ? rec.fontWeight : null);

    if (size === null || line === null || weight === null) return null;
    return { size, line, weight };
  };

  const colorEntries = useMemo(() => Object.entries(tokens.color || {}), [tokens.color]);
  const spacingScale: number[] = useMemo(() => {
    const s = (tokens as unknown as { spacing?: { scale?: unknown } }).spacing?.scale;
    return Array.isArray(s) ? (s.filter((n) => typeof n === 'number') as number[]) : [];
  }, [tokens]);

  const [primary, setPrimary] = useState(String(tokens.color?.primary || '#FFB000'));
  const [labels, setLabels] = useState({ countdown: '倒计时', stopwatch: '正向计时' });
  const [timerSize, setTimerSize] = useState<number>(110);
  const [cardRadius, setCardRadius] = useState<number>(Number(tokens.radii?.card ?? 16));
  const [ioStatus, setIoStatus] = useState<string | null>(null);

  const readFromApp = () => {
    try {
      const currentPrimary = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
      if (currentPrimary) setPrimary(currentPrimary);

      const currentRadius = getComputedStyle(document.documentElement).getPropertyValue('--radius-card').trim();
      const radiusMatch = /^(-?\d+(?:\.\d+)?)px$/i.exec(currentRadius);
      if (radiusMatch) setCardRadius(Number(radiusMatch[1]));
      const storedRadius = localStorage.getItem('design.radiusCard');
      if (storedRadius) {
        const n = Number(storedRadius);
        if (Number.isFinite(n)) setCardRadius(n);
      }

      const storedLabels = localStorage.getItem('design.tabLabels');
      if (storedLabels) {
        const parsed = JSON.parse(storedLabels);
        if (parsed && typeof parsed === 'object') {
          setLabels({
            countdown: String(parsed.countdown || '倒计时'),
            stopwatch: String(parsed.stopwatch || '正向计时')
          });
        }
      }
      const sizeRaw = localStorage.getItem('design.timerDisplaySize');
      if (sizeRaw) {
        const px = Number(sizeRaw);
        if (Number.isFinite(px) && px > 20) setTimerSize(px);
      }
      setIoStatus('已从当前应用读取');
      setTimeout(() => setIoStatus(null), 1200);
    } catch {
      setIoStatus('读取失败');
      setTimeout(() => setIoStatus(null), 1200);
    }
  };

  const applyToHome = () => {
    document.documentElement.style.setProperty('--color-primary', primary);
    localStorage.setItem('design.colorPrimary', primary);
    document.documentElement.style.setProperty('--timer-display-size', `${timerSize}px`);
    localStorage.setItem('design.timerDisplaySize', String(timerSize));
    document.documentElement.style.setProperty('--radius-card', `${cardRadius}px`);
    localStorage.setItem('design.radiusCard', String(cardRadius));
    localStorage.setItem('design.tabLabels', JSON.stringify(labels));
    setIoStatus('已应用到首页');
    setTimeout(() => setIoStatus(null), 1200);
  };

  const readFromPencil = async () => {
    if (!hasApi || !window.api?.design?.readDesign) {
      setIoStatus('请在应用窗口内执行读取');
      setTimeout(() => setIoStatus(null), 1400);
      return;
    }
    const text = await window.api.design.readDesign();
    if (!text) {
      setIoStatus('读取 pencil.design.json 失败');
      setTimeout(() => setIoStatus(null), 1400);
      return;
    }
    try {
      const parsed = JSON.parse(String(text));
      const nextPrimary = parsed?.tokens?.color?.primary;
      if (typeof nextPrimary === 'string') setPrimary(nextPrimary);
      const home = parsed?.overrides?.home;
      if (home?.tabLabels && typeof home.tabLabels === 'object') {
        setLabels({
          countdown: String(home.tabLabels.countdown || '倒计时'),
          stopwatch: String(home.tabLabels.stopwatch || '正向计时')
        });
      }
      const size = home?.timerDisplaySize;
      if (Number.isFinite(size)) setTimerSize(Number(size));

      const radiusFromTokens = parsed?.tokens?.radii?.card;
      if (Number.isFinite(radiusFromTokens)) setCardRadius(Number(radiusFromTokens));
      setIoStatus('已从 pencil.design.json 读取');
      setTimeout(() => setIoStatus(null), 1200);
    } catch {
      setIoStatus('解析 pencil.design.json 失败');
      setTimeout(() => setIoStatus(null), 1400);
    }
  };

  const saveToPencil = async () => {
    if (!hasApi || !window.api?.design?.writeDesign || !window.api?.design?.readDesign) {
      setIoStatus('请在应用窗口内执行保存');
      setTimeout(() => setIoStatus(null), 1400);
      return;
    }
    const text = await window.api.design.readDesign();
    if (!text) {
      setIoStatus('读取 pencil.design.json 失败');
      setTimeout(() => setIoStatus(null), 1400);
      return;
    }
    try {
      const parsed = JSON.parse(String(text));
      parsed.tokens ??= {};
      parsed.tokens.color ??= {};
      parsed.tokens.color.primary = primary;
      parsed.tokens.radii ??= {};
      parsed.tokens.radii.card = cardRadius;
      parsed.overrides ??= {};
      parsed.overrides.home ??= {};
      parsed.overrides.home.tabLabels = { ...labels };
      parsed.overrides.home.timerDisplaySize = timerSize;
      const ok = await window.api.design.writeDesign(JSON.stringify(parsed));
      setIoStatus(ok ? '已保存到 pencil.design.json' : '保存失败');
      setTimeout(() => setIoStatus(null), 1400);
    } catch {
      setIoStatus('保存失败');
      setTimeout(() => setIoStatus(null), 1400);
    }
  };

  useEffect(() => {
    readFromApp();
  }, []);

  return (
    <div className="page-container design-page">
      <header className="page-header design-header">
        <div className="header-content">
          <h1 className="page-title">设计系统预览</h1>
          <p className="page-subtitle">来自 pencil.design.json</p>
        </div>
        <div className="page-header-actions design-actions">
          <button
            className="icon-btn-small"
            onClick={() => (hasApi ? window.api?.design?.openPenHome?.() : openVsCodeFile(HOME_PEN_PATH))}
            title="打开首页 .pen"
          >Home.pen</button>
          <button
            className="icon-btn-small"
            onClick={() => (hasApi ? window.api?.design?.openDesignFile?.() : openVsCodeFile(DESIGN_PATH))}
            title="打开 Pencil 设计文件"
          >Pencil</button>
          <button
            className="icon-btn-small"
            onClick={() => (hasApi ? window.api?.design?.openTokensCss?.() : openVsCodeFile(TOKENS_PATH))}
            title="打开 tokens.css"
          >Tokens</button>
          <button
            className="icon-btn-small"
            onClick={() => (hasApi ? window.api?.design?.syncTokensFromCss?.() : undefined)}
            title="从 CSS 同步到 Pencil"
          >同步</button>
          <button className="icon-btn-small" onClick={readFromPencil} title="从 pencil.design.json 读取">读取</button>
          <button className="icon-btn-small" onClick={saveToPencil} title="保存到 pencil.design.json">保存</button>
          <button className="icon-btn-small" onClick={applyToHome} title="应用到首页">应用</button>
        </div>
      </header>

      {!hasApi && (
        <div className="api-warning">检测到在浏览器中打开，请点击上方按钮使用 VS Code 直接打开文件；在应用窗口内使用可执行同步。</div>
      )}

      {ioStatus && <div className="io-status">{ioStatus}</div>}

      <div className="design-grid">
        <section className="card">
          <h2>颜色 Tokens</h2>
          <div className="color-grid">
            {colorEntries.map(([key, value]) => (
              <div key={key} className="color-item">
                <div className="swatch" style={{ background: String(value) }} />
                <div className="color-meta">
                  <div className="color-name">{key}</div>
                  <div className="color-value">{String(value)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="inline-controls">
            <div className="control-row">
              <label>主色</label>
              <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} />
              <button className="icon-btn-small" onClick={() => {
                document.documentElement.style.setProperty('--color-primary', primary);
                localStorage.setItem('design.colorPrimary', primary);
              }}>应用到页面</button>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>排版 Tokens</h2>
          <div className="type-grid">
            {Object.entries(tokens.typography || {}).map(([key, conf]) => {
              const normalized = normalizeTypography(conf);
              if (!normalized) return null;
              return (
                <div key={key} className="type-item">
                  <div className="type-preview" style={{ fontSize: `${normalized.size}px`, lineHeight: `${normalized.line}px`, fontWeight: normalized.weight }}>
                    专注让你更强 • {key}
                  </div>
                  <div className="type-meta">
                    <span>{normalized.size}px</span>
                    <span>{normalized.line}px</span>
                    <span>{normalized.weight}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="inline-controls">
            <div className="control-row">
              <label>计时字号</label>
              <input type="range" min={72} max={160} value={timerSize} onChange={(e) => setTimerSize(Number(e.target.value))} />
              <span>{timerSize}px</span>
              <button className="icon-btn-small" onClick={() => {
                document.documentElement.style.setProperty('--timer-display-size', `${timerSize}px`);
                localStorage.setItem('design.timerDisplaySize', String(timerSize));
              }}>应用到页面</button>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>组件样式</h2>
          <div className="inline-controls">
            <div className="control-row">
              <label>卡片圆角</label>
              <input type="range" min={0} max={28} value={cardRadius} onChange={(e) => setCardRadius(Number(e.target.value))} />
              <span>{cardRadius}px</span>
              <button className="icon-btn-small" onClick={() => {
                document.documentElement.style.setProperty('--radius-card', `${cardRadius}px`);
                localStorage.setItem('design.radiusCard', String(cardRadius));
              }}>应用到页面</button>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>间距 Tokens</h2>
          <div className="space-row">
            {spacingScale.map((px, idx) => (
              <div key={idx} className="space-item">
                <div className="space-block" style={{ width: px, height: px }} />
                <div className="space-meta">{px}px</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>PlayButton 预览</h2>
          <div className="play-preview-row">
            <button className={clsx('play-btn-large')} aria-label="播放">
              <Play size={32} fill="currentColor" stroke="currentColor" />
            </button>
            <button className={clsx('play-btn-large', 'is-playing')} aria-label="暂停">
              <Pause size={32} fill="currentColor" stroke="currentColor" />
            </button>
          </div>
        </section>

        <section className="card">
          <h2>首页 Tab 文案</h2>
          <div className="inline-controls">
            <div className="control-row">
              <label>倒计时</label>
              <input type="text" value={labels.countdown} onChange={(e) => setLabels({ ...labels, countdown: e.target.value })} />
            </div>
            <div className="control-row">
              <label>正向计时</label>
              <input type="text" value={labels.stopwatch} onChange={(e) => setLabels({ ...labels, stopwatch: e.target.value })} />
            </div>
            <div className="control-row">
              <button className="icon-btn-small" onClick={() => {
                localStorage.setItem('design.tabLabels', JSON.stringify(labels));
              }}>应用到首页</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
