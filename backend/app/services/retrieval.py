from __future__ import annotations

import json
import math
import re
from collections import Counter
from dataclasses import dataclass
from functools import lru_cache

from app.core.config import REPOSITORY_ROOT
from app.schemas.chat import ChatSource


CORPUS_PATH = REPOSITORY_ROOT / "data" / "processed" / "rag_corpus_2026.json"
STOP = {"the", "and", "for", "with", "that", "this", "from", "what", "when", "how", "does", "are", "was", "into", "your"}
ALIASES = {"income": {"earnings", "gross", "wage"}, "limit": {"threshold", "mtsp"}, "household": {"family", "person"}, "document": {"upload", "paperwork"}}


@dataclass
class RetrievedContext:
    text: str
    sources: list[ChatSource]
    version: str


def _tokens(value: str) -> list[str]:
    tokens = [t for t in re.findall(r"[a-z0-9]+", value.casefold()) if len(t) > 2 and t not in STOP]
    expanded = list(tokens)
    for token in tokens:
        expanded.extend(ALIASES.get(token, ()))
    return expanded


@lru_cache
def _corpus() -> dict:
    return json.loads(CORPUS_PATH.read_text(encoding="utf-8"))


def retrieve(query: str, limit: int = 5) -> RetrievedContext:
    document = _corpus()
    query_counts = Counter(_tokens(query))
    scored = []
    for chunk in document["chunks"]:
        counts = Counter(_tokens(chunk["text"] + " " + chunk["title"]))
        overlap = sum(min(count, counts[token]) for token, count in query_counts.items())
        cosine_denominator = math.sqrt(sum(v * v for v in query_counts.values()) * sum(v * v for v in counts.values()))
        cosine = sum(query_counts[t] * counts[t] for t in query_counts) / cosine_denominator if cosine_denominator else 0
        phrase_bonus = 1.5 if query.casefold() in chunk["text"].casefold() else 0
        score = overlap + 3 * cosine + phrase_bonus
        if score > 0:
            scored.append((score, chunk))
    selected = [chunk for _, chunk in sorted(scored, key=lambda pair: (-pair[0], pair[1]["id"]))[:limit]]
    sources, seen = [], set()
    for chunk in selected:
        key = (chunk["source_id"], chunk.get("page"))
        if key not in seen:
            seen.add(key)
            sources.append(ChatSource(id=chunk["source_id"], title=chunk["title"], page=chunk.get("page"), url=chunk.get("url")))
    text = "\n\n".join(f"[{chunk['source_id']} p.{chunk.get('page') or 'n/a'}] {chunk['text']}" for chunk in selected)
    return RetrievedContext(text=text, sources=sources, version=document["version"])
