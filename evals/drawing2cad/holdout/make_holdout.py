"""Writes the Drawing-to-CAD blind holdout: each in-scope part as a reference STEP and as the DXF its drawing writer makes, built
with build123d solids placed off the origin, never with the operation vocabulary the agent uses; plus out-of-scope parts, a
drawing at a dimension scale factor of 2, a raster file and a drawing whose dimension contradicts its geometry.
Run from the repo root: python evals/drawing2cad/holdout/make_holdout.py"""
import math
import shutil
import sys
import tempfile
from pathlib import Path

import ezdxf
from build123d import Box, Cone, Cylinder, Pos, export_step

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "cad-AI" / "worker"))
from drawing import draw  # noqa: E402

OUT = Path(__file__).parent / "fixtures"


def plate(cx, cy, cz, l, w, t, holes=()):
    """An l x w x t plate centred at (cx, cy) with its bottom on z = cz, minus through holes given as (x, y, diameter) from its centre."""
    return Pos(cx, cy, cz + t / 2) * Box(l, w, t) - [Pos(cx + x, cy + y, cz + t / 2) * Cylinder(d / 2, t + 2) for x, y, d in holes]


def checked(l, w, t, holes):
    """Each hole at least 1 mm inside the plate and 1 mm from every other hole, and the kernel volume the plate minus its holes."""
    for i, (x, y, d) in enumerate(holes):
        assert l / 2 - abs(x) - d / 2 >= 1 and w / 2 - abs(y) - d / 2 >= 1, (x, y, d)
        assert all(math.hypot(x - a, y - b) - (d + e) / 2 >= 1 for a, b, e in holes[:i]), (x, y, d)
    return l * w * t - sum(math.pi * d * d / 4 * t for _, _, d in holes)


BAR = [(-498.375 + i * 110.75, 0 if i % 2 == 0 else 0.75, 4.5 if i % 2 == 0 else 3.375) for i in range(10)]
# In scope: name -> (centre x, y, bottom z, length, width, thickness, holes).
PARTS = {
    "h01": (250, -40, 0, 1063.5, 9.75, 6.125, BAR),
    "h03": (18.25, -9.5, 0, 64.125, 38.5, 0.375, [(-29.5, -16.75, 2.25), (29.5, 16.75, 2.25), (0, 0, 9.5), (-15.125, 10.5, 3.125),
                                                   (15.125, -10.5, 3.125)]),
    "h04": (-200, 300, 0, 75, 75, 75, [(0, 0, 60.125), (33.5, 33.5, 3), (-33.5, -33.5, 2)]),
    "h06": (-317.5, 222.125, 40.5, 1180.375, 412.25, 15.875, [(-575.5, -190.5, 12.7), (575.5, 190.5, 12.7), (0, 0, 25.125),
                                                               (-300.25, 150.125, 6.35), (450.375, -175.75, 8.5), (120.5, 60.25, 17.5),
                                                               (580, -195, 6.35)]),
    "h08": (-130.125, 85.625, -20, 17.375, 311.875, 42.5, []),
    "h10": (7.5, 7.5, 0, 4.875, 3.625, 1.25, [(0.25, 0, 1.125)]),
    "h11": (33.333, -66.667, 0, 101.6, 76.2, 9.525, [(-41.275, -28.575, 6.35), (41.275, -28.575, 6.35), (-41.275, 28.575, 6.35),
                                                      (41.275, 28.575, 6.35), (0, 0, 7.938), (19.05, 12.7, 4.763), (-47.25, 0, 4.763)]),
    "h13": (-75, -60, 12, 52.75, 47.125, 140.5, [(-14.5, 10.25, 9.875), (16.375, -12.625, 4.125)]),
    "h14": (60.5, 45.25, 5, 187.25, 126.125, 3.175, [(-85, -55, 5.5), (85, -55, 5.5), (-85, 55, 5.5), (85, 55, 5.5), (-40.125, 20.375, 11),
                                                      (35.875, -18.5, 11), (0, 0, 3.4), (-60.25, -30.75, 3.4), (62.5, 30.125, 3.4)]),
}

# Out of the reader's scope: countersunk holes, and a step down at one end.
OUTSIDE = {
    "h02": plate(14, -22, 3, 88.5, 54.25, 11.125, [(-30, 0, 6.6), (30, 0, 6.6)])
           - [Pos(14 + x, -22, 3 + 11.125 - 3 + 1.75) * Cone(3.3, 6.8, 3.5) for x in (-30, 30)],
    "h09": plate(-45, 30, 0, 90, 40.5, 24, [(-25, 0, 8)]) - Pos(-45 + 31, 30, 19) * Box(32, 42.5, 14),
}


def write_dxf(part, name):
    with tempfile.TemporaryDirectory() as d:
        out = draw(part, d)
        shutil.copy(out["files"]["dxf"], OUT / ("%s.dxf" % name))
    return out


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (cx, cy, cz, l, w, t, holes) in PARTS.items():
        part, volume = plate(cx, cy, cz, l, w, t, holes), checked(l, w, t, holes)
        assert len(part.solids()) == 1 and part.is_valid, name
        assert abs(part.volume - volume) <= 1e-6 * volume, (name, part.volume, volume)
        export_step(part, str(OUT / ("%s.step" % name)))
        drawn = write_dxf(part, name)
        assert sum(x["name"] == "hole" for x in drawn["dimensions"]) == len(holes), name
        print(name, "part", round(part.volume, 3))
    for name, part in OUTSIDE.items():
        assert len(part.solids()) == 1 and part.is_valid, name
        write_dxf(part, name)
        print(name, "unsupported")
    # A drawing whose length is shown through a dimension at a scale factor of 2.
    l, t = 140, 5
    write_dxf(plate(-60, -35, 0, l, 70.25, t, [(-55, -20, 7), (55, 20, 7), (0, 0, 14.5)]), "h12")
    doc = ezdxf.readfile(OUT / "h12.dxf")
    doc.modelspace().add_linear_dim(base=(0, -t / 2 - 30), p1=(-l / 2, -t / 2), p2=(l / 2, -t / 2), text="<>", dimstyle="Standard",
                                    override={"dimlfac": 2}).render()
    doc.saveas(OUT / "h12.dxf")
    print("h12 unsupported")
    # A drawing whose 36.75 mm width is labelled 37.65.
    write_dxf(plate(90, 12.5, 0, 63.5, 36.75, 4.5, [(-20, 0, 5), (20, 0, 5), (0, 10, 3)]), "h07")
    doc = ezdxf.readfile(OUT / "h07.dxf")
    dims = [x for x in doc.modelspace().query("DIMENSION") if x.dxf.text == "36.75"]
    assert len(dims) == 1, len(dims)
    dims[0].dxf.text = "37.65"
    doc.saveas(OUT / "h07.dxf")
    print("h07 asks")
    (OUT / "h05.png").write_bytes(b"\x89PNG\r\n\x1a\n" + bytes(64))
    print("h05 unsupported")
