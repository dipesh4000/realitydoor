from app.services.retrieval import retrieve


def test_retrieval_returns_page_cited_hud_context():
    context = retrieve("How does HUD calculate the 60 percent MTSP income limit?")
    assert context.text
    assert context.version.startswith("hud-fy2026-")
    assert any(source.id == "HUD_MTSP_BRIEFING_2026" and source.page for source in context.sources)
