export const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") return false;

  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    "android",
    "iphone",
    "ipad",
    "ipod",
    "blackberry",
    "windows phone",
    "mobile",
    "tablet",
  ];

  return mobileKeywords.some((keyword) => userAgent.includes(keyword));
};

export const isMobileViewport = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 768;
};
