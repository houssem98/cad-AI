import io
import json

from adapter_double import DoubleAdapter
from main import serve
from test_kernel_geometry import op


def replies(adapter, *msgs):
    out = io.StringIO()
    serve(adapter, [json.dumps(m) for m in msgs], out)
    return [json.loads(line) for line in out.getvalue().splitlines()]


def test_the_worker_refuses_an_operation_the_schema_refuses():
    double = DoubleAdapter()
    [r] = replies(double, {"kind": "op", "operation": op("p", "new_part", {"name": "x", "smuggled": 1})})
    assert r["status"] == "failed" and r["error"]["code"] == "validation_failed", r
    assert double.docs == {}


def test_capabilities_name_the_adapter_call_for_each_type():
    [r] = replies(DoubleAdapter(), {"kind": "capabilities"})
    assert r["calls"]["extrude"] == "create_feature" and r["calls"]["export"] == "export_document"


def test_the_kernel_worker_draws_a_document_and_reads_the_drawing_back(tmp_path):
    from adapter_kernel import KernelAdapter
    from test_kernel_geometry import PLATE
    k = KernelAdapter()
    *built, drawn = replies(k, *({"kind": "op", "operation": o} for o in PLATE), {"kind": "draw", "document": "plate", "folder": str(tmp_path)})
    assert all(r["status"] == "succeeded" for r in built)
    assert drawn["status"] == "succeeded" and drawn["views"] == ["front", "top", "right", "iso"], drawn
    [read] = replies(k, {"kind": "read_drawing", "path": drawn["files"]["dxf"]})
    assert read["status"] == "succeeded" and read["drawing"]["kind"] == "spec", read
    assert [read["drawing"][d] for d in ("length", "width", "height")] == [120, 80, 10]
    assert sorted((h["x"], h["y"]) for h in read["drawing"]["holes"]) == [(-50, -30), (-50, 30), (50, -30), (50, 30)]


def test_a_drawing_the_worker_cannot_read_or_draw_is_unsupported(tmp_path):
    scan = tmp_path / "scan.png"
    scan.write_bytes(b"\x89PNG\r\n\x1a\n")
    [read, drawn] = replies(DoubleAdapter(), {"kind": "read_drawing", "path": str(scan)}, {"kind": "draw", "document": "x", "folder": str(tmp_path)})
    assert read["status"] == "unsupported" and "raster" in read["error"]["message"], read
    assert drawn["status"] == "unsupported", drawn
