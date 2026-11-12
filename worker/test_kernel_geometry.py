import math

import pytest

from adapter_kernel import KernelAdapter


def mm(v):
    return {"value": v, "unit": "mm"}


def op(i, kind, params):
    return {"id": i, "target": {"document": "plate"}, "type": kind, "params": params,
            "preconditions": [], "status": "pending", "result": None, "verification": None, "error": None}


HOLES = [{"x": mm(x), "y": mm(y)} for x, y in ((-50, -30), (50, -30), (50, 30), (-50, 30))]
PLATE = [
    op("p", "new_part", {"name": "plate"}),
    op("s", "sketch_rectangle", {"plane": "top", "width": mm(120), "height": mm(80)}),
    op("x", "extrude", {"sketch": "s", "depth": mm(10)}),
    op("h", "hole", {"diameter": mm(6), "positions": HOLES, "through_all": True}),
]


def analytic_volume(thickness):
    return 120 * 80 * thickness - 4 * math.pi * 3 ** 2 * thickness


def built():
    k = KernelAdapter()
    for o in PLATE:
        assert k.run(o)["status"] == "succeeded", o["id"]
    return k


def inspect(k):
    return k.run(op("i", "inspect", {}))


def assert_bbox(v, z_max):
    for axis, lo, hi in (("x", -60, 60), ("y", -40, 40), ("z", 0, z_max)):
        assert abs(v["bbox_mm"]["min"][axis] - lo) < 1e-3, (axis, v["bbox_mm"])
        assert abs(v["bbox_mm"]["max"][axis] - hi) < 1e-3, (axis, v["bbox_mm"])


def test_plate_with_four_through_holes_matches_its_analytic_values():
    out = inspect(built())
    v = out["verification"]
    assert v["valid"] and v["counts"]["solids"] == 1
    assert abs(v["volume_mm3"] - analytic_volume(10)) / analytic_volume(10) < 1e-4
    assert_bbox(v, 10)
    assert out["result"]["cylindrical_faces"] == 4
    assert out["result"]["features"] == ["p", "s", "x", "h"]


def test_holes_count_concave_full_turns_and_not_bosses_or_fillets():
    k = built()
    for o in (op("b", "sketch_circle", {"plane": "top", "diameter": mm(12)}), op("bx", "extrude", {"sketch": "b", "depth": mm(20)}),
              op("f", "fillet", {"edges": ["x:edge:0"], "radius": mm(5)}),
              op("bh", "hole", {"diameter": mm(4), "depth": mm(8), "positions": [{"x": mm(0), "y": mm(0)}]})):
        assert k.run(o)["status"] == "succeeded", o["id"]
    result = inspect(k)["result"]
    assert result["cylindrical_faces"] == 7  # 4 through holes, the boss, the fillet, the blind hole in the boss
    assert result["holes"] == 5


def test_inspect_lists_the_edges_by_the_names_fillet_takes():
    edges = inspect(built())["result"]["edges"]
    # The plate's four outer vertical edges; each hole's seam is a vertical line too, told apart by its centre.
    vertical = [e["name"] for e in edges if e["type"] == "LINE" and e["direction"] == [0, 0, 1] and [abs(c) for c in e["center"][:2]] == [60, 40]]
    assert len(vertical) == 4 and all(n.startswith("h:edge:") for n in vertical), edges
    k = built()
    assert k.run(op("f", "fillet", {"edges": vertical, "radius": mm(5)}))["status"] == "succeeded"
    assert abs(inspect(k)["verification"]["volume_mm3"] - (analytic_volume(10) - 4 * (25 - 25 * math.pi / 4) * 10)) < 1e-3


def test_inspect_measures_each_hole_round_and_bevel():
    k = built()
    for o in (op("f", "fillet", {"edges": ["x:edge:0"], "radius": mm(5)}), op("c", "chamfer", {"edges": ["x:edge:3"], "distance": mm(3)})):
        assert k.run(o)["status"] == "succeeded", o["id"]
    r = inspect(k)["result"]
    assert sorted((h["diameter"], h["depth"]) for h in r["hole_list"]) == [(6.0, 10.0)] * 4
    assert r["rounds"] == [5.0] and r["bevels"] == [4.243]

    # A C-section: one drill through both flanges makes two holes on one axis, not one.
    k = KernelAdapter()
    c = [(0, 0), (40, 0), (40, 4), (6, 4), (6, 16), (40, 16), (40, 20), (0, 20)]
    for o in (op("p", "new_part", {"name": "c"}), op("s", "sketch_polyline", {"plane": "front", "points": [{"x": mm(x), "y": mm(y)} for x, y in c]}),
              op("x", "extrude", {"sketch": "s", "depth": mm(30)}), op("h", "hole", {"diameter": mm(5), "through_all": True, "positions": [{"x": mm(25), "y": mm(-15)}]})):
        assert k.run(o)["status"] == "succeeded", o["id"]
    r = inspect(k)["result"]
    assert r["holes"] == 2 and sorted((h["diameter"], h["depth"]) for h in r["hole_list"]) == [(5.0, 4.0)] * 2


