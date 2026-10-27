import json
import os
import sys
from pathlib import Path

# Add backend root to path
backend_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_root))

from app.services.ocr_service import (
    _parse_fdr_fields_from_text,
    normalize_fdr_number,
    normalize_bank_name
)

def run_kie_evaluation():
    benchmark_path = Path(__file__).resolve().parent / "fixtures" / "kie_ground_truth_benchmark.json"
    if not benchmark_path.exists():
        print(f"Error: {benchmark_path} not found.")
        return

    with open(benchmark_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    samples = data.get("samples", [])
    total_samples = len(samples)

    print("=" * 80)
    print(f" AICTE FDR KIE BENCHMARK EVALUATION (Total Samples: {total_samples})")
    print("=" * 80)

    evaluated_fields = ["fdr_number", "bank_name", "amount", "issue_date", "maturity_date"]
    field_stats = {f: {"correct": 0, "total": 0} for f in evaluated_fields}
    sample_exact_matches = 0

    for sample in samples:
        sid = sample["sample_id"]
        cat = sample["category"]
        raw_text = sample["raw_ocr_text"]
        gt = sample["ground_truth"]

        extracted, evidence = _parse_fdr_fields_from_text(raw_text)

        all_fields_matched = True
        field_eval_results = {}

        # 1. FDR Number
        ext_fdr = extracted.get("fdr_number")
        gt_fdr = gt.get("FDR_NUMBER", {}).get("normalized")
        field_stats["fdr_number"]["total"] += 1
        if ext_fdr and gt_fdr and normalize_fdr_number(ext_fdr) == normalize_fdr_number(gt_fdr):
            field_stats["fdr_number"]["correct"] += 1
            field_eval_results["fdr_number"] = True
        else:
            field_eval_results["fdr_number"] = False
            all_fields_matched = False

        # 2. Bank Name
        ext_bank = extracted.get("bank_name")
        gt_bank = gt.get("BANK_NAME", {}).get("normalized")
        field_stats["bank_name"]["total"] += 1
        if ext_bank and gt_bank and normalize_bank_name(ext_bank) == normalize_bank_name(gt_bank):
            field_stats["bank_name"]["correct"] += 1
            field_eval_results["bank_name"] = True
        else:
            field_eval_results["bank_name"] = False
            all_fields_matched = False

        # 3. Amount
        ext_amt = extracted.get("amount")
        gt_amt = gt.get("AMOUNT", {}).get("normalized")
        field_stats["amount"]["total"] += 1
        if ext_amt is not None and gt_amt is not None and float(ext_amt) == float(gt_amt):
            field_stats["amount"]["correct"] += 1
            field_eval_results["amount"] = True
        else:
            field_eval_results["amount"] = False
            all_fields_matched = False

        # 4. Issue Date
        ext_issue = extracted.get("issue_date")
        gt_issue = gt.get("ISSUE_DATE", {}).get("normalized")
        field_stats["issue_date"]["total"] += 1
        if ext_issue and gt_issue and str(ext_issue) == str(gt_issue):
            field_stats["issue_date"]["correct"] += 1
            field_eval_results["issue_date"] = True
        else:
            field_eval_results["issue_date"] = False
            all_fields_matched = False

        # 5. Maturity Date
        ext_mat = extracted.get("maturity_date")
        gt_mat = gt.get("MATURITY_DATE", {}).get("normalized")
        field_stats["maturity_date"]["total"] += 1
        if ext_mat and gt_mat and str(ext_mat) == str(gt_mat):
            field_stats["maturity_date"]["correct"] += 1
            field_eval_results["maturity_date"] = True
        else:
            field_eval_results["maturity_date"] = False
            all_fields_matched = False

        if all_fields_matched:
            sample_exact_matches += 1

        status_icon = "[PASS]" if all_fields_matched else "[DISCREPANCY/DIFF]"
        print(f"{sid:<12} | {cat:<24} | {status_icon:<18} | Details: {field_eval_results}")

    print("-" * 80)
    print(" FIELD-LEVEL ACCURACY BREAKDOWN:")
    print("-" * 80)
    for field in evaluated_fields:
        c = field_stats[field]["correct"]
        t = field_stats[field]["total"]
        pct = (c / t * 100) if t > 0 else 0
        print(f" • {field:<16}: {c:2d}/{t:2d} ({pct:5.1f}%)")

    overall_acc = (sample_exact_matches / total_samples) * 100
    print("=" * 80)
    print(f" FULL RECORD EXACT MATCH ACCURACY: {sample_exact_matches}/{total_samples} ({overall_acc:.1f}%)")
    print("=" * 80)

if __name__ == "__main__":
    run_kie_evaluation()

