import pytest

from adapter import Adapter
from adapter_contract import CASES, TYPES, check_adapter
from adapter_double import DoubleAdapter
from adapter_kernel import KernelAdapter
from operation_schema import validate_operation

ADAPTERS = [
    pytest.param(lambda: DoubleAdapter(), id="double-full"),
    pytest.param(lambda: DoubleAdapter(lacks={"fillet", "import"}), id="double-partial"),
    pytest.param(lambda: KernelAdapter(), id="kernel"),
]


@pytest.mark.parametrize("make", ADAPTERS)
def test_adapter_meets_the_contract(make):
    assert check_adapter(make()) == []


def test_contract_cases_are_valid_operations():
    for op in CASES:
        assert validate_operation(op) == [], op["id"]


def test_every_operation_type_has_a_contract_case():
    assert {op["type"] for op in CASES} == set(TYPES)


class LyingDouble(DoubleAdapter):
    create_feature = Adapter.create_feature


def test_contract_fails_a_double_that_claims_an_operation_it_lacks():
    problems = check_adapter(LyingDouble())
    assert any("extrude: claimed supported but returned unsupported" in p for p in problems), problems


class OverclaimingDouble(DoubleAdapter):
    def capabilities(self):
        return {**super().capabilities(), "operations": {**super().capabilities()["operations"], "mate": "supported"}}


def test_contract_fails_a_manifest_claiming_a_type_the_schema_lacks():
    assert any("mate" in p for p in check_adapter(OverclaimingDouble()))


def test_adapter_called_directly_with_an_operation_it_lacks_returns_unsupported():
    op = next(c for c in CASES if c["type"] == "fillet")
    out = DoubleAdapter(lacks={"fillet"}).run(op)
    assert out["status"] == "unsupported" and out["error"]["code"] == "unsupported"


def test_export_to_an_unlisted_format_returns_unsupported():
    op = next(c for c in CASES if c["type"] == "export" and c["params"]["format"] == "brep")
    out = DoubleAdapter().run(op)
    assert out["status"] == "unsupported" and out["error"]["code"] == "unsupported"
