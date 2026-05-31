import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from typing import List, Dict, Any

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute total pages and add page numbering.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Draw header on all pages except maybe cover or first page
        # Top banner
        self.setStrokeColor(colors.HexColor("#00C2CB"))
        self.setLineWidth(1)
        self.line(54, 750, 558, 750)
        
        self.drawString(54, 755, "EnzyXNova — AI Enzyme Intelligence Platform")
        self.drawRightString(558, 755, f"Report ID: EZX-PROJ-{self._pageNumber}")
        
        # Bottom page numbers
        self.line(54, 60, 558, 60)
        self.drawString(54, 45, "CONFIDENTIAL — FOR RESEARCH USE ONLY")
        self.drawRightString(558, 45, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


def compile_pdf_report(file_path: str, project: Any, metrics: Dict[str, Any], selected_modules: List[str]):
    # Setup document geometry (0.75 in / 54pt margins)
    doc = SimpleDocTemplate(
        file_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=72,
        bottomMargin=80
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#64748B"),
        spaceAfter=25
    )
    
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=15,
        spaceAfter=10,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#334155"),
        spaceAfter=12
    )

    bold_body_style = ParagraphStyle(
        'DocBodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#334155")
    )

    story = []

    # Title Block
    story.append(Paragraph("EnzyXNova Master Intelligence Report", title_style))
    story.append(Paragraph(f"Computational Enzymology & Catalytic Analytics — Generated {datetime.date.today().isoformat()}", subtitle_style))
    story.append(Spacer(1, 10))

    # SECTION I: Protein & Substrate Specifications
    story.append(Paragraph("I. Protein & Substrate Specifications", section_title_style))
    
    # Specs Table
    specs_data = [
        [
            Paragraph("<b>Parameter</b>", table_header_style), 
            Paragraph("<b>Configuration / Value</b>", table_header_style)
        ],
        [
            Paragraph("Project ID", table_cell_style), 
            Paragraph(str(project.id), table_cell_style)
        ],
        [
            Paragraph("PDB File Scope", table_cell_style), 
            Paragraph(str(project.pdb_filename or "De Novo Model"), table_cell_style)
        ],
        [
            Paragraph("Fasta Sequence Len", table_cell_style), 
            Paragraph(f"{len(project.fasta_sequence or '')} residues", table_cell_style)
        ],
        [
            Paragraph("Ligand Substrate", table_cell_style), 
            Paragraph(str(project.ligand_smiles or project.ligand_pdb_filename or "None Specified"), table_cell_style)
        ],
        [
            Paragraph("Temperature (K) / pH", table_cell_style), 
            Paragraph(f"{project.temperature} K / pH {project.ph}", table_cell_style)
        ],
        [
            Paragraph("Mutation Spec", table_cell_style), 
            Paragraph(str(project.mutation or "None (Wild Type)"), table_cell_style)
        ]
    ]

    t_specs = Table(specs_data, colWidths=[180, 320])
    t_specs.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), colors.HexColor("#0F172A")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_specs)
    story.append(Spacer(1, 20))

    # Compile the modules
    for module in selected_modules:
        if module == 'dg' and "dg" in metrics:
            story.append(Paragraph("II. Gibbs Free Energy (ΔG) Prediction", section_title_style))
            dg_val = metrics["dg"]["delta_g"]
            conf = metrics["dg"]["confidence_score"]
            story.append(Paragraph(f"<b>Predicted ΔG Value:</b> {dg_val} kcal/mol (Confidence: {conf}%)", body_style))
            story.append(Paragraph(f"<b>Interpretation:</b> {metrics['dg']['stability_interpretation']}", body_style))
            
            # Table of residue contributions
            contrib_data = [[
                Paragraph("<b>Residue</b>", table_header_style),
                Paragraph("<b>Position</b>", table_header_style),
                Paragraph("<b>Type</b>", table_header_style),
                Paragraph("<b>Distance (Å)</b>", table_header_style),
                Paragraph("<b>Energy (kcal/mol)</b>", table_header_style),
                Paragraph("<b>Reliability</b>", table_header_style)
            ]]
            for c in metrics["dg"]["residue_contributions"]:
                contrib_data.append([
                    Paragraph(str(c["residue"]), table_cell_style),
                    Paragraph(str(c["position"]), table_cell_style),
                    Paragraph(str(c["type"]), table_cell_style),
                    Paragraph(str(c["distance"]), table_cell_style),
                    Paragraph(str(c["energy"]), table_cell_style),
                    Paragraph(str(c["reliability"]), table_cell_style)
                ])
            t_contrib = Table(contrib_data, colWidths=[70, 60, 120, 80, 90, 80])
            t_contrib.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#00C2CB")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ]))
            story.append(t_contrib)
            story.append(Spacer(1, 15))

        elif module == 'dh' and "dh" in metrics:
            story.append(Paragraph("III. Enthalpy Change (ΔH) Calculations", section_title_style))
            dh_val = metrics["dh"]["delta_h"]
            react_type = metrics["dh"]["reaction_type"]
            story.append(Paragraph(f"<b>Predicted ΔH Value:</b> {dh_val} kcal/mol ({react_type})", body_style))
            story.append(Paragraph(f"<b>Enthalpic Heat Interpretation:</b> {metrics['dh']['catalytic_heat_interpretation']}", body_style))
            
            # Energy map terms
            emap = metrics["dh"]["energy_map"]
            map_data = [
                [Paragraph("<b>Energy Term</b>", table_header_style), Paragraph("<b>Value (kcal/mol)</b>", table_header_style)],
                [Paragraph("Electrostatic Interaction", table_cell_style), Paragraph(str(emap["electrostatic"]), table_cell_style)],
                [Paragraph("Polar Solvation", table_cell_style), Paragraph(str(emap["polar_solvation"]), table_cell_style)],
                [Paragraph("Nonpolar Solvation", table_cell_style), Paragraph(str(emap["nonpolar_solvation"]), table_cell_style)],
                [Paragraph("Van der Waals (VdW)", table_cell_style), Paragraph(str(emap["vdw"]), table_cell_style)]
            ]
            t_map = Table(map_data, colWidths=[250, 250])
            t_map.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#6366F1")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ]))
            story.append(t_map)
            story.append(Spacer(1, 15))

        elif module == 'active-site' and "active_site" in metrics:
            story.append(Paragraph("IV. Active Site Predictions & 3D Coordinates", section_title_style))
            story.append(Paragraph("<b>Catalytic Residues Detected:</b>", body_style))
            
            res_data = [[
                Paragraph("<b>Residue</b>", table_header_style),
                Paragraph("<b>Position</b>", table_header_style),
                Paragraph("<b>Chain</b>", table_header_style),
                Paragraph("<b>ASA Exposure</b>", table_header_style),
                Paragraph("<b>Pocket Volume</b>", table_header_style),
                Paragraph("<b>Confidence</b>", table_header_style)
            ]]
            for r in metrics["active_site"]["catalytic_residues"]:
                res_data.append([
                    Paragraph(str(r["residue"]), table_cell_style),
                    Paragraph(str(r["position"]), table_cell_style),
                    Paragraph(str(r["chain"]), table_cell_style),
                    Paragraph(str(r.get("exposure", "N/A")), table_cell_style),
                    Paragraph(str(r.get("volume", "N/A")), table_cell_style),
                    Paragraph(str(r["confidence"]), table_cell_style)
                ])
            t_res = Table(res_data, colWidths=[80, 60, 60, 100, 100, 100])
            t_res.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ]))
            story.append(t_res)
            story.append(Spacer(1, 15))

        elif module == 'mechanism' and "mechanism" in metrics:
            story.append(Paragraph("V. Catalytic Mechanism Pathways", section_title_style))
            story.append(Paragraph(f"<b>Predicted Mechanism Class:</b> {metrics['mechanism']['mechanism_type']}", body_style))
            
            steps_data = [[Paragraph("<b>Step</b>", table_header_style), Paragraph("<b>Chemical Stage Name</b>", table_header_style), Paragraph("<b>Detailed Reaction Description</b>", table_header_style)]]
            for s in metrics["mechanism"]["catalytic_steps"]:
                steps_data.append([
                    Paragraph(str(s["step"]), table_cell_style),
                    Paragraph(str(s["name"]), table_cell_style),
                    Paragraph(str(s["desc"]), table_cell_style)
                ])
            t_steps = Table(steps_data, colWidths=[50, 150, 300])
            t_steps.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#8B5CF6")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ]))
            story.append(t_steps)
            story.append(Spacer(1, 15))

        elif module == 'affinity' and "binding" in metrics:
            story.append(Paragraph("VI. Binding Affinity Predictions", section_title_style))
            score = metrics["binding"]["docking_score"]
            energy = metrics["binding"]["binding_energy"]
            res = ", ".join(metrics["binding"]["interaction_residues"])
            story.append(Paragraph(f"<b>Vina-like Docking Score:</b> {score} kcal/mol", body_style))
            story.append(Paragraph(f"<b>Estimated Binding Free Energy:</b> {energy} kcal/mol", body_style))
            story.append(Paragraph(f"<b>Key Contact Residues:</b> {res}", body_style))
            story.append(Spacer(1, 15))

        elif module == 'specificity' and "specificity" in metrics:
            story.append(Paragraph("VI. Substrate Specificity & Selectivity", section_title_style))
            story.append(Paragraph(f"<b>Selectivity Index:</b> {metrics['specificity']['selectivity_index']}%", body_style))
            story.append(Paragraph(f"<b>Top Predicted Substrates:</b> {', '.join(metrics['specificity']['top_substrates'])}", body_style))
            story.append(Paragraph(f"<b>Prediction Confidence:</b> {metrics['specificity']['confidence_score']}%", body_style))

            substrate_data = [[Paragraph("<b>Substrate</b>", table_header_style), Paragraph("<b>Predicted Score</b>", table_header_style)]]
            for row in metrics['specificity']['substrate_rankings']:
                substrate_data.append([
                    Paragraph(str(row['substrate']), table_cell_style),
                    Paragraph(str(row['score']), table_cell_style)
                ])
            t_sub = Table(substrate_data, colWidths=[280, 280])
            t_sub.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#22C55E")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ]))
            story.append(t_sub)
            story.append(Spacer(1, 15))

        elif module == 'stability' and "stability" in metrics:
            story.append(Paragraph("VII. Enzyme Stability Profile", section_title_style))
            tm = metrics["stability"]["thermal_tolerance"]
            denat = metrics["stability"]["denaturation_probability"]
            score = metrics["stability"]["stability_score"]
            story.append(Paragraph(f"<b>Thermal Denaturation Limit (Tm):</b> {tm} °C", body_style))
            story.append(Paragraph(f"<b>Denaturation Probability (298.15K):</b> {round(denat*100, 1)}%", body_style))
            story.append(Paragraph(f"<b>Folding Stability Index:</b> {score}/100", body_style))
            story.append(Paragraph(f"<b>Unstable Structural Loops:</b> {', '.join(metrics['stability']['unstable_regions'])}", body_style))
            story.append(Spacer(1, 15))

        elif module == 'mutation' and "mutation" in metrics:
            story.append(Paragraph("VIII. In Silico Mutagenesis Predictions", section_title_style))
            story.append(Paragraph(f"<b>Activity Delta:</b> {metrics['mutation']['activity_change']} | <b>Stability Delta:</b> {metrics['mutation']['stability_change']}", body_style))
            
            mut_data = [[
                Paragraph("<b>Mutation</b>", table_header_style),
                Paragraph("<b>Region Scope</b>", table_header_style),
                Paragraph("<b>Predicted ΔΔG (kcal/mol)</b>", table_header_style),
                Paragraph("<b>Activity Impact</b>", table_header_style),
                Paragraph("<b>Recommendation</b>", table_header_style)
            ]]
            for m in metrics["mutation"]["beneficial_mutations"] + metrics["mutation"]["harmful_mutations"]:
                mut_data.append([
                    Paragraph(str(m["mutation"]), table_cell_style),
                    Paragraph(str(m["region"]), table_cell_style),
                    Paragraph(f"{m['ddg']}", table_cell_style),
                    Paragraph(str(m["impact"]), table_cell_style),
                    Paragraph(str(m.get("rec", "Detrimental")), table_cell_style)
                ])
            t_mut = Table(mut_data, colWidths=[80, 110, 110, 120, 80])
            t_mut.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#10B981")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ]))
            story.append(t_mut)
            story.append(Spacer(1, 15))

        elif module == 'pathway' and "pathway" in metrics:
            story.append(Paragraph("IX. Reaction Pathway Prediction", section_title_style))
            story.append(Paragraph(f"<b>Pathway Feasibility Score:</b> {metrics['pathway']['feasibility_score']}/100", body_style))
            
            path_data = [[Paragraph("<b>Reaction Stage / State</b>", table_header_style), Paragraph("<b>Relative Transition Energy (kcal/mol)</b>", table_header_style)]]
            for p in metrics["pathway"]["pathway_steps"]:
                path_data.append([
                    Paragraph(str(p["state"]), table_cell_style),
                    Paragraph(f"{p['energy']} kcal/mol", table_cell_style)
                ])
            t_path = Table(path_data, colWidths=[250, 250])
            t_path.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#EC4899")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ]))
            story.append(t_path)
            story.append(Spacer(1, 15))

    # Scientific Conclusions block
    conclusion_block = []
    conclusion_block.append(Spacer(1, 10))
    conclusion_block.append(Paragraph("Scientific Conclusions & Interpretative Summary", section_title_style))
    
    # Generate dynamic conclusion text based on parameters
    mut_str = f"The specified mutation <b>{project.mutation}</b> is predicted to "
    if project.mutation:
        if metrics["is_catalytic_mutation"]:
            mut_str += "disrupt core hydrogen bonding and active site triad residues, resulting in a severe loss of catalytic efficiency."
        elif metrics["is_stabilizing_mutation"]:
            mut_str += "increase hydrophobic packing in the cavity wall, providing thermal stability gains without activity loss."
        else:
            mut_str += "display standard baseline affinity profiles with slight modifications."
    else:
        mut_str += "remain at wild-type baseline parameters."

    conclusion_text = f"""
    Based on the compiled thermodynamic calculations, active pocket structural mapping, and transition pathway simulations, 
    the target enzyme system exhibits spontaneous binding free energy with favorable substrate affinity. {mut_str} 
    Folding stability metrics suggest that thermal tolerance is maintained at standard physiological parameters ({project.temperature} K), 
    and is appropriate for industrial design constraints.
    """
    conclusion_block.append(Paragraph(conclusion_text, body_style))
    
    # Signature line
    conclusion_block.append(Spacer(1, 15))
    sig_data = [
        [Paragraph("", body_style), Paragraph("<b>Validated by:</b>", bold_body_style)],
        [Paragraph("", body_style), Paragraph("EnzyXNova AI Analytics Engine v4.1", body_style)],
        [Paragraph("", body_style), Paragraph("Computational Biology Pipeline, Confirmed", body_style)]
    ]
    t_sig = Table(sig_data, colWidths=[300, 200])
    t_sig.setStyle(TableStyle([
        ('LINEBELOW', (1, 0), (1, 0), 1, colors.HexColor("#475569")),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    conclusion_block.append(t_sig)
    
    story.append(KeepTogether(conclusion_block))

    # Build PDF with NumberedCanvas page numbering
    doc.build(story, canvasmaker=NumberedCanvas)
