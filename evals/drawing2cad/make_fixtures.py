"""Writes the Drawing-to-CAD eval fixtures (L7 T2): each part as a reference STEP and as the DXF its drawing writer makes, built
with build123d solids placed off the origin, never with the operation vocabulary the agent uses; plus a raster scan and a
drawing whose dimension contradicts its geometry. Only files not on disk yet. Run: python evals/drawing2cad/make_fixtures.py"""
import shutil
import sys
import tempfile
from pathlib import Path

import ezdxf
from build123d import Axis, Box, Cylinder, Pos, SlotCenterToCenter, chamfer, export_step, extrude, fillet

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "cad-AI" / "worker"))
from drawing import draw  # noqa: E402

OUT = Path(__file__).parent / "fixtures"


def plate(cx, cy, l, w, t, holes=()):
    """An l x w x t plate centred at (cx, cy) on z = 0, minus through holes given as (x, y, diameter) from its centre."""
    return Pos(cx, cy, t / 2) * Box(l, w, t) - [Pos(cx + x, cy + y, t / 2) * Cylinder(d / 2, t + 2) for x, y, d in holes]


def random_plates(n, seed=20261114):
    """Seeded plates over the brief's ranges, not chosen by hand: sizes 5 to 1500 mm in 0.125 mm steps, 0.5 to 100 mm thick,
    0 to 10 non-overlapping through holes with at least 1 mm of material around each."""
    import random
    rng, out = random.Random(seed), {}
    q = lambda lo, hi: round(rng.uniform(lo, hi) * 8) / 8
    for i in range(n):
        l, w = q(5, 1500), q(5, 400)
        holes = []
        for _ in range(rng.randint(0, 10)):
            d = q(1, max(1, min(l, w) / 4 - 2))
            if d + 2 > min(l, w):
                continue
            x, y = q(-l / 2 + d / 2 + 1, l / 2 - d / 2 - 1), q(-w / 2 + d / 2 + 1, w / 2 - d / 2 - 1)
            if all(((x - a) ** 2 + (y - b) ** 2) ** 0.5 > (d + e) / 2 + 1 for a, b, e in holes):
                holes.append((x, y, d))
        out["random_%02d" % i] = plate(q(-500, 500), q(-500, 500), l, w, q(0.5, 100), holes)
    return out


