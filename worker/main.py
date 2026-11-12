"""Kernel worker: one JSON object per line on stdin and stdout (docs/cad-agent/architecture/API_CONTRACTS.md)."""
import argparse
import json
import os
import sys

from adapter import METHODS, PreconditionFailed, Unsupported, outcome
from adapter_double import DoubleAdapter
from operation_schema import validate_operation


def answer(call, document, missing):
    """An executor step outside the operation set (a preview mesh, a rebuild plan), with the operations' error codes."""
    try:
        return {"status": "succeeded", "error": None, **call(document)}
    except NotImplementedError:
        return {"status": "unsupported", "error": {"code": "unsupported", "message": missing}}
    except Unsupported as e:
        return {"status": "unsupported", "error": {"code": "unsupported", "message": str(e)}}
    except PreconditionFailed as e:
        return {"status": "failed", "error": {"code": "precondition_failed", "message": str(e)}}
    except Exception as e:
        return {"status": "failed", "error": {"code": "kernel_error", "message": str(e)}}


def serve(adapter, lines, out):
    ops = 0
    for line in lines:
        msg = json.loads(line)
        kind = msg.get("kind")
        if kind == "health":
            reply = {"kind": "health", "ops": ops, **adapter.health()}
        elif kind == "capabilities":
            reply = {"kind": "capabilities", "manifest": adapter.capabilities(), "calls": METHODS}
        elif kind == "op":
            ops += 1
            op = msg["operation"]
            errs = validate_operation(op)
            body = adapter.run(op) if not errs else outcome("failed", error={
                "code": "validation_failed", "message": "; ".join("%s %s" % e for e in errs)})
            reply = {"kind": "result", "id": op.get("id"), "call": METHODS.get(op.get("type")), **body}
        elif kind == "inspect":
            reply = {"kind": "inspected", **adapter.inspect_geometry({"target": {"document": msg["document"]}})}
        elif kind == "tessellate":
            reply = {"kind": "tessellated", **answer(adapter.tessellate, msg["document"], "this adapter has no preview mesh")}
        elif kind == "plan":
            reply = {"kind": "planned", **answer(adapter.rebuild_plan, msg["document"], "this adapter cannot rebuild a part as features")}
        elif kind == "save":
            adapter.save_checkpoint(msg["document"], msg["path"])
            reply = {"kind": "saved"}
        elif kind == "load":
            adapter.load_checkpoint(msg["document"], msg["path"])
            reply = {"kind": "loaded"}
        else:
            reply = {"kind": "error", "message": "unknown kind %r" % kind}
        out.write(json.dumps(reply) + "\n")
        out.flush()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--adapter", choices=["double", "kernel"], default="double")
    p.add_argument("--hang", action="append", default=[], help="double only: hang on this operation type")
    p.add_argument("--fail", action="append", default=[], help="double only: fail on this operation type")
    p.add_argument("--hang-inspect", action="append", default=[], help="double only: hang on the inspect after this type")
    p.add_argument("--artifacts", help="folder the kernel writes exported files to")
    a = p.parse_args()
    # The protocol gets its own copy of stdout; file descriptor 1 then points at stderr, so text the CAD
    # engine prints from native code (a STEP parse error, for one) can never land in the protocol.
    protocol = os.fdopen(os.dup(1), "w", encoding="utf-8")
    os.dup2(2, 1)
    sys.stdout = sys.stderr
    if a.adapter == "kernel":
        from adapter_kernel import KernelAdapter  # build123d loads only when the kernel is asked for
        adapter = KernelAdapter(artifact_dir=a.artifacts)
    else:
        adapter = DoubleAdapter(hangs=set(a.hang), fails=set(a.fail), hang_inspect=set(a.hang_inspect))
    serve(adapter, sys.stdin, protocol)


if __name__ == "__main__":
    main()
