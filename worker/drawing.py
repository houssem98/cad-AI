"""A drawing of a part: three third-angle orthographic views and an isometric from the kernel's hidden-line removal,
dimensioned with the kernel's own measurements, written as SVG and DXF by the kernel's writers and as PDF by hand."""
import xml.etree.ElementTree as ET
from io import BytesIO
from pathlib import Path

import ezdxf
from build123d import Compound, Edge, ExportDXF, ExportSVG, GeomType, LineType, Pos, Vector

from adapter_kernel import _measure

GAP, OFFSET, TEXT = 25.0, 10.0, 3.5  # mm on a 1:1 sheet
# The viewer's direction from the part's centre, and the sheet's up direction.
VIEWS = {"front": ((0, -1, 0), (0, 0, 1)), "top": ((0, 0, 1), (0, 1, 0)), "right": ((1, 0, 0), (0, 0, 1)), "iso": ((1, -1, 1), (0, 0, 1))}
SVG_NS = "http://www.w3.org/2000/svg"
PT = 72 / 25.4


def draw(part, folder):
    layers, dims = _sheet(part)
    files = {fmt: str(Path(folder) / ("drawing." + fmt)) for fmt in ("svg", "dxf", "pdf")}
    _svg(layers, dims, files["svg"])
    _dxf(layers, dims, files["dxf"])
    _pdf(layers, dims, files["pdf"])
    return {"views": list(VIEWS), "dimensions": [{"name": n, "value": v, "label": _label(n, v)} for n, v, *_ in dims], "files": files}


def _n(v):
    """Up to three decimals, no trailing zeros: %g keeps only six significant digits, so 1250.125 would read 1250.12."""
    return ("%.3f" % (round(v, 3) + 0.0)).rstrip("0").rstrip(".")


def _label(name, value):
    return ("Ø" if name == "hole" else "") + _n(value)


def _sheet(part):
    """Each view's visible and hidden edges placed on the sheet, and the dimensions as (name, value, p1, p2, a point on the
    dimension line). Only holes along Z are dimensioned: the top view shows them as circles."""
    bb = part.bounding_box()
    c, sx, sy, sz = bb.center(), bb.size.X, bb.size.Y, bb.size.Z
    proj = {n: part.project_to_viewport(tuple(c + Vector(*d) * (bb.diagonal + 1)), up, tuple(c)) for n, (d, up) in VIEWS.items()}
    iso = Compound(proj["iso"][0]).bounding_box()
    at = {"front": (0, 0), "top": (0, sz / 2 + GAP + sy / 2), "right": (sx / 2 + GAP + sy / 2, 0),
          "iso": (sx / 2 + GAP - iso.min.X, sz / 2 + GAP - iso.min.Y)}
    layers = []
    for name, (visible, hidden) in proj.items():
        move = Pos(*at[name])
        layers.append((name, [move * e for e in visible], False))
        if name != "iso":
            layers.append((name + "_hidden", [move * e for e in hidden], True))
    (fx, fy), (tx, ty) = at["front"], at["top"]
    dims = [("length", sx, (fx - sx / 2, fy - sz / 2), (fx + sx / 2, fy - sz / 2), (fx, fy - sz / 2 - OFFSET)),
            ("height", sz, (fx - sx / 2, fy - sz / 2), (fx - sx / 2, fy + sz / 2), (fx - sx / 2 - OFFSET, fy)),
            ("width", sy, (tx - sx / 2, ty - sy / 2), (tx - sx / 2, ty + sy / 2), (tx - sx / 2 - OFFSET, ty))]
    for h in _measure(part)["hole_list"]:
        if h["direction"] == [0, 0, 1]:
            x, y, r = tx + h["point"][0] - c.X, ty + h["point"][1] - c.Y, h["diameter"] / 2
            dims.append(("hole", h["diameter"], (x - r, y), (x + r, y), (x, y)))
    return layers, dims


def _marks(dims):
    """Extension and dimension lines as segments, and each label as (text, x, y, anchor)."""
    segs, texts = [], []
    for name, v, p1, p2, base in dims:
        if p1[1] == p2[1]:
            a, b = (p1[0], base[1]), (p2[0], base[1])
            texts.append((_label(name, v), (a[0] + b[0]) / 2, base[1] + 1 + (v / 2 if name == "hole" else 0), "middle"))
        else:
            a, b = (base[0], p1[1]), (base[0], p2[1])
            texts.append((_label(name, v), base[0] - 1, (a[1] + b[1]) / 2, "end"))
        segs += [s for s in ((p1, a), (p2, b)) if s[0] != s[1]] + [(a, b)]
    return segs, texts


