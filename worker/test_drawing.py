import re
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

import ezdxf
import pytest

from adapter_kernel import KernelAdapter
from drawing import draw
from test_kernel_geometry import PLATE, inspect, mm, op

SVG = "{http://www.w3.org/2000/svg}"
VIEWS = ["front", "top", "right", "iso"]
HIDDEN = ["front_hidden", "top_hidden", "right_hidden"]


@pytest.fixture(scope="module")
def sheet(tmp_path_factory):
    k = KernelAdapter()
    centre = op("c", "hole", {"diameter": mm(10), "positions": [{"x": mm(5), "y": mm(-8)}], "through_all": True})
    for o in PLATE + [centre]:
        assert k.run(o)["status"] == "succeeded", o["id"]
    return draw(k._build(k.docs["plate"])[0], tmp_path_factory.mktemp("drawing")), inspect(k)


@pytest.fixture(scope="module")
def expected(sheet):
    """The labels the drawing must carry, from the kernel's own inspection of the part, not from the drawing code."""
    bb = sheet[1]["verification"]["bbox_mm"]
    sizes = ["%g" % round(bb["max"][a] - bb["min"][a], 3) for a in "xyz"]
    holes = ["Ø%g" % h["diameter"] for h in sheet[1]["result"]["hole_list"] if h["direction"] == [0, 0, 1]]
    assert Counter(sizes + holes) == Counter(["120", "80", "10", "Ø6", "Ø6", "Ø6", "Ø6", "Ø10"])
    return Counter(sizes + holes)


def _value(label):
    return float(label.lstrip("Ø"))


def _on(p, e):
    if e.dxftype() == "LINE":
        a, b = e.dxf.start, e.dxf.end
        t = max(0.0, min(1.0, (p - a).dot(b - a) / (b - a).magnitude_square))
        return (a + (b - a) * t - p).magnitude < 1e-3
    if e.dxftype() in ("CIRCLE", "ARC"):
        return abs((p - e.dxf.center).magnitude - e.dxf.radius) < 1e-3
    return False


def test_every_dxf_dimension_measures_the_model_value_on_the_drawn_geometry(sheet, expected):
    doc = ezdxf.readfile(sheet[0]["files"]["dxf"])
    msp = doc.modelspace()
    dims = msp.query("DIMENSION")
    labels = [d.dxf.text.replace("%%c", "Ø") for d in dims]
    assert Counter(labels) == expected
    geometry = [e for e in msp if e.dxf.layer in VIEWS + HIDDEN]
    for d, label in zip(dims, labels):
        assert d.get_measurement() == pytest.approx(_value(label), abs=1e-3), label
        for p in (d.dxf.defpoint2, d.dxf.defpoint3):
            assert any(_on(p, e) for e in geometry), "%s is not attached to the drawn part at %s" % (label, p)


def test_three_orthographic_views_and_an_isometric_with_hidden_lines(sheet):
    doc = ezdxf.readfile(sheet[0]["files"]["dxf"])
    msp = doc.modelspace()
    for layer in VIEWS + HIDDEN:
        assert len(msp.query('*[layer=="%s"]' % layer)) > 0, layer
    for layer in HIDDEN:
        assert doc.layers.get(layer).dxf.linetype.upper() == "HIDDEN", layer
    groups = {g.get("id"): g for g in ET.parse(sheet[0]["files"]["svg"]).getroot().iter(SVG + "g")}
    for layer in VIEWS + HIDDEN:
        assert len(groups[layer]) > 0, layer
    for layer in HIDDEN:
        assert groups[layer].get("stroke-dasharray"), layer


def test_svg_labels_equal_the_model_values(sheet, expected):
    texts = [t.text for t in ET.parse(sheet[0]["files"]["svg"]).getroot().iter(SVG + "text") if t.get("class") == "dimension"]
    assert Counter(texts) == expected


def test_pdf_is_well_formed_and_its_labels_equal_the_model_values(sheet, expected):
    data = Path(sheet[0]["files"]["pdf"]).read_bytes()
    assert data.startswith(b"%PDF-1.4") and data.rstrip().endswith(b"%%EOF")
    start = int(re.search(rb"startxref\s+(\d+)", data).group(1))
    assert data[start:].startswith(b"xref")
    offsets = [int(o) for o in re.findall(rb"(\d{10}) 00000 n", data[start:])]
    assert len(offsets) == 5
    for i, o in enumerate(offsets, 1):
        assert data[o:].startswith(b"%d 0 obj" % i), i
    labels = [t.decode("latin-1") for t in re.findall(rb"\(([^)]*)\) Tj", data)]
    assert Counter(labels) == expected


def test_the_report_lists_the_views_and_the_model_values(sheet, expected):
    report = sheet[0]
    assert report["views"] == VIEWS
    assert Counter(d["label"] for d in report["dimensions"]) == expected
