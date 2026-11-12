import base64
import hashlib
import json
import tempfile
import uuid
from pathlib import Path

import math

from build123d import (Circle, Cylinder, GeomType, Plane, Polygon, Pos, Rectangle, Vector, chamfer, export_brep, export_gltf,
                       export_step, extrude, fillet, import_brep, import_step)
from OCP.BRepAdaptor import BRepAdaptor_Surface

from adapter import Adapter, PreconditionFailed, VerificationFailed, outcome
from adapter_contract import TYPES

PLANES = {"top": Plane.XY, "front": Plane.XZ, "right": Plane.YZ}
SOLID_STEPS = {"extrude", "cut", "hole", "fillet", "chamfer"}
WRITERS = {"step": export_step, "brep": export_brep}
VOLUME_TOL, BBOX_TOL_MM = 1e-4, 1e-3  # an export counts only when its re-import matches (EXECUTION_AND_VERIFICATION.md)
REMOVED_MIN_MM3 = 1e-6


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


def _measure(part):
    """The features a grader compares. A hole is a concave cylinder closing a full turn over one stretch of its axis, so a
    cylinder split into faces counts once and two holes on one axis count twice. Rounds are the radii of convex part-turn
    cylinders (fillets); bevels are the widths of planar faces on no axis plane (chamfers, hexagon sides)."""
    holes, rounds, bevels = _holes(part)
    holes = [{"diameter": round(2 * key[6], 3), "depth": round(hi - lo, 3), "point": list(key[:3]), "direction": list(key[3:6])}
             for key, lo, hi, _ in holes]
    return {"holes": len(holes), "hole_list": holes, "rounds": sorted(rounds), "bevels": sorted(bevels)}


def _holes(part):
    """Each hole as (key, lo, hi, axis): key is the axis foot point nearest the origin, the axis direction and the radius,
    rounded; lo and hi bound the hole along its axis from that foot; axis is (foot, direction, radius) unrounded. Also the
    rounds and bevels _measure reports."""
    groups, axes, rounds, bevels = {}, {}, [], []
    for f in part.faces():
        if f.geom_type == GeomType.PLANE:
            n = f.normal_at()
            if max(abs(n.X), abs(n.Y), abs(n.Z)) < 1 - 1e-6:
                bevels.append(round(f.area / max(e.length for e in f.edges()), 3))
            continue
        if f.geom_type != GeomType.CYLINDER:
            continue
        s = BRepAdaptor_Surface(f.wrapped)
        cyl = s.Cylinder()
        o, d = Vector(cyl.Axis().Location()), Vector(cyl.Axis().Direction())
        p = f.position_at(0.5, 0.5)
        turn = s.LastUParameter() - s.FirstUParameter()
        if f.normal_at(p).dot(p - o - d * (p - o).dot(d)) >= 0:
            if turn < 2 * math.pi - 1e-6:
                rounds.append(round(cyl.Radius(), 3))
            continue
        if max((d.X, d.Y, d.Z), key=abs) < 0:
            d = -d
        foot = o - d * o.dot(d)
        key = tuple(round(c, 4) for c in (foot.X, foot.Y, foot.Z, d.X, d.Y, d.Z, cyl.Radius()))
        ts = [(Vector(v.X, v.Y, v.Z) - foot).dot(d) for v in f.vertices()]
        groups.setdefault(key, []).append([min(ts), max(ts), turn])
        axes.setdefault(key, (foot, d, cyl.Radius()))
    holes = []
    for key, stretches in groups.items():
        merged = []
        for lo, hi, turn in sorted(stretches):
            if merged and lo <= merged[-1][1] + 1e-6:
                merged[-1][1], merged[-1][2] = max(merged[-1][1], hi), merged[-1][2] + turn
            else:
                merged.append([lo, hi, turn])
        holes += [(key, lo, hi, axes[key]) for lo, hi, turn in merged if turn > 2 * math.pi - 1e-6]
    return holes, rounds, bevels


