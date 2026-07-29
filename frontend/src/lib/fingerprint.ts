'use client';

/**
 * Generate a unique device fingerprint using multiple browser signals.
 * Returns a SHA-256 hex string.
 */
export async function getDeviceFingerprint(): Promise<string> {
  const signals: string[] = [];

  // 1. Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(100, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.font = '11pt Arial';
    ctx.fillText('ConsistentChar™', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.font = '18pt Comic Sans MS';
    ctx.fillText('demo', 4, 45);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgb(255,0,255)';
    ctx.beginPath();
    ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgb(0,255,255)';
    ctx.beginPath();
    ctx.arc(100, 100, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    signals.push(canvas.toDataURL());
  } catch {}

  // 2. WebGL fingerprint
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || (canvas.getContext('experimental-webgl') as WebGLRenderingContext);
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        signals.push(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || '');
        signals.push(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
      }
    }
  } catch {}

  // 3. Screen & browser info
  signals.push(screen.width.toString());
  signals.push(screen.height.toString());
  signals.push(screen.colorDepth.toString());
  signals.push(navigator.language);
  signals.push(navigator.platform);
  signals.push(navigator.userAgent);
  signals.push(new Date().getTimezoneOffset().toString());

  // 4. Available fonts (sampling)
  try {
    const testString = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const testSize = '10px';
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana',
      'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS', 'Trebuchet MS',
      'Arial Black', 'Impact', 'Lucida Console', 'Tahoma', 'Geneva', 'Segoe UI', 'Candara'];

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.visibility = 'hidden';
    document.body.appendChild(container);

    const defaultWidths: Record<string, number> = {};
    for (const base of baseFonts) {
      const el = document.createElement('span');
      el.style.fontSize = testSize;
      el.style.fontFamily = base;
      el.textContent = testString;
      container.appendChild(el);
      defaultWidths[base] = el.offsetWidth;
      container.removeChild(el);
    }

    const found: string[] = [];
    for (const font of testFonts) {
      for (const base of baseFonts) {
        const el = document.createElement('span');
        el.style.fontSize = testSize;
        el.style.fontFamily = `"${font}", ${base}`;
        el.textContent = testString;
        container.appendChild(el);
        if (el.offsetWidth !== defaultWidths[base]) {
          found.push(font);
        }
        container.removeChild(el);
        break;
      }
    }
    document.body.removeChild(container);
    signals.push(found.sort().join(','));
  } catch {}

  // 5. Audio fingerprint
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    const oscillator = audioCtx.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, audioCtx.currentTime);
    oscillator.connect(analyser);
    oscillator.start(0);
    oscillator.stop(0.1);
    signals.push(audioCtx.sampleRate.toString());
    audioCtx.close();
  } catch {}

  // 6. Touch support
  signals.push('ontouchstart' in window ? '1' : '0');
  signals.push(navigator.maxTouchPoints.toString());

  // 7. Hardware concurrency
  signals.push((navigator.hardwareConcurrency || 0).toString());

  // 8. Device memory (Chrome only)
  signals.push(((navigator as any).deviceMemory || 0).toString());

  // Hash everything
  const raw = signals.join('|||');
  const hash = await sha256(raw);
  return hash;
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
