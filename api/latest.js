/**
 * Vercel Serverless — proxy com cache para a release mais recente.
 * Evita o rate limit da API pública do GitHub no browser (60 req/h por IP).
 */

const OWNER = "juliopagnussat";
const REPO = "valdenn-releases";
const API = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;

function pickAssets(assets) {
  const list = Array.isArray(assets) ? assets : [];
  const windows = list.find(
    (a) => /\.exe$/i.test(a?.name ?? "") && !/blockmap/i.test(a.name ?? "")
  );
  const macos = list.find(
    (a) => /\.dmg$/i.test(a?.name ?? "") && !/blockmap/i.test(a.name ?? "")
  );
  return { windows, macos };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=3600"
  );

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "Valdenn-Site",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const gh = await fetch(API, { headers });
    if (!gh.ok) {
      const text = await gh.text();
      res.status(gh.status).json({ error: "github_error", detail: text.slice(0, 200) });
      return;
    }

    const data = await gh.json();
    const version = String(data.tag_name || "").replace(/^v/i, "");
    const { windows, macos } = pickAssets(data.assets);

    res.status(200).json({
      version,
      tag: data.tag_name,
      windows: windows
        ? {
            name: windows.name,
            url: windows.browser_download_url,
            downloads: windows.download_count ?? 0,
          }
        : null,
      macos: macos
        ? {
            name: macos.name,
            url: macos.browser_download_url,
            downloads: macos.download_count ?? 0,
          }
        : null,
      updatedAt: data.published_at || data.created_at || null,
    });
  } catch (err) {
    res.status(500).json({ error: "proxy_failed", detail: String(err?.message || err) });
  }
}
