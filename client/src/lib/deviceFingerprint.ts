export interface DeviceSignature {
  deviceId: string;
  deviceName: string;
  signature: string;
  details?: {
    os: string;
    browser: string;
    resolution: string;
    gpu: string;
    timezone: string;
    memory: string;
    cores: string | number;
  };
}

// Generates a SHA-256 hash of a given string
async function generateHash(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Gets OS name from user agent
function getOS(): string {
  const userAgent = window.navigator.userAgent;
  if (userAgent.indexOf('Win') !== -1) return 'Windows';
  if (userAgent.indexOf('Mac') !== -1) return 'macOS';
  if (userAgent.indexOf('Linux') !== -1) return 'Linux';
  if (userAgent.indexOf('Android') !== -1) return 'Android';
  if (userAgent.indexOf('like Mac') !== -1) return 'iOS';
  return 'Unknown OS';
}

// Gets browser name
function getBrowser(): string {
  const userAgent = window.navigator.userAgent;
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg/') && !userAgent.includes('OPR/')) return 'Chrome';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edg/')) return 'Edge';
  if (userAgent.includes('OPR/')) return 'Opera';
  return 'Unknown Browser';
}

// Gets GPU info using WebGL
function getGPU(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        return (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }
  } catch (e) {
    console.error('WebGL not supported', e);
  }
  return 'Unknown GPU';
}

export async function getDeviceFingerprint(): Promise<DeviceSignature> {
  // 1. Get or create UUID from localStorage (persistent tracking for the same browser)
  let deviceId = localStorage.getItem('device_uuid');
  if (!deviceId) {
    deviceId = `DEV-${crypto.randomUUID()}`;
    localStorage.setItem('device_uuid', deviceId);
  }

  // 2. Hardware and environment values
  const os = getOS();
  const browser = getBrowser();
  const resolution = `${window.screen.width}x${window.screen.height}`;
  const pixelRatio = window.devicePixelRatio || 1;
  const colorDepth = window.screen.colorDepth;
  // @ts-ignore - memory is a non-standard property but widely supported in Chromium
  const memory = navigator.deviceMemory || 'Unknown'; 
  const cores = navigator.hardwareConcurrency || 'Unknown';
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  const gpu = getGPU();

  // 3. Compose a semi-stable device signature string
  const rawSignature = [
    os,
    resolution,
    pixelRatio,
    colorDepth,
    memory,
    cores,
    timezone,
    language,
    gpu
  ].join('|');

  // 4. Hash the signature
  const signatureHash = await generateHash(rawSignature);

  // Take the first 14 chars as per the example spec (or keep full hash)
  const shortSignature = signatureHash.substring(0, 14);

  return {
    deviceId,
    deviceName: `${os} ${browser}`, // e.g. "Windows Chrome"
    signature: shortSignature,
    details: {
      os,
      browser,
      resolution,
      gpu,
      timezone,
      memory: String(memory),
      cores,
    }
  };
}
