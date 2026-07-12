/**
 * Valdenn Landing — releases automáticas
 *
 * Busca a versão mais recente via /api/latest (proxy Vercel com cache),
 * que consulta o GitHub Releases do repo público de instaladores.
 */

const GITHUB_OWNER = "juliopagnussat";
const GITHUB_REPO = "valdenn-releases";

/** Só usado se /api/latest falhar (offline / deploy local sem Vercel) */
const FALLBACK_VERSION = "0.2.36";

const WIN_ARCH = "x64";
const MAC_ARCH = "arm64";

const RELEASES_PAGE = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const LOCAL_API = "/api/latest";

function assetUrl(version, arch, ext) {
  const clean = String(version).replace(/^v/i, "");
  const tag = `v${clean}`;
  const file = `Valdenn-${clean}-${arch}.${ext}`;
  return `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/${tag}/${file}`;
}

function windowsUrl(version) {
  return assetUrl(version, WIN_ARCH, "exe");
}

function macosUrl(version) {
  return assetUrl(version, MAC_ARCH, "dmg");
}

function formatCount(n) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

function setVersion(tag) {
  const clean = (tag || "").replace(/^v/i, "") || "—";
  const versionEl = document.getElementById("game-version");
  const footerEl = document.getElementById("footer-version");
  if (versionEl) versionEl.textContent = clean === "—" ? "—" : `v${clean}`;
  if (footerEl) footerEl.textContent = clean === "—" ? "v—" : `v${clean}`;
}

function setDownloadLinks(winHref, macHref) {
  document.querySelectorAll(".btn-download, .btn-download-sm").forEach((btn) => {
    const platform = btn.getAttribute("data-platform");
    if (platform === "windows") {
      btn.href = winHref;
      btn.setAttribute("download", "");
    } else if (platform === "macos") {
      btn.href = macHref;
      btn.setAttribute("download", "");
    }
  });
}

function setCount(platform, count) {
  const el = document.querySelector(`[data-count-for="${platform}"]`);
  if (!el) return;
  if (typeof count !== "number" || Number.isNaN(count)) {
    el.hidden = true;
    return;
  }
  el.textContent = `${formatCount(count)} downloads`;
  el.hidden = false;
}

async function loadRelease() {
  setVersion(FALLBACK_VERSION);
  setDownloadLinks(windowsUrl(FALLBACK_VERSION), macosUrl(FALLBACK_VERSION));

  const releasesLink = document.getElementById("github-releases");
  if (releasesLink) releasesLink.href = RELEASES_PAGE;

  try {
    const res = await fetch(LOCAL_API, { cache: "no-store" });
    if (!res.ok) throw new Error(`API ${res.status}`);

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const version = (data.version || FALLBACK_VERSION).replace(/^v/i, "");
    setVersion(version);

    setDownloadLinks(
      data.windows?.url || windowsUrl(version),
      data.macos?.url || macosUrl(version)
    );

    if (typeof data.windows?.downloads === "number") {
      setCount("windows", data.windows.downloads);
    }
    if (typeof data.macos?.downloads === "number") {
      setCount("macos", data.macos.downloads);
    }
  } catch {
    // Mantém fallback — em produção o /api/latest costuma responder
  }
}

function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function initReveal() {
  const targets = document.querySelectorAll(
    ".about-copy, .class-card, .pillar-card, .shot-frame, .download-card"
  );
  targets.forEach((el) => el.classList.add("reveal"));

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );

  targets.forEach((el) => io.observe(el));
}

function initFooterYear() {
  const el = document.getElementById("footer-year");
  if (el) el.textContent = String(new Date().getFullYear());
}

document.addEventListener("DOMContentLoaded", () => {
  initFooterYear();
  initNav();
  initReveal();
  loadRelease();
});
