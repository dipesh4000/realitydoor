from __future__ import annotations

import re
import unicodedata
from collections.abc import Collection


INSTRUCTION_OVERRIDE_PATTERNS = (
    r"\b(?:important|new|updated|priority|urgent)\s+(?:instruction|message|prompt)\b",
    r"\b(?:system|developer|assistant)\s+(?:instruction|message|prompt)\b",
    r"\b(?:ignore|disregard|forget|override|bypass|disable|circumvent)\b.{0,100}\b(?:instruction|rule|policy|guardrail|context|evidence|wages?|income|text|above|previous|printed)\b",
    r"\b(?:reveal|repeat|print|show|expose)\b.{0,60}\b(?:system|developer|hidden|internal)\b.{0,30}\b(?:prompt|instruction|message|reasoning)\b",
    r"\b(?:do not|don't)\s+(?:follow|obey|use)\b.{0,60}\b(?:instruction|rule|policy|evidence|wages?|income)\b",
)

STATE_MUTATION_PATTERNS = (
    r"\b(?:set|change|replace|overwrite|fabricate|force|reset)\b.{0,80}\b(?:annual(?:ized)?\s+income|gross\s+pay|wages?|income|field|value|amount)\b",
    r"\b(?:annual(?:ized)?\s+income|gross\s+pay|wages?|income|field|value|amount)\b.{0,50}\b(?:set|changed|replaced|overwritten|fabricated|forced|reset)\b",
    r"\b(?:mark|treat|label|declare|make)\b.{0,80}\b(?:documents?|fields?|values?|applicant|renter)\b.{0,40}\b(?:verified|confirmed|valid|eligible|approved|complete)\b",
    r"\b(?:all|every)\s+(?:of\s+the\s+)?(?:documents?|fields?|values?)\b.{0,50}\b(?:verified|confirmed|valid|approved|complete)\b",
)

DECISION_OUTPUT_PATTERNS = (
    r"\byou (?:are|seem|appear) (?:eligible|qualified|approved|denied)\b",
    r"\byou (?:do|will) qualify\b",
    r"\byour application (?:is|will be|should be) (?:approved|denied)\b",
    r"\bthe (?:applicant|renter) (?:is|will be|should be) (?:eligible|qualified|approved|denied)\b",
    r"\byou (?:meet|satisfy) (?:all )?(?:the )?(?:eligibility |program )?requirements\b",
    r"\b(?:approval|acceptance) (?:is|looks|seems) (?:likely|probable|guaranteed)\b",
    r"\byour application (?:looks|seems) (?:good|strong|ready)\b",
)

INTERNAL_REASONING_PATTERNS = (
    r"\b(?:we|i) need to\b",
    r"\bthe user wants (?:us|me) to\b",
    r"\bprobably (?:we|i) (?:need|should|can)\b",
    r"\b(?:we|i) (?:must|should) (?:answer|output|respond|cite|comply)\b",
    r"\b(?:system prompt|trusted context|developer instruction|instruction says)\b",
)

MUTATION_CLAIM_PATTERNS = (
    r"\b(?:i|we) (?:have )?(?:set|changed|updated|overwritten|marked|verified|confirmed)\b",
    r"\b(?:annual(?:ized)?\s+income|gross\s+pay|wages?|income)\b.{0,40}\b(?:has been|was|is now)?\s*(?:set|changed|updated|overwritten|reset)\b",
    r"\b(?:all|every|your|the)\s+(?:of\s+the\s+)?(?:documents?|files?|evidence)\b.{0,50}\b(?:have been|are now|were|is|are)?\s*(?:verified|confirmed|approved|complete|valid|ready|passed)\b",
    r"\bannual(?:ized)?\s+income\b.{0,20}\b(?:is|equals|of)\s*\$?\s*\d",
    r"\bgross\s+pay\b.{0,20}\b(?:is|equals|of)\s*\$?\s*\d",
)

_CITATION_PATTERN = re.compile(r"\[([^\[\]]+)\]")
SENSITIVE_TEXT_PATTERNS = (
    (r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", "[REDACTED_EMAIL]"),
    (r"\b\d{3}-\d{2}-\d{4}\b", "[REDACTED_SSN]"),
    (r"\b(?:account|routing)(?:\s+number|\s+no\.?|\s*#)?\s*[:=-]?\s*\d{4,17}\b", "[REDACTED_ACCOUNT]"),
    (r"\b(?:date of birth|dob)\s*[:=-]?\s*\d{1,4}[-/]\d{1,2}[-/]\d{1,4}\b", "[REDACTED_DOB]"),
    (r"\b(?:driver'?s? license|license number)(?:\s+no\.?|\s*#)?\s*[:=-]?\s*[A-Z0-9-]{5,20}\b", "[REDACTED_LICENSE]"),
)


def _matches(patterns: tuple[str, ...], text: str) -> bool:
    normalized = unicodedata.normalize("NFKC", text)
    normalized = re.sub(r"[\u200b-\u200f\u2060\ufeff]", "", normalized)
    return any(re.search(pattern, normalized, flags=re.IGNORECASE | re.DOTALL) for pattern in patterns)


def contains_untrusted_instruction(text: str) -> bool:
    return _matches(INSTRUCTION_OVERRIDE_PATTERNS, text) or _matches(STATE_MUTATION_PATTERNS, text)


def safe_document_text(text: str) -> str:
    """Remove instruction-like lines before local field extraction."""
    return "\n".join(line for line in text.splitlines() if not contains_untrusted_instruction(line))


def redact_sensitive_text(text: str) -> str:
    redacted = text
    for pattern, replacement in SENSITIVE_TEXT_PATTERNS:
        redacted = re.sub(pattern, replacement, redacted, flags=re.IGNORECASE)
    return redacted


def provider_reply_violation(
    reply: str,
    allowed_source_ids: Collection[str],
    cited_source_ids: Collection[str] | None = None,
) -> str | None:
    if _matches(DECISION_OUTPUT_PATTERNS, reply):
        return "decision"
    if _matches(INTERNAL_REASONING_PATTERNS, reply):
        return "internal_reasoning"
    if _matches(MUTATION_CLAIM_PATTERNS, reply):
        return "state_mutation"

    allowed = set(allowed_source_ids)
    if cited_source_ids is not None:
        cited = set(cited_source_ids)
        if not cited.issubset(allowed):
            return "invalid_citation"
        if allowed and not cited:
            return "missing_citation"

    citations = _CITATION_PATTERN.findall(reply)
    for citation in citations:
        source_id = re.split(r"\s+p(?:age)?\.?\s*\d+", citation, maxsplit=1, flags=re.IGNORECASE)[0].strip()
        if source_id not in allowed:
            return "invalid_citation"
    if cited_source_ids is None and allowed and not citations:
        return "missing_citation"
    return None
