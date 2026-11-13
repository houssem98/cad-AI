import math

import pytest
from build123d import Box, Pos, Sphere

from adapter import Unsupported
from adapter_kernel import KernelAdapter, _holes
from step2cad import plan


def mm(v):
    return {"value": v, "unit": "mm"}


def run(k, o, doc="d"):
    out = k.run({"target": {"document": doc}, "preconditions": [], "status": "pending", "result": None, "verification": None,
                 "error": None, **o})
    assert out["status"] == "succeeded", out["error"]
    return out


def test_a_sketch_offset_moves_the_sketch_along_its_plane_normal():
    k = KernelAdapter()
    run(k, {"id": "p", "type": "new_part", "params": {"name": "p"}})
    run(k, {"id": "s", "type": "sketch_rectangle", "params": {"plane": "top", "width": mm(10), "height": mm(10), "offset": mm(5)}})
    run(k, {"id": "x", "type": "extrude", "params": {"sketch": "s", "depth": mm(10)}})
    # front is XZ with its normal along -Y, so offset -5 puts the sketch on the face at y = 5 and the cut runs to y = 4
    run(k, {"id": "f", "type": "sketch_circle", "params": {"plane": "front", "diameter": mm(4), "center": {"x": mm(0), "y": mm(10)},
                                                           "offset": mm(-5)}})
    run(k, {"id": "c", "type": "cut", "params": {"sketch": "f", "depth": mm(1)}})
    v = run(k, {"id": "i", "type": "inspect", "params": {}})["verification"]
    assert v["bbox_mm"]["min"]["z"] == pytest.approx(5) and v["bbox_mm"]["max"]["z"] == pytest.approx(15)
    assert v["volume_mm3"] == pytest.approx(1000 - math.pi * 4)
    part, _ = k._build(k.docs["d"])  # a flipped normal keeps volume and box, so probe which side was cut (council C27)
    assert not part.is_inside((0, 4.5, 10)) and part.is_inside((0, -4.5, 10))


def build(ops, doc="d"):
    k = KernelAdapter()
    run(k, {"id": "p", "type": "new_part", "params": {"name": "p"}}, doc)
    for o in ops:
        run(k, o, doc)
    return k


def test_compare_measures_the_symmetric_difference_of_two_documents():
    plate = [{"id": "s", "type": "sketch_rectangle", "params": {"plane": "top", "width": mm(20), "height": mm(10)}},
             {"id": "x", "type": "extrude", "params": {"sketch": "s", "depth": mm(5)}}]
    hole = lambda x: [{"id": "c", "type": "sketch_circle", "params": {"plane": "top", "diameter": mm(2), "center": {"x": mm(x), "y": mm(0)}}},
                      {"id": "h", "type": "cut", "params": {"sketch": "c", "depth": mm(5)}}]
    k = build(plate + hole(5))
    for o in [{"id": "p", "type": "new_part", "params": {"name": "q"}}, *plate, *hole(-5)]:
        run(k, o, "e")
    assert k.compare("d", "d")["difference_mm3"] == pytest.approx(0, abs=1e-9)
    assert k.compare("d", "e")["difference_mm3"] == pytest.approx(2 * math.pi * 5, rel=1e-6)  # the mirror: same volume, same box


def test_an_island_inside_a_pocket_is_rebuilt_not_cut_away():
    # council C1: a pocket's cut used to run after every extrude, erasing a pin standing on its floor
    part = Pos(50, 50, 10) * Box(100, 100, 20) - Pos(50, 50, 16) * Box(60, 60, 12) + Pos(50, 50, 12.5) * Box(2, 2, 5)
    k = build(plan(part, _holes(part)[0]))
    rebuilt, _ = k._build(k.docs["d"])
    assert (part - rebuilt).volume + (rebuilt - part).volume < 1e-6 * part.area


def test_a_rebuilt_part_is_editable_features():
    part = (Pos(10, 0, 0) * Box(40, 20, 10)) - Pos(25, 0, 5) * Box(10, 20, 4)
    ops = plan(part, _holes(part)[0])
    assert {o["type"] for o in ops} <= {"sketch_rectangle", "sketch_circle", "sketch_polyline", "extrude", "cut"}
    k = KernelAdapter()
    run(k, {"id": "p", "type": "new_part", "params": {"name": "p"}})
    for o in ops:
        run(k, o)
    before = run(k, {"id": "i", "type": "inspect", "params": {}})["verification"]
    assert before["volume_mm3"] == pytest.approx(part.volume)
    extrude = next(o for o in ops if o["type"] == "extrude")
    run(k, {"id": "m", "type": "modify_dimension", "params": {"parameter": extrude["id"] + ".depth", "value": mm(30)}})
    after = run(k, {"id": "j", "type": "inspect", "params": {}})["verification"]
    assert after["volume_mm3"] > before["volume_mm3"]


def test_a_freeform_part_is_unsupported():
    with pytest.raises(Unsupported, match="sphere"):
        plan(Sphere(10), [])
