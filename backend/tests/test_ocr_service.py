from pathlib import Path

from PIL import Image
from app.services.ocr_service import extract_fdr_fields_from_document


def test_empty_file_returns_invalid_status():
    result = extract_fdr_fields_from_document(b"", "empty.png")
    assert result["status"] == "EMPTY_OR_CORRUPTED_FILE"


def test_unsupported_extension_requires_manual_review():
    result = extract_fdr_fields_from_document(b"test", "document.exe")
    assert result["status"] == "MANUAL_REVIEW_REQUIRED"


def test_corrupted_image_is_handled_safely():
    result = extract_fdr_fields_from_document(b"not-an-image", "corrupt.png")
    assert result["status"] == "EMPTY_OR_CORRUPTED_FILE"


def test_corrupted_pdf_is_handled_safely():
    result = extract_fdr_fields_from_document(
        b"%PDF-1.4\ninvalid test content", "corrupt.pdf"
    )
    assert result["status"] == "EMPTY_OR_CORRUPTED_FILE"


def test_scanned_pdf_extracts_fdr_fields():
    pdf_path = Path("ocr_scanned_test.pdf")
    if not pdf_path.exists():
        image_path = Path("ocr_sample.png")
        assert image_path.exists(), "OCR sample image is missing"
        with Image.open(image_path) as image:
            image.convert("RGB").save(str(pdf_path), "PDF", resolution=150)

    result = extract_fdr_fields_from_document(
        pdf_path.read_bytes(), pdf_path.name
    )

    assert result["status"] == "EXTRACTED"
    fields = result["extracted_fields"]
    assert fields["fdr_number"] == "SBI-FDR-12345"
    assert fields["bank_name"] == "State Bank of India"
from app.services.ocr_service import _parse_fdr_fields_from_text


def test_parser_extracts_all_fdr_fields():
    sample_text = """
    FDR Number: SBI-FDR-12345
    Bank Name: State Bank of India
    Amount: Rs. 5,00,000
    Issue Date: 15/01/2026
    Maturity Date: 15/01/2027
    """

    fields, raw_fields = _parse_fdr_fields_from_text(sample_text)

    assert fields["fdr_number"] == "SBI-FDR-12345"
    assert fields["bank_name"] == "State Bank of India"
    assert fields["amount"] == 500000.0
    assert fields["issue_date"] == "2026-01-15"
    assert fields["maturity_date"] == "2027-01-15"

    assert all(raw_fields[key] for key in fields)
from unittest.mock import patch

from app.services.ocr_service import _extract_pdf_text_with_ocr_fallback


def test_pdfium_full_page_fallback_is_reached():
    from pathlib import Path

    pdf_path = Path("ocr_scanned_test.pdf")
    assert pdf_path.exists(), "OCR scanned PDF sample is missing"

    with patch(
        "app.services.ocr_service._extract_image_ocr_text",
        return_value=("", "MANUAL_REVIEW_REQUIRED", "TEST_EMPTY_OCR", None),
    ):
        result = _extract_pdf_text_with_ocr_fallback(pdf_path.read_bytes())

    raw_text, status, source, engine, notice = result

    assert status == "EXTRACTED_TEXT", (
        f"Full-page OCR did not extract text. "
        f"status={status}, engine={engine}, notice={notice}"
    )
    assert "SBI-FDR-12345" in raw_text
    assert engine == "PYPDFIUM2_FULL_PAGE_TESSERACT_OCR"


# -----------------------------------------------------------------------------
# FDR comparison tests
# -----------------------------------------------------------------------------
def test_compare_fdr_extractions_detects_mismatch_and_missing_fields():
    import datetime
    from types import SimpleNamespace

    from app.services.ocr_service import compare_fdr_with_extractions

    submitted_issue = datetime.date(2026, 1, 15)
    submitted_maturity = datetime.date(2027, 1, 15)

    fdr = SimpleNamespace(
        id=1,
        fdr_number="SBI-FDR-12345",
        bank_name="State Bank of India",
        amount=500000.0,
        issue_date=submitted_issue,
        maturity_date=submitted_maturity,
        documents=[
            SimpleNamespace(
                id=10,
                upload_metadata={
                    "ocr_extraction": {
                        "status": "EXTRACTED",
                        "source_modality": "PDF_TEXT_EXTRACTION",
                        "engine": "TEST_ENGINE",
                        "confidence": 0.76,
                        "extracted_fields": {
                            "fdr_number": "WRONG-FDR-999",
                            "bank_name": "Punjab National Bank",
                            "amount": 450000.0,
                            "issue_date": "2026-01-16",
                            "maturity_date": None,
                        },
                        "evidence_snippets": {},
                        "notice": "Test extraction",
                    }
                },
            )
        ],
    )

    result = compare_fdr_with_extractions(fdr)

    assert result["has_document"] is True
    assert result["extraction_status"] == "EXTRACTED"
    assert len(result["mismatches"]) == 4
    assert "maturity_date" in result["missing_fields"]

    comparisons = {item["field"]: item for item in result["field_comparisons"]}
    assert comparisons["fdr_number"]["matches"] is False
    assert comparisons["bank_name"]["matches"] is False
    assert comparisons["amount"]["matches"] is False
    assert comparisons["issue_date"]["matches"] is False
    assert comparisons["maturity_date"]["matches"] is None
    assert comparisons["maturity_date"]["needs_manual_review"] is True


def test_compare_fdr_without_document_requires_manual_review():
    import datetime
    from types import SimpleNamespace

    from app.services.ocr_service import compare_fdr_with_extractions

    fdr = SimpleNamespace(
        id=2,
        fdr_number="SBI-FDR-12345",
        bank_name="State Bank of India",
        amount=500000.0,
        issue_date=datetime.date(2026, 1, 15),
        maturity_date=datetime.date(2027, 1, 15),
        documents=[],
    )

    result = compare_fdr_with_extractions(fdr)

    assert result["has_document"] is False
    assert result["extraction_status"] == "NO_DOCUMENT"
    assert len(result["missing_fields"]) == 5
    assert result["field_comparisons"] == []


def test_compare_fdr_applies_officer_overrides():
    import datetime
    from types import SimpleNamespace

    from app.services.ocr_service import compare_fdr_with_extractions

    fdr = SimpleNamespace(
        id=3,
        fdr_number="SBI-FDR-12345",
        bank_name="State Bank of India",
        amount=500000.0,
        issue_date=datetime.date(2026, 1, 15),
        maturity_date=datetime.date(2027, 1, 15),
        documents=[
            SimpleNamespace(
                id=11,
                upload_metadata={
                    "ocr_extraction": {
                        "status": "EXTRACTED",
                        "source_modality": "PDF_TEXT_EXTRACTION",
                        "engine": "TEST_ENGINE",
                        "confidence": 0.95,
                        "extracted_fields": {
                            "fdr_number": "WRONG-FDR",
                            "bank_name": "Wrong Bank",
                            "amount": 1.0,
                            "issue_date": "2020-01-01",
                            "maturity_date": "2020-01-02",
                        },
                        "evidence_snippets": {},
                        "notice": "Test extraction",
                    },
                    "officer_overrides": {
                        "fdr_number": "SBI-FDR-12345",
                        "bank_name": "State Bank of India",
                        "amount": 500000.0,
                        "issue_date": "2026-01-15",
                        "maturity_date": "2027-01-15",
                    },
                },
            )
        ],
    )

    result = compare_fdr_with_extractions(fdr)

    assert result["has_officer_overrides"] is True
    assert result["mismatches"] == []
    assert result["missing_fields"] == []
    assert all(item["matches"] is True for item in result["field_comparisons"])

