import copy
import hashlib
from pathlib import Path

from operation_schema import DEFS, SCHEMA, validate_operation

TYPES = SCHEMA["properties"]["type"]["enum"]
EXPORT_FORMATS = DEFS["params"]["export"]["properties"]["format"]["enum"]
DOCUMENT_KINDS = {"part"}  # the only kind the cases below build


def _mm(v):
    return {"value": v, "unit": "mm"}


def _op(n, kind, params):
    return {"id": "c%02d" % n, "target": {"document": "doc-contract"}, "type": kind, "params": params,
            "preconditions": [], "status": "pending", "result": None, "verification": None, "error": None}


# One run in order. An operation that creates a sketch, feature or artifact names it with its own id.
CASES = [
    _op(1, "new_part", {"name": "contract"}),
    _op(2, "sketch_rectangle", {"plane": "top", "width": _mm(40), "height": _mm(20)}),
    _op(3, "extrude", {"sketch": "c02", "depth": _mm(10)}),
    _op(4, "sketch_circle", {"plane": "top", "diameter": _mm(6)}),
    _op(5, "cut", {"sketch": "c04", "depth": _mm(5)}),
    _op(6, "hole", {"diameter": _mm(3), "positions": [{"x": _mm(10), "y": _mm(5)}], "through_all": True}),
    _op(7, "sketch_polyline", {"plane": "front", "points": [{"x": _mm(0), "y": _mm(0)}, {"x": _mm(5), "y": _mm(0)}, {"x": _mm(0), "y": _mm(5)}]}),
    _op(8, "fillet", {"edges": ["c03:edge:0"], "radius": _mm(1)}),
    _op(9, "chamfer", {"edges": ["c03:edge:1"], "distance": _mm(0.5)}),
    _op(10, "modify_dimension", {"parameter": "c03.depth", "value": _mm(12)}),
    _op(11, "assign_material", {"material": "aluminium_6061"}),
    _op(12, "inspect", {}),
    _op(13, "export", {"format": "step"}),
    _op(14, "export", {"format": "brep"}),
    {**_op(15, "import", {"artifact": "c13"}), "target": {"document": "doc-contract-copy"}},
]


def check_adapter(adapter):
    """Every problem with the adapter, as text; an empty list means it meets the contract."""
    problems = []
    m = adapter.capabilities()
    for key in ("adapter", "version", "operations", "documents", "exports"):
        if key not in m:
            problems.append("manifest lacks %s" % key)
    ops = m.get("operations", {})
    for kind, claim in ops.items():
        if claim not in ("supported", "unsupported"):
            problems.append("manifest says %r for %s" % (claim, kind))
        elif claim == "supported" and kind not in TYPES:
            problems.append("manifest claims %s, which the schema does not define" % kind)
    problems += ["manifest claims export to %s, which the schema does not define" % f for f in m.get("exports", []) if f not in EXPORT_FORMATS]
    problems += ["manifest claims %s documents, which no contract case builds" % d for d in m.get("documents", []) if d not in DOCUMENT_KINDS]
    if m.get("exports") and ops.get("export") != "supported":
        problems.append("manifest lists export formats but marks export unsupported")
    if not adapter.health().get("ok"):
        problems.append("health() is not ok")
    exported = None  # an adapter imports a file path; the executor resolves artifact ids to paths before this point
    for case in CASES:
        case = copy.deepcopy(case)
        if case["type"] == "import" and exported:
            case["params"]["artifact"] = exported
        claimed = ops.get(case["type"]) == "supported" and (case["type"] != "export" or case["params"]["format"] in m.get("exports", []))
        out = adapter.run(copy.deepcopy(case))
        if case["type"] == "export" and out.get("status") == "succeeded":
            exported = (out.get("result") or {}).get("path", exported)
        label = "%s %s" % (case["id"], case["type"])
        merged = {**case, **{k: out.get(k) for k in ("status", "result", "verification", "error")}}
        problems += ["%s: result breaks the schema at %s" % (label, path) for path, _ in validate_operation(merged)]
        if claimed and out.get("status") != "succeeded":
            problems.append("%s: claimed supported but returned %s" % (label, out.get("status")))
        if not claimed and (out.get("status") != "unsupported" or (out.get("error") or {}).get("code") != "unsupported"):
            problems.append("%s: not claimed but returned %s" % (label, out.get("status")))
        if claimed and case["type"] == "inspect" and out.get("verification") is None:
            problems.append("%s: returned no verification" % label)
        if claimed and case["type"] == "export" and out.get("status") == "succeeded":
            r = out.get("result") or {}
            path = Path(r["path"]) if r.get("path") else None
            if not path or not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != r.get("sha256"):
                problems.append("%s: reported an export with no matching file" % label)
            if out.get("verification") is None:
                problems.append("%s: reported an export with no re-import measurement" % label)
    return problems
