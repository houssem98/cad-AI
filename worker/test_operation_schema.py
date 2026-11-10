import copy
import json
from pathlib import Path

import pytest

from operation_schema import validate_operation

FIX = json.loads((Path(__file__).parent.parent / "schema" / "operation-cases.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("case", FIX["cases"], ids=lambda c: c["name"])
def test_case(case):
    op = {**copy.deepcopy(FIX["base"]), **case.get("patch", {})}
    if "delete" in case:
        del op[case["delete"]]
    paths = [p for p, _ in validate_operation(op)]
    if case["refusedAt"] is None:
        assert paths == []
    else:
        assert case["refusedAt"] in paths
