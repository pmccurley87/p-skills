---
name: tdd
description: "Test-driven development skill for writing unit tests, generating test fixtures and mocks, analyzing coverage gaps, and guiding red-green-refactor workflows across Jest, Pytest, JUnit, Vitest, and Mocha. Use when the user asks to write tests, improve test coverage, practice TDD, generate mocks or stubs, or mentions testing frameworks like Jest, pytest, or JUnit."
---

# TDD Guide

Test-driven development skill for generating tests, analyzing coverage, and guiding red-green-refactor workflows across Jest, Pytest, JUnit, and Vitest.

## When to Use

- Writing unit tests for new or existing code
- Practicing red-green-refactor TDD cycles
- Analyzing test coverage gaps and prioritizing what to test next
- Generating test fixtures, mocks, or stubs
- Adding property-based or mutation testing to a project
- Working with Jest, Pytest, JUnit, Vitest, Mocha, or Go testing

## When NOT to Use

- E2E or integration testing -- use Playwright, Cypress, or Selenium instead
- Performance/load testing -- use k6, JMeter, or Locust
- Security testing -- use OWASP ZAP or Burp Suite
- Manual QA workflows or exploratory testing
- Writing tests for languages not covered (best for TS, JS, Python, Java, Go)

## Workflows

### Generate Tests from Code

1. Provide source code (TypeScript, JavaScript, Python, Java)
2. Specify target framework (Jest, Pytest, JUnit, Vitest)
3. Review generated test stubs
4. **Validation:** Tests compile and cover happy path, error cases, edge cases

### Analyze Coverage Gaps

1. Generate coverage report from test runner (`npm test -- --coverage`)
2. Analyze coverage report (LCOV/JSON/XML)
3. Review prioritized gaps (P0/P1/P2)
4. Generate missing tests for uncovered paths
5. **Validation:** Coverage meets target threshold (typically 80%+)

### TDD New Feature

1. Write failing test first (RED)
2. Validate the test fails for the right reason
3. Implement minimal code to pass (GREEN)
4. Validate all tests pass
5. Refactor while keeping tests green (REFACTOR)
6. **Validation:** All tests pass after each cycle

## Spec-First Workflow

TDD is most effective when driven by a written spec. The flow:

1. **Write or receive a spec** -- stored in `specs/<feature>.md`
2. **Extract acceptance criteria** -- each criterion becomes one or more test cases
3. **Write failing tests (RED)** -- one test per acceptance criterion
4. **Implement minimal code (GREEN)** -- satisfy each test in order
5. **Refactor** -- clean up while all tests stay green

### Extracting Tests from Specs

Each acceptance criterion in a spec maps to at least one test:

| Spec Criterion | Test Case |
|---------------|-----------|
| "User can log in with valid credentials" | `test_login_valid_credentials_returns_token` |
| "Invalid password returns 401" | `test_login_invalid_password_returns_401` |
| "Account locks after 5 failed attempts" | `test_login_locks_after_five_failures` |

Number your acceptance criteria in the spec. Reference the number in the test docstring for traceability (`# AC-3: Account locks after 5 failed attempts`).

## Examples

### Test Generation -- Pytest

**Input source function (`math_utils.py`):**
```python
def divide(a: float, b: float) -> float:
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b
```

**Generated test output (`test_math_utils.py`):**
```python
import pytest
from math_utils import divide

class TestDivide:
    def test_divide_positive_numbers(self):
        assert divide(10, 2) == 5.0

    def test_divide_negative_numerator(self):
        assert divide(-10, 2) == -5.0

    def test_divide_float_result(self):
        assert divide(1, 3) == pytest.approx(0.333, rel=1e-3)

    def test_divide_by_zero_raises_value_error(self):
        with pytest.raises(ValueError, match="Cannot divide by zero"):
            divide(10, 0)

    def test_divide_zero_numerator(self):
        assert divide(0, 5) == 0.0
```

### Coverage Analysis -- P0/P1/P2 Output

```
Coverage Report -- Overall: 63% (threshold: 80%)

P0 -- Critical gaps (uncovered error paths):
  auth/login.py:42-58   handle_expired_token()       0% covered
  payments/process.py:91-110  handle_payment_failure()   0% covered

P1 -- High-value gaps (core logic branches):
  users/service.py:77   update_profile() -- else branch  0% covered
  orders/cart.py:134    apply_discount() -- zero-qty guard  0% covered

P2 -- Low-risk gaps (utility / helper functions):
  utils/formatting.py:12  format_currency()            0% covered

Recommended: Generate tests for P0 items first to reach 80% threshold.
```

## Red-Green-Refactor Examples Per Language

### TypeScript / Jest

