import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAppRouteForNgaUrl, openInInternalBrowser, toHttpUrl } from "../utils/internalLinks";

export default function InternalLinkGuard() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      const appRoute = getAppRouteForNgaUrl(href);
      if (appRoute) {
        event.preventDefault();
        navigate(appRoute);
        return;
      }

      const url = toHttpUrl(href, window.location.href);
      if (!url) return;

      if (url.origin === window.location.origin) {
        event.preventDefault();
        navigate(`${url.pathname}${url.search}${url.hash}`);
        return;
      }

      event.preventDefault();
      void openInInternalBrowser(url.toString());
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [navigate]);

  return null;
}
