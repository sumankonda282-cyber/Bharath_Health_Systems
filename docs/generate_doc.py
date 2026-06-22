from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import Flowable

# ── Colors ────────────────────────────────────────────────────────────────────
NAVY     = colors.HexColor('#0F2557')
ORANGE   = colors.HexColor('#F5821E')
RED      = colors.HexColor('#CC1414')
LIGHT_BG = colors.HexColor('#F8F9FC')
BORDER   = colors.HexColor('#E2E8F0')
WHITE    = colors.white
GRAY     = colors.HexColor('#64748B')
DARK     = colors.HexColor('#1E293B')
GREEN    = colors.HexColor('#16A34A')
PURPLE   = colors.HexColor('#7C3AED')

W, H = A4

# ── Styles ────────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

def style(name, **kw):
    return ParagraphStyle(name, **kw)

COVER_TITLE = style('CoverTitle', fontSize=36, textColor=WHITE,
    fontName='Helvetica-Bold', alignment=TA_CENTER, leading=44)
COVER_SUB = style('CoverSub', fontSize=16, textColor=ORANGE,
    fontName='Helvetica-Bold', alignment=TA_CENTER, leading=24)
COVER_META = style('CoverMeta', fontSize=11, textColor=colors.HexColor('#CBD5E1'),
    fontName='Helvetica', alignment=TA_CENTER, leading=18)

H1 = style('H1', fontSize=22, textColor=NAVY, fontName='Helvetica-Bold',
    leading=30, spaceBefore=20, spaceAfter=8)
H2 = style('H2', fontSize=16, textColor=NAVY, fontName='Helvetica-Bold',
    leading=22, spaceBefore=14, spaceAfter=6)
H3 = style('H3', fontSize=13, textColor=ORANGE, fontName='Helvetica-Bold',
    leading=18, spaceBefore=10, spaceAfter=4)
H4 = style('H4', fontSize=11, textColor=DARK, fontName='Helvetica-Bold',
    leading=16, spaceBefore=8, spaceAfter=3)

BODY = style('Body', fontSize=10, textColor=DARK, fontName='Helvetica',
    leading=16, spaceAfter=6, alignment=TA_JUSTIFY)
BODY_SMALL = style('BodySmall', fontSize=9, textColor=GRAY, fontName='Helvetica',
    leading=14, spaceAfter=4)
BULLET = style('Bullet', fontSize=10, textColor=DARK, fontName='Helvetica',
    leading=16, spaceAfter=4, leftIndent=16, bulletIndent=4)
CODE = style('Code', fontSize=8.5, textColor=colors.HexColor('#1E40AF'),
    fontName='Courier', leading=13, spaceAfter=2,
    backColor=colors.HexColor('#EFF6FF'), leftIndent=12, rightIndent=12)
CAPTION = style('Caption', fontSize=8, textColor=GRAY, fontName='Helvetica-Oblique',
    alignment=TA_CENTER, leading=12, spaceAfter=8)
LABEL = style('Label', fontSize=9, textColor=WHITE, fontName='Helvetica-Bold',
    alignment=TA_CENTER, leading=12)
NOTE = style('Note', fontSize=9, textColor=colors.HexColor('#92400E'),
    fontName='Helvetica-Oblique', leading=13,
    backColor=colors.HexColor('#FEF3C7'), leftIndent=10)

# ── Helpers ───────────────────────────────────────────────────────────────────

def hr(color=BORDER, thickness=1):
    return HRFlowable(width='100%', thickness=thickness, color=color, spaceAfter=8, spaceBefore=8)

def sp(h=6):
    return Spacer(1, h)

def p(text, s=BODY):
    return Paragraph(text, s)

def h1(t): return Paragraph(t, H1)
def h2(t): return Paragraph(t, H2)
def h3(t): return Paragraph(t, H3)
def h4(t): return Paragraph(t, H4)
def body(t): return Paragraph(t, BODY)
def small(t): return Paragraph(t, BODY_SMALL)
def bullet(t): return Paragraph(f'• {t}', BULLET)
def code(t): return Paragraph(t, CODE)
def caption(t): return Paragraph(t, CAPTION)
def note(t): return Paragraph(f'📌 {t}', NOTE)

def section_box(title, content_rows, color=NAVY):
    data = [[Paragraph(title, style('SBT', fontSize=11, textColor=WHITE,
        fontName='Helvetica-Bold', leading=14))]]
    for r in content_rows:
        data.append([Paragraph(r, style('SBC', fontSize=9.5, textColor=DARK,
            fontName='Helvetica', leading=14))])
    t = Table(data, colWidths=[16.5*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), color),
        ('BACKGROUND', (0,1), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 1, BORDER),
        ('LINEBELOW', (0,0), (-1,0), 1, BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, LIGHT_BG]),
    ]))
    return t

