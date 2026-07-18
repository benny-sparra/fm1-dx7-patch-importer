type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    brands: Array<{ brand: string; version: string }>
  }
}

const chromiumBrandPattern = /chromium|google chrome|microsoft edge|opera/i
const chromiumUserAgentPattern = /(?:chrome|chromium|crios|edg|opr)\//i

export function isChromiumBrowser(navigatorObject: Navigator = navigator) {
  const brands = (navigatorObject as NavigatorWithUserAgentData).userAgentData?.brands

  if (brands?.length) {
    return brands.some(({ brand }) => chromiumBrandPattern.test(brand))
  }

  return chromiumUserAgentPattern.test(navigatorObject.userAgent)
}
