import { registerPlugin, Capacitor } from '@capacitor/core';

const AdvancedCamera = Capacitor.isNativePlatform()
  ? registerPlugin('AdvancedCamera')
  : null;

export { AdvancedCamera };
