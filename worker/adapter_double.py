from adapter import Adapter, outcome
from adapter_contract import TYPES

_ORIGIN = {"x": 0, "y": 0, "z": 0}


class DoubleAdapter(Adapter):
    """In-memory stand-in for the contract suite only. It holds no geometry, so inspect reports an invalid, empty body."""

    def __init__(self, lacks=()):
        self.lacks = set(lacks)
        self.docs = {}

    def capabilities(self):
        return {"adapter": "test-double", "version": "1", "documents": ["part"], "exports": ["step"],
                "operations": {t: "unsupported" if t in self.lacks else "supported" for t in TYPES}}

    def health(self):
        return {"ok": True}

    def _record(self, op):
        self.docs.setdefault(op["target"]["document"], []).append(op["id"])
        return outcome("succeeded", result={"id": op["id"]})

    create_part = create_sketch = create_feature = modify_feature = apply_material = import_document = _record

    def inspect_geometry(self, op):
        return outcome("succeeded", result={"features": list(self.docs.get(op["target"]["document"], []))},
                       verification={"valid": False, "volume_mm3": 0, "bbox_mm": {"min": _ORIGIN, "max": _ORIGIN},
                                     "counts": {"solids": 0, "faces": 0, "edges": 0}})

    def export_document(self, op):
        return outcome("succeeded", result={"artifact": op["id"]})
