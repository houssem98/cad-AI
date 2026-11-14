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
    if not (OUT / "scan.png").exists():
        (OUT / "scan.png").write_bytes(b"\x89PNG\r\n\x1a\n" + bytes(32))
