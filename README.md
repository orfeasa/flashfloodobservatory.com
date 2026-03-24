# Flash Flood Observatory

This repository currently contains a small static placeholder site so the publishing path can be verified before the real dashboard is built.

## What's here

- `index.html` and `styles.css` for a lightweight static homepage
- `404.html` for a simple not-found page
- `CNAME` for the custom domain

## Publish path

This setup assumes GitHub Pages is serving the repository from the branch root.

1. Push `main` to GitHub.
2. In the repository settings, set **Pages** to **Deploy from a branch**.
3. Choose the `main` branch and the `/ (root)` folder.
4. In **Pages**, confirm the custom domain is `flashfloodobservatory.com`.

Once that is enabled, opening `https://flashfloodobservatory.com` should show the placeholder page.

## Notes

- If you later switch GitHub Pages to a custom GitHub Actions workflow, GitHub's docs say the `CNAME` file is ignored and no longer required.
- If you later add directories or files that start with `_`, GitHub Pages may ignore them unless you add a `.nojekyll` file.
