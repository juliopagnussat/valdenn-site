# Valdenn — Landing Page

Site estático de divulgação do idle RPG **Valdenn**.

## Rodar local

```bash
npm install
npm run dev
```

Abra `http://localhost:5173` (Vite abre o browser automaticamente).

## Configuração

Em `js/main.js`, no topo:

```js
const GITHUB_OWNER = "juliopagnussat";
const GITHUB_REPO = "valdenn-releases"; // repo PÚBLICO só de instaladores
```

Os botões de download e os contadores usam `GET /repos/{owner}/{repo}/releases/latest`.

O código-fonte do jogo continua privado em `novo-game`.

## Estrutura

- `index.html` — seções da página
- `css/styles.css` — tema dark medieval (cores do `theme.css` do jogo)
- `js/main.js` — GitHub Releases API
- `logo/` — logo e ícone
- `assets/` — ícones de classe, molduras e textura
