import json
from pathlib import Path

SCHEMA = json.loads((Path(__file__).parent.parent / "schema" / "cad-operation.schema.json").read_text(encoding="utf-8"))
DEFS = SCHEMA["$defs"]
TYPES = {"null": type(None), "array": list, "object": dict, "string": str, "boolean": bool}


def _type_ok(value, name):
    if name == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    return isinstance(value, TYPES[name])


def _resolve(node):
    while "$ref" in node:
        node = DEFS[node["$ref"].replace("#/$defs/", "")]
    return node


def _check(value, node, path, errs):
    node = _resolve(node)
    if "type" in node:
        allowed = node["type"] if isinstance(node["type"], list) else [node["type"]]
        if not any(_type_ok(value, t) for t in allowed):
            errs.append((path, "expected " + " or ".join(allowed)))
            return
    if "enum" in node and value not in node["enum"]:
        errs.append((path, "must be one of " + ", ".join(node["enum"])))
    if isinstance(value, str) and len(value) < node.get("minLength", 0):
        errs.append((path, "too short"))
    if isinstance(value, list):
        if len(value) < node.get("minItems", 0):
            errs.append((path, "needs at least %d items" % node["minItems"]))
        for i, v in enumerate(value):
            if "items" in node:
                _check(v, node["items"], "%s/%d" % (path, i), errs)
    if isinstance(value, dict):
        for k in node.get("required", []):
            if k not in value:
                errs.append(("%s/%s" % (path, k), "required"))
        for k, v in value.items():
            if k in node.get("properties", {}):
                _check(v, node["properties"][k], "%s/%s" % (path, k), errs)
            elif node.get("additionalProperties") is False:
                errs.append(("%s/%s" % (path, k), "not allowed"))


def validate_operation(op):
    errs = []
    _check(op, SCHEMA, "", errs)
    if isinstance(op, dict) and isinstance(op.get("params"), dict) and op.get("type") in DEFS["params"]:
        _check(op["params"], DEFS["params"][op["type"]], "/params", errs)
    return errs
