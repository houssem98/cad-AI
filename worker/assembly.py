"""Assemblies: part solids placed as instances, positioned by face mates through the kernel's rigid joints, checked for
interference between every pair, and counted into a bill of materials."""
import copy

from build123d import GeomType, Location, Plane, RigidJoint, Vector

from adapter import PreconditionFailed, Unsupported
from adapter_kernel import _verification

SIDES = {"+x": (1, 0, 0), "-x": (-1, 0, 0), "+y": (0, 1, 0), "-y": (0, -1, 0), "+z": (0, 0, 1), "-z": (0, 0, -1)}
INTERFERENCE_MM3 = 1e-6


def assemble(parts, instances, mates=()):
    """parts: part name -> solid. instances: [{"id", "part"}], each a copy of its part where the part was built.
    mates: [{"kind": "face", "instance", "face", "to", "to_face", "offset": [x, y] mm}] put the instance's outermost planar
    face on that side against the other instance's, opposed, offset in the other face's plane. Each instance moves once."""
    placed = {}
    for i in instances:
        if i["part"] not in parts:
            raise PreconditionFailed("part %s does not exist" % i["part"])
        if i["id"] in placed:
            raise PreconditionFailed("instance %s is listed twice" % i["id"])
        placed[i["id"]] = copy.copy(parts[i["part"]])
    moved = set()
    for m in mates:
        if m.get("kind") != "face":
            raise Unsupported("a %s mate" % m.get("kind"))
        if m["instance"] not in placed or m["to"] not in placed or m["instance"] == m["to"]:
            raise PreconditionFailed("a mate needs two different instances; got %s and %s" % (m["instance"], m["to"]))
        if m["instance"] in moved:
            raise PreconditionFailed("instance %s is already placed by a mate" % m["instance"])
        moved.add(m["instance"])
    # A mate moves its instance to where its target is now, so every target is placed before what is mated to it, whatever the
    # list's order (council S3); mates that wait on each other form a loop and are refused.
    pending = list(enumerate(mates))
    while pending:
        ready = [(n, m) for n, m in pending if not any(o["instance"] == m["to"] for _, o in pending)]
        if not ready:
            raise PreconditionFailed("the mates form a loop: %s" % ", ".join("%s on %s" % (m["instance"], m["to"]) for _, m in pending))
        for n, m in ready:
            a, b, label = placed[m["to"]], placed[m["instance"]], "mate%d" % n
            dx, dy = m.get("offset", (0, 0))
            RigidJoint(label, a, _frame(a, m["to_face"], inward=False) * Location((dx, dy, 0)))
            RigidJoint(label, b, _frame(b, m["face"], inward=True))
            a.joints[label].connect_to(b.joints[label])
            pending.remove((n, m))
    ids = list(placed)
    clashes = [{"a": x, "b": y, "volume_mm3": v} for k, x in enumerate(ids) for y in ids[k + 1:]
               for v in [(placed[x] & placed[y]).volume] if v > INTERFERENCE_MM3]
    counts = {}
    for i in instances:
        counts[i["part"]] = counts.get(i["part"], 0) + 1
    return {"instances": [{"id": i["id"], "part": i["part"], "verification": _verification(placed[i["id"]])} for i in instances],
            "interference": clashes, "bom": [{"part": p, "quantity": q, "volume_mm3": parts[p].volume} for p, q in counts.items()]}


def _frame(part, side, inward):
    """A frame at the centre of the part's outermost planar face on that side, z along the face's outward normal, or into
    the part for the instance being placed so the two faces meet opposed."""
    if side not in SIDES:
        raise PreconditionFailed("unknown face side %s" % side)
    n = Vector(*SIDES[side])
    faces = [f for f in part.faces() if f.geom_type == GeomType.PLANE and f.normal_at().dot(n) > 1 - 1e-9]
    if not faces:
        raise PreconditionFailed("the part has no planar face toward %s" % side)
    f = max(faces, key=lambda f: f.center().dot(n))
    return Location(Plane(f.center(), x_dir=(1, 0, 0) if abs(n.X) < 0.9 else (0, 1, 0), z_dir=-n if inward else n))