def _svg(layers, dims, path):
    segs, texts = _marks(dims)
    out = ExportSVG(margin=10)
    for name, edges, hidden in layers:
        if edges:
            out.add_layer(name, line_type=LineType.HIDDEN if hidden else LineType.CONTINUOUS)
            out.add_shape(edges, layer=name)
    out.add_layer("dimensions", line_weight=0.05)
    out.add_shape([Edge.make_line(a, b) for a, b in segs], layer="dimensions")
    buf = BytesIO()
    out.write(buf)
    ET.register_namespace("", SVG_NS)
    root = ET.fromstring(buf.getvalue())
    for text, x, y, anchor in texts:  # outside the writer's y-flipped group, so the text reads upright
        ET.SubElement(root, "{%s}text" % SVG_NS, {"x": "%g" % x, "y": "%g" % -y, "font-size": "%g" % TEXT, "font-family": "sans-serif",
                                                  "text-anchor": anchor, "class": "dimension"}).text = text
    ET.ElementTree(root).write(path, encoding="utf-8", xml_declaration=True)


def _dxf(layers, dims, path):
    out = ExportDXF()
    for name, edges, hidden in layers:
        if edges:
            out.add_layer(name, line_type=LineType.HIDDEN if hidden else None)
            out.add_shape(edges, layer=name)
    out.write(path)
    doc = ezdxf.readfile(path)
    msp = doc.modelspace()
    for name, v, p1, p2, base in dims:  # real DXF dimensions, so a CAD reader measures them between their attachment points
        msp.add_linear_dim(base=base, p1=p1, p2=p2, angle=0 if p1[1] == p2[1] else 90, text=_label(name, v).replace("Ø", "%%c"),
                           dimstyle="Standard", override={"dimtxt": TEXT, "dimasz": 2.5}, dxfattribs={"layer": "dimensions"}).render()
    doc.saveas(path)


def _pdf(layers, dims, path):
    segs, texts = _marks(dims)
    lines = [([e.position_at(i / n) for i in range(n + 1)], hidden) for _, edges, hidden in layers for e in edges
             for n in [1 if e.geom_type == GeomType.LINE else 48]]
    lines += [([Vector(*a), Vector(*b)], False) for a, b in segs]
    xs, ys = [p.X for pts, _ in lines for p in pts], [p.Y for pts, _ in lines for p in pts]
    x0, y0 = min(xs) - 15, min(ys) - 15
    w, h = (max(xs) + 15 - x0) * PT, (max(ys) + 15 - y0) * PT
    ops = ["0.5 w 1 J"]
    for pts, hidden in lines:
        path_ops = " ".join("%.3f %.3f %s" % ((p.X - x0) * PT, (p.Y - y0) * PT, "l" if i else "m") for i, p in enumerate(pts))
        ops.append("[%s] 0 d %s S" % ("3 2" if hidden else "", path_ops))
    for text, x, y, anchor in texts:
        shift = {"middle": 0.5, "end": 1.0}[anchor] * 0.55 * TEXT * len(text)  # Helvetica digits are about 0.55 em wide
        ops.append("BT /F1 %.2f Tf %.3f %.3f Td (%s) Tj ET" % (TEXT * PT, (x - x0 - shift) * PT, (y - y0) * PT, text))
    stream = "\n".join(ops).encode("latin-1")  # WinAnsi, where Ø is one byte
    objs = [b"<< /Type /Catalog /Pages 2 0 R >>", b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>" % (w, h),
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
            b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream"]
    data, offsets = bytearray(b"%PDF-1.4\n"), []
    for i, o in enumerate(objs, 1):
        offsets.append(len(data))
        data += b"%d 0 obj\n" % i + o + b"\nendobj\n"
    xref = len(data)
    data += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1) + b"".join(b"%010d 00000 n \n" % o for o in offsets)
    data += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, xref)
    Path(path).write_bytes(bytes(data))
