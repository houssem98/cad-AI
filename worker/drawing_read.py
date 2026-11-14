"""Drawing-to-CAD, vector-first: reads a DXF drawing back into the part it shows, as a spec and a request for the agent. It reads
a drawing at 1:1 in millimetres with named front and top views of a rectangular plate with through holes; every value comes from
the drawing's geometry and must agree with the drawing's own dimensions. Anything else is unsupported, and a contradiction is
asked about, never guessed (I12)."""
from pathlib import Path

import ezdxf

from adapter import Unsupported

RASTER = {".png", ".jpg", ".jpeg", ".bmp", ".gif", ".tif", ".tiff", ".webp"}
TOL = 1e-3
INSUNITS_MM = 4


def _n(v):
    return "%g" % (round(v, 3) + 0.0)


def read_drawing(path):
    ext = Path(path).suffix.lower()
    if ext in RASTER:
        raise Unsupported("a raster image: only vector drawings (DXF) are read")
    if ext != ".dxf":
        raise Unsupported("a %s drawing: only DXF is read" % (ext or "typeless"))
    doc = ezdxf.readfile(path)
    if doc.units != INSUNITS_MM:
        raise Unsupported("a drawing not in millimetres")
    msp = doc.modelspace()
    view = lambda name: list(msp.query('*[layer=="%s"]' % name))
    front, top = view("front"), view("top")
    if not front or not top:
        raise Unsupported("a drawing without named front and top views")
    fx0, fy0, fx1, fy1 = _rectangle(front, "front")
    tx0, ty0, tx1, ty1 = _rectangle(top, "top", circles=True)
    length, width, height = tx1 - tx0, ty1 - ty0, fy1 - fy0
    if abs((fx1 - fx0) - length) > TOL:
        raise Unsupported("front and top views that disagree on the length")

    circles = {}
    for c in (e for e in top if e.dxftype() == "CIRCLE"):  # a blind hole's floor projects onto its rim: one hole
        circles.setdefault((round(c.dxf.center.x, 3), round(c.dxf.center.y, 3), round(c.dxf.radius, 3)), c)
    centres = [k[:2] for k in circles]
    if len(set(centres)) < len(centres):
        raise Unsupported("concentric circles in the top view (a counterbore or a boss)")
    hidden = [e for e in view("front_hidden") if e.dxftype() == "LINE"]
    holes = []
    for (cx, cy, r) in sorted(circles):
        x = cx - tx0
        for side in (x - r, x + r):
            if not any(_vertical(e, fx0 + side, fy0, fy1) for e in hidden):
                raise Unsupported("a hole that is not through (centre x %s mm from the left edge)" % _n(x))
        holes.append({"diameter": 2 * r, "x": x, "y": cy - ty0})

    # A hole along X or Y, a blind hole from below or an inner void shows only in the right view or in hidden lines.
    right = view("right")
    if not right:
        raise Unsupported("a drawing without a right view")
    rx0, ry0, rx1, ry1 = _rectangle(right, "right")
    if abs((rx1 - rx0) - width) > TOL or abs((ry1 - ry0) - height) > TOL:
        raise Unsupported("views that disagree on the part's size")
    _hidden(view("front_hidden"), "front", (fx0, fy0, fx1, fy1), [(h["x"], h["diameter"] / 2) for h in holes])
    _hidden(view("right_hidden"), "right", (rx0, ry0, rx1, ry1), [(h["y"], h["diameter"] / 2) for h in holes])
    for e in view("top_hidden"):
        if not ((e.dxftype() == "LINE" and _on_boundary(e, tx0, ty0, tx1, ty1)) or (e.dxftype() == "CIRCLE"
                and (round(e.dxf.center.x, 3), round(e.dxf.center.y, 3), round(e.dxf.radius, 3)) in circles)):
            raise Unsupported("hidden geometry in the top view that no through hole explains")

    for d in msp.query("DIMENSION"):
        text = d.dxf.text.replace("%%c", "").replace("%%C", "").replace("Ø", "").strip()
        if text in ("", "<>"):
            continue  # the reader shows the measurement itself
        m = d.get_measurement()
        try:
            said = float(text)
        except ValueError:
            return {"kind": "asks", "question": "The drawing has a dimension '%s' that is not a number. What does it measure?" % d.dxf.text}
        if abs(said - m) > TOL:
            return {"kind": "asks", "question": "The drawing says %s where its geometry measures %s mm. Which is right?" % (_n(said), _n(m))}

    request = "Rectangular plate %s mm long along X, %s mm wide along Y and %s mm thick along Z" % (_n(length), _n(width), _n(height))
    # Hole centres from the corner at minimum X and Y, as a drawing dimensions them from datum edges: the agent's spec takes only
    # positive values. No bare count: its unit guard reads "2 through" as a number without a unit.
    if holes:
        request += ", with %s measured from the plate's corner at minimum X and minimum Y: %s" % (
            "through holes whose centres are" if len(holes) > 1 else "a through hole whose centre is",
            "; ".join("diameter %s mm at x %s mm, y %s mm" % (_n(h["diameter"]), _n(h["x"]), _n(h["y"])) for h in holes))
    return {"kind": "spec", "length": length, "width": width, "height": height, "holes": holes, "request": request + "."}


def _rectangle(entities, view, circles=False):
    """The bounds of a view drawn as a plain rectangle: lines only on its boundary, plus circles in the top view."""
    allowed = ("LINE", "CIRCLE") if circles else ("LINE",)
    lines = [e for e in entities if e.dxftype() == "LINE"]
    if not lines or any(e.dxftype() not in allowed for e in entities):
        raise Unsupported("a %s view that is not a plain rectangle" % view)
    xs = [p.x for e in lines for p in (e.dxf.start, e.dxf.end)]
    ys = [p.y for e in lines for p in (e.dxf.start, e.dxf.end)]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    if not all(_on_boundary(e, x0, y0, x1, y1) for e in lines):
        raise Unsupported("a %s view that is not a plain rectangle" % view)
    return x0, y0, x1, y1


def _on_boundary(e, x0, y0, x1, y1):
    s, t = e.dxf.start, e.dxf.end
    return ((abs(s.x - t.x) <= TOL and min(abs(s.x - x0), abs(s.x - x1)) <= TOL)
            or (abs(s.y - t.y) <= TOL and min(abs(s.y - y0), abs(s.y - y1)) <= TOL))


def _hidden(entities, view, box, spans):
    """Hidden lines must be the outline's far side, or the silhouettes and rims of the through holes, each hole given as its
    centre along the view's horizontal axis from the outline's left edge and its radius."""
    x0, y0, x1, y1 = box
    for e in entities:
        kind = e.dxftype()
        if kind == "LINE" and (_on_boundary(e, *box) or any(_vertical(e, x0 + c + s * r, y0, y1) for c, r in spans for s in (-1, 1))):
            continue
        if kind == "SPLINE":
            pts = e.control_points
            if all(min(abs(p[1] - y0), abs(p[1] - y1)) <= TOL for p in pts) and any(
                    all(x0 + c - r - TOL <= p[0] <= x0 + c + r + TOL for p in pts) for c, r in spans):
                continue
        raise Unsupported("hidden geometry in the %s view that no through hole explains" % view)


def _vertical(e, x, y0, y1):
    s, t = e.dxf.start, e.dxf.end
    return abs(s.x - x) <= TOL and abs(t.x - x) <= TOL and min(s.y, t.y) <= y0 + TOL and max(s.y, t.y) >= y1 - TOL