def two_col_table(headers, rows, col_widths=None):
    if col_widths is None:
        col_widths = [6*cm, 10.5*cm]
    header_style = style('TH', fontSize=9, textColor=WHITE,
        fontName='Helvetica-Bold', leading=13, alignment=TA_CENTER)
    cell_style = style('TD', fontSize=9, textColor=DARK,
        fontName='Helvetica', leading=13)
    data = [[Paragraph(h, header_style) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), cell_style) for c in row])
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, LIGHT_BG]),
        ('BOX', (0,0), (-1,-1), 1, BORDER),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('PADDING', (0,0), (-1,-1), 7),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    return t

def arch_box(label, items, bg=NAVY):
    cell_s = style('AB', fontSize=9, textColor=DARK, fontName='Helvetica', leading=13)
    head_s = style('AH', fontSize=10, textColor=WHITE, fontName='Helvetica-Bold',
        leading=14, alignment=TA_CENTER)
    data = [[Paragraph(label, head_s)]]
    for i in items:
        data.append([Paragraph(f'  {i}', cell_s)])
    t = Table(data, colWidths=[7.8*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), bg),
        ('BACKGROUND', (0,1), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 1.5, bg),
        ('PADDING', (0,0), (-1,-1), 7),
        ('LINEBELOW', (0,0), (-1,0), 1, WHITE),
    ]))
    return t

def flow_table(steps):
    """Horizontal flow diagram as table"""
    cell_s = style('FS', fontSize=8.5, textColor=WHITE,
        fontName='Helvetica-Bold', leading=12, alignment=TA_CENTER)
    arr_s = style('AR', fontSize=14, textColor=NAVY,
        fontName='Helvetica-Bold', alignment=TA_CENTER)
    row = []
    for i, (label, color) in enumerate(steps):
        row.append(Paragraph(label, cell_s))
        if i < len(steps) - 1:
            row.append(Paragraph('→', arr_s))
    widths = []
    for i in range(len(steps)):
        widths.append(2.8*cm)
        if i < len(steps) - 1:
            widths.append(0.6*cm)
    t = Table([row], colWidths=widths)
    style_cmds = [('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                  ('PADDING', (0,0), (-1,-1), 6)]
    for i, (_, color) in enumerate(steps):
        col = i * 2
        style_cmds.append(('BACKGROUND', (col,0), (col,0), color))
        style_cmds.append(('ROUNDEDCORNERS', [4]))
    t.setStyle(TableStyle(style_cmds))
    return t

# ── Cover Page ────────────────────────────────────────────────────────────────

class ColoredRect(Flowable):
    def __init__(self, w, h, color):
        self.w, self.h, self.color = w, h, color
    def draw(self):
        self.canv.setFillColor(self.color)
        self.canv.rect(0, 0, self.w, self.h, fill=1, stroke=0)
    def wrap(self, *args):
        return self.w, self.h

def cover_page():
    items = []
    # Navy background block
    items.append(ColoredRect(W - 4*cm, 10*cm, NAVY))
    items.append(Spacer(1, -9*cm))
    items.append(sp(20))
    items.append(p('BHarath Health Systems', COVER_TITLE))
    items.append(sp(8))
    items.append(p('Complete System Architecture & Product Documentation', COVER_SUB))
    items.append(sp(16))
    items.append(p('Version 1.0  ·  June 2026  ·  Confidential', COVER_META))
    items.append(sp(30))
    items.append(hr(ORANGE, 3))
    items.append(sp(20))

    # Summary boxes
    data = [
        [Paragraph('9', style('N', fontSize=28, textColor=ORANGE,
            fontName='Helvetica-Bold', alignment=TA_CENTER)),
         Paragraph('1', style('N', fontSize=28, textColor=ORANGE,
            fontName='Helvetica-Bold', alignment=TA_CENTER)),
         Paragraph('1', style('N', fontSize=28, textColor=ORANGE,
            fontName='Helvetica-Bold', alignment=TA_CENTER)),
         Paragraph('∞', style('N', fontSize=28, textColor=ORANGE,
            fontName='Helvetica-Bold', alignment=TA_CENTER))],
        [Paragraph('Portals', style('NL', fontSize=9, textColor=GRAY,
            fontName='Helvetica', alignment=TA_CENTER)),
         Paragraph('Backend API', style('NL', fontSize=9, textColor=GRAY,
            fontName='Helvetica', alignment=TA_CENTER)),
         Paragraph('Database', style('NL', fontSize=9, textColor=GRAY,
            fontName='Helvetica', alignment=TA_CENTER)),
         Paragraph('Tenants', style('NL', fontSize=9, textColor=GRAY,
            fontName='Helvetica', alignment=TA_CENTER))],
    ]
    t = Table(data, colWidths=[4*cm]*4)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 1, BORDER),
        ('LINEAFTER', (0,0), (2,-1), 0.5, BORDER),
        ('PADDING', (0,0), (-1,-1), 12),
    ]))
    items.append(t)
    items.append(sp(30))

    meta = [
        ['Document Type', 'System Architecture & Product Blueprint'],
        ['Platform', 'BHarath Health Systems (BharatCliniq)'],
        ['Serves', 'Clinics and Hospitals across India'],
        ['Tech Stack', 'FastAPI · PostgreSQL · React (Vite) · Render · Vercel'],
        ['Status', 'Active Development — v1.0'],
        ['Prepared by', 'Engineering Team'],
    ]
    t2 = Table(meta, colWidths=[5*cm, 11.5*cm])
    t2.setStyle(TableStyle([
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('TEXTCOLOR', (0,0), (0,-1), NAVY),
        ('TEXTCOLOR', (1,0), (1,-1), DARK),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, BORDER),
        ('PADDING', (0,0), (-1,-1), 7),
        ('ROWBACKGROUNDS', (0,0), (-1,-1), [WHITE, LIGHT_BG]),
    ]))
    items.append(t2)
    return items

