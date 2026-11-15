from pathlib import Path
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
BROWSER = ROOT.parent / "browsers/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell"


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=str(BROWSER),
        headless=True,
        args=["--single-process", "--in-process-gpu", "--no-zygote"],
    )
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto("http://127.0.0.1:8765/", wait_until="networkidle")
    page.wait_for_function("window.POKEMON_DATA?.length === 1025")

    assert page.evaluate("APP_VERSION") == "1.5.0"
    assert page.evaluate("[state.quickBalls,state.netBalls,state.duskBalls,state.repeatBalls]") == [2, 2, 2, 2]

    chances = page.evaluate(
        """() => {
          const water = BY_ID[7], grass = BY_ID[1];
          const waterEnemy = E.makeOwned(water, 8), grassEnemy = E.makeOwned(grass, 8);
          const chance = (species, enemy, ball, context = {}) => E.catchChance(species, enemy, ball, 0, 'balanced', context);
          return {
            baseWater: chance(water, waterEnemy, 'poke'),
            quickFirst: chance(water, waterEnemy, 'quick', {turn: 1}),
            quickLater: chance(water, waterEnemy, 'quick', {turn: 2}),
            netWater: chance(water, waterEnemy, 'net'),
            netGrass: chance(grass, grassEnemy, 'net'),
            baseGrass: chance(grass, grassEnemy, 'poke'),
            duskAtDusk: chance(grass, grassEnemy, 'dusk', {habitat: 'dusk'}),
            duskElsewhere: chance(grass, grassEnemy, 'dusk', {habitat: 'meadow'}),
            repeatCaught: chance(grass, grassEnemy, 'repeat', {caught: true}),
            repeatNew: chance(grass, grassEnemy, 'repeat', {caught: false}),
          };
        }"""
    )
    assert chances["quickFirst"] > chances["baseWater"] == chances["quickLater"]
    assert chances["netWater"] > chances["baseWater"]
    assert chances["netGrass"] == chances["baseGrass"]
    assert chances["duskAtDusk"] > chances["duskElsewhere"] == chances["baseGrass"]
    assert chances["repeatCaught"] > chances["repeatNew"] == chances["baseGrass"]

    migrated = page.evaluate(
        """() => {
          const old = E.freshState(BY_ID);
          for (const key of ['quickBalls','netBalls','duskBalls','repeatBalls']) delete old[key];
          return E.validateSave(old, BY_ID);
        }"""
    )
    assert [migrated[key] for key in ("quickBalls", "netBalls", "duskBalls", "repeatBalls")] == [2, 2, 2, 2]

    page.evaluate("go('bag')")
    page.wait_for_function("page === 'bag'")
    for name in ("Quick Balls", "Net Balls", "Dusk Balls", "Repeat Balls"):
        assert name in page.locator("main").inner_text()
    page.screenshot(path=str(ROOT.parent / "special-balls-backpack.png"), full_page=True)

    page.evaluate("startEncounter(7, 'river')")
    page.wait_for_function("page === 'battle'")
    options = page.locator("#battle-ball option").all_text_contents()
    assert any(text.startswith("Quick Ball") for text in options)
    assert any(text.startswith("Net Ball") for text in options)
    assert any(text.startswith("Dusk Ball") for text in options)
    assert any(text.startswith("Repeat Ball") for text in options)
    page.screenshot(path=str(ROOT.parent / "special-balls-battle.png"), full_page=True)
    page.select_option("#battle-ball", "net")
    before = page.evaluate("state.netBalls")
    page.evaluate("Math.random=()=>0; throwBall()")
    page.wait_for_function("battle.done")
    assert page.evaluate("state.netBalls") == before  # one thrown, one earned for the river encounter
    assert not errors, errors
    print({"ball_types": 7, "special_ball_rules": "passed", "migration": "passed", "browser_errors": errors})
    browser.close()
