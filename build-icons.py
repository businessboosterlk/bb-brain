#!/usr/bin/env python3
"""RETIRED 2026-09-18. The Brain's icon is now built with the whole estate, from one file.

    python3 ~/bb-systems/icons/build_estate_icons.py brain

WHY. This script drew the Brain at 60 percent of the family scale: monogram 197px wide where the
other four BB apps are 333px, so it read faded in the dock beside them. The fix was not a tweak here,
it was moving the geometry to one place every app shares. Running this file would have quietly put
the small mark back, which is why it now delegates instead of drawing. The original is kept at
~/bb-systems/icons/RETIRED-bb-brain-build-icons.py for its docstring, which records why the wordmark
was dropped on 6 September.
"""
import subprocess, sys
from pathlib import Path

TARGET = Path.home() / "bb-systems" / "icons" / "build_estate_icons.py"

if __name__ == "__main__":
    if not TARGET.exists():
        print("the estate icon builder is missing: " + str(TARGET)); sys.exit(1)
    print("build-icons.py is retired, running the estate builder for brain")
    sys.exit(subprocess.run([sys.executable, str(TARGET), "brain"] +
                            [a for a in sys.argv[1:] if a.startswith("--")]).returncode)