def test_changing_thickness_to_12_rebuilds_to_the_new_analytic_volume():
    k = built()
    assert k.run(op("m", "modify_dimension", {"parameter": "x.depth", "value": mm(12)}))["status"] == "succeeded"
    v = inspect(k)["verification"]
    assert abs(v["volume_mm3"] - analytic_volume(12)) / analytic_volume(12) < 1e-4
    assert_bbox(v, 12)


def test_an_unknown_sketch_is_a_precondition_failure_and_changes_nothing():
    k = built()
    before = inspect(k)["verification"]["volume_mm3"]
    out = k.run(op("y", "extrude", {"sketch": "nope", "depth": mm(5)}))
    assert out["status"] == "failed" and out["error"]["code"] == "precondition_failed"
    assert inspect(k)["verification"]["volume_mm3"] == before


def triangle(i, points, plane):
    return op(i, "sketch_polyline", {"plane": plane, "points": [{"x": mm(x), "y": mm(y)} for x, y in points]})


@pytest.mark.parametrize("plane", ["top", "front"])
def test_a_polyline_extrudes_along_the_plane_normal_whichever_way_it_winds(plane):
    boxes = []
    for points in (((0, 0), (10, 0), (0, 10)), ((0, 0), (0, 10), (10, 0))):
        k = KernelAdapter()
        for o in (op("p", "new_part", {"name": "t"}), triangle("s", points, plane), op("x", "extrude", {"sketch": "s", "depth": mm(5)})):
            assert k.run(o)["status"] == "succeeded", o["id"]
        v = inspect(k)["verification"]
        assert abs(v["volume_mm3"] - 250) < 1e-6
        boxes.append(v["bbox_mm"])
    for end in ("min", "max"):
        for axis in "xyz":
            assert abs(boxes[0][end][axis] - boxes[1][end][axis]) < 1e-6, boxes
    if plane == "top":
        assert abs(boxes[0]["min"]["z"]) < 1e-6 and abs(boxes[0]["max"]["z"] - 5) < 1e-6


def test_a_hole_or_cut_that_removes_nothing_fails_verification_and_changes_nothing():
    k = built()
    before = inspect(k)["verification"]["volume_mm3"]
    out = k.run(op("h2", "hole", {"diameter": mm(6), "positions": [{"x": mm(500), "y": mm(500)}], "through_all": True}))
    assert out["status"] == "failed" and out["error"]["code"] == "verification_failed", out
    assert k.run(op("c", "sketch_circle", {"plane": "top", "center": {"x": mm(500), "y": mm(0)}, "diameter": mm(6)}))["status"] == "succeeded"
    out = k.run(op("y", "cut", {"sketch": "c", "depth": mm(5)}))
    assert out["status"] == "failed" and out["error"]["code"] == "verification_failed", out
    assert inspect(k)["verification"]["volume_mm3"] == before


@pytest.mark.parametrize("extra", [{}, {"depth": mm(3), "through_all": True}])
def test_a_hole_needs_exactly_one_of_depth_and_through_all(extra):
    out = built().run(op("h2", "hole", {"diameter": mm(2), "positions": [{"x": mm(0), "y": mm(0)}], **extra}))
    assert out["status"] == "failed" and out["error"]["code"] == "precondition_failed", out


@pytest.mark.parametrize("kind, params", [("new_part", {"name": "again"}), ("import", {"artifact": "any.step"})])
def test_a_document_that_exists_is_not_created_again(kind, params):
    k = built()
    out = k.run(op("again", kind, params))
    assert out["status"] == "failed" and out["error"]["code"] == "precondition_failed", out
    assert inspect(k)["result"]["features"] == ["p", "s", "x", "h"]


def test_checkpoint_round_trip_rebuilds_the_same_part(tmp_path):
    k = built()
    path = tmp_path / "plate.ckpt"
    k.save_checkpoint("plate", str(path))
    fresh = KernelAdapter()
    fresh.load_checkpoint("plate", str(path))
    assert abs(inspect(fresh)["verification"]["volume_mm3"] - analytic_volume(10)) / analytic_volume(10) < 1e-4
