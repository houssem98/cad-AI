import hashlib
import json
import uuid
from pathlib import Path

from build123d import (Circle, Cylinder, GeomType, Plane, Polygon, Pos, Rectangle, chamfer, export_brep, export_step,
                       extrude, fillet, import_brep, import_step)

from adapter import Adapter, PreconditionFailed, outcome
from adapter_contract import TYPES

PLANES = {"top": Plane.XY, "front": Plane.XZ, "right": Plane.YZ}
SOLID_STEPS = {"extrude", "cut", "hole", "fillet", "chamfer"}
WRITERS = {"step": export_step, "brep": export_brep}
VOLUME_TOL, BBOX_TOL_MM = 1e-4, 1e-3  # an export counts only when its re-import matches (EXECUTION_AND_VERIFICATION.md)


def _mm(length):
    return length["value"]  # the executor converts every length to mm before the adapter sees it


def _xyz(v):
    return {"x": v.X, "y": v.Y, "z": v.Z}


def _edge_key(e):
    c = e.center()
    return (round(c.X, 6), round(c.Y, 6), round(c.Z, 6), round(e.length, 6))


def _verification(part):
    if part is None:
        origin = {"x": 0, "y": 0, "z": 0}
        return {"valid": False, "volume_mm3": 0, "bbox_mm": {"min": origin, "max": origin}, "counts": {"solids": 0, "faces": 0, "edges": 0}}
    bb, solids = part.bounding_box(), len(part.solids())
    return {"valid": bool(part.is_valid) and solids > 0, "volume_mm3": part.volume, "bbox_mm": {"min": _xyz(bb.min), "max": _xyz(bb.max)},
            "counts": {"solids": solids, "faces": len(part.faces()), "edges": len(part.edges())}}


def _matches(a, b):
    if abs(a["volume_mm3"] - b["volume_mm3"]) > VOLUME_TOL * abs(b["volume_mm3"]):
        return False
    return all(abs(a["bbox_mm"][end][axis] - b["bbox_mm"][end][axis]) <= BBOX_TOL_MM for end in ("min", "max") for axis in "xyz")


def _read(path):
    """A STEP or BREP file as a shape; a file that parses to no solid is refused (a broken STEP imports as nothing)."""
    shape = import_step(path) if Path(path).suffix.lower() in (".step", ".stp") else import_brep(path)
    if not shape.solids():
        raise ValueError("%s holds no solid" % Path(path).name)
    return shape


