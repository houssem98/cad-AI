"""Writes the blind Drawing-to-CAD holdout fixtures: each in-scope part as a reference STEP and as the DXF its drawing writer
makes, built with build123d solids placed off the origin, never with the operation vocabulary the agent uses; plus out-of-scope
parts, a drawing with a dimension scale factor of 2, a raster image, and a drawing whose dimension contradicts its geometry.
Run from the repo root: python evals/drawing2cad/holdout/make_holdout.py"""
import math
import shutil
import sys
import tempfile
from pathlib import Path

import ezdxf
from build123d import Box, Cone, Cylinder, Pos, export_step

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "cad-AI" / "worker"))
from drawing import _n, draw  # noqa: E402

OUT = Path(__file__).parent / "fixtures"


def plate(cx, cy, l, w, t, holes=()):
    """An l x w x t plate centred at (cx, cy) on z = 0, minus through holes given as (x, y, diameter) from its centre."""
    return Pos(cx, cy, t / 2) * Box(l, w, t) - [Pos(cx + x, cy + y, t / 2) * Cylinder(d / 2, t + 2) for x, y, d in holes]


def check(l, w, t, holes):
    """Every hole fully inside with at least 1 mm of material around it, and no two holes closer than 1 mm."""
    for x, y, d in holes:
        assert abs(x) + d / 2 <= l / 2 - 1 and abs(y) + d / 2 <= w / 2 - 1, (x, y, d)
    for i, (x1, y1, d1) in enumerate(holes):
        for x2, y2, d2 in holes[i + 1:]:
            assert math.hypot(x1 - x2, y1 - y2) >= (d1 + d2) / 2 + 1, (x1, y1, x2, y2)


# In scope: (cx, cy, length, width, thickness, holes).
PARTS = {
    "q01": (-210.0, -95.25, 142.875, 63.5, 22.225,
            [(-50.8, 19.05, 7.938), (50.8, -19.05, 7.938), (0, 0, 25.4), (-50.8, -19.05, 11.113), (35.0, 15.875, 4.763)]),
    "q03": (-155.125, 48.0, 310.375, 95.625, 0.25,
            [(-152.375, 0, 3.2), (152.375, 0, 3.2), (-100, 45.375, 2.5), (100, -45.375, 2.5), (-60, -10.5, 12.7), (60, 10.5, 12.7),
             (0, 0, 5.125), (0, 30, 5.125), (-120.5, -30.25, 8.875), (120.5, 30.25, 8.875)]),
    "q04": (-7.5, 12.25, 3.875, 5.25, 2.125, []),
    "q06": (700.25, -310.5, 1250.125, 640.5, 15.875,
            [(x, y, 22.125) for x in (-605, 605) for y in (-298, 298)] + [(0, 0, 150.375), (-300.5, 120.125, 35.75), (300.5, -120.125, 35.75)]),
    "q08": (-33.375, -44.625, 87.375, 87.375, 4.625, [(x, y, 4.5) for x in (-40.312, 40.312) for y in (-40.312, 40.312)] + [(0, 0, 60.125)]),
    "q09": (40.0, -60.375, 18.25, 22.5, 140.75, [(-4.125, -5.5, 4.25), (3.5, 5.0, 6.0)]),
    "q11": (15.0, 230.75, 35.5, 410.25, 6.0, [(0, y, 10.5) for y in (-180, -60, 60, 180)] + [(11.0, 195.0, 6.35), (-11.0, -195.0, 6.35)]),
    "q13": (540.5, -20.0, 1080.0, 14.5, 9.125, [(x, 0, 5.5) for x in (-500, -250, 0, 250, 500)] + [(-525.5, 2.0, 3.375), (525.5, 2.0, 3.375)]),
    "q14": (88.875, 133.5, 200.5, 150.25, 30.125, [(-30.0, 5.0, 100.375), (85.0, -65.0, 2.125)]),
}
# Out of scope: a boss rising above the plate, and a countersunk hole.
OTHER = {
    "q02": plate(-25.5, 70.25, 90.0, 55.5, 7.5, [(-30, -15, 5.0)]) + Pos(-10.5, 75.25, 12.5) * Cylinder(9.0, 12),
    "q12": plate(110.0, -35.0, 70.25, 48.5, 9.0, [(10.0, -5.0, 6.6)]) - Pos(120.0, -40.0, 8.0) * Cone(3.3, 6.3, 3.0),
}
SCALED = (-90.0, -15.5, 64.25, 38.75, 5.5, [(12.0, 8.0, 7.25)])  # q10: its drawing gains a dimension with scale factor 2
CONTRA = (60.5, 75.0, 118.625, 47.625, 11.0, [(-40, 0, 9.0), (40, 0, 9.0)])  # q05: its width labelled 45.625


def drawn(part):
    """The drawing writer's DXF of a part, opened with ezdxf, and its dimensions."""
    with tempfile.TemporaryDirectory() as d:
        out = draw(part, d)
        return ezdxf.readfile(out["files"]["dxf"]), out["dimensions"]


def solid(name, part):
    assert len(part.solids()) == 1 and part.is_valid, name
    return part


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (cx, cy, l, w, t, holes) in PARTS.items():
        check(l, w, t, holes)
        part = solid(name, plate(cx, cy, l, w, t, holes))
        expected = (l * w - sum(math.pi * d * d / 4 for _, _, d in holes)) * t
        assert abs(part.volume - expected) <= 1e-6 * expected, (name, part.volume, expected)
        export_step(part, str(OUT / ("%s.step" % name)))
        with tempfile.TemporaryDirectory() as d:
            out = draw(part, d)
            assert sum(x["name"] == "hole" for x in out["dimensions"]) == len(holes), name
            shutil.copy(out["files"]["dxf"], OUT / ("%s.dxf" % name))
    for name, part in OTHER.items():
        with tempfile.TemporaryDirectory() as d:
            shutil.copy(draw(solid(name, part), d)["files"]["dxf"], OUT / ("%s.dxf" % name))
    cx, cy, l, w, t, holes = SCALED
    check(l, w, t, holes)
    doc, _ = drawn(solid("q10", plate(*SCALED)))
    msp = doc.modelspace()
    ref = next(d for d in msp.query("DIMENSION") if d.dxf.text == _n(l))
    p1, p2, base = ref.dxf.defpoint2, ref.dxf.defpoint3, ref.dxf.defpoint
    msp.add_linear_dim(base=(base.x, base.y - 10), p1=(p1.x, p1.y), p2=(p2.x, p2.y), angle=0, dimstyle="Standard",
                       override={"dimtxt": 3.5, "dimasz": 2.5, "dimlfac": 2}, dxfattribs={"layer": "dimensions"}).render()
    doc.saveas(OUT / "q10.dxf")
    cx, cy, l, w, t, holes = CONTRA
    check(l, w, t, holes)
    doc, _ = drawn(solid("q05", plate(*CONTRA)))
    (dim,) = [d for d in doc.modelspace().query("DIMENSION") if d.dxf.text == _n(w)]
    dim.dxf.text = "45.625"
    doc.saveas(OUT / "q05.dxf")
    (OUT / "q07.jpg").write_bytes(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00" + bytes(64) + b"\xff\xd9")
    print("written", len(list(OUT.iterdir())))
