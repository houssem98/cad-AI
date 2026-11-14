"""Writes the blind Drawing-to-CAD holdout fixtures: each in-scope part as a reference STEP and as the DXF its drawing writer
makes, built with build123d solids placed off the origin, never with the agent's operation vocabulary; plus out-of-scope
parts and a drawing whose dimension contradicts its geometry. Only files not on disk yet.
Run from the repo root: python evals/drawing2cad/holdout/make_holdout.py"""
import math
import shutil
import sys
import tempfile
from pathlib import Path

import ezdxf
from build123d import Box, Cylinder, Pos, export_step

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "cad-AI" / "worker"))
from drawing import draw  # noqa: E402

OUT = Path(__file__).parent / "fixtures"


def plate(cx, cy, l, w, t, holes=()):
    """An l x w x t plate centred at (cx, cy) on z = 0, minus through holes given as (x, y, diameter) from its centre."""
    return Pos(cx, cy, t / 2) * Box(l, w, t) - [Pos(cx + x, cy + y, t / 2) * Cylinder(d / 2, t + 2) for x, y, d in holes]


# In scope: (cx, cy, length, width, thickness, holes).
SPECS = {
    "h01": (37.5, 48.5, 47.5, 83, 13.5, [(-8, 20.5, 16.5), (19, -38, 2)]),
    "h03": (140, -75.5, 250, 90.5, 45, [(-110, -35, 12), (110, 35, 12), (-110, 35, 8), (110, -35, 8), (0, 0, 30),
                                        (-60, 0, 10.5), (60, 0, 10.5), (0, 40.5, 6.5)]),
    "h04": (-63.5, 17, 22.5, 14, 1.5, [(-7, 2, 3), (7.5, -3.5, 2.5)]),
    "h06": (-210, -33.5, 18.5, 72, 60, []),
    "h08": (155.5, -310, 310, 19, 6.5, [(-120, 3, 5.5), (-60, -3, 5.5), (0, 3, 5.5), (60, -3, 5.5), (120, 3, 5.5),
                                        (151, 0, 4)]),
    "h09": (12.5, 260, 180.5, 32, 0.5, [(-80, 0, 5), (80, 9, 4.5), (0, 0, 20), (40, -12, 3)]),
    "h10": (-95, -140, 64, 58, 9.5, [(-27.5, 24.5, 6), (27.25, 24.25, 7), (-26, -23, 9), (25.5, -22.5, 10), (0, 0, 14.5)]),
    "h12": (-150.5, 95, 136, 58.5, 22, [(-55, -20, 8), (-55, 20, 8), (55, -20, 8), (55, 20, 8), (-20, 0, 18), (20, 0, 18),
                                        (0, 22, 4.5)]),
}
ASKS_SPEC = (-44, 71.5, 95.5, 41, 7, [(-35, 0, 6.5), (35, 10, 5), (10, -12, 9)])
ASKS_FROM, ASKS_TO = "41", "45"  # the width label edited to a number the geometry does not have

# Out of the reader's scope, so each must come back unsupported.
OUT_OF_SCOPE = {
    "h02": plate(-70, 120, 60, 36, 24, [(-18, 0, 7)]) - Pos(-65, 120, 12) * Cylinder(4, 40, rotation=(90, 0, 0)),
    "h07": plate(85, 160, 70, 45, 8, [(20, 0, 6)]) + Pos(70, 160, 13.5) * Cylinder(9, 12),
    "h11": plate(-130, -260, 80, 50, 12, [(-28, 0, 6)]) - Pos(-118, -257, 11) * Box(30, 18, 6),
}


def check_spec(name, spec):
    """Every hole fully inside the plate with >= 1 mm of material around it and >= 1 mm from every other hole."""
    _, _, l, w, _, holes = spec
    for i, (x, y, d) in enumerate(holes):
        assert abs(x) + d / 2 <= l / 2 - 1 and abs(y) + d / 2 <= w / 2 - 1, (name, i)
        for x2, y2, d2 in holes[i + 1:]:
            assert math.hypot(x - x2, y - y2) >= d / 2 + d2 / 2 + 1, (name, i)


def build(name, spec):
    check_spec(name, spec)
    part = plate(*spec)
    _, _, l, w, t, holes = spec
    expected = t * (l * w - sum(math.pi * d * d / 4 for _, _, d in holes))
    assert len(part.solids()) == 1 and part.is_valid, name
    assert abs(part.volume - expected) <= 1e-6 * expected, (name, part.volume, expected)
    return part


def write(name, part, step):
    if step and not (OUT / ("%s.step" % name)).exists():
        export_step(part, str(OUT / ("%s.step" % name)))
    if not (OUT / ("%s.dxf" % name)).exists():
        with tempfile.TemporaryDirectory() as d:
            shutil.copy(draw(part, d)["files"]["dxf"], OUT / ("%s.dxf" % name))


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name, spec in SPECS.items():
        write(name, build(name, spec), True)
    for name, part in OUT_OF_SCOPE.items():
        assert len(part.solids()) == 1 and part.is_valid, name
        write(name, part, False)
    if not (OUT / "h05.dxf").exists():
        with tempfile.TemporaryDirectory() as d:
            doc = ezdxf.readfile(draw(build("h05", ASKS_SPEC), d)["files"]["dxf"])
            dims = [e for e in doc.modelspace().query("DIMENSION") if e.dxf.text == ASKS_FROM]
            assert len(dims) == 1, len(dims)
            dims[0].dxf.text = ASKS_TO
            doc.saveas(OUT / "h05.dxf")
    print("ok", len(SPECS) + len(OUT_OF_SCOPE) + 1)
