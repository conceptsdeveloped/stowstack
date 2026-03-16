export const trackEvent = (eventName: string, properties: Record<string, unknown> = {}) => {
  if (import.meta.env.DEV) {
    console.log(`[Analytics] ${eventName}`, properties);
  }
  // Hook for future provider integration
  // window.gtag?.('event', eventName, properties);
  // window.plausible?.(eventName, { props: properties });
};
