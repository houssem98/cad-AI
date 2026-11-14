import ezdxf
import pytest
from build123d import Box, Cylinder, Pos

from adapter import Unsupported
from drawing import draw
from drawing_read import read_drawing


def plate():
    """100 x 60 x 8 mm, off the origin, with two through holes: corner at (-20, -10), so holes sit at (20, 10) and (80, 45)."""
    return Pos(30, 20, 4) * Box(100, 60, 8) - [Pos(x, y, 4) * Cylinder(r, 20) for x, y, r in ((0, 0, 3), (60, 35, 5))]


def test_reads_a_dxf_drawing_back_into_the_part_it_shows(tmp_path):
    spec = read_drawing(draw(plate(), tmp_path)["files"]["dxf"])
    assert spec["kind"] == "spec"
    assert [spec[k] for k in ("length", "width", "height")] == pytest.approx([100, 60, 8], abs=1e-6)
    assert [(h["diameter"], h["x"], h["y"]) for h in spec["holes"]] == [pytest.approx((6, 20, 10)), pytest.approx((10, 80, 45))]
    assert spec["request"] == ("Rectangular plate 100 mm long along X, 60 mm wide along Y and 8 mm thick along Z, with through holes whose "
                               "centres are measured from the plate's corner at minimum X and minimum Y: diameter 6 mm at x 20 mm, y 10 mm; "
                               "diameter 10 mm at x 80 mm, y 45 mm.")


def test_a_dimension_that_contradicts_the_geometry_is_asked_about(tmp_path):
    path = draw(plate(), tmp_path)["files"]["dxf"]
    doc = ezdxf.readfile(path)
    next(d for d in doc.modelspace().query("DIMENSION") if d.dxf.text == "100").dxf.text = "110"
    doc.saveas(path)
    out = read_drawing(path)
    assert out["kind"] == "asks"
    assert "110" in out["question"] and "100" in out["question"]


def test_raster_images_and_unreadable_drawings_are_unsupported(tmp_path):
    scan = tmp_path / "scan.png"
    scan.write_bytes(b"\x89PNG\r\n\x1a\n" + bytes(16))
    with pytest.raises(Unsupported, match="raster"):
        read_drawing(str(scan))
    bare = tmp_path / "bare.dxf"
    doc = ezdxf.new(units=4)
    doc.modelspace().add_line((0, 0), (10, 0))
    doc.saveas(bare)
    with pytest.raises(Unsupported, match="front and top views"):
        read_drawing(str(bare))


@pytest.mark.parametrize("part, why", [
    (Box(60, 40, 10) + Pos(20, 30, 0) * Box(20, 40, 10), "rectangle"),  # an L in the top view
    (Pos(0, 0, 5) * Box(60, 40, 10) + Pos(0, 0, 15) * Cylinder(5, 10), "rectangle"),  # a boss rises above the front view's outline
    (Pos(0, 0, 5) * Box(60, 40, 10) - Pos(0, 0, 8) * Cylinder(4, 4), "through"),  # a blind hole
])
def test_parts_beyond_a_plate_with_through_holes_are_unsupported(tmp_path, part, why):
    with pytest.raises(Unsupported, match=why):
        read_drawing(draw(part, tmp_path)["files"]["dxf"])
