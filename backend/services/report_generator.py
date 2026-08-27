from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import datetime
import io

class ReportGenerator:
    @staticmethod
    def generate_pdf(data: dict) -> io.BytesIO:
        """
        Generates a professional clinical PDF report based on prediction inputs and results.
        """
        symptoms = data.get("symptoms", {})
        result = data.get("result", {})
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=letter,
            rightMargin=54, 
            leftMargin=54,
            topMargin=54, 
            bottomMargin=54
        )
        
        story = []
        styles = getSampleStyleSheet()
        
        # Define Color Palette
        primary_color = colors.HexColor("#2563EB")   # Deep Blue
        secondary_color = colors.HexColor("#1E293B") # Charcoal
        neutral_dark = colors.HexColor("#0F172A")    # Slate Dark
        neutral_light = colors.HexColor("#F8FAFC")   # Light gray
        border_color = colors.HexColor("#E2E8F0")    # Light border
        accent_red = colors.HexColor("#DC2626")      # Alert/High Risk red
        accent_green = colors.HexColor("#16A34A")    # Healthy green
        accent_yellow = colors.HexColor("#D97706")   # Moderate yellow
        
        # Styles
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=24,
            textColor=primary_color,
            spaceAfter=6
        )
        
        subtitle_style = ParagraphStyle(
            'DocSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            textColor=colors.HexColor("#64748B"),
            spaceAfter=20
        )
        
        section_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=14,
            textColor=secondary_color,
            spaceBefore=14,
            spaceAfter=8,
            keepWithNext=True
        )
        
        label_style = ParagraphStyle(
            'Label',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            textColor=colors.HexColor("#475569")
        )
        
        value_style = ParagraphStyle(
            'Value',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            textColor=neutral_dark
        )
        
        text_style = ParagraphStyle(
            'BodyTextCustom',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            textColor=neutral_dark,
            leading=14
        )
        
        disclaimer_style = ParagraphStyle(
            'Disclaimer',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9.5,
            textColor=accent_red,
            leading=13,
            alignment=1 # Center aligned
        )

        # Header Block
        story.append(Paragraph("NeuroPark AI — Screening Assessment Report", title_style))
        story.append(Paragraph(f"Generated on {datetime.datetime.now().strftime('%Y-%m-%d %I:%M %p')} | Document Ref: NPK-{datetime.datetime.now().strftime('%y%m%d%H%M')}", subtitle_style))
        
        # 1. Overall Risk (Callout block)
        risk_pct = result.get("riskPercent", 0)
        risk_text = "High Risk" if risk_pct >= 70 else ("Moderate Risk" if risk_pct >= 30 else "Low Risk")
        risk_color = accent_red if risk_pct >= 70 else (accent_yellow if risk_pct >= 30 else accent_green)
        
        risk_title_style = ParagraphStyle(
            'RiskTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=16,
            textColor=colors.white
        )
        risk_score_style = ParagraphStyle(
            'RiskScore',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=36,
            textColor=colors.white
        )
        risk_desc_style = ParagraphStyle(
            'RiskDesc',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=11,
            textColor=colors.white
        )
        
        risk_table_data = [
            [
                Paragraph("OVERALL ASSESSMENT RISK STATUS", risk_title_style), 
                Paragraph(f"{risk_pct}%", risk_score_style)
            ],
            [
                Paragraph(f"Classification: <b>{risk_text}</b> (Multimodal composite analysis)", risk_desc_style),
                Paragraph("Probability Score", ParagraphStyle('ScoreLbl', parent=risk_desc_style, fontSize=9, alignment=1))
            ]
        ]
        
        risk_table = Table(risk_table_data, colWidths=[4.2*inch, 2*inch])
        risk_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), risk_color),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 12),
            ('ALIGN', (1,0), (1,-1), 'CENTER'),
            ('LINEBELOW', (0,0), (-1,0), 1, colors.white),
        ]))
        
        story.append(risk_table)
        story.append(Spacer(1, 15))
        
        # 2. Patient Summary
        story.append(Paragraph("Patient Profile Summary", section_heading))
        patient_data = [
            [
                Paragraph("Age:", label_style), Paragraph(str(symptoms.get("age", "N/A")), value_style),
                Paragraph("Gender:", label_style), Paragraph(str(symptoms.get("gender", "N/A")), value_style)
            ],
            [
                Paragraph("Family History:", label_style), Paragraph("Yes (Parkinson's Diagnosed in Relative)" if symptoms.get("familyHistory") else "No Family History", value_style),
                Paragraph("Assessed Modalities:", label_style), Paragraph("Symptoms, Voice, Handwriting" if result.get("voiceScore", 0) > 0 and result.get("handwritingScore", 0) > 0 else "Partial Modality Assessment", value_style)
            ]
        ]
        patient_table = Table(patient_data, colWidths=[1.2*inch, 1.9*inch, 1.3*inch, 1.8*inch])
        patient_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), neutral_light),
            ('BOX', (0,0), (-1,-1), 0.5, border_color),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 8),
            ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ]))
        story.append(patient_table)
        story.append(Spacer(1, 15))
        
        # 3. Modality Scores
        story.append(Paragraph("Modality Breakdown Scores", section_heading))
        voice_score = result.get("voiceScore", 0)
        hand_score = result.get("handwritingScore", 0)
        
        modality_data = [
            [
                Paragraph("<b>Assessment Modality</b>", label_style),
                Paragraph("<b>Predicted Score</b>", label_style),
                Paragraph("<b>Risk Status</b>", label_style)
            ],
            [
                Paragraph("Subjective Symptoms", value_style),
                Paragraph(f"{result.get('symptomsScore', 0)} / 100", value_style),
                Paragraph("Elevated Risk" if result.get('symptomsScore', 0) >= 50 else "Normal/Borderline", value_style)
            ],
            [
                Paragraph("Vocal Acoustic Analysis", value_style),
                Paragraph(f"{voice_score} / 100" if voice_score > 0 else "Not Provided / Failed", value_style),
                Paragraph("Elevated Risk" if voice_score >= 50 else ("Normal" if voice_score > 0 else "N/A"), value_style)
            ],
            [
                Paragraph("Handwriting Spiral Analysis", value_style),
                Paragraph(f"{hand_score} / 100" if hand_score > 0 else "Not Provided", value_style),
                Paragraph("Elevated Risk" if hand_score >= 50 else ("Normal" if hand_score > 0 else "N/A"), value_style)
            ]
        ]
        
        modality_table = Table(modality_data, colWidths=[2.5*inch, 1.8*inch, 1.9*inch])
        modality_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
            ('BOX', (0,0), (-1,-1), 0.5, border_color),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 8),
            ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ]))
        story.append(modality_table)
        story.append(Spacer(1, 15))
        
        # 4. Symptoms Profile
        story.append(Paragraph("Clinical Scores & Symptom Severity (0-10)", section_heading))
        symptom_details = [
            [
                Paragraph("Tremor Severity:", label_style), Paragraph(f"{symptoms.get('tremor', 0)}/10", value_style),
                Paragraph("MDS-UPDRS Score:", label_style), Paragraph(f"{symptoms.get('updrs', 0.0):.1f} / 199", value_style)
            ],
            [
                Paragraph("Muscle Rigidity:", label_style), Paragraph(f"{symptoms.get('rigidity', 0)}/10", value_style),
                Paragraph("MoCA Cognitive Score:", label_style), Paragraph(f"{symptoms.get('moca', 30.0):.1f} / 30", value_style)
            ],
            [
                Paragraph("Bradykinesia (Slowness):", label_style), Paragraph(f"{symptoms.get('bradykinesia', 0)}/10", value_style),
                Paragraph("Functional Independence:", label_style), Paragraph(f"{symptoms.get('functionalAssessment', 10.0):.1f} / 10", value_style)
            ],
            [
                Paragraph("Postural Instability:", label_style), Paragraph(f"{symptoms.get('posturalInstability', 0)}/10", value_style),
                Paragraph("Sleep Disorders (REM):", label_style), Paragraph(f"{symptoms.get('sleepDisorders', 0)}/10", value_style)
            ]
        ]
        symptom_table = Table(symptom_details, colWidths=[1.8*inch, 1.3*inch, 1.8*inch, 1.3*inch])
        symptom_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), neutral_light),
            ('BOX', (0,0), (-1,-1), 0.5, border_color),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 7),
            ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ]))
        story.append(symptom_table)
        story.append(Spacer(1, 15))
        
        # 5. Clinical Recommendations
        story.append(Paragraph("Screening Recommendations", section_heading))
        rec_text = """
        • <b>Consult a Neurologist:</b> It is highly recommended to seek a professional clinical assessment with a movement disorder specialist/neurologist.
        <br/><br/>
        • <b>MDS-UPDRS Motor Evaluation:</b> Ask your physician about conducting a formal Unified Parkinson's Disease Rating Scale (MDS-UPDRS) exam to evaluate motor capabilities.
        <br/><br/>
        • <b>Periodic Screening Monitoring:</b> Repeat this self-administered assessment every 3 to 6 months to track progression rates of motor signals, voice metrics, and handwriting drawings.
        <br/><br/>
        • <b>Active Lifestyle and Exercise:</b> Engage in physical exercises targeting motor coordination, balance, and core strength, such as Brisky Walking, Tai Chi, Yoga, or specialized Parkinson's boxing programs.
        """
        story.append(Paragraph(rec_text, text_style))
        story.append(Spacer(1, 20))
        
        # 6. Critical Disclaimer Box (At the bottom)
        disclaimer_text = "<b>CRITICAL DISCLAIMER:</b> This prediction is for early screening purposes only. It does not constitute a medical diagnosis. Please consult a qualified neurologist for a professional clinical diagnosis and personalized care plan."
        disclaimer_table = Table([[Paragraph(disclaimer_text, disclaimer_style)]], colWidths=[6.2*inch])
        disclaimer_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEE2E2")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#FCA5A5")),
            ('PADDING', (0,0), (-1,-1), 10),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
        ]))
        story.append(disclaimer_table)
        
        # Build Document
        doc.build(story)
        buffer.seek(0)
        return buffer
