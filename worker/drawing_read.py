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
        holes.append({"diameter": 2 * r, "x": x - length / 2, "y": cy - ty0 - width / 2})

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
    if holes:  # no bare count: the agent's unit guard reads "2 through" as a number without a unit
        request += ", with %s measured from the centre of the plate's top face: %s" % (
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
    for e in lines:
        s, t = e.dxf.start, e.dxf.end
        on_side = abs(s.x - t.x) <= TOL and min(abs(s.x - x0), abs(s.x - x1)) <= TOL
        on_end = abs(s.y - t.y) <= TOL and min(abs(s.y - y0), abs(s.y - y1)) <= TOL
        if not (on_side or on_end):
            raise Unsupported("a %s view that is not a plain rectangle" % view)
    return x0, y0, x1, y1


def _vertical(e, x, y0, y1):
    s, t = e.dxf.start, e.dxf.end
    return abs(s.x - x) <= TOL and abs(t.x - x) <= TOL and min(s.y, t.y) <= y0 + TOL and max(s.y, t.y) >= y1 - TOL
