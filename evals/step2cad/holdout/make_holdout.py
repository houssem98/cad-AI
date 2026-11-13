"""Writes the held-out STEP-to-CAD fixtures, read only by the eval runner."""
from pathlib import Path

from build123d import Axis, Keep, Plane, Solid, Vector, export_step

OUT = Path(__file__).parent / "fixtures"


def box(x0, y0, z0, x1, y1, z1):
    return Solid.make_box(x1 - x0, y1 - y0, z1 - z0, Plane.XY.offset(z0).shift_origin((x0, y0, z0)))


def rod(p0, p1, d):
    p0, p1 = Vector(p0), Vector(p1)
    return Solid.make_cylinder(d / 2, (p1 - p0).length, Plane(origin=p0, z_dir=p1 - p0))


def z_rod(x, y, z0, z1, d):
    return rod((x, y, z0), (x, y, z1), d)


def edge_at(shape, axis, a_max, b_max):
    """The single edge parallel to `axis` lying at the max of both other axes."""
    edges = shape.edges().filter_by(axis)
    return [max(edges, key=lambda e: (round(getattr(e.center(), a_max), 6), round(getattr(e.center(), b_max), 6)))]


_tilt = box(40, 30, 0, 110, 70, 15) - z_rod(60, 50, -1, 16, 9)
_round = box(-60, 20, 4, 10, 65, 24)
_bevel = box(15, -45, -10, 85, 5, 12) - z_rod(50, -20, -11, 13, 8)
_h12 = box(-70, -50, 6, -20, -10, 30) - z_rod(-45, -30, 5, 31, 8)

FIXTURES = {
    "h01": box(10, 20, 5, 90, 80, 25) - box(25, 35, 13, 75, 65, 26) + box(32, 42, 13, 44, 58, 21) + z_rod(62, 50, 13, 19, 10),
    "h02": _tilt.rotate(Axis((75, 50, 0), (0, 0, 1)), 20),
    "h03": box(-40, 15, 2, 40, 65, 14) - z_rod(18, 40, 1, 15, 8),
    "h04": box(5, 10, 0, 75, 45, 10) + box(5, 10, 10, 15, 45, 55) - z_rod(62, 20, -1, 11, 7) - box(4, 25, 30, 9, 38, 46),
    "h05": box(20, -30, 5, 100, 10, 15) + box(20, -30, 15, 70, 10, 27) + box(20, -30, 27, 40, 10, 40)
           - rod((19, -10, 20), (45, -10, 20), 8),
    "h06": _round.fillet(6, edge_at(_round, Axis.Y, "X", "Z")),
    "h07": box(-25, 0, -15, 25, 120, 15) - box(-20, -1, -10, 20, 121, 10) - rod((-26, 60, 0), (26, 60, 0), 6),
    "h08": box(30, -60, 10, 100, -10, 45) - box(45, -50, 30, 85, -20, 46) - rod((65, -61, 20), (65, -9, 20), 10),
    "h09": _bevel.chamfer(5, None, edge_at(_bevel, Axis.X, "Y", "Z")),
    "h10": box(100, 100, 0, 160, 150, 8) + z_rod(130, 125, 8, 20, 36) + z_rod(130, 125, 20, 32, 22)
           - z_rod(130, 125, 18, 33, 10),
    "h11": box(55, -35, 3, 115, 15, 18) - z_rod(85, -10, 2, 19, 6.6)
           - Solid.make_cone(3.3, 7.0, 3.7, Plane.XY.offset(14.8).shift_origin((85, -10, 14.8))),
    "h12": _h12.split(Plane(origin=(-28, -10, 30), z_dir=(1, 1, 1)), keep=Keep.BOTTOM),
}

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, shape in FIXTURES.items():
        assert len(shape.solids()) == 1 and shape.is_valid, name
        export_step(shape, str(OUT / ("%s.step" % name)))
        print(name, round(shape.volume, 3))
