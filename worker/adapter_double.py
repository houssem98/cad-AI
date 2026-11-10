import json
import time
from pathlib import Path

from adapter import Adapter, outcome
from adapter_contract import TYPES

_ORIGIN = {"x": 0, "y": 0, "z": 0}


class DoubleAdapter(Adapter):
    """In-memory stand-in for tests only. It holds no geometry, so inspect reports an invalid, empty body.

    hangs and fails name operation types that change the document and then hang or raise, so tests can
    check that the executor restores the checkpoint.
    """

    def __init__(self, lacks=(), hangs=(), fails=()):
        self.lacks, self.hangs, self.fails = set(lacks), set(hangs), set(fails)
        self.docs = {}

    def capabilities(self):
        return {"adapter": "test-double", "version": "1", "documents": ["part"], "exports": ["step"],
                "operations": {t: "unsupported" if t in self.lacks else "supported" for t in TYPES}}

    def health(self):
        return {"ok": True}

    def _record(self, op):
        self.docs.setdefault(op["target"]["document"], []).append(op["id"])
        if op["type"] in self.hangs:
            time.sleep(3600)
        if op["type"] in self.fails:
            raise RuntimeError("double: %s failed on purpose" % op["type"])
        return outcome("succeeded", result={"id": op["id"]})

    create_part = create_sketch = create_feature = modify_feature = apply_material = import_document = _record

    def inspect_geometry(self, op):
        return outcome("succeeded", result={"features": list(self.docs.get(op["target"]["document"], []))},
                       verification={"valid": False, "volume_mm3": 0, "bbox_mm": {"min": _ORIGIN, "max": _ORIGIN},
                                     "counts": {"solids": 0, "faces": 0, "edges": 0}})

    def export_document(self, op):
        return outcome("succeeded", result={"artifact": op["id"]})

    def save_checkpoint(self, document, path):
        Path(path).write_text(json.dumps(self.docs.get(document, [])), encoding="utf-8")

    def load_checkpoint(self, document, path):
        if path is None:
            self.docs.pop(document, None)
        else:
            self.docs[document] = json.loads(Path(path).read_text(encoding="utf-8"))