```typescript
describe("Cart", () => {
  describe("addItem", () => {
    it("should add a new item to an empty cart", () => {
      const cart = new Cart();
      cart.addItem({ id: "sku-1", name: "Widget", price: 9.99, qty: 1 });

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].id).toBe("sku-1");
    });

    it("should increment quantity when adding an existing item", () => {
      const cart = new Cart();
      cart.addItem({ id: "sku-1", name: "Widget", price: 9.99, qty: 1 });
      cart.addItem({ id: "sku-1", name: "Widget", price: 9.99, qty: 2 });

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].qty).toBe(3);
    });

    it("should throw when quantity is zero or negative", () => {
      const cart = new Cart();
      expect(() =>
        cart.addItem({ id: "sku-1", name: "Widget", price: 9.99, qty: 0 })
      ).toThrow("Quantity must be positive");
    });
  });
});
```

### Python / Pytest (Parametrize)

```python
import pytest
from app.pricing import calculate_discount

@pytest.mark.parametrize("subtotal, expected_discount", [
    (50.0, 0.0),       # Below threshold -- no discount
    (100.0, 5.0),      # 5% tier
    (250.0, 25.0),     # 10% tier
    (500.0, 75.0),     # 15% tier
])
def test_calculate_discount(subtotal, expected_discount):
    assert calculate_discount(subtotal) == pytest.approx(expected_discount)
```

### Go -- Table-Driven Tests

```go
func TestApplyDiscount(t *testing.T) {
    tests := []struct {
        name     string
        subtotal float64
        want     float64
    }{
        {"no discount below threshold", 50.0, 0.0},
        {"5 percent tier", 100.0, 5.0},
        {"10 percent tier", 250.0, 25.0},
        {"15 percent tier", 500.0, 75.0},
        {"zero subtotal", 0.0, 0.0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := ApplyDiscount(tt.subtotal)
            if got != tt.want {
                t.Errorf("ApplyDiscount(%v) = %v, want %v", tt.subtotal, got, tt.want)
            }
        })
    }
}
```

## Bounded Autonomy Rules

### Stop and Ask When

- **Ambiguous requirements** -- the spec has conflicting or unclear acceptance criteria
- **Missing edge cases** -- you cannot determine boundary values without domain knowledge
- **Test count exceeds 50** -- present a summary and ask which areas to prioritize
- **External dependencies unclear** -- feature relies on undocumented third-party APIs
- **Security-sensitive logic** -- auth, authorization, encryption, or payment flows require human sign-off

### Continue Autonomously When

- **Clear spec with numbered acceptance criteria** -- each maps directly to tests
- **Straightforward CRUD operations** -- well-defined models
- **Well-defined API contracts** -- OpenAPI spec or typed interfaces available
- **Pure functions** -- deterministic input/output with no side effects
- **Existing test patterns** -- the codebase already has similar tests to follow

## Property-Based Testing

Use when the input space is large and expected behavior can be described as a property.

### Python -- Hypothesis

```python
from hypothesis import given, strategies as st
from app.serializers import serialize, deserialize

@given(st.text())
def test_roundtrip_serialization(data):
    """Serialization followed by deserialization returns the original."""
    assert deserialize(serialize(data)) == data
```

### TypeScript -- fast-check

```typescript
import fc from "fast-check";
import { encode, decode } from "./codec";

test("encode/decode roundtrip", () => {
  fc.assert(
    fc.property(fc.string(), (input) => {
      expect(decode(encode(input))).toBe(input);
    })
  );
});
```

### When to Use Property-Based Over Example-Based

| Use Property-Based | Example |
|-------------------|---------|
| Data transformations | Serialize/deserialize roundtrips |
| Mathematical properties | Commutativity, associativity, idempotency |
| Encoding/decoding | Base64, URL encoding, compression |
| Sorting and filtering | Output is sorted, length preserved |
| Parser correctness | Valid input always parses without error |

## Mutation Testing

Mutation testing modifies production code ("mutants") and checks whether tests catch the changes. If a mutant survives (tests still pass), your tests have a gap that coverage alone cannot reveal.

### Tools

| Language | Tool | Command |
|----------|------|---------|
| TypeScript/JavaScript | **Stryker** | `npx stryker run` |
| Python | **mutmut** | `mutmut run --paths-to-mutate=src/` |
| Java | **PIT** | `mvn org.pitest:pitest-maven:mutationCoverage` |

### Why Mutation Testing Matters

- **100% line coverage != good tests** -- coverage tells you code was executed, not that it was verified
- **Catches weak assertions** -- tests that run code but assert nothing meaningful
- **Finds missing boundary tests** -- mutants that change `<` to `<=` expose off-by-one gaps

Target 85%+ mutation score on critical modules (auth, payments, data processing).

## Limitations

| Scope | Details |
|-------|---------|
| Unit test focus | Integration and E2E tests require different patterns |
| Language support | Best for TypeScript, JavaScript, Python, Java, Go |
| Report formats | LCOV, JSON, XML only; other formats need conversion |
| Generated tests | Provide scaffolding; require human review for complex logic |

**When to use other tools:**
- E2E testing: Playwright, Cypress, Selenium
- Performance testing: k6, JMeter, Locust
- Security testing: OWASP ZAP, Burp Suite
