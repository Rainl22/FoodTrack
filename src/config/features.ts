// Feature flags — all default false for safe rollout.
// Set via environment variables or override locally for development.

export const features = {
  // Health Connect / Google Drive sync
  healthConnectSync: true,

  // Barcode scanning via camera
  barcodeScanning: true,

  // Voice-to-text in text logger
  voiceInput: true,

  // Insights tab (placeholder until Phase 2)
  insights: false,

  // PWA install prompt
  installPrompt: true,

  // Training-day macro adjustment
  trainingDayAdjustment: true,
} as const;

export type FeatureKey = keyof typeof features;
