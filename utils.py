"""
utils.py
Image processing utilities, base64 formatting, image validation,
and academic clinical PDF report generation using ReportLab.
"""

import io
import base64
from datetime import datetime
import numpy as np
import cv2
from PIL import Image

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def numpy_to_base64(img_np, format="PNG"):
    """Converts a numpy RGB image array into a base64 Data URI."""
    pil_img = Image.fromarray(img_np.astype(np.uint8))
    buffered = io.BytesIO()
    pil_img.save(buffered, format=format)
    img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/{format.lower()};base64,{img_b64}"

def validate_image_file(contents: bytes):
    """
    Validates uploaded image bytes.
    Ensures valid format, decodable pixel data, and minimum dimensions.
    """
    if len(contents) > 15 * 1024 * 1024:
        return False, "File size exceeds 15 MB limit."
    
    try:
        img = Image.open(io.BytesIO(contents))
        img.verify()
        
        # Re-open for dimension inspection because verify() can close file
        img = Image.open(io.BytesIO(contents))
        width, height = img.size
        
        if width < 64 or height < 64:
            return False, f"Image dimensions too small ({width}x{height}). Minimum required: 64x64 pixels."
        
        if img.format.lower() not in ["jpeg", "jpg", "png", "webp", "bmp"]:
            return False, f"Unsupported format: {img.format}. Please provide PNG, JPG, or WebP brain MRI scans."
            
        return True, "Valid"
    except Exception as e:
        return False, f"Corrupted or invalid image file: {str(e)}"

