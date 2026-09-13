#!/usr/bin/env python3
"""Validate maximusPoints card research JSON files against the seed schema.

Usage: python3 scripts/validate-cards.py [file ...]
Defaults to all data/cards_*.json. Exits non-zero on the first problem.
Also used by the monthly card-benefits refresh job.
"""
import json
import glob
import sys

ALLOWED_MULTS = {
    "dining", "groceries", "gas", "travel",
    "flights", "hotels", "everyday", "alaska_airlines",
}
NETWORKS = {"Visa", "Mastercard", "American Express", "Discover", "Diners Club"}
CADENCES = {"monthly", "quarterly", "semiannual", "annual"}


def main() -> int:
    files = sys.argv[1:] or sorted(glob.glob("data/cards_*.json"))
    total = 0
    names: set[str] = set()
    for f in files:
        with open(f) as fh:
            data = json.load(fh)
        cards = data if isinstance(data, list) else data.get("cards", data)
        assert isinstance(cards, list), f"{f}: top level must be a list or {{\"cards\": [...]}}"
        for c in cards:
            name = c.get("name", "?")
            assert name and c.get("issuer"), f"{f}: card missing name/issuer: {c}"
            assert isinstance(c.get("annual_fee"), (int, float)), f"{name}: annual_fee must be a number (dollars)"
            assert isinstance(c.get("foreign_transaction_fee"), bool), f"{name}: foreign_transaction_fee must be boolean"
            m = c.get("multipliers", {})
            assert isinstance(m, dict), f"{name}: multipliers must be an object"
            bad = set(m) - ALLOWED_MULTS
            assert not bad, f"{name}: bad multiplier keys {bad}"
            assert all(isinstance(v, (int, float)) and v >= 0 for v in m.values()), f"{name}: multiplier values must be non-negative numbers"
            assert c.get("network") in NETWORKS, f"{name}: network must be one of {sorted(NETWORKS)}"
            perks = c.get("perks", c.get("benefits", []))
            assert isinstance(perks, list), f"{name}: perks/benefits must be a list"
            for p in perks:
                assert p.get("cadence") in CADENCES, f"{name}: perk cadence must be one of {sorted(CADENCES)}: {p}"
                assert isinstance(p.get("amount"), (int, float)), f"{name}: perk amount must be a number (dollars): {p}"
                assert p.get("name"), f"{name}: perk missing name: {p}"
            assert len(c.get("sources", [])) >= 2, f"{name}: need at least 2 sources"
            assert name not in names, f"DUPLICATE card name across files: {name}"
            names.add(name)
        total += len(cards)
        print(f"{f}: {len(cards)} cards OK")
    print(f"VALID: {total} unique cards across {len(files)} files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
