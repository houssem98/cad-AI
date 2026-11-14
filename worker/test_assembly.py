import pytest

from adapter import PreconditionFailed, Unsupported
from adapter_kernel import KernelAdapter
from assembly import assemble


def mm(v):
    return {"value": v, "unit": "mm"}


def box(k, doc, w, h, d):
    for i, kind, params in (("p", "new_part", {"name": doc}), ("s", "sketch_rectangle", {"plane": "top", "width": mm(w), "height": mm(h)}),
                            ("x", "extrude", {"sketch": "s", "depth": mm(d)})):
        o = {"id": i, "target": {"document": doc}, "type": kind, "params": params, "preconditions": [], "status": "pending",
             "result": None, "verification": None, "error": None}
        assert k.run(o)["status"] == "succeeded", i
    return k._build(k.docs[doc])[0]


@pytest.fixture(scope="module")
def parts():
    k = KernelAdapter()
    return {"base": box(k, "base", 120, 80, 10), "block": box(k, "block", 20, 20, 15)}


def on_base(instance, x=0):
    return {"kind": "face", "instance": instance, "face": "-z", "to": "base", "to_face": "+z", "offset": [x, 0]}


BASE = {"id": "base", "part": "base"}


def test_two_mated_parts_touch_and_do_not_interfere(parts):
    out = assemble(parts, [BASE, {"id": "lid", "part": "block"}], [on_base("lid")])
    assert out["interference"] == []
    base, lid = (i["verification"] for i in out["instances"])
    assert lid["valid"] and lid["volume_mm3"] == pytest.approx(20 * 20 * 15, rel=1e-9)
    assert lid["bbox_mm"]["min"]["z"] == pytest.approx(base["bbox_mm"]["max"]["z"], abs=1e-6)  # the faces meet: no gap, no overlap
    assert [lid["bbox_mm"]["min"][a] for a in "xy"] == pytest.approx([-10, -10], abs=1e-6)


def test_overlapping_instances_are_reported_with_the_volume_they_share(parts):
    out = assemble(parts, [BASE, {"id": "a", "part": "block"}, {"id": "b", "part": "block"}], [on_base("a"), on_base("b")])
    assert [(c["a"], c["b"]) for c in out["interference"]] == [("a", "b")]
    assert out["interference"][0]["volume_mm3"] == pytest.approx(20 * 20 * 15, rel=1e-6)


def test_the_bom_counts_each_part_by_its_instances(parts):
    out = assemble(parts, [BASE, {"id": "a", "part": "block"}, {"id": "b", "part": "block"}], [on_base("a", -30), on_base("b", 30)])
    assert out["interference"] == []
    assert [(r["part"], r["quantity"]) for r in out["bom"]] == [("base", 1), ("block", 2)]
    assert parts["block"].bounding_box().min.Z == pytest.approx(0, abs=1e-9)  # placing an instance never moves the part itself


def test_a_mate_the_kernel_lacks_is_unsupported_and_a_missing_instance_is_refused(parts):
    with pytest.raises(Unsupported):
        assemble(parts, [BASE, {"id": "a", "part": "block"}], [{**on_base("a"), "kind": "gear"}])
    with pytest.raises(PreconditionFailed):
        assemble(parts, [BASE], [on_base("ghost")])
    with pytest.raises(PreconditionFailed):
        assemble(parts, [BASE, {"id": "a", "part": "block"}], [on_base("a"), on_base("a", 30)])
