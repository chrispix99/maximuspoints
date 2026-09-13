#!/usr/bin/env python3
"""Validate maximusPoints portal bonus research JSON against the seed schema.

Usage: python3 scripts/validate-portals.py [file]
Defaults to data/portals.json. Exits non-zero on the first problem.
Also used by the monthly card-benefits refresh job.
"""
import json
import sys


def main() -> int:
    path = sys.argv[1] if len(sys.argv) > 1 else "data/portals.json"
    with open(path) as fh:
        data = json.load(fh)
    assert isinstance(data, dict) and isinstance(data.get("portals"), list), (
        f"{path}: top level must be {{\"portals\": [...]}}"
    )
    portals = data["portals"]
    assert portals, f"{path}: portals list is empty"
    total_merchants = 0
    names: set[str] = set()
    for p in portals:
        name = p.get("name", "?")
        assert name and isinstance(name, str), f"{path}: portal missing name: {p}"
        key = name.strip().lower()
        assert key not in names, f"{path}: duplicate portal {name!r}"
        names.add(key)
        sources = p.get("sources", [])
        assert isinstance(sources, list) and len(sources) >= 1, (
            f"{name}: need at least one portal-level source URL"
        )
        merchants = p.get("merchants", [])
        assert isinstance(merchants, list) and merchants, (
            f"{name}: merchants must be a non-empty list"
        )
        seen: set[str] = set()
        for m in merchants:
            mname = m.get("name", "?")
            assert mname and isinstance(mname, str), (
                f"{name}: merchant missing name: {m}"
            )
            mk = mname.strip().lower()
            assert mk not in seen, f"{name}: duplicate merchant {mname!r}"
            seen.add(mk)
            rate = m.get("miles_per_dollar", m.get("milesPerDollar"))
            assert isinstance(rate, (int, float)) and rate >= 0, (
                f"{name} / {mname}: miles_per_dollar must be a non-negative number"
            )
            total_merchants += 1
    print(f"VALID: {len(portals)} portals, {total_merchants} merchant rates")
    return 0


if __name__ == "__main__":
    sys.exit(main())