def _edge_list(part, feature):
    """The solid's edges under the names fillet and chamfer take (<last solid feature>:edge:<n>), so a caller can choose them."""
    out = []
    for i, e in enumerate(sorted(part.edges(), key=_edge_key)):
        d = {"name": "%s:edge:%d" % (feature, i), "type": e.geom_type.name, "center": [round(c, 3) for c in e.center()],
             "length": round(e.length, 3)}
        if e.geom_type == GeomType.LINE:
            v = (e.position_at(1) - e.position_at(0)).normalized()
            d["direction"] = [round(abs(c), 3) + 0 for c in v]  # unsigned, so an edge reads the same either way
        out.append(d)
    return out


def _matches(a, b):
    if abs(a["volume_mm3"] - b["volume_mm3"]) > VOLUME_TOL * abs(b["volume_mm3"]):
        return False
    return all(abs(a["bbox_mm"][end][axis] - b["bbox_mm"][end][axis]) <= BBOX_TOL_MM for end in ("min", "max") for axis in "xyz")


def _removing(before, after, what):
    if before.volume - after.volume <= REMOVED_MIN_MM3:
        raise VerificationFailed("%s removed no material" % what)
    return after


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
        if op["target"]["document"] in self.docs:
            raise PreconditionFailed("document %s already exists" % op["target"]["document"])
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
        part, snapshots = self._build(history)
        material = next((o["params"]["material"] for o in reversed(history) if o["type"] == "assign_material"), None)
        result = {"features": [o["id"] for o in history], "material": material,
                  "area_mm2": part.area if part is not None else 0,
                  "cylindrical_faces": len(part.faces().filter_by(GeomType.CYLINDER)) if part is not None else 0,
                  **(_measure(part) if part is not None else {"holes": 0, "hole_list": [], "rounds": [], "bevels": []}),
                  "edges": _edge_list(part, next(reversed(snapshots), None)) if part is not None else []}
        return outcome("succeeded", result=result, verification=_verification(part))

    def tessellate(self, document):
        """A GLB of the document's solid for the viewport: a preview, never evidence (I3)."""
        part, _ = self._build(self._history({"target": {"document": document}}))
        if part is None:
            raise PreconditionFailed("the document has no solid to preview")
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "preview.glb"
            if not export_gltf(part, str(path), binary=True):
                raise RuntimeError("the kernel did not write the preview")
            data = path.read_bytes()
        return {"glb": base64.b64encode(data).decode("ascii"), "bytes": len(data)}

    def rebuild_plan(self, document):
        """The operations that rebuild the document's solid as editable features (STEP-to-CAD, step2cad.py)."""
        from step2cad import plan
        part, _ = self._build(self._history({"target": {"document": document}}))
        if part is None:
            raise PreconditionFailed("the document has no solid to rebuild")
        return {"operations": plan(part, _holes(part)[0])}

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
        plane = PLANES[p["plane"]].offset(_mm(p["offset"])) if "offset" in p else PLANES[p["plane"]]
        if kind == "sketch_polyline":
            pts = [(_mm(q["x"]), _mm(q["y"])) for q in p["points"]]
            # A clockwise outline makes a face whose normal points against the plane's, so extrude and cut would go backwards.
            if sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1])) < 0:
                pts.reverse()
            return plane * Polygon(*pts)
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
            return _removing(part, part - extrude(face, amount=part.bounding_box().diagonal + 1, both=True), "cut")
        return _removing(part, part - extrude(face, amount=_mm(p["depth"])), "cut")

    def _hole(self, part, p, *_):
        if bool(p.get("through_all")) == ("depth" in p):
            raise PreconditionFailed("a hole needs exactly one of depth and through_all")
        bb, r = part.bounding_box(), _mm(p["diameter"]) / 2
        for q in p["positions"]:
            x, y = _mm(q["x"]), _mm(q["y"])
            if p.get("through_all"):
                tool = Pos(x, y, (bb.min.Z + bb.max.Z) / 2) * Cylinder(r, bb.size.Z + 2)
            else:
                d = _mm(p["depth"])
                tool = Pos(x, y, bb.max.Z - d / 2 + 0.005) * Cylinder(r, d + 0.01)
            part = _removing(part, part - tool, "hole at (%g, %g)" % (x, y))
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
