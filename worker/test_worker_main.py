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
