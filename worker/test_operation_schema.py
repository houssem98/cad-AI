import copy
import json
from pathlib import Path

import pytest

from operation_schema import validate_operation, validate_proposal

FIX = json.loads((Path(__file__).parent.parent / "schema" / "operation-cases.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("case", FIX["cases"], ids=lambda c: c["name"])
def test_case(case):
    op = {**copy.deepcopy(FIX["base"]), **case.get("patch", {})}
    if "delete" in case:
        del op[case["delete"]]
    validate = validate_proposal if case.get("proposal") else validate_operation
    paths = [p for p, _ in validate(op)]
    if case["refusedAt"] is None:
        assert paths == []
    else:
        assert case["refusedAt"] in paths


def test_nan_length_is_refused():
    # Only Python's json module admits NaN, so this case cannot live in the shared file.
    op = copy.deepcopy(FIX["base"])
    op["params"]["depth"]["value"] = float("nan")
    assert "/params/depth/value" in [p for p, _ in validate_operation(op)]
