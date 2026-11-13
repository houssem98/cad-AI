"""Writes the STEP-to-CAD eval fixtures (L6 T3) with build123d solids, never with the operation vocabulary the rebuild
uses, and placed off the origin, plus the grader's planted faults; only files not on disk yet, so a STEP's timestamp does not
churn. Run: python evals/step2cad/make_fixtures.py"""
import math
from pathlib import Path

from build123d import Axis, Circle, Ellipse, Plane, Pos, RegularPolygon, Solid, SlotCenterToCenter, Vector, export_step, extrude, loft

OUT = Path(__file__).parent / "fixtures"


def box(x0, y0, z0, x1, y1, z1):
    return Solid.make_box(x1 - x0, y1 - y0, z1 - z0, Plane.XY.offset(z0).shift_origin((x0, y0, z0)))


def rod(p0, p1, d):
    p0, p1 = Vector(p0), Vector(p1)
    return Solid.make_cylinder(d / 2, (p1 - p0).length, Plane(origin=p0, z_dir=p1 - p0))


def z_rod(x, y, z0, z1, d):
    return rod((x, y, z0), (x, y, z1), d)


FIXTURES = {
    "plate_holes": box(-20, 7, 3, 60, 57, 11) - [z_rod(x, y, 2, 12, 6) for x in (-10, 50) for y in (17, 47)],
    "step_block": box(0, 0, 0, 60, 40, 20) - box(30, -1, 10, 61, 41, 21),
    "pocket_plate": box(0, 0, 0, 100, 60, 10) - box(20, 20, 6, 60, 40, 11) - z_rod(80, 30, 4, 11, 5),
    "boss_plate": box(-30, -30, 0, 30, 30, 6) + z_rod(0, 0, 6, 16, 20) - z_rod(0, 0, -1, 17, 8),
    "counterbore_plate": box(0, 0, 0, 50, 50, 12) - z_rod(25, 25, -1, 13, 6) - z_rod(25, 25, 8, 13, 12),
    "l_bracket": box(0, 0, 0, 60, 40, 8) + box(0, 0, 8, 8, 40, 50) - [z_rod(35, y, -1, 9, 6) for y in (12, 28)]
                 - rod((-1, 20, 30), (9, 20, 30), 6),
    "u_channel": box(0, 0, 0, 100, 40, 5) + box(0, 0, 5, 100, 5, 30) + box(0, 35, 5, 100, 40, 30)
                 - [rod((x, -1, 20), (x, 41, 20), 5) for x in (25, 75)],
    "hex_bore": extrude(Plane.XY.offset(2) * Pos(10, -5) * RegularPolygon(30 / math.sqrt(3), 6), 20) - z_rod(10, -5, 1, 23, 12),
    "t_slot_block": box(0, 0, 0, 80, 60, 40) - box(30, -1, 25, 50, 61, 41) - box(20, -1, 12, 60, 61, 25),
    "flange": z_rod(0, 0, 0, 10, 80) + z_rod(0, 0, 10, 25, 40) - z_rod(0, 0, -1, 26, 20)
              - [z_rod(30 * math.cos(a), 30 * math.sin(a), -1, 11, 8) for a in (i * math.pi / 3 for i in range(6))],
    "pin_pocket": box(0, 0, 0, 100, 100, 20) - box(20, 20, 10, 80, 80, 21) + box(49, 49, 10, 51, 51, 15),
    # Council D5: a large part with one small feature, whose surface area once made a missing hole fit the limit.
    "big_block_hole": box(0, 0, 0, 1000, 1000, 200) - z_rod(500, 500, 197, 201, 1),
    # Council D19: rotated about the axis it is extruded along, a plate is still a prism.
    "rotated_plate": (box(10, 0, 0, 70, 40, 8) - z_rod(40, 20, -1, 9, 10)).rotate(Axis.Z, 30),
    # Out of scope, so each must come back unsupported: a freeform surface, a slot whose round ends are part cylinders, and a
    # block tilted about two axes, so no principal axis runs along its edges.
    "freeform_loft": loft([Circle(20), Plane.XY.offset(30) * Ellipse(25, 10)]),
    "slot_plate": box(0, 0, 0, 80, 40, 6) - extrude(Pos(40, 20) * SlotCenterToCenter(30, 8), 6),
    "tilted_block": box(0, 0, 0, 40, 30, 20).rotate(Axis.X, 20).rotate(Axis.Y, 15),
}

# Council C2: parts with their fixture's volume (within 0.1 %) and bounding box that are not the fixture, so only the grader's
# symmetric difference can tell them apart.
FAULTS = {
    "plate_holes_moved": box(-20, 7, 3, 60, 57, 11) - [z_rod(x, y, 2, 12, 6) for x, y in ((-5, 17), (50, 17), (-10, 47), (50, 47))],
    "l_bracket_mirrored": FIXTURES["l_bracket"].mirror(Plane.YZ.offset(30)),
    "pin_pocket_bare": box(0, 0, 0, 100, 100, 20) - box(20, 20, 10, 80, 80, 21),
    "big_block_hole_bare": box(0, 0, 0, 1000, 1000, 200),
}

if __name__ == "__main__":
    for folder, shapes in ((OUT, FIXTURES), (OUT.parent / "faults", FAULTS)):
        folder.mkdir(exist_ok=True)
        for name, shape in shapes.items():
            assert len(shape.solids()) == 1 and shape.is_valid, name
            if not (folder / ("%s.step" % name)).exists():
                export_step(shape, str(folder / ("%s.step" % name)))
            print(name, round(shape.volume, 3))