class KernelAdapter(Adapter):
    """build123d on OpenCascade. A document is its feature history; every change replays it from the start,
    so a failed operation never leaves the document half changed."""

    def __init__(self, artifact_dir=None):
        self.docs = {}
        self.artifact_dir = artifact_dir

    def capabilities(self):
        return {"adapter": "kernel", "version": "1", "documents": ["part"], "exports": sorted(WRITERS),
                "operations": {t: "supported" for t in TYPES}}

    def health(self):
        return {"ok": True}

    def _history(self, op):
        doc = op["target"]["document"]
        if doc not in self.docs:
            raise PreconditionFailed("document %s does not exist" % doc)
        return self.docs[doc]

    def _commit(self, op, history):
        self._build(history)
        self.docs[op["target"]["document"]] = history
        return outcome("succeeded", result={"id": op["id"]})

    def create_part(self, op):
        return self._commit(op, [op])

    import_document = create_part  # the imported file starts the document's history

    def export_document(self, op):
        part, _ = self._build(self._history(op))
        if part is None:
            raise PreconditionFailed("the document has no solid to export")
        if not self.artifact_dir:
            raise RuntimeError("the worker was started without an artifact folder")
        fmt = op["params"]["format"]
        path = Path(self.artifact_dir) / ("%s.%s" % (uuid.uuid4().hex, fmt))
        if not WRITERS[fmt](part, str(path)):
            raise RuntimeError("the kernel did not write %s" % path.name)
        data = path.read_bytes()
        result = {"artifact": op["id"], "path": str(path), "format": fmt, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}
        back = _verification(_read(str(path)))
        if not _matches(back, _verification(part)):
            return outcome("failed", result=result, verification=back,
                           error={"code": "verification_failed", "message": "the re-imported %s differs from the part" % fmt})
        return outcome("succeeded", result=result, verification=back)

    def _append(self, op):
        return self._commit(op, self._history(op) + [op])

    create_sketch = create_feature = apply_material = _append

    def modify_feature(self, op):
        feature, _, name = op["params"]["parameter"].partition(".")
        history = list(self._history(op))
        for i, o in enumerate(history):
            if o["id"] == feature and isinstance(o["params"].get(name), dict) and "value" in o["params"][name]:
                history[i] = {**o, "params": {**o["params"], name: op["params"]["value"]}}
                return self._commit(op, history)
        raise PreconditionFailed("no length parameter %s" % op["params"]["parameter"])

    def inspect_geometry(self, op):
        history = self.docs.get(op["target"]["document"], [])
        part, _ = self._build(history)
        material = next((o["params"]["material"] for o in reversed(history) if o["type"] == "assign_material"), None)
        result = {"features": [o["id"] for o in history], "material": material,
                  "area_mm2": part.area if part is not None else 0,
                  "cylindrical_faces": len(part.faces().filter_by(GeomType.CYLINDER)) if part is not None else 0}
        return outcome("succeeded", result=result, verification=_verification(part))

    def save_checkpoint(self, document, path):
        Path(path).write_text(json.dumps(self.docs.get(document, [])), encoding="utf-8")

    def load_checkpoint(self, document, path):
        if path is None:
            self.docs.pop(document, None)
        else:
            self.docs[document] = json.loads(Path(path).read_text(encoding="utf-8"))

    def _build(self, history):
        part, sketches, snapshots = None, {}, {}
        for o in history:
            kind, p = o["type"], o["params"]
            if kind == "new_part":
                part, sketches, snapshots = None, {}, {}
            elif kind == "import":
                part, sketches = _read(p["artifact"]), {}
                snapshots = {o["id"]: part}
            elif kind.startswith("sketch_"):
                sketches[o["id"]] = self._sketch(kind, p)
            elif kind in SOLID_STEPS:
                if kind != "extrude" and part is None:
                    raise PreconditionFailed("%s %s needs a solid first" % (kind, o["id"]))
                part = getattr(self, "_" + kind)(part, p, sketches, snapshots)
                snapshots[o["id"]] = part
        return part, snapshots

    def _sketch(self, kind, p):
        plane = PLANES[p["plane"]]
        if kind == "sketch_polyline":
            return plane * Polygon(*[(_mm(q["x"]), _mm(q["y"])) for q in p["points"]])
        at = plane * Pos(_mm(p["center"]["x"]), _mm(p["center"]["y"])) if "center" in p else plane
        if kind == "sketch_rectangle":
            return at * Rectangle(_mm(p["width"]), _mm(p["height"]))
        return at * Circle(_mm(p["diameter"]) / 2)

    @staticmethod
    def _profile(p, sketches):
        if p["sketch"] not in sketches:
            raise PreconditionFailed("sketch %s does not exist" % p["sketch"])
        return sketches[p["sketch"]]

    def _extrude(self, part, p, sketches, _):
        d, direction = _mm(p["depth"]), p.get("direction", "normal")
        face = self._profile(p, sketches)
        tool = extrude(face, amount=d / 2, both=True) if direction == "mid_plane" else extrude(face, amount=d if direction == "normal" else -d)
        return tool if part is None else part + tool

    def _cut(self, part, p, sketches, _):
        face = self._profile(p, sketches)
        if p.get("through_all"):
            return part - extrude(face, amount=part.bounding_box().diagonal + 1, both=True)
        return part - extrude(face, amount=_mm(p["depth"]))

    def _hole(self, part, p, *_):
        if p.get("through_all") == ("depth" in p):
            raise PreconditionFailed("a hole needs exactly one of depth and through_all")
        bb, r = part.bounding_box(), _mm(p["diameter"]) / 2
        for q in p["positions"]:
            if p.get("through_all"):
                tool = Pos(_mm(q["x"]), _mm(q["y"]), (bb.min.Z + bb.max.Z) / 2) * Cylinder(r, bb.size.Z + 2)
            else:
                d = _mm(p["depth"])
                tool = Pos(_mm(q["x"]), _mm(q["y"]), bb.max.Z - d / 2 + 0.005) * Cylinder(r, d + 0.01)
            part = part - tool
        return part

    def _fillet(self, part, p, _, snapshots):
        return fillet(self._edges(p["edges"], part, snapshots), radius=_mm(p["radius"]))

    def _chamfer(self, part, p, _, snapshots):
        return chamfer(self._edges(p["edges"], part, snapshots), length=_mm(p["distance"]))

    @staticmethod
    def _edges(names, part, snapshots):
        """An edge name is <feature id>:edge:<n>, the n-th edge of the solid right after that feature,
        found again in the current solid as the edge of the same kind lying on it."""
        found = []
        for name in names:
            feature, _, n = name.partition(":edge:")
            if feature not in snapshots or not n.isdigit() or int(n) >= len(snapshots[feature].edges()):
                raise PreconditionFailed("unknown edge %s" % name)
            ref = sorted(snapshots[feature].edges(), key=_edge_key)[int(n)]
            matches = [e for e in part.edges() if e.geom_type == ref.geom_type and ref.distance_to(e.center()) < 1e-4]
            if not matches:
                raise PreconditionFailed("edge %s no longer exists" % name)
            found.append(max(matches, key=lambda e: e.length))
        return found
