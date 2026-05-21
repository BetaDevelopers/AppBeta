export const isIpad =
  /iPad/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isAndroid = /Android/.test(navigator.userAgent);

export const isTablet =
  isIpad || (isAndroid && Math.min(screen.width, screen.height) >= 600);

export const hasApplePencil = isIpad;

export const hasStylusSupport = isTablet;