# ── Table of Contents ─────────────────────────────────────────────────────────

def toc():
    items = [PageBreak()]
    items.append(h1('Table of Contents'))
    items.append(hr(ORANGE, 2))
    items.append(sp(10))

    entries = [
        ('1', 'Mission & Vision', '3'),
        ('2', 'Business Model', '5'),
        ('3', 'System Architecture Overview', '7'),
        ('4', 'Technology Stack', '9'),
        ('5', 'Database Schema & Relationships', '11'),
        ('6', 'Portal 1 — Public Portal', '15'),
        ('7', 'Portal 2 — Patient Portal', '20'),
        ('8', 'Portal 3 — Staff Portal (Receptionist + Manager)', '25'),
        ('9', 'Portal 4 — Provider (Doctor) Portal', '31'),
        ('10', 'Portal 5 — CareChart (Ward/Nursing) Portal', '37'),
        ('11', 'Portal 6 — Pharmacy Portal', '43'),
        ('12', 'Portal 7 — Lab Portal', '49'),
        ('13', 'Portal 8 — Imaging Portal', '53'),
        ('14', 'Portal 9 — Admin Portal', '57'),
        ('15', 'API Endpoint Map', '61'),
        ('16', 'Authentication & Security', '65'),
        ('17', 'Deployment & DevOps', '68'),
        ('18', 'Multi-Tenancy Design', '71'),
        ('19', 'Error Prevention & Quality Methods', '73'),
        ('20', 'Roadmap & Future Features', '75'),
    ]

    num_s = style('TN', fontSize=10, textColor=ORANGE, fontName='Helvetica-Bold', leading=16)
    title_s = style('TT', fontSize=10, textColor=DARK, fontName='Helvetica', leading=16)
    page_s = style('TP', fontSize=10, textColor=GRAY, fontName='Helvetica', leading=16,
        alignment=TA_CENTER)

    for num, title, page in entries:
        row = Table(
            [[Paragraph(num, num_s), Paragraph(title, title_s), Paragraph(page, page_s)]],
            colWidths=[1*cm, 13.5*cm, 2*cm]
        )
        row.setStyle(TableStyle([
            ('LINEBELOW', (0,0), (-1,-1), 0.5, BORDER),
            ('PADDING', (0,0), (-1,-1), 5),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        items.append(row)
    return items

# ── Chapter 1 — Mission & Vision ──────────────────────────────────────────────

def ch1_mission():
    items = [PageBreak()]
    items.append(h1('Chapter 1 — Mission & Vision'))
    items.append(hr(ORANGE, 2))
    items.append(sp(8))

    items.append(h2('1.1 Who We Are'))
    items.append(body(
        '<b>BHarath Health Systems</b> is a multi-tenant SaaS healthcare platform built '
        'specifically for the Indian market. We serve both <b>clinics and hospitals</b> of '
        'all sizes — from a single-doctor clinic in a small town to a multi-branch '
        'hospital chain in a major city. Every feature, workflow, and design decision '
        'is shaped by the realities of Indian healthcare: cash-dominant billing, '
        'GST compliance, multi-language patient populations, variable connectivity, '
        'and the need for affordable, high-quality digital tools.'
    ))
    items.append(sp(8))

    items.append(h2('1.2 The Problem We Solve'))
    items.append(body(
        'Indian clinics and hospitals face three critical challenges with existing software:'
    ))
    problems = [
        ('Too Expensive', 'GoFrugal, Practo, Marg charge ₹50,000–₹5,00,000/year. '
         'Small clinics cannot afford enterprise software.'),
        ('Too Fragmented', 'Pharmacy uses one system, lab uses another, doctor uses paper. '
         'No unified patient record exists.'),
        ('Not India-Ready', 'Most software is built for Western workflows. GST billing, '
         'Indian drug databases, OTP-based auth, and INR billing are afterthoughts.'),
    ]
    data = [[Paragraph(p, style('PT', fontSize=10, textColor=WHITE,
                fontName='Helvetica-Bold', leading=14)),
             Paragraph(d, style('PD', fontSize=9.5, textColor=DARK,
                fontName='Helvetica', leading=14))]
            for p, d in problems]
    t = Table(data, colWidths=[4*cm, 12.5*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), NAVY),
        ('BACKGROUND', (1,0), (1,-1), LIGHT_BG),
        ('ROWBACKGROUNDS', (1,0), (1,-1), [WHITE, LIGHT_BG]),
        ('BOX', (0,0), (-1,-1), 1, BORDER),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, BORDER),
        ('PADDING', (0,0), (-1,-1), 9),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    items.append(t)
    items.append(sp(12))

    items.append(h2('1.3 Our Solution'))
    items.append(body(
        'BHarath Health Systems is a <b>unified, cloud-based platform</b> that connects '
        'every department of a clinic or hospital into one system — accessible from any '
        'device, anywhere, at a fraction of the cost of legacy software.'
    ))
    items.append(sp(6))

    pillars = [
        ('🏥', 'Unified', 'One platform for reception, doctor, pharmacy, lab, imaging, ward, and administration. Single patient record flows through all.'),
        ('💰', 'Affordable', 'Subscription-based pricing designed for Indian clinics. Free tier for single-doctor clinics. No hardware needed.'),
        ('🇮🇳', 'India-First', 'Built with GST billing, Indian drug database (5,000+ drugs), OTP authentication, INR currency, and ICD-10 coding.'),
        ('☁️', 'Cloud-Native', 'No installation, no server maintenance, no IT team needed. Works on any browser, any device.'),
        ('🔒', 'Secure', 'JWT authentication, role-based access control, PIN-gated clinical actions, audit logs for every change.'),
        ('📈', 'Scalable', 'Multi-tenant architecture supports unlimited clinics on one backend. Built to scale to 1M+ users.'),
    ]

    rows = []
    for i in range(0, len(pillars), 2):
        row = []
        for icon, title, desc in pillars[i:i+2]:
            cell_content = [
                Paragraph(f'{icon} <b>{title}</b>', style('PH', fontSize=10,
                    textColor=NAVY, fontName='Helvetica-Bold', leading=14)),
                Paragraph(desc, style('PB', fontSize=9, textColor=DARK,
                    fontName='Helvetica', leading=13)),
            ]
            row.append(cell_content)
        rows.append(row)

    for row in rows:
        t = Table([[row[0], row[1]]], colWidths=[8*cm, 8*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
            ('BOX', (0,0), (-1,-1), 1, BORDER),
            ('LINEAFTER', (0,0), (0,-1), 0.5, BORDER),
            ('PADDING', (0,0), (-1,-1), 10),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        items.append(t)
        items.append(sp(4))

    items.append(sp(12))
    items.append(h2('1.4 Vision Statement'))
    items.append(body(
        '<i>"To become the default healthcare operating system for every clinic and hospital '
        'in India — making world-class clinical software accessible to a doctor in a '
        'village as easily as to a hospital chain in Mumbai."</i>'
    ))
    items.append(sp(8))

    items.append(h2('1.5 Target Market'))
    market_data = [
        ['Segment', 'Size', 'Our Offer'],
        ['Single-doctor clinics', '~6,00,000 in India', 'Free/Basic plan — OPD, prescriptions, billing'],
        ['Multi-doctor clinics', '~1,50,000 in India', 'Standard plan — full OPD + pharmacy + lab'],
        ['Small hospitals (10–50 beds)', '~50,000 in India', 'Professional plan — inpatient + all modules'],
        ['Mid-size hospitals (50–200 beds)', '~15,000 in India', 'Enterprise plan — full suite + analytics'],
    ]
    t = two_col_table(
        market_data[0],
        market_data[1:],
        col_widths=[5.5*cm, 5*cm, 6*cm]
    )
    items.append(t)
    items.append(sp(12))

    items.append(h2('1.6 Revenue Model'))
    revenue = [
        ['Plan', 'Price/Month', 'Included'],
        ['Free', '₹0', 'Up to 2 doctors, basic OPD + billing, 1 branch'],
        ['Standard', '₹2,999', 'Up to 5 doctors, pharmacy + lab, 2 branches'],
        ['Professional', '₹7,999', 'Up to 15 doctors, inpatient/ward, 5 branches'],
        ['Enterprise', '₹19,999+', 'Unlimited doctors, all modules, unlimited branches'],
    ]
    t = two_col_table(revenue[0], revenue[1:], col_widths=[3.5*cm, 3.5*cm, 9.5*cm])
    items.append(t)
    items.append(sp(8))
    items.append(note(
        'All plans include: GST-compliant billing, Indian drug database, OTP auth, '
        'unlimited patients, and free SSL/hosting. No hidden charges.'
    ))

    return items

# ── Chapter 2 — Architecture ──────────────────────────────────────────────────

def ch2_architecture():
    items = [PageBreak()]
    items.append(h1('Chapter 2 — System Architecture Overview'))
    items.append(hr(ORANGE, 2))
    items.append(sp(8))

    items.append(h2('2.1 High-Level Architecture'))
    items.append(body(
        'BHarath Health Systems uses a <b>monolithic-backend / multi-frontend architecture</b>. '
        'A single FastAPI backend serves all 9 portals via a unified REST API. Each portal '
        'is an independent React SPA that communicates exclusively through this API. '
        'The database is a single PostgreSQL instance with row-level multi-tenancy via clinic_id.'
    ))
    items.append(sp(10))

    # Architecture diagram as table
    layers = [
        ('USERS / BROWSERS', [
            'Public visitors · Patients · Receptionists · Managers',
            'Doctors · Nurses · Pharmacists · Lab staff · Radiologists · Admins',
            'Any device — desktop, tablet, mobile',
        ], NAVY),
        ('FRONTEND LAYER — 9 React (Vite) SPAs on Vercel / Cloudflare Pages', [
            'public  |  patient  |  staff  |  provider  |  carechart',
            'pharmacy  |  lab  |  imaging  |  admin',
            'Each SPA: React 18 + React Router + Axios + Tailwind CSS',
            'Communicates via HTTPS to backend API only — no direct DB access',
        ], colors.HexColor('#1D4ED8')),
        ('BACKEND LAYER — Single FastAPI App on Render', [
            'All routes under /api/v1  ·  JWT authentication  ·  Role-based guards',
            '~140 inpatient routes  ·  pharmacy  ·  lab  ·  imaging  ·  billing  ·  auth',
            'Rate limiting (slowapi)  ·  CORS middleware  ·  Security headers',
            'Python 3.11  ·  FastAPI 0.111  ·  SQLAlchemy ORM  ·  Gunicorn + Uvicorn',
        ], colors.HexColor('#0369A1')),
        ('DATABASE LAYER — PostgreSQL on Supabase', [
            '70+ tables  ·  Multi-tenant via clinic_id on every row',
            'No Alembic — schema managed via start.sh (CREATE TABLE IF NOT EXISTS)',
            'NullPool connection — Supavisor manages pooling (45 usable connections)',
            'Auto-seeded: 5,000+ drugs  ·  ICD-10 terms  ·  Lab tests  ·  Imaging catalog',
        ], colors.HexColor('#065F46')),
        ('EXTERNAL SERVICES', [
            'Fast2SMS / Twilio — OTP delivery  ·  Resend — email notifications',
            'Cloudinary — image/document storage  ·  Daily.co — telehealth video',
            'GitHub Actions — CI/CD  ·  Sentry — error monitoring (planned)',
        ], colors.HexColor('#4C1D95')),
    ]

    for label, details, bg in layers:
        data = [[Paragraph(label, style('LH', fontSize=10, textColor=WHITE,
            fontName='Helvetica-Bold', leading=14, alignment=TA_CENTER))]]
        for d in details:
            data.append([Paragraph(d, style('LD', fontSize=9, textColor=DARK,
                fontName='Helvetica', leading=13))])
        t = Table(data, colWidths=[16.5*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), bg),
            ('BACKGROUND', (0,1), (-1,-1), LIGHT_BG),
            ('BOX', (0,0), (-1,-1), 1.5, bg),
            ('PADDING', (0,0), (-1,-1), 8),
            ('LINEBELOW', (0,0), (-1,0), 1, WHITE),
        ]))
        items.append(t)
        items.append(sp(3))

    items.append(sp(10))
    items.append(h2('2.2 Request Flow Example'))
    items.append(body(
        'Example: A receptionist books an appointment for a walk-in patient.'
    ))
    items.append(sp(6))

    steps = [
        ('Staff Portal\n(Browser)', colors.HexColor('#1D4ED8')),
        ('HTTPS POST\n/api/v1/\nappointments', colors.HexColor('#0369A1')),
        ('FastAPI\nAuth Guard', colors.HexColor('#0369A1')),
        ('SQLAlchemy\nORM', colors.HexColor('#065F46')),
        ('PostgreSQL\n(Supabase)', colors.HexColor('#065F46')),
    ]

    row_data = []
    widths = []
    for i, (label, color) in enumerate(steps):
        row_data.append(Paragraph(label, style('FS', fontSize=8, textColor=WHITE,
            fontName='Helvetica-Bold', leading=11, alignment=TA_CENTER)))
        widths.append(3.0*cm)
        if i < len(steps) - 1:
            row_data.append(Paragraph('→', style('AR', fontSize=12, textColor=NAVY,
                fontName='Helvetica-Bold', alignment=TA_CENTER)))
            widths.append(0.5*cm)

    t = Table([row_data], colWidths=widths)
    style_cmds = [('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('PADDING', (0,0), (-1,-1), 6)]
    for i, (_, color) in enumerate(steps):
        col = i * 2
        style_cmds.append(('BACKGROUND', (col,0), (col,0), color))
    t.setStyle(TableStyle(style_cmds))
    items.append(t)
    items.append(caption('Figure 2.1 — Request flow from browser to database'))
    items.append(sp(8))

    items.append(h2('2.3 Multi-Tenancy Design'))
    items.append(body(
        'Every table that contains clinic-specific data has a <b>clinic_id</b> foreign key. '
        'The backend resolves clinic_id from the authenticated staff JWT on every request. '
        'This means a pharmacist at Clinic A can never read or write data belonging to Clinic B — '
        'isolation is enforced at the SQL query level, not the application level.'
    ))
    items.append(sp(6))
    items.append(code('Example: SELECT * FROM appointments WHERE clinic_id = :clinic_id AND id = :id'))
    items.append(sp(4))
    items.append(note(
        'org_type field on the Clinic model controls feature access: '
        '"clinic" gets OPD features, "hospital" additionally gets inpatient/ward modules.'
    ))

    items.append(sp(12))
    items.append(h2('2.4 The 9 Portals — Overview'))

    portal_data = [
        ['#', 'Portal', 'Directory', 'Users', 'URL'],
        ['1', 'Public', 'frontend/public/', 'Visitors, patients', 'bharathhealthsystems.com'],
        ['2', 'Patient', 'frontend/patient/', 'Registered patients', 'my.bharathhealthsystems.com'],
        ['3', 'Staff', 'frontend/staff/', 'Receptionists + Managers', 'staff.bharathhealthsystems.com'],
        ['4', 'Provider', 'frontend/provider/', 'Doctors', 'provider.bharathhealthsystems.com'],
        ['5', 'CareChart', 'frontend/carechart/', 'Nurses, ward staff', 'carechart.bharathhealthsystems.com'],
        ['6', 'Pharmacy', 'frontend/pharmacy/', 'Pharmacists', 'pharmacy.bharathhealthsystems.com'],
        ['7', 'Lab', 'frontend/lab/', 'Lab technicians', 'lab.bharathhealthsystems.com'],
        ['8', 'Imaging', 'frontend/imaging/', 'Radiologists', 'imaging.bharathhealthsystems.com'],
        ['9', 'Admin', 'frontend/admin/', 'Platform superadmins', '(internal)'],
    ]
    t = two_col_table(
        portal_data[0],
        portal_data[1:],
        col_widths=[0.7*cm, 2.5*cm, 4*cm, 4.5*cm, 5*cm]
    )
    items.append(t)

    return items

# ── Chapter 3 — Public Portal ─────────────────────────────────────────────────

def ch3_public():
    items = [PageBreak()]
    items.append(h1('Chapter 3 — Portal 1: Public Portal'))
    items.append(hr(ORANGE, 2))
    items.append(sp(6))

    # Badge
    badge_data = [[
        Paragraph('PORTAL 1', style('B1', fontSize=9, textColor=WHITE,
            fontName='Helvetica-Bold', leading=12, alignment=TA_CENTER)),
        Paragraph('Public Portal', style('B2', fontSize=14, textColor=NAVY,
            fontName='Helvetica-Bold', leading=18)),
        Paragraph('bharathhealthsystems.com', style('B3', fontSize=9, textColor=GRAY,
            fontName='Helvetica', leading=12)),
    ]]
    bt = Table(badge_data, colWidths=[2.5*cm, 8*cm, 6*cm])
    bt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), ORANGE),
        ('BACKGROUND', (1,0), (-1,0), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 1, BORDER),
        ('PADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    items.append(bt)
    items.append(sp(12))

    items.append(h2('3.1 Purpose'))
    items.append(body(
        'The Public Portal is the <b>front door of BHarath Health Systems</b>. It serves '
        'two distinct audiences: (1) <b>Patients and the public</b> who want to find doctors, '
        'book appointments, or access health information — without creating an account first. '
        '(2) <b>Clinics and hospitals</b> who want to register their facility on the platform '
        'and start using the system. No login is required for browsing; OTP-based verification '
        'is used for booking.'
    ))
    items.append(sp(8))

    items.append(h2('3.2 Key Features'))
    features = [
        ('Doctor Discovery', 'Search doctors by name, specialization, clinic, or location. '
         'View doctor profiles, qualifications, consultation fees, and available time slots.'),
        ('Online Appointment Booking', 'Book appointments without creating an account. '
         'OTP verification via mobile ensures authenticity. Patients receive confirmation.'),
        ('Clinic Discovery', 'Search for clinics and hospitals by location, specialty, '
         'or name. View clinic details, branches, working hours, and available doctors.'),
        ('Clinic Self-Registration', 'New clinics register themselves on the platform. '
         'Form captures clinic name, type (clinic/hospital), specialties, branch details, '
         'and admin contact. Submitted for platform admin approval.'),
        ('Pre-Visit Forms', 'Patients fill health questionnaires before arriving — '
         'chief complaint, existing conditions, current medications. Saves time at reception.'),
        ('Public Health Information', 'Marketing pages explaining platform features, '
         'pricing plans, and benefits for clinics and hospitals.'),
    ]
    for title, desc in features:
        items.append(KeepTogether([
            h3(f'▸ {title}'),
            body(desc),
            sp(4),
        ]))

    items.append(sp(8))
    items.append(h2('3.3 Pages & Routes'))
    routes = [
        ['Route', 'Page', 'Description'],
        ['/', 'Landing Page', 'Hero, features, pricing, CTA to book or register'],
        ['/find-doctor', 'Doctor Search', 'Search + filter doctors, view profiles'],
        ['/book/:doctorId', 'Booking Flow', 'Select slot → OTP verify → confirm booking'],
        ['/clinic/:clinicId', 'Clinic Profile', 'Clinic info, branches, doctors, hours'],
        ['/register-clinic', 'Clinic Registration', 'Multi-step form for new clinic signup'],
        ['/pre-visit/:token', 'Pre-Visit Form', 'Patient health questionnaire before visit'],
        ['/plans', 'Pricing', 'Subscription plans and feature comparison'],
    ]
    t = two_col_table(routes[0], routes[1:], col_widths=[4*cm, 4*cm, 8.5*cm])
    items.append(t)
    items.append(sp(10))

    items.append(h2('3.4 API Endpoints Used'))
    items.append(body(
        'The Public Portal uses <b>unauthenticated endpoints only</b> — no JWT required. '
        'All routes are under <b>/api/v1/public/</b> and <b>/api/v1/otp/</b>.'
    ))
    items.append(sp(6))
    endpoints = [
        ['Method', 'Endpoint', 'Purpose'],
        ['GET', '/api/v1/public/doctors', 'Search/list doctors with filters'],
        ['GET', '/api/v1/public/doctors/:id/slots', 'Get available appointment slots'],
        ['POST', '/api/v1/public/book', 'Book an appointment (OTP-verified)'],
        ['GET', '/api/v1/public/clinics', 'Search clinics/hospitals'],
        ['GET', '/api/v1/public/patient-lookup', 'Check if patient exists by mobile'],
        ['POST', '/api/v1/otp/send', 'Send OTP to mobile number'],
        ['POST', '/api/v1/otp/verify', 'Verify OTP and return verified token'],
        ['POST', '/api/v1/public/register-clinic', 'Submit new clinic registration'],
        ['GET', '/api/v1/public/patient-profile', 'Get patient profile by verified token'],
    ]
    t = two_col_table(endpoints[0], endpoints[1:], col_widths=[2*cm, 6.5*cm, 8*cm])
    items.append(t)
    items.append(sp(6))
    items.append(note(
        'OTP routes are mounted at /api/v1/otp/ — NOT at /otp/. '
        'This is a common mistake. The /api/v1 prefix always applies.'
    ))
    items.append(sp(10))

    items.append(h2('3.5 Booking Flow — Step by Step'))
    items.append(body('Example: A patient named Ravi books an appointment with Dr. Sharma.'))
    items.append(sp(6))

    booking_steps = [
        ['Step', 'Action', 'Technical Detail'],
        ['1', 'Patient visits /find-doctor, searches "Cardiologist"',
         'GET /public/doctors?specialization=Cardiologist'],
        ['2', 'Selects Dr. Sharma, clicks "Book Appointment"',
         'GET /public/doctors/42/slots?booking_date=2026-06-22'],
        ['3', 'Selects 10:30 AM slot, enters mobile 9876543210',
         'POST /otp/send { mobile: "9876543210" }'],
        ['4', 'Receives OTP 4521 on mobile, enters it',
         'POST /otp/verify { mobile: "9876543210", otp: "4521" } → returns verified_token'],
        ['5', 'Booking confirmed',
         'POST /public/book { doctor_id: 42, slot: "10:30", verified_token: "..." }'],
        ['6', 'Patient gets SMS confirmation',
         'Backend sends confirmation via Fast2SMS'],
    ]
    t = two_col_table(booking_steps[0], booking_steps[1:],
        col_widths=[1*cm, 6.5*cm, 9*cm])
    items.append(t)
    items.append(sp(10))

    items.append(h2('3.6 Clinic Registration Flow'))
    items.append(body(
        'When a new clinic wants to join the platform:'
    ))
    reg_steps = [
        '1. Clinic admin visits /register-clinic and fills the registration form',
        '2. Form captures: clinic name, type (clinic/hospital), specialties, branch address, admin name, email, mobile',
        '3. POST /public/register-clinic → creates a pending Clinic record in the database',
        '4. Platform Admin receives notification and reviews the registration',
        '5. Admin approves → clinic status changes to "active" → admin credentials emailed',
        '6. Clinic admin logs into Staff Portal to set up doctors, schedules, and settings',
    ]
    for s in reg_steps:
        items.append(bullet(s))
    items.append(sp(10))

    items.append(h2('3.7 Database Tables Used'))
    db_tables = [
        ['Table', 'Purpose', 'Key Fields'],
        ['clinics', 'Clinic/hospital records', 'id, name, org_type, status, clinic_id'],
        ['branches', 'Clinic branch locations', 'id, clinic_id, address, city, phone'],
        ['doctor_profiles', 'Doctor information', 'id, staff_id, specialization, fee, bio'],
        ['doctor_schedules', 'Availability slots', 'id, doctor_id, day_of_week, start_time'],
        ['appointments', 'Booked appointments', 'id, clinic_id, patient_id, doctor_id, status'],
        ['patients', 'Patient records', 'id, clinic_id, name, mobile, bh_id'],
        ['online_bookings', 'Public bookings', 'id, verified_token, appointment_id, status'],
    ]
    t = two_col_table(db_tables[0], db_tables[1:], col_widths=[4*cm, 5*cm, 7.5*cm])
    items.append(t)
    items.append(sp(10))

    items.append(h2('3.8 Technical Stack'))
    items.append(body('Frontend directory: <b>frontend/public/</b>'))
    items.append(sp(4))
    stack = [
        ['Component', 'Technology', 'Notes'],
        ['Framework', 'React 18 + Vite', 'SPA, no SSR'],
        ['Routing', 'React Router v6', 'Client-side routing'],
        ['HTTP Client', 'Axios', 'Configured in src/api/client.js'],
        ['Styling', 'Tailwind CSS', 'Utility-first, custom brand colors'],
        ['Auth', 'None (public)', 'OTP verified_token for booking only'],
        ['State', 'React useState/useEffect', 'No global state library needed'],
        ['Deployment', 'Vercel', 'Auto-deploy from main branch'],
        ['Env Var', 'VITE_API_URL', 'Points to https://bharatcliniq-api.onrender.com'],
    ]
    t = two_col_table(stack[0], stack[1:], col_widths=[4*cm, 5*cm, 7.5*cm])
    items.append(t)
    items.append(sp(8))
    items.append(note(
        'The public portal has NO JWT authentication. Any endpoint it calls must be '
        'accessible without an Authorization header. Never add protected endpoints here.'
    ))
    items.append(sp(10))

    items.append(h2('3.9 Key Design Decisions'))
    decisions = [
        ('OTP instead of password', 'Patients in India are comfortable with OTP-based '
         'auth (used by banks, UPI, etc.). No password to forget, no account to create.'),
        ('No login required for browsing', 'Reduces friction for new patients. They can '
         'explore doctors and clinics before committing to any interaction.'),
        ('Verified token pattern', 'After OTP verification, the server returns a short-lived '
         'verified_token. This token is passed with the booking request to prove the patient '
         'is who they claim to be — without creating a full session.'),
        ('Unauthenticated API only', 'The public portal never handles staff JWTs or patient '
         'session tokens. This limits the attack surface significantly.'),
    ]
    for title, desc in decisions:
        items.append(KeepTogether([
            h4(f'◆ {title}'),
            body(desc),
            sp(4),
        ]))

    return items

# ── Build PDF ─────────────────────────────────────────────────────────────────

def build():
    path = '/home/user/bharatcliniq/docs/BHarath_Health_Systems_Architecture.pdf'
    doc = SimpleDocTemplate(
        path,
        pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2.5*cm,
        title='BHarath Health Systems — Architecture Document',
        author='BHarath Health Systems Engineering',
    )

    def on_page(canvas, doc):
        canvas.saveState()
        # Header bar
        canvas.setFillColor(NAVY)
        canvas.rect(0, H - 1*cm, W, 1*cm, fill=1, stroke=0)
        canvas.setFillColor(WHITE)
        canvas.setFont('Helvetica-Bold', 8)
        canvas.drawString(2*cm, H - 0.65*cm, 'BHarath Health Systems')
        canvas.setFont('Helvetica', 8)
        canvas.drawRightString(W - 2*cm, H - 0.65*cm, 'Architecture & Product Documentation v1.0')
        # Footer
        canvas.setFillColor(LIGHT_BG)
        canvas.rect(0, 0, W, 1.2*cm, fill=1, stroke=0)
        canvas.setFillColor(GRAY)
        canvas.setFont('Helvetica', 7.5)
        canvas.drawString(2*cm, 0.45*cm, 'Confidential — BHarath Health Systems © 2026')
        canvas.drawRightString(W - 2*cm, 0.45*cm, f'Page {doc.page}')
        # Orange accent line
        canvas.setFillColor(ORANGE)
        canvas.rect(0, 1.2*cm, W, 0.15*cm, fill=1, stroke=0)
        canvas.restoreState()

    story = []
    story += cover_page()
    story += toc()
    story += ch1_mission()
    story += ch2_architecture()
    story += ch3_public()

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print(f'PDF generated: {path}')

build()
