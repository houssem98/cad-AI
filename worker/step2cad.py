"""STEP-to-CAD (L6 T3): the operations that rebuild an imported solid as editable features, or Unsupported.

Scope: prismatic parts, every face planar or cylindrical. Each hole (a concave cylinder closing a full turn) on a principal
axis becomes a circle sketch and a cut. The solid with its holes filled is cut into slabs between the levels of its faces
square to one principal axis; every slab's section must be lines and full circles. A run of one outline over consecutive
slabs becomes a sketch at the run's start (its offset) and an extrude; a run of one inner outline becomes a sketch and a cut.
Extrudes go in an order where each joins the solid so far (the executor keeps one solid after every operation). Of the
three axes the plan with the fewest operations wins."""
from build123d import Circle, GeomType, Polygon, Pos, Rectangle, Vector, extrude
from OCP.BRepAdaptor import BRepAdaptor_Surface

from adapter import Unsupported
from adapter_kernel import PLANES

TOL = 1e-6
AXIS_PLANE = {(0, 0, 1): "top", (1, 0, 0): "right", (0, 1, 0): "front"}


def _r(x):
    return round(x, 6) + 0.0  # no -0.0


def _mm(x):
    return {"value": _r(x), "unit": "mm"}


def _face(e):
    kind, *a = e
    if kind == "circle":
        return Pos(a[0], a[1]) * Circle(a[2] / 2)
    if kind == "rectangle":
        return Pos(a[0], a[1]) * Rectangle(a[2], a[3])
    return Polygon(*a[0])


def _prism(e, plane, w0, w1):
    return extrude(plane.offset(w0) * _face(e), amount=w1 - w0)


def _element(wire, plane):
    """A section outline as ("circle", u, v, d), ("rectangle", u, v, w, h) or ("polyline", points), in the plane's
    coordinates; a polyline runs anticlockwise from its least point, so one outline always reads the same."""
    edges = wire.edges()
    if all(e.geom_type == GeomType.CIRCLE for e in edges):  # a closed wire of arcs on one circle (a STEP may split it)
        rings = {(_r(e.arc_center.X), _r(e.arc_center.Y), _r(e.arc_center.Z), _r(e.radius)) for e in edges}
        if len(rings) == 1:
            c = plane.to_local_coords(edges[0].arc_center)
            return ("circle", _r(c.X), _r(c.Y), _r(2 * edges[0].radius))
    if any(e.geom_type != GeomType.LINE for e in edges):
        raise Unsupported("a section has an arc or a curve; a sketch draws lines and full circles only")
    pt = lambda v: (_r(plane.to_local_coords(v).X), _r(plane.to_local_coords(v).Y))
    rest = [(pt(e.position_at(0)), pt(e.position_at(1))) for e in edges]
    pts, cur = [rest[0][0]], rest.pop(0)[1]
    while rest:
        seg = next(s for s in rest if cur in s)
        rest.remove(seg)
        pts.append(cur)
        cur = seg[1] if seg[0] == cur else seg[0]
    turn = lambda a, b, c: (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
    pts = [p for i, p in enumerate(pts) if abs(turn(pts[i - 1], p, pts[(i + 1) % len(pts)])) > TOL]
    if sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(pts, pts[1:] + pts[:1])) < 0:
        pts.reverse()
    k = pts.index(min(pts))
    pts = pts[k:] + pts[:k]
    us, vs = sorted({p[0] for p in pts}), sorted({p[1] for p in pts})
    if len(pts) == 4 and len(us) == 2 and len(vs) == 2:
        return ("rectangle", _r((us[0] + us[1]) / 2), _r((vs[0] + vs[1]) / 2), _r(us[1] - us[0]), _r(vs[1] - vs[0]))
    return ("polyline", tuple(pts))


def _runs(found, levels):
    """(element, w0, w1) for each stretch of consecutive slabs holding the same element."""
    by = {}
    for i, e in found:
        by.setdefault(e, []).append(i)
    out = []
    for e, idx in by.items():
        start = idx[0]
        for a, b in zip(idx, idx[1:] + [None]):
            if b != a + 1:
                out.append((e, levels[start], levels[a + 1]))
                start = b
    return out


