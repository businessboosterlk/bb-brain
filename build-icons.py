#!/usr/bin/env python3
"""THE DIGITAL BRAIN ICON, from one canonical source.

WHY IT EXISTS. Until 2026-09-06 the Brain's home-screen icon was the BUSINESS
BOOSTER wordmark cropped so hard it read "USINESS OOSTER": an illegible white
smear at 60px. Four BB apps had already been fixed on 4 September with a monogram
over an accent pill. The Brain was left behind. Thulaib called it ugly and he was
right.

PRIOR ART, taken deliberately:
  - THE SHAPE comes from the 4 September family (Command Centre, SMM, Video,
    Graphic): BB monogram, accent pill carrying the app's word, near-black tile.
    Five BB apps then read as one family and are told apart by colour alone.
  - THE METHOD comes from bb-systems/gym/build_icon_system.py: one canonical
    vector source, every raster a projection of the same numbers, a documented
    maskable safe zone. Not taken: its PIL dependency, which this Mac lacks.
  - NOT taken: the Command Centre's flat orange slab. The Brain is the premium
    object, so it gets the app's own blue-to-violet gradient, more dark space
    and a glass highlight. And no new mark was invented: a colour is searchable,
    a shape is not, so the family shape stays.

THE MARK. BB in Poppins Bold, white, over a gradient pill reading BRAIN. The
ground is the app's own near-black with two soft lights, the same blue and violet
the 3D brain is lit with and the same gradient its loading bar uses. At 60px only
mass survives: a dark tile, a white monogram, one coloured bar.

THE SAFE ZONE. Android may mask up to 20 percent from every edge, so the maskable
variants draw the mark at 62 percent of the canvas, inside the 80 percent circle.

RENDERING. Poppins Bold is installed on this Mac, so Chrome renders the type
offline with no webfont race. Headless Chrome screenshots the 1024 master and
sips projects every other size from it.

LANDMINES THIS SCRIPT OBEYS (bb-web-learnings, 2026-09-04):
  - headless Chrome exits 0 having rendered nothing, so this verifies by
    DIFFERING file sizes and real dimensions, never by exit code
  - --virtual-time-budget is required or the page is captured before it paints
  - the BB logo is white, so an icon on a light ground samples 255,255,255 and
    disappears: the centre pixel is asserted dark

Usage: python3 build-icons.py [--check]
"""
import subprocess, sys, os, json, struct
from pathlib import Path

HERE = Path(__file__).resolve().parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SIZES = [48, 72, 96, 128, 144, 152, 192, 384, 512]
MASKABLE = [192, 512]
MASTER = 1024

INK = "#0A0D14"      # the tile, one notch above the app's own --bg so it reads as an object
BLUE = "#4F93FF"     # the app's accent, and the 3D brain's rim light
VIOLET = "#A07CF8"   # the second half of the loading gradient
WHITE = "#FFFFFF"


def svg(scale=1.0):
    """The canonical geometry, in a 1000 unit square. scale<1 pulls the mark
    into the Android safe zone. Everything else is a projection of this."""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
  <defs>
    <radialGradient id="lightA" cx="0.22" cy="0.86" r="0.75">
      <stop offset="0" stop-color="{BLUE}" stop-opacity="0.34"/>
      <stop offset="1" stop-color="{BLUE}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="lightB" cx="0.82" cy="0.14" r="0.68">
      <stop offset="0" stop-color="{VIOLET}" stop-opacity="0.26"/>
      <stop offset="1" stop-color="{VIOLET}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="pill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{BLUE}"/>
      <stop offset="1" stop-color="{VIOLET}"/>
    </linearGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{WHITE}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="{WHITE}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="1000" height="1000" fill="{INK}"/>
  <rect width="1000" height="1000" fill="url(#lightA)"/>
  <rect width="1000" height="1000" fill="url(#lightB)"/>

  <g transform="translate(500,500) scale({scale:.3f}) translate(-500,-500)">
    <!-- OPTICALLY CENTRED. The first cut put the mark 4 percent high: the
         monogram's cap top and the pill's foot must straddle y=500, not the
         baseline. Cap top 259, pill foot 740, centre 499.5. -->
    <text x="500" y="490" text-anchor="middle"
          font-family="Poppins" font-weight="700" font-size="330"
          letter-spacing="-12" fill="{WHITE}">BB</text>

    <rect x="242" y="588" width="516" height="152" rx="76" fill="url(#pill)"/>
    <rect x="262" y="597" width="476" height="62" rx="31" fill="url(#gloss)"/>
    <text x="500" y="694" text-anchor="middle"
          font-family="Poppins" font-weight="700" font-size="90"
          letter-spacing="14" fill="{INK}">BRAIN</text>
  </g>
