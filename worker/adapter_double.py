import json
import time
from pathlib import Path

from adapter import Adapter, outcome
from adapter_contract import TYPES

_ORIGIN = {"x": 0, "y": 0, "z": 0}


class DoubleAdapter(Adapter):
    """In-memory stand-in for tests only. It holds no geometry, so inspect reports an invalid, empty body,
    and it claims neither export nor import, which would need a file it cannot write or measure.

    hangs and fails name operation types that change the document and then hang or raise; hang_inspect names
    types after which the next inspect hangs. Tests use them to check that the executor restores the checkpoint.
    """

    def __init__(self, lacks=(), hangs=(), fails=(), hang_inspect=()):
        self.lacks = set(lacks) | {"export", "import"}
        self.hangs, self.fails, self.hang_inspect = set(hangs), set(fails), set(hang_inspect)
        self.docs, self.last = {}, {}

    def capabilities(self):
        return {"adapter": "test-double", "version": "1", "documents": ["part"], "exports": [],
                "operations": {t: "unsupported" if t in self.lacks else "supported" for t in TYPES}}

    def health(self):
        return {"ok": True}

    def _record(self, op):
        doc = op["target"]["document"]
        self.docs.setdefault(doc, []).append(op["id"])
        self.last[doc] = op["type"]
        if op["type"] in self.hangs:
            time.sleep(3600)
        if op["type"] in self.fails:
            raise RuntimeError("double: %s failed on purpose" % op["type"])
        return outcome("succeeded", result={"id": op["id"]})

    create_part = create_sketch = create_feature = modify_feature = apply_material = _record

    def inspect_geometry(self, op):
        if self.last.get(op["target"]["document"]) in self.hang_inspect:
            time.sleep(3600)
        return outcome("succeeded", result={"features": list(self.docs.get(op["target"]["document"], []))},
                       verification={"valid": False, "volume_mm3": 0, "bbox_mm": {"min": _ORIGIN, "max": _ORIGIN},
                                     "counts": {"solids": 0, "faces": 0, "edges": 0}})

    def save_checkpoint(self, document, path):
        Path(path).write_text(json.dumps(self.docs.get(document, [])), encoding="utf-8")

    def load_checkpoint(self, document, path):
        self.last.pop(document, None)
        if path is None:
            self.docs.pop(document, None)
        else:
            self.docs[document] = json.loads(Path(path).read_text(encoding="utf-8"))