def _slabs(base, name):
    plane, n = PLANES[name], PLANES[name].z_dir
    levels = set()
    for f in base.faces():
        if f.geom_type == GeomType.PLANE:
            a = abs(f.normal_at().dot(n))
            if a > 1 - TOL:
                levels.add(_r(f.center().dot(n)))
            elif a > TOL:
                raise Unsupported("a planar face is tilted to the %s plane" % name)
        elif abs(Vector(BRepAdaptor_Surface(f.wrapped).Cylinder().Axis().Direction()).dot(n)) < 1 - TOL:
            raise Unsupported("a round face is not square to the %s plane" % name)
    levels = sorted(levels)
    bb = base.bounding_box()
    side = 4 * (bb.min.length + bb.max.length) + 2
    outers, inners = [], []
    for i, (a, b) in enumerate(zip(levels, levels[1:])):
        for f in (base & (plane.offset((a + b) / 2) * Rectangle(side, side))).faces():
            outers.append((i, _element(f.outer_wire(), plane)))
            inners += [(i, _element(w, plane)) for w in f.inner_wires()]
    pending, order, acc = sorted(_runs(outers, levels), key=lambda r: r[1]), [], None
    while pending:
        for r in pending:
            s = _prism(r[0], plane, r[1], r[2])
            joined = s if acc is None else acc + s
            if len(joined.solids()) == 1:
                break
        else:
            raise Unsupported("the slabs along the %s plane do not join into one solid" % name)
        acc = joined
        order.append(r)
        pending.remove(r)
    out = [(name, *r, "extrude") for r in order]
    for r in _runs(inners, levels):  # a cut goes before any extrude standing wholly inside it (a pin in a pocket), not after
        hole = _prism(r[0], plane, r[1], r[2])
        k = next((i for i, f in enumerate(out) if f[4] == "extrude" and (_prism(f[1], plane, f[2], f[3]) - hole).volume < TOL), len(out))
        out.insert(k, (name, *r, "cut"))
    return out


def _operations(features):
    ops = []
    for i, (name, e, w0, w1, kind) in enumerate(features, 1):
        a = e[1:]
        params = {"plane": name, **({"diameter": _mm(a[2]), "center": {"x": _mm(a[0]), "y": _mm(a[1])}} if e[0] == "circle" else
                                     {"width": _mm(a[2]), "height": _mm(a[3]), "center": {"x": _mm(a[0]), "y": _mm(a[1])}} if e[0] == "rectangle" else
                                     {"points": [{"x": _mm(u), "y": _mm(v)} for u, v in a[0]]})}
        if w0:
            params["offset"] = _mm(w0)
        ops.append({"id": "s%d" % i, "type": "sketch_" + e[0], "params": params})
        ops.append({"id": "f%d" % i, "type": kind, "params": {"sketch": "s%d" % i, "depth": _mm(w1 - w0)}})
    return ops


def plan(part, holes):
    """The operations after new_part that rebuild part; holes as adapter_kernel._holes gives them."""
    kinds = {f.geom_type for f in part.faces()} - {GeomType.PLANE, GeomType.CYLINDER}
    if kinds:
        raise Unsupported("the part has %s faces; only planar and cylindrical faces are rebuilt" % ", ".join(sorted(k.name.lower() for k in kinds)))
    base, cuts = part, []
    for _, lo, hi, (foot, axis, radius) in holes:
        d = tuple(round(c) for c in axis)
        if d not in AXIS_PLANE or any(abs(c - k) > TOL for c, k in zip(axis, d)):
            raise Unsupported("a hole runs along (%g, %g, %g), which is not a principal axis" % tuple(axis))
        name = AXIS_PLANE[d]
        s = PLANES[name].z_dir.dot(Vector(*d))
        w0, w1 = sorted((lo * s, hi * s))
        c = PLANES[name].to_local_coords(foot)
        e = ("circle", _r(c.X), _r(c.Y), _r(2 * radius))
        base = base + _prism(e, PLANES[name], w0, w1)
        cuts.append((name, e, w0, w1, "cut"))
    plans, reasons = [], []
    for name in PLANES:
        try:
            plans.append(_operations(_slabs(base, name) + cuts))
        except Unsupported as e:
            reasons.append("%s: %s" % (name, e))
    if not plans:
        raise Unsupported("no principal axis gives a prismatic rebuild (%s)" % "; ".join(reasons))
    return min(plans, key=len)