</svg>'''


def png_size(path):
    """width and height straight out of the IHDR, so a broken file is obvious"""
    with open(path, "rb") as f:
        head = f.read(24)
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{path.name} is not a PNG")
    return struct.unpack(">II", head[16:24])


def render(svg_text, out, px):
    """headless Chrome, the only renderer on this Mac that draws SVG properly"""
    html = HERE / ".icon-render.html"
    html.write_text(
        "<!doctype html><meta charset='utf-8'>"
        "<style>html,body{margin:0;padding:0;background:" + INK + ";}"
        "svg{display:block;width:100vw;height:100vh}</style>" + svg_text)
    if out.exists():
        out.unlink()
    subprocess.run([
        CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--force-device-scale-factor=1", f"--window-size={px},{px}",
        "--virtual-time-budget=4000",          # without this Chrome exits 0 having painted nothing
        f"--screenshot={out}", html.as_uri(),
    ], check=True, capture_output=True, timeout=120)
    html.unlink(missing_ok=True)
    if not out.exists():
        raise RuntimeError("Chrome exited without writing " + out.name)
    return out


def sips(src, size, dest):
    subprocess.run(["sips", "--resampleHeightWidth", str(size), str(size),
                    str(src), "--out", str(dest)], check=True, capture_output=True)


def centre_is_dark(path):
    """the fault that produced a white-on-white icon in the estate before"""
    out = subprocess.run(["magick", str(path), "-format", "%[pixel:p{512,180}]", "info:"],
                         capture_output=True, text=True)
    return out.stdout.strip()


def main():
    check_only = "--check" in sys.argv
    src, mask_src = HERE / "icon.svg", HERE / "icon-maskable.svg"

    if not check_only:
        src.write_text(svg(1.0))
        mask_src.write_text(svg(0.62))          # inside Android's 80 percent circle
        master = render(svg(1.0), HERE / ".icon-master.png", MASTER)
        mask_master = render(svg(0.62), HERE / ".icon-mask-master.png", MASTER)
        for s in SIZES:
            sips(master, s, HERE / f"icon-{s}.png")
        sips(master, 180, HERE / "apple-touch-icon.png")
        for s in MASKABLE:
            sips(mask_master, s, HERE / f"icon-maskable-{s}.png")
        master.unlink(missing_ok=True)
        mask_master.unlink(missing_ok=True)

    # ── verify. Every check prints its denominator. ──────────────────────────
    files = [(f"icon-{s}.png", s) for s in SIZES] + \
            [("apple-touch-icon.png", 180)] + \
            [(f"icon-maskable-{s}.png", s) for s in MASKABLE]
    fails, sizes_seen = [], {}
    for name, want in files:
        p = HERE / name
        if not p.exists():
            fails.append(f"{name} missing"); continue
        w, h = png_size(p)
        if (w, h) != (want, want):
            fails.append(f"{name} is {w}x{h}, wanted {want}")
        sizes_seen[name] = p.stat().st_size

    # eight identical byte counts means the render never ran (L: 2026-09-04)
    dupes = len(sizes_seen) - len(set(sizes_seen.values()))
    if dupes:
        fails.append(f"{dupes} icons share a byte count, the render did not run")

    px = centre_is_dark(HERE / "icon-512.png")
    if px and ("255,255,255" in px.replace(" ", "") or "white" in px.lower()):
        fails.append(f"icon-512 samples {px} where the tile should be dark")

    man = json.loads((HERE / "manifest.json").read_text())
    declared = [i["src"].split("?")[0].lstrip("./") for i in man["icons"]]
    missing = [d for d in declared if not (HERE / d).exists()]
    if missing:
        fails.append(f"manifest declares {len(missing)} icons that do not exist: {missing}")

    print(f"icons: {len(files)} files, {len(set(sizes_seen.values()))} distinct byte counts, "
          f"centre pixel {px or 'unread'}, manifest declares {len(declared)}")
    for name, want in files:
        print(f"  {'ok ' if (HERE / name).exists() else 'XX '}{name:26} {want}x{want}  "
              f"{sizes_seen.get(name, 0):>7} bytes")
    if fails:
        print("FAILED: " + "; ".join(fails))
        return 1
    print("ICONS: all green")
    return 0


if __name__ == "__main__":
    sys.exit(main())