PARTS = {
    "plate_two_holes": plate(30, 20, 100, 60, 8, [(-30, -20, 6), (30, 15, 10)]),
    "block_plain": plate(-15, 40, 40, 30, 25),
    "plate_four_holes": plate(5, -7, 120, 80, 10, [(x, y, 6) for x in (-50, 50) for y in (-30, 30)]),
    "sheet_three_holes": plate(0, 0, 200, 150, 2, [(0, 0, 12), (-80, 55, 4), (80, -55, 4)]),
    "square_offset_hole": plate(-40, -40, 50, 50, 12, [(10, -12, 8)]),
    # L7 T2 step 5: the kinds of variety the holdout's brief named, so a miss shows here first.
    "many_holes_mixed": plate(12.5, -30, 160.5, 90, 6.5, [(-70, -35, 3), (-70, 35, 3), (70, -35, 4.5), (70, 35, 4.5), (-30, 0, 8.5),
                                                            (30, 0, 8.5), (0, -30, 6), (0, 30, 6)]),
    "thin_near_edges": plate(-60, 25, 75.5, 40, 0.8, [(-35.25, -17.5, 3), (35.25, 17.5, 3), (0, 0, 10)]),
    "thick_block": plate(20, 20, 45, 30.5, 60, [(-12.5, 0, 5.5), (12.5, 0, 5.5)]),
    "long_bar": plate(100, 0, 250, 20, 12, [(x, 0, 6.6) for x in (-100, -50, 0, 50, 100)]),
    "tiny_plate": plate(3, 3, 12, 8.5, 1.5, [(0, 0, 2)]),
    # After the fresh holdout's first look (10 of 14): the kinds of variety its brief named.
    "big_decimals": plate(400, -150, 1250.125, 300.5, 12.375, [(-600, -140, 8.125), (600.25, 140.125, 8.125), (0.5, 0, 22.25), (-300.375, 100.5, 5.5)]),
    "ten_holes": plate(-80, 60, 300, 200, 10, [(x, y, d) for (x, y), d in zip([(-130, -90), (-65, -90), (0, -90), (65, -90), (130, -90),
                                                                               (-130, 90), (-65, 90), (0, 90), (65, 90), (130, 90)], [4, 5, 6, 8, 10, 4, 5, 6, 8, 10])]),
    "tiny_block": plate(2, 2, 6.5, 4.25, 3, [(0, 0, 1.5)]),
    "thick_edge_holes": plate(0, 0, 80, 60, 75.5, [(-36.5, -26.5, 4), (36.5, 26.5, 4), (-36.5, 26.5, 4), (36.5, -26.5, 4)]),
    **random_plates(20),
    # Out of the reader's scope, so each must come back unsupported.
    "side_hole": plate(0, 0, 60, 40, 20) - Pos(0, 0, 10) * Cylinder(4, 80, rotation=(0, 90, 0)),
    "filleted_corners": fillet(plate(0, 0, 60, 40, 10).edges().filter_by(Axis.Z), 5),
    "chamfered_top": chamfer(plate(0, 0, 60, 40, 10).edges().group_by(Axis.Z)[-1], 1.5),
    "pocket": plate(0, 0, 80, 50, 12) - Pos(0, 0, 9) * Box(30, 20, 6),
    "blind_from_below": plate(0, 0, 60, 40, 10) - Pos(0, 0, 2) * Cylinder(4, 4),
    "slot": plate(0, 0, 80, 50, 8) - extrude(Pos(0, 0) * SlotCenterToCenter(30, 8), 8),
    "l_outline": plate(0, 0, 60, 40, 10) + Pos(20, 30, 5) * Box(20, 20, 10),
    "blind_hole": plate(0, 0, 60, 40, 10) - Pos(0, 0, 8) * Cylinder(4, 4),
    "counterbore": plate(0, 0, 60, 40, 12, [(0, 0, 6)]) - Pos(0, 0, 10) * Cylinder(6, 4),
}

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name, part in PARTS.items():
        assert len(part.solids()) == 1 and part.is_valid, name
        if not (OUT / ("%s.step" % name)).exists():
            export_step(part, str(OUT / ("%s.step" % name)))
        if not (OUT / ("%s.dxf" % name)).exists():
            with tempfile.TemporaryDirectory() as d:
                shutil.copy(draw(part, d)["files"]["dxf"], OUT / ("%s.dxf" % name))
        print(name, round(part.volume, 3))
    if not (OUT / "contradiction.dxf").exists():  # the plate's drawing with its 100 mm length labelled 110
        doc = ezdxf.readfile(OUT / "plate_two_holes.dxf")
        next(d for d in doc.modelspace().query("DIMENSION") if d.dxf.text == "100").dxf.text = "110"
        doc.saveas(OUT / "contradiction.dxf")
    if not (OUT / "contradiction_hole.dxf").exists():  # a hole drawn 4.5 mm and labelled 5
        doc = ezdxf.readfile(OUT / "many_holes_mixed.dxf")
        next(d for d in doc.modelspace().query("DIMENSION") if d.dxf.text == "%%c4.5").dxf.text = "%%c5"
        doc.saveas(OUT / "contradiction_hole.dxf")
    if not (OUT / "scaled.dxf").exists():  # true sizes shown at a scale factor of 2 over half-size geometry
        doc = ezdxf.readfile(OUT / "plate_two_holes.dxf")
        doc.modelspace().add_linear_dim(base=(0, -60), p1=(-50, -4), p2=(50, -4), text="<>", dimstyle="Standard", override={"dimlfac": 2}).render()
        doc.saveas(OUT / "scaled.dxf")
    if not (OUT / "mislabelled_hole.dxf").exists():  # a hole label naming a diameter no drawn hole has
        doc = ezdxf.readfile(OUT / "plate_two_holes.dxf")
        doc.modelspace().add_linear_dim(base=(0, 120), p1=(0, 120), p2=(7, 120), text="%%c7", dimstyle="Standard").render()
        doc.saveas(OUT / "mislabelled_hole.dxf")
    if not (OUT / "scan.jpg").exists():
        (OUT / "scan.jpg").write_bytes(bytes([0xFF, 0xD8, 0xFF, 0xE0]) + bytes(32))
    if not (OUT / "scan.png").exists():
        (OUT / "scan.png").write_bytes(b"\x89PNG\r\n\x1a\n" + bytes(32))