def generate_pdf_report(
    scan_id: str,
    original_img_np: np.ndarray,
    gradcam_img_np: np.ndarray,
    prediction_data: dict,
    patient_name: str = "Anonymous Patient / Test Scan",
    patient_age: str = "N/A",
    patient_gender: str = "N/A",
    clinical_notes: str = "Standard axial brain MRI screening"
) -> bytes:
    """
    Generates an official-looking, academic clinical diagnostic report PDF
    complete with MRI visuals, Grad-CAM heatmap, metrics, and academic disclaimer.
    """
    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    header_style = ParagraphStyle(
        'DocHeader',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0F172A'),
        alignment=0
    )
    
    subhead_style = ParagraphStyle(
        'DocSubHeader',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B')
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=10,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )

    bold_body = ParagraphStyle(
        'BoldBody',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#991B1B')
    )

    elements = []

    # 1. Title Banner
    elements.append(Paragraph("NEUROSCAN AI — DEEP LEARNING DIAGNOSTIC REPORT", header_style))
    elements.append(Paragraph("Academic BCA Capstone Project • Brain Tumor Classification & Explainable AI (Grad-CAM)", subhead_style))
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#2563EB'), spaceAfter=10))

    # 2. Metadata Box
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    meta_data = [
        [
            Paragraph(f"<b>Scan ID:</b> {scan_id}", body_style),
            Paragraph(f"<b>Date/Time:</b> {now_str}", body_style)
        ],
        [
            Paragraph(f"<b>Subject / Case:</b> {patient_name}", body_style),
            Paragraph(f"<b>Age / Sex:</b> {patient_age} / {patient_gender}", body_style)
        ],
        [
            Paragraph(f"<b>Modalities:</b> Axial MRI Brain (T1/T2)", body_style),
            Paragraph(f"<b>Clinical Indication:</b> {clinical_notes}", body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[260, 280])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 10))

    # 3. Model Analysis & Classification Result
    elements.append(Paragraph("1. Deep Learning Classification Findings", section_heading))
    
    pred_cls = prediction_data.get("predicted_class", "unknown")
    disp_name = prediction_data.get("display_name", "Unknown")
    confidence = prediction_data.get("confidence", 0.0)
    risk_level = prediction_data.get("risk_level", "Unknown")
    is_tumor = prediction_data.get("is_tumor", False)

    pred_bg = '#FEF2F2' if is_tumor else '#F0FDF4'
    pred_border = '#DC2626' if is_tumor else '#16A34A'
    pred_text_color = '#991B1B' if is_tumor else '#166534'

    result_data = [
        [
            Paragraph(f"<b>PREDICTED CLASS:</b> <font size=12 color='{pred_text_color}'><b>{disp_name.upper()}</b></font>", bold_body),
            Paragraph(f"<b>MODEL CONFIDENCE:</b> <font size=12 color='{pred_text_color}'><b>{confidence}%</b></font>", bold_body)
        ],
        [
            Paragraph(f"<b>Pathology Status:</b> {'Space-Occupying Lesion Identified' if is_tumor else 'No Lesion / Normal'}", body_style),
            Paragraph(f"<b>Risk Assessment:</b> {risk_level}", body_style)
        ],
        [
            Paragraph(f"<b>Anatomical Region:</b> {prediction_data.get('anatomical_site', 'N/A')}", body_style),
            Paragraph(f"<b>Architecture:</b> ResNet-18 Transfer Learning CNN", body_style)
        ]
    ]
    result_table = Table(result_data, colWidths=[270, 270])
    result_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(pred_bg)),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor(pred_border)),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(result_table)
    elements.append(Spacer(1, 10))

    # 4. Side-by-Side Images (Original MRI vs. Grad-CAM Saliency)
    elements.append(Paragraph("2. Explainable AI: Grad-CAM Saliency Localization", section_heading))
    
    # Save images to temp in-memory buffers
    orig_buf = io.BytesIO()
    Image.fromarray(original_img_np.astype(np.uint8)).save(orig_buf, format="JPEG")
    orig_buf.seek(0)
    
    cam_buf = io.BytesIO()
    Image.fromarray(gradcam_img_np.astype(np.uint8)).save(cam_buf, format="JPEG")
    cam_buf.seek(0)

    img_table_data = [
        [
            RLImage(orig_buf, width=2.4*inch, height=2.4*inch),
            RLImage(cam_buf, width=2.4*inch, height=2.4*inch)
        ],
        [
            Paragraph("<b>Original Input Brain MRI Scan</b>", ParagraphStyle('C1', parent=body_style, alignment=1)),
            Paragraph("<b>Grad-CAM Saliency Map (Target Area)</b>", ParagraphStyle('C2', parent=body_style, alignment=1))
        ]
    ]
    img_table = Table(img_table_data, colWidths=[270, 270])
    img_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(img_table)
    elements.append(Spacer(1, 8))

    # 5. Probabilities Table
    elements.append(Paragraph("3. Multi-Class Probability Distribution", section_heading))
    probs = prediction_data.get("probabilities", {})
    prob_rows = [["Diagnostic Category", "Class Type", "Posterior Probability"]]
    for k, v in probs.items():
        prob_rows.append([
            v.get("display_name", k),
            k.capitalize(),
            f"{v.get('percentage', 0)}%"
        ])
    
    prob_table = Table(prob_rows, colWidths=[200, 170, 170])
    prob_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('ALIGN', (2,0), (2,-1), 'CENTER')
    ]))
    elements.append(prob_table)
    elements.append(Spacer(1, 10))

    # 6. Description & Clinical Context
    elements.append(Paragraph("4. Pathology Characteristics & Clinical Profile", section_heading))
    desc_p = Paragraph(f"<b>Pathology Summary:</b> {prediction_data.get('description', '')}", body_style)
    action_p = Paragraph(f"<b>Clinical Context:</b> {prediction_data.get('clinical_relevance', '')}", body_style)
    elements.append(desc_p)
    elements.append(Spacer(1, 4))
    elements.append(action_p)
    elements.append(Spacer(1, 12))

    # 7. Academic Disclaimer Box (Crucial for BCA Capstone project)
    disclaimer_box = [
        [
            Paragraph(
                "<b>ACADEMIC & RESEARCH DISCLAIMER:</b><br/>"
                "This report was generated autonomously by an experimental Deep Learning Computer Vision model "
                "developed for an academic Bachelor of Computer Applications (BCA) capstone project. "
                "This application is <b>strictly non-diagnostic and for demonstration purposes only</b>. "
                "It has not undergone clinical certification (FDA/CE/MDR) and must NEVER be used as a substitute "
                "for a qualified radiologist's or neurosurgeon's clinical evaluation. In case of real medical symptoms, "
                "consult an authorized healthcare professional immediately.",
                disclaimer_style
            )
        ]
    ]
    disclaimer_table = Table(disclaimer_box, colWidths=[540])
    disclaimer_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FEF2F2')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#F87171')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(disclaimer_table)

    doc.build(elements)
    pdf_buffer.seek(0)
    return pdf_buffer.getvalue()
