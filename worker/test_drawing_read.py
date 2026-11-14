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
    (Pos(0, 0, 10) * Box(60, 40, 20) - Pos(0, 0, 10) * Cylinder(4, 80, rotation=(0, 90, 0)), "rectangle"),  # a hole along X: only the right view shows it
    (Pos(0, 0, 5) * Box(60, 40, 10) - Pos(0, 0, 2) * Cylinder(4, 4), "hidden"),  # a blind hole from below: only hidden lines show it
])
def test_parts_beyond_a_plate_with_through_holes_are_unsupported(tmp_path, part, why):
    with pytest.raises(Unsupported, match=why):
        read_drawing(draw(part, tmp_path)["files"]["dxf"])


def test_a_long_plate_reads_back_with_its_three_decimals(tmp_path):
    """Council S4: the reader's own %g turned 1250.125 into a question that contradicted itself."""
    spec = read_drawing(draw(Pos(0, 0, 4) * Box(1250.125, 60, 8) - Pos(100, 0, 4) * Cylinder(3, 10), tmp_path)["files"]["dxf"])
    assert spec["kind"] == "spec" and spec["length"] == pytest.approx(1250.125, abs=1e-6)
    assert "1250.125 mm long" in spec["request"]


def test_a_drawing_not_at_full_scale_is_unsupported(tmp_path):
    """Council S5: a dimension scale factor of 2 showed true sizes on half-size geometry, and the plate was read at half size."""
    path = draw(plate(), tmp_path)["files"]["dxf"]
    doc = ezdxf.readfile(path)
    doc.modelspace().add_linear_dim(base=(0, -60), p1=(-50, -4), p2=(50, -4), text="<>", dimstyle="Standard", override={"dimlfac": 2}).render()
    doc.saveas(path)
    with pytest.raises(Unsupported, match="1:1"):
        read_drawing(path)


def test_a_hole_label_that_matches_no_drawn_circle_is_asked_about(tmp_path):
    """Council S5: each label was compared only with its own attachment points, never with the circles it names."""
    path = draw(plate(), tmp_path)["files"]["dxf"]
    doc = ezdxf.readfile(path)
    doc.modelspace().add_linear_dim(base=(0, 60), p1=(0, 60), p2=(7, 60), text="%%c7", dimstyle="Standard").render()
    doc.saveas(path)
    out = read_drawing(path)
    assert out["kind"] == "asks" and "7" in out["question"]


def test_a_diameter_in_eighth_millimetre_steps_reads_back_exactly(tmp_path):
    """Found after the fresh holdout's first look: radii were rounded to 3 decimals, so Ø18.375 (r 9.1875) read as 18.376 and then
    contradicted its own label."""
    spec = read_drawing(draw(Pos(0, 0, 4) * Box(100.75, 60.125, 8) - Pos(10.0625, 5, 4) * Cylinder(18.375 / 2, 10), tmp_path)["files"]["dxf"])
    assert spec["kind"] == "spec", spec
    assert spec["holes"][0]["diameter"] == pytest.approx(18.375, abs=1e-9)
    assert spec["holes"][0]["x"] == pytest.approx(100.75 / 2 + 10.0625, abs=1e-9)
