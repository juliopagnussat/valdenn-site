/**
 * Valdenn Landing — GitHub Releases + UI
 *
 * Preencha owner/repo com o repositório que publica os instaladores
 * via electron-builder (GitHub Releases).
 *
 * Nomes dos assets (artifactName do jogo):
 *   Valdenn-${version}-x64.exe
 *   Valdenn-${version}-arm64.dmg
 */

const GITHUB_OWNER = "juliopagnussat";
const GITHUB_REPO = "valdenn-releases";

/** Exibido / usado nos links se a API falhar */
const FALLBACK_VERSION = "0.2.36";

const WIN_ARCH = "x64";
const MAC_ARCH = "arm64";

const RELEASES_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const RELEASES_PAGE = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

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

function pickAssets(assets) {
  const list = Array.isArray(assets) ? assets : [];

  const windows = list.find(
    (a) => /\.exe$/i.test(a?.name ?? "") && !/blockmap/i.test(a.name ?? "")
  );

  // Sempre preferir .dmg (não .zip)
  const macos = list.find(
    (a) => /\.dmg$/i.test(a?.name ?? "") && !/blockmap/i.test(a.name ?? "")
  );

  return { windows, macos };
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
  // Links diretos desde o carregamento (não abre a página do GitHub)
  setVersion(FALLBACK_VERSION);
  setDownloadLinks(windowsUrl(FALLBACK_VERSION), macosUrl(FALLBACK_VERSION));

  const releasesLink = document.getElementById("github-releases");
  if (releasesLink) releasesLink.href = RELEASES_PAGE;

  try {
    const res = await fetch(RELEASES_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);

    const data = await res.json();
    const version = (data.tag_name || FALLBACK_VERSION).replace(/^v/i, "");
    if (data.tag_name) setVersion(data.tag_name);

    const { windows, macos } = pickAssets(data.assets);

    // Preferir URL oficial do asset; senão montar pelo padrão do electron-builder
    setDownloadLinks(
      windows?.browser_download_url || windowsUrl(version),
      macos?.browser_download_url || macosUrl(version)
    );

    if (windows && typeof windows.download_count === "number") {
      setCount("windows", windows.download_count);
    }
    if (macos && typeof macos.download_count === "number") {
      setCount("macos", macos.download_count);
    }
  } catch {
    // Mantém os links diretos do FALLBACK_VERSION
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
