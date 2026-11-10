import hashlib
from pathlib import Path

import pytest

from adapter_kernel import KernelAdapter
from test_kernel_geometry import PLATE, analytic_volume, assert_bbox, op


@pytest.fixture
def kernel(tmp_path):
    k = KernelAdapter(artifact_dir=str(tmp_path))
    for o in PLATE:
        assert k.run(o)["status"] == "succeeded", o["id"]
    return k


def imported(k, path, doc="copy"):
    out = k.run({**op("im", "import", {"artifact": path}), "target": {"document": doc}})
    return out, k.run({**op("i", "inspect", {}), "target": {"document": doc}})


@pytest.mark.parametrize("fmt", ["step", "brep"])
def test_export_then_reimport_keeps_volume_and_bounding_box(kernel, fmt):
    out = kernel.run(op("e", "export", {"format": fmt}))
    assert out["status"] == "succeeded", out["error"]
    r = out["result"]
    assert Path(r["path"]).suffix == "." + fmt and r["format"] == fmt
    assert hashlib.sha256(Path(r["path"]).read_bytes()).hexdigest() == r["sha256"]
    v = out["verification"]  # measured on the adapter's own re-import of the file it wrote
    assert abs(v["volume_mm3"] - analytic_volume(10)) / analytic_volume(10) < 1e-4
    assert_bbox(v, 10)
    imp, ins = imported(kernel, r["path"])
    assert imp["status"] == "succeeded", imp["error"]
    assert abs(ins["verification"]["volume_mm3"] - analytic_volume(10)) / analytic_volume(10) < 1e-4
    assert_bbox(ins["verification"], 10)
    assert ins["result"]["cylindrical_faces"] == 4


def test_a_corrupted_step_is_refused_and_creates_no_document(kernel, tmp_path):
    bad = tmp_path / "bad.step"
    bad.write_text("ISO-10303-21;\nthis is not a step file\n")
    imp, ins = imported(kernel, str(bad))
    assert imp["status"] == "failed" and imp["error"]["code"] == "kernel_error"
    assert ins["result"]["features"] == []


def test_export_without_a_solid_is_a_precondition_failure(tmp_path):
    k = KernelAdapter(artifact_dir=str(tmp_path))
    k.run(op("p", "new_part", {"name": "empty"}))
    assert k.run(op("e", "export", {"format": "step"}))["error"]["code"] == "precondition_failed"
