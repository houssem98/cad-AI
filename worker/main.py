"""Kernel worker: one JSON object per line on stdin and stdout (docs/cad-agent/architecture/API_CONTRACTS.md)."""
import argparse
import json
import sys

from adapter import METHODS
from adapter_double import DoubleAdapter


def serve(adapter, lines, out):
    ops = 0
    for line in lines:
        msg = json.loads(line)
        kind = msg.get("kind")
        if kind == "health":
            reply = {"kind": "health", "ops": ops, **adapter.health()}
        elif kind == "capabilities":
            reply = {"kind": "capabilities", "manifest": adapter.capabilities()}
        elif kind == "op":
            ops += 1
            op = msg["operation"]
            reply = {"kind": "result", "id": op["id"], "call": METHODS.get(op["type"]), **adapter.run(op)}
        elif kind == "inspect":
            reply = {"kind": "inspected", **adapter.inspect_geometry({"target": {"document": msg["document"]}})}
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
    a = p.parse_args()
    if a.adapter == "kernel":
        from adapter_kernel import KernelAdapter  # build123d loads only when the kernel is asked for
        adapter = KernelAdapter()
    else:
        adapter = DoubleAdapter(hangs=set(a.hang), fails=set(a.fail))
    protocol = sys.stdout
    sys.stdout = sys.stderr  # library output never reaches the protocol channel
    serve(adapter, sys.stdin, protocol)


if __name__ == "__main__":
    main()
