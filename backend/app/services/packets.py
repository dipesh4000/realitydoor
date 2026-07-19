from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import UUID, uuid4

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.core.config import REPOSITORY_ROOT, Settings
from app.repositories.documents import DocumentRepository
from app.repositories.packets import PacketRepository
from app.schemas.packets import PacketRecord
from app.schemas.session import SessionRecord
from app.services.readiness import evaluate_readiness
from app.services.storage import StorageService


NAVY = colors.HexColor("#17324D")
TEAL = colors.HexColor("#13A89E")
PALE = colors.HexColor("#EAF7F5")
INK = colors.HexColor("#263238")
MUTED = colors.HexColor("#637381")


def _page_footer(canvas, document) -> None:
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#D8E1E8"))
    canvas.line(0.65 * inch, 0.55 * inch, 7.85 * inch, 0.55 * inch)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(0.65 * inch, 0.35 * inch, "RealDoor · Application-readiness only")
    canvas.drawRightString(7.85 * inch, 0.35 * inch, f"Page {document.page}")
    canvas.restoreState()


async def generate_packet(
    *,
    session: SessionRecord,
    documents: DocumentRepository,
    packets: PacketRepository,
    storage: StorageService,
    settings: Settings,
    notes: str = "",
    include_document_ids: set[UUID] | None = None,
) -> PacketRecord:
    packet_id = uuid4()
    created_at = datetime.now(UTC)
    expires_at = created_at + timedelta(minutes=settings.packet_ttl_minutes)
    folder = REPOSITORY_ROOT / "tmp" / "packets" / str(session.id)
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"realdoor_readiness_{packet_id}.pdf"
    readiness = await evaluate_readiness(session.id, documents)
    document_records = await documents.list_for_session(session.id)
    if include_document_ids is not None:
        document_records = [item for item in document_records if item.id in include_document_ids]

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="PacketTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=26, leading=31, textColor=NAVY, alignment=TA_CENTER, spaceAfter=8))
    styles.add(ParagraphStyle(name="PacketSubtitle", parent=styles["Normal"], fontSize=11, leading=16, textColor=MUTED, alignment=TA_CENTER, spaceAfter=22))
    styles.add(ParagraphStyle(name="Section", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=15, leading=20, textColor=NAVY, spaceBefore=12, spaceAfter=9))
    styles.add(ParagraphStyle(name="Small", parent=styles["Normal"], fontSize=8.5, leading=12, textColor=MUTED))
    styles.add(ParagraphStyle(name="BodyCompact", parent=styles["Normal"], fontSize=9.5, leading=14, textColor=INK))

    story = [
        Spacer(1, 0.35 * inch),
        Paragraph("REALDOOR", styles["PacketTitle"]),
        Paragraph("LIHTC Application-Readiness Packet", styles["PacketSubtitle"]),
        Table(
            [
                ["Program", session.program, "Area", session.area],
                ["Rule year", str(session.year), "Generated", created_at.date().isoformat()],
                ["Checklist", readiness.checklist_id, "Session", str(session.id)[:8]],
            ],
            colWidths=[0.9 * inch, 2.15 * inch, 0.9 * inch, 2.6 * inch],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), PALE),
                ("TEXTCOLOR", (0, 0), (-1, -1), INK),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBE5E1")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]),
        ),
        Spacer(1, 16),
        Paragraph("Important notice", styles["Section"]),
        Paragraph(readiness.notice, styles["BodyCompact"]),
        Spacer(1, 7),
        Paragraph("RealDoor does not approve, deny, score, rank, or predict eligibility. The housing provider makes the final determination.", styles["BodyCompact"]),
        *([Paragraph("Renter notes", styles["Section"]), Paragraph(notes.replace("<", "&lt;").replace(">", "&gt;"), styles["BodyCompact"])] if notes else []),
        Paragraph("Checklist status", styles["Section"]),
        Paragraph(f"<b>{readiness.label}</b> · {readiness.checks_passed} of {readiness.checks_total} document checks currently pass · {readiness.issues_count} finding(s)", styles["BodyCompact"]),
    ]

    issue_rows = [["Severity", "Finding", "Next action", "Reference"]]
    for issue in readiness.issues:
        issue_rows.append([
            issue.severity.upper(),
            Paragraph(f"<b>{issue.title}</b><br/>{issue.description}", styles["BodyCompact"]),
            issue.action,
            Paragraph(issue.rule_ref or "—", styles["Small"]),
        ])
    if len(issue_rows) == 1:
        issue_rows.append(["INFO", "No open checklist findings", "—", readiness.checklist_id])
    story.extend([
        Spacer(1, 10),
        Table(issue_rows, colWidths=[0.65 * inch, 3.2 * inch, 0.85 * inch, 2.05 * inch], repeatRows=1, style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D8E1E8")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7FAFC")]),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])),
        Paragraph("Confirmed calculation", styles["Section"]),
    ])
    if readiness.confirmed_income:
        calc = readiness.confirmed_income
        story.append(Paragraph(f"<b>${calc.annualized_income:,.2f}</b> annualized income using {calc.method.replace('_', ' ')}. Inputs: gross pay ${calc.inputs['gross_pay']:,.2f}; {calc.inputs['periods_per_year']} periods/year. [{calc.rule_id}]", styles["BodyCompact"]))
    else:
        story.append(Paragraph("No income result is included because gross pay and pay frequency have not both been renter-confirmed or corrected.", styles["BodyCompact"]))

    story.extend([PageBreak(), Paragraph("Document inventory", styles["Section"])])
    document_rows = [["File", "Type", "Status", "Uploaded", "Safety"]]
    for item in document_records:
        document_rows.append([
            Paragraph(item.name, styles["BodyCompact"]),
            Paragraph(item.document_type.replace("_", " "), styles["BodyCompact"]),
            Paragraph(item.status.replace("_", " "), styles["BodyCompact"]),
            item.uploaded_at.date().isoformat(),
            Paragraph(", ".join(item.safety_flags) or "—", styles["Small"]),
        ])
    if len(document_rows) == 1:
        document_rows.append(["No documents uploaded", "—", "—", "—", "—"])
    story.append(Table(document_rows, colWidths=[2.6 * inch, 1.25 * inch, 0.8 * inch, 0.85 * inch, 1.25 * inch], repeatRows=1, style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D8E1E8")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7FAFC")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ])))
    story.extend([
        Paragraph("Sources and method notes", styles["Section"]),
        Paragraph("HUD FY2026 HERA Income Limits Report, Albany, GA MSA table, page 43. Effective May 1, 2026. Income annualization rule: INC-BIWEEKLY-001. RealDoor demo checklist entries are configurable preparation requirements, not universal legal requirements.", styles["BodyCompact"]),
        Spacer(1, 12),
        Paragraph(f"Packet expires {expires_at.isoformat()}. Delete the session to remove uploaded files and generated packets from this demo.", styles["Small"]),
    ])

    document = SimpleDocTemplate(str(path), pagesize=letter, rightMargin=0.65 * inch, leftMargin=0.65 * inch, topMargin=0.55 * inch, bottomMargin=0.7 * inch, title="RealDoor LIHTC Application-Readiness Packet", author="RealDoor")
    document.build(story, onFirstPage=_page_footer, onLaterPages=_page_footer)
    storage_path = str(path)
    if not settings.use_in_memory_repository:
        storage_path = await storage.upload(
            settings.supabase_packet_bucket,
            f"{session.id}/{path.name}",
            path.read_bytes(),
            "application/pdf",
        )
        path.unlink()
    record = PacketRecord(id=packet_id, session_id=session.id, storage_path=storage_path, created_at=created_at, expires_at=expires_at)
    return await packets.create(record)
