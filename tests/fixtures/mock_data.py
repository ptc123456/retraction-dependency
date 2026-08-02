# Mock fixtures for RetractionDependency deterministic contract tests

FIXTURE_A = {
    "original_doi": "10.1371/journal.pntd.0009591",
    "original_pmid": "34280196",
    "original_pmcid": "PMC8321350",
    "original_title": "Short Report: Early genomic detection of SARS-CoV-2 P.1 variant in Northeast Brazil",
    "notice_doi": "10.1371/journal.pntd.0011024",
    "notice_pmid": "36584006",
    "notice_pmcid": "PMC9803134",
    "notice_type": "correction",
    "dependency_statement": "The study reports genetic evidence that the SARS-CoV-2 P.1 variant was circulating in Northeast Brazil.",
    "claim_text": "SARS-CoV-2 P.1 variant genomic evidence in Northeast Brazil.",
    "expected_verdict": "USABLE",
    "expected_reason_code": "CORRECTION_UNRELATED_TO_DEPENDENCY",
    "expected_material_effect": "NO_MATERIAL_EFFECT",
    "expected_summary": "Correction amends author name spelling from Pedro Henrique Presta Dia to Pedro Henrique Presta Dias without affecting genomic findings or study conclusions.",
}

FIXTURE_B = {
    "original_doi": "10.1371/journal.pntd.0009266",
    "original_pmid": "33690646",
    "original_pmcid": "PMC7984611",
    "original_title": "Derivation of the first clinical diagnostic models for dehydration severity in patients over five years with acute diarrhea",
    "notice_doi": "10.1371/journal.pntd.0011026",
    "notice_pmid": "36584025",
    "notice_pmcid": "PMC9803166",
    "notice_type": "correction",
    "dependency_statement": "In the simplified NIRUDAK model, five vomiting episodes in 24 hours belongs to the lowest non-reference vomiting bucket.",
    "claim_text": "Clinical diagnostic cutoff classification for dehydration severity in NIRUDAK model.",
    "expected_verdict": "INVALID_FOR_CLAIM",
    "expected_reason_code": "CORRECTION_CHANGES_DEPENDENCY",
    "expected_material_effect": "MATERIALLY_UNDERMINES",
    "expected_summary": "Correction alters vomiting episode cutoff ranges from 1-5, 6-10, >10 to 1-4, 5-9, >9, placing 5 episodes into a higher severity category and directly invalidating the claimed bucket assignment.",
}

FIXTURE_C = {
    "original_doi": "10.1126/sciadv.ade8971",
    "original_pmid": "36542710",
    "original_pmcid": "PMC9770993",
    "original_title": "Interference of flagellar rotation up-regulates the expression of small RNA contributing to Bordetella pertussis infection",
    "notice_doi": "10.1126/sciadv.adv4615",
    "notice_pmid": "39742501",
    "notice_pmcid": "PMC11691688",
    "notice_type": "retraction",
    "dependency_statement": "Bpr4 up-regulates filamentous hemagglutinin and contributes to Bordetella pertussis infection.",
    "claim_text": "Role of Bpr4 small RNA in Bordetella pertussis infection mechanisms.",
    "expected_verdict": "INVALID_FOR_CLAIM",
    "expected_reason_code": "RETRACTION_REMOVES_SUPPORT",
    "expected_material_effect": "MATERIALLY_UNDERMINES",
    "expected_summary": "Retraction notice states that figures 1-8 and supplementary figures S1-S3 lacked adequate supporting data and all authors agreed to retract the article, completely removing evidentiary support.",
}
