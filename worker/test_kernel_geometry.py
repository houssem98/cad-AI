import math

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


def test_checkpoint_round_trip_rebuilds_the_same_part(tmp_path):
    k = built()
    path = tmp_path / "plate.ckpt"
    k.save_checkpoint("plate", str(path))
    fresh = KernelAdapter()
    fresh.load_checkpoint("plate", str(path))
    assert abs(inspect(fresh)["verification"]["volume_mm3"] - analytic_volume(10)) / analytic_volume(10) < 1e-4
