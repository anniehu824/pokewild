from pathlib import Path
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
BROWSER = ROOT.parent / "browsers/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell"


def check_origin(page, origin):
    response = page.goto(origin, wait_until="networkidle", timeout=60_000)
    assert response and response.ok, f"Could not load {origin}"
    page.wait_for_function("window.POKEMON_DATA?.length === 1025")
    return page.evaluate(
        """async () => {
          const paths = [];
          for (const p of POKEMON_DATA) {
            paths.push(`assets/sprites/${p.art}.png`);
            paths.push(`assets/shiny/${p.art}.png`);
          }
          for (const id of LOCAL_ART) paths.push(`assets/art/${id}.png`);
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 96;
          const context = canvas.getContext('2d', {willReadFrequently: true});
          const failed = [], blank = [];
          for (const src of paths) {
            const image = new Image();
            await new Promise(resolve => {
              image.onload = resolve;
              image.onerror = () => { failed.push(src); resolve(); };
              image.src = src;
            });
            if (!image.naturalWidth) continue;
            context.clearRect(0, 0, 96, 96);
            context.drawImage(image, 0, 0, 96, 96);
            const pixels = context.getImageData(0, 0, 96, 96).data;
            let visible = false;
            for (let i = 3; i < pixels.length; i += 4) {
              if (pixels[i] > 8) { visible = true; break; }
            }
            if (!visible) blank.push(src);
          }
          return {checked: paths.length, failed, blank};
        }"""
    )


def check_fallback(page):
    return page.evaluate(
        """async () => {
          const image = document.createElement('img');
          image.className = 'pokemon-img';
          image.dataset.fallback = 'assets/sprites/25.png';
          image.onerror = () => pokemonImageFallback(image);
          image.src = 'assets/sprites/does-not-exist.png';
          document.body.append(image);
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Fallback timed out')), 5000);
            image.onload = () => { clearTimeout(timeout); resolve(); };
          });
          const result = {
            loaded: image.naturalWidth > 0,
            source: image.getAttribute('src'),
          };
          image.remove();
          return result;
        }"""
    )


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=str(BROWSER),
        headless=True,
        args=["--single-process", "--in-process-gpu", "--no-zygote"],
    )
    page = browser.new_page(ignore_https_errors=True)
    for origin in ("http://127.0.0.1:8765/", "https://anniehu824.github.io/pokewild/"):
        result = check_origin(page, origin)
        print(origin, result)
        assert not result["failed"], f"Images failed to load from {origin}: {result['failed']}"
        assert not result["blank"], f"Images contain no visible pixels at {origin}: {result['blank']}"
        if origin.startswith("http://127.0.0.1"):
            fallback = check_fallback(page)
            print("fallback", fallback)
            assert fallback == {"loaded": True, "source": "assets/sprites/25.png"}
    browser.close()
