"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, logframeApi } from "@/lib/api";
import { formatDate, formatNumber, formatCurrency, cn } from "@/lib/utils";
import {
  FileText, Download, FileSpreadsheet, Calendar, Filter,
  BarChart3, Users, Layers, Target, TrendingUp, CheckCircle2,
  AlertCircle, Circle, Printer, RefreshCw,
} from "lucide-react";

// ─── Report types ─────────────────────────────────────────────────────────────
const REPORT_TYPES = [
  {
    id: "output_progress",
    title: "Output Progress Report",
    subtitle: "Monthly physical progress by component and scheme",
    icon: BarChart3,
    color: "brand",
    frequency: "Monthly",
  },
  {
    id: "quarterly_progress",
    title: "Quarterly Progress Report",
    subtitle: "Indicators, gender disaggregation, component analysis",
    icon: TrendingUp,
    color: "blue",
    frequency: "Quarterly",
  },
  {
    id: "logframe_status",
    title: "Logframe Status Report",
    subtitle: "All 88 indicators — targets vs actuals, achievement rates",
    icon: Target,
    color: "saffron",
    frequency: "Monthly",
  },
  {
    id: "beneficiary_summary",
    title: "Beneficiary Register Summary",
    subtitle: "Category-wise, district-wise, gender breakdown",
    icon: Users,
    color: "purple",
    frequency: "On-demand",
  },
  {
    id: "component_progress",
    title: "Component Progress Report",
    subtitle: "Component → Sub-component → Scheme with approval stats",
    icon: Layers,
    color: "green",
    frequency: "Quarterly",
  },
] as const;

type ReportId = typeof REPORT_TYPES[number]["id"];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const QUARTERS = ["Q1 (Apr–Jun)","Q2 (Jul–Sep)","Q3 (Oct–Dec)","Q4 (Jan–Mar)"];
const YEARS = [2024, 2025, 2026, 2027];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportId>("output_progress");
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(4); // May
  const [quarter, setQuarter] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generatingExcel, setGeneratingExcel] = useState(false);

  // Fetch all data needed for reports
  const { data: beneficiaries = [] } = useQuery({ queryKey: ["beneficiaries"], queryFn: () => api.get("/beneficiaries").then(r => r.data as any[]) });
  const { data: schemes = [] } = useQuery({ queryKey: ["schemes"], queryFn: () => api.get("/schemes").then(r => r.data as any[]) });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => api.get("/projects").then(r => r.data as any[]) });
  const { data: components = [] } = useQuery({ queryKey: ["components"], queryFn: () => api.get("/components").then(r => r.data as any[]) });
  const { data: tree = [] } = useQuery({ queryKey: ["logframe-tree"], queryFn: logframeApi.getTree });
  const { data: stats } = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => api.get("/dashboard/stats").then(r => r.data as any) });

  const reportType = REPORT_TYPES.find(r => r.id === selectedReport)!;
  const periodLabel = reportType.frequency === "Monthly"
    ? `${MONTHS[month - 1]} ${year}`
    : reportType.frequency === "Quarterly"
    ? `${QUARTERS[quarter - 1]} ${year}`
    : `${year}`;

  // ─── Generate PDF ─────────────────────────────────────────────────────────
  const generatePDF = async () => {
    setGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF("p", "mm", "a4");
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 14;

      // ── Header ──
      doc.setFillColor(26, 58, 42); // sidebar green
      doc.rect(0, 0, pageW, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text("GOVERNMENT OF UNION TERRITORY OF JAMMU & KASHMIR", margin, 10);
      doc.text("Department of Agriculture Production and Farmers Welfare — JKCIP-PMU", margin, 15);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(reportType.title, margin, 23);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Period: ${periodLabel}   |   Generated: ${new Date().toLocaleDateString("en-IN")}   |   CONFIDENTIAL`, pageW - margin, 23, { align: "right" });

      let y = 36;

      const addSection = (title: string) => {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(26, 58, 42);
        doc.text(title, margin, y);
        doc.setDrawColor(26, 58, 42);
        doc.setLineWidth(0.4);
        doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 50, 50);
        y += 7;
      };

      const checkPage = (neededHeight = 20) => {
        if (y + neededHeight > 270) {
          doc.addPage();
          y = 20;
        }
      };

      if (selectedReport === "output_progress" || selectedReport === "quarterly_progress") {
        // ── Summary Statistics ──
        addSection("1. Summary Statistics");
        const summaryData = [
          ["Total Schemes", formatNumber(schemes.length), "Active Schemes", formatNumber(schemes.filter((s: any) => s.status === "ACTIVE").length)],
          ["Total Projects", formatNumber(projects.length), "Ongoing Projects", formatNumber(projects.filter((p: any) => p.status === "ONGOING").length)],
          ["Total Beneficiaries", formatNumber(beneficiaries.length), "Approved", formatNumber(beneficiaries.filter((b: any) => b.applicationStatus === "APPROVED").length)],
          ["Female Beneficiaries", formatNumber(beneficiaries.filter((b: any) => b.isWoman).length), "Youth Beneficiaries", formatNumber(beneficiaries.filter((b: any) => b.isYouth).length)],
        ];
        autoTable(doc, {
          startY: y,
          head: [["Metric", "Value", "Metric", "Value"]],
          body: summaryData,
          margin: { left: margin, right: margin },
          styles: { fontSize: 9, cellPadding: 2.5 },
          headStyles: { fillColor: [21, 128, 61], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 0: { fontStyle: "bold", cellWidth: 52 }, 2: { fontStyle: "bold", cellWidth: 52 } },
        });
        y = (doc as any).lastAutoTable.finalY + 10;

        // ── Component Progress ──
        checkPage(30);
        addSection("2. Component-wise Progress");
        const compRows = components.map((comp: any) => {
          const compBeneficiaries = beneficiaries.filter((b: any) => {
            return comp.subComponents?.some((sc: any) =>
              sc.schemes?.some((s: any) => s.id === b.schemeId)
            );
          });
          const approved = compBeneficiaries.filter((b: any) => b.applicationStatus === "APPROVED").length;
          const total = compBeneficiaries.length;
          return [
            comp.name,
            comp.subComponents?.length ?? 0,
            comp.subComponents?.reduce((a: number, sc: any) => a + (sc.schemes?.length ?? 0), 0) ?? 0,
            total,
            approved,
            total > 0 ? `${Math.round((approved / total) * 100)}%` : "—",
          ];
        });
        autoTable(doc, {
          startY: y,
          head: [["Component", "Sub-components", "Schemes", "Total Apps", "Approved", "Approval Rate"]],
          body: compRows,
          margin: { left: margin, right: margin },
          styles: { fontSize: 8.5 },
          headStyles: { fillColor: [21, 128, 61], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });
        y = (doc as any).lastAutoTable.finalY + 10;

        // ── Gender Disaggregation ──
        checkPage(30);
        addSection("3. Gender & Category Disaggregation");
        const total = beneficiaries.length || 1;
        const female = beneficiaries.filter((b: any) => b.isWoman).length;
        const male = beneficiaries.filter((b: any) => b.gender === "male").length;
        const youth = beneficiaries.filter((b: any) => b.isYouth).length;
        const sc = beneficiaries.filter((b: any) => b.category === "SC").length;
        const st = beneficiaries.filter((b: any) => b.category === "ST").length;
        const obc = beneficiaries.filter((b: any) => b.category === "OBC").length;
        const phh = beneficiaries.filter((b: any) => b.category === "PHH").length;
        const gen = beneficiaries.filter((b: any) => b.category === "GENERAL").length;
        autoTable(doc, {
          startY: y,
          head: [["Category", "Count", "% of Total"]],
          body: [
            ["Female", female, `${Math.round((female / total) * 100)}%`],
            ["Male", male, `${Math.round((male / total) * 100)}%`],
            ["Youth (< 35)", youth, `${Math.round((youth / total) * 100)}%`],
            ["SC (Scheduled Caste)", sc, `${Math.round((sc / total) * 100)}%`],
            ["ST (Scheduled Tribe)", st, `${Math.round((st / total) * 100)}%`],
            ["OBC", obc, `${Math.round((obc / total) * 100)}%`],
            ["PHH (Priority Household)", phh, `${Math.round((phh / total) * 100)}%`],
            ["General", gen, `${Math.round((gen / total) * 100)}%`],
          ],
          margin: { left: margin, right: margin },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [21, 128, 61], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 0: { cellWidth: 80 } },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      if (selectedReport === "logframe_status") {
        addSection("1. Logframe Achievement Summary");
        const allIndicators: any[] = [];
        const collectIndicators = (nodes: any[]) => {
          nodes.forEach(node => {
            node.indicators?.forEach((ind: any) => {
              const prog = ind.yearlyProgress?.find((p: any) => p.reportYear === year);
              allIndicators.push({ ...ind, currentProg: prog, nodeName: node.title, nodeCode: node.code });
            });
            collectIndicators(node.children || []);
          });
        };
        collectIndicators(tree);

        const onTarget = allIndicators.filter(i => {
          const p = i.currentProg;
          if (!p?.annualResult) return false;
          const target = p.annualTarget || i.endTarget || 1;
          return (p.annualResult / target) * 100 >= 75;
        }).length;
        const withData = allIndicators.filter(i => i.currentProg?.annualResult != null).length;

        autoTable(doc, {
          startY: y,
          body: [
            ["Total Indicators", allIndicators.length, "With Data", withData],
            ["On Target (≥75%)", onTarget, "Below Target", withData - onTarget],
            ["Reporting Year", year, "Data Coverage", `${Math.round((withData / allIndicators.length) * 100)}%`],
          ],
          margin: { left: margin, right: margin },
          styles: { fontSize: 9 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 }, 2: { fontStyle: "bold", cellWidth: 60 } },
        });
        y = (doc as any).lastAutoTable.finalY + 8;

        addSection(`2. Indicator Progress — ${year}`);
        const indRows = allIndicators.map(ind => {
          const p = ind.currentProg;
          const result = p?.annualResult ?? null;
          const target = p?.annualTarget ?? ind.endTarget ?? null;
          const pct = target && result !== null ? `${Math.round((result / target) * 100)}%` : "—";
          const status = !result ? "No data" : target && (result / target) * 100 >= 75 ? "On Target" : "Off Track";
          return [ind.code, ind.name.substring(0, 45), ind.unit ?? "—", ind.endTarget ?? "—", result ?? "—", pct, status];
        });
        autoTable(doc, {
          startY: y,
          head: [["Code", "Indicator", "Unit", "End Target", `${year} Result`, "Achievement", "Status"]],
          body: indRows,
          margin: { left: margin, right: margin },
          styles: { fontSize: 7.5, cellPadding: 1.8 },
          headStyles: { fillColor: [21, 128, 61], textColor: 255, fontStyle: "bold", fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 58 },
            2: { cellWidth: 16 },
            3: { cellWidth: 20 },
            4: { cellWidth: 20 },
            5: { cellWidth: 20 },
            6: { cellWidth: 20 },
          },
          didParseCell: (data: any) => {
            if (data.column.index === 6 && data.section === "body") {
              if (data.cell.raw === "On Target") data.cell.styles.textColor = [21, 128, 61];
              else if (data.cell.raw === "Off Track") data.cell.styles.textColor = [220, 38, 38];
              else data.cell.styles.textColor = [148, 163, 184];
            }
          },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      if (selectedReport === "beneficiary_summary") {
        addSection("1. Beneficiary Overview");
        const districts: Record<string, { total: number; approved: number; female: number; youth: number }> = {};
        beneficiaries.forEach((b: any) => {
          const d = b.district || "Unknown";
          if (!districts[d]) districts[d] = { total: 0, approved: 0, female: 0, youth: 0 };
          districts[d].total++;
          if (b.applicationStatus === "APPROVED") districts[d].approved++;
          if (b.isWoman) districts[d].female++;
          if (b.isYouth) districts[d].youth++;
        });

        autoTable(doc, {
          startY: y,
          head: [["District", "Total Applications", "Approved", "Female", "Youth", "Approval %"]],
          body: Object.entries(districts).sort((a, b) => b[1].total - a[1].total).map(([dist, d]) => [
            dist, d.total, d.approved, d.female, d.youth,
            `${Math.round((d.approved / d.total) * 100)}%`,
          ]),
          margin: { left: margin, right: margin },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [21, 128, 61], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });
        y = (doc as any).lastAutoTable.finalY + 10;

        checkPage(30);
        addSection("2. Category Breakdown");
        const cats = ["SC", "ST", "OBC", "PHH", "GENERAL"];
        autoTable(doc, {
          startY: y,
          head: [["Category", "Total", "Approved", "Pending", "Reverted", "Approval Rate"]],
          body: cats.map(cat => {
            const catBens = beneficiaries.filter((b: any) => b.category === cat);
            const app = catBens.filter((b: any) => b.applicationStatus === "APPROVED").length;
            const pend = catBens.filter((b: any) => b.applicationStatus === "PENDING").length;
            const rev = catBens.filter((b: any) => b.applicationStatus === "REVERTED").length;
            return [cat, catBens.length, app, pend, rev, catBens.length > 0 ? `${Math.round((app / catBens.length) * 100)}%` : "—"];
          }),
          margin: { left: margin, right: margin },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [21, 128, 61], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      if (selectedReport === "component_progress") {
        components.forEach((comp: any, ci: number) => {
          checkPage(40);
          addSection(`${ci + 1}. ${comp.name} (${comp.code})`);
          comp.subComponents?.forEach((sc: any) => {
            checkPage(20);
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(55, 65, 81);
            doc.text(`  ${sc.code} — ${sc.name}`, margin, y);
            doc.setFont("helvetica", "normal");
            y += 5;
            if (sc.schemes?.length > 0) {
              autoTable(doc, {
                startY: y,
                head: [["Scheme", "Code", "Department", "Status"]],
                body: sc.schemes.map((s: any) => [s.title.substring(0, 45), s.code, s.department, s.status]),
                margin: { left: margin + 5, right: margin },
                styles: { fontSize: 8 },
                headStyles: { fillColor: [45, 107, 78], textColor: 255, fontStyle: "bold", fontSize: 8 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
              });
              y = (doc as any).lastAutoTable.finalY + 6;
            }
          });
        });
      }

      // ── Footer on all pages ──
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(150);
        doc.text(
          `JKCIP-PMU | DAP&FW, Government of UTJ&K | IFAD Co-financed | Page ${i} of ${pageCount}`,
          pageW / 2, 290, { align: "center" }
        );
      }

      const filename = `JKCIP_${reportType.id}_${periodLabel.replace(/\s/g, "_")}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF generation failed. Check console for details.");
    } finally {
      setGenerating(false);
    }
  };

  // ─── Generate Excel ────────────────────────────────────────────────────────
  const generateExcel = async () => {
    setGeneratingExcel(true);
    try {
      const XLSX = await import("xlsx");

      const wb = XLSX.utils.book_new();
      const headerRow = [`JKCIP-PMU | ${reportType.title} | Period: ${periodLabel} | Generated: ${new Date().toLocaleDateString("en-IN")}`];

      if (selectedReport === "output_progress" || selectedReport === "quarterly_progress") {
        // Summary sheet
        const summaryData = [
          headerRow, [],
          ["SUMMARY STATISTICS"],
          ["Metric", "Value"],
          ["Total Beneficiaries", beneficiaries.length],
          ["Approved", beneficiaries.filter((b: any) => b.applicationStatus === "APPROVED").length],
          ["Pending", beneficiaries.filter((b: any) => b.applicationStatus === "PENDING").length],
          ["Reverted", beneficiaries.filter((b: any) => b.applicationStatus === "REVERTED").length],
          ["Female", beneficiaries.filter((b: any) => b.isWoman).length],
          ["Youth", beneficiaries.filter((b: any) => b.isYouth).length],
          ["Total Schemes", schemes.length],
          ["Total Projects", projects.length],
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

        // Beneficiaries sheet
        const benHeaders = ["Reference No", "Name", "Gender", "Category", "Application Status", "District", "Block", "Village", "Woman", "Youth", "BPL", "Phone", "Scheme", "Created"];
        const benRows = beneficiaries.map((b: any) => [
          b.referenceNumber, b.fullName, b.gender ?? "", b.category ?? "", b.applicationStatus ?? b.status,
          b.district ?? "", b.block ?? "", b.village ?? "",
          b.isWoman ? "Yes" : "No", b.isYouth ? "Yes" : "No", b.isBpl ? "Yes" : "No",
          b.phone ?? "", b.scheme?.title ?? "", new Date(b.createdAt).toLocaleDateString("en-IN"),
        ]);
        const wsBen = XLSX.utils.aoa_to_sheet([headerRow, [], benHeaders, ...benRows]);
        XLSX.utils.book_append_sheet(wb, wsBen, "Beneficiaries");

        // Schemes sheet
        const schemeHeaders = ["Code", "Title", "Department", "Status", "Budget (₹)", "Utilized (₹)", "Target Beneficiaries", "Achieved", "Component", "Sub-component"];
        const schemeRows = schemes.map((s: any) => [
          s.code, s.title, s.department, s.status, s.budget, s.utilizedBudget,
          s.targetBeneficiaries, s.achievedBeneficiaries,
          s.subComponent?.component?.name ?? "", s.subComponent?.name ?? "",
        ]);
        const wsSchemes = XLSX.utils.aoa_to_sheet([headerRow, [], schemeHeaders, ...schemeRows]);
        XLSX.utils.book_append_sheet(wb, wsSchemes, "Schemes");
      }

      if (selectedReport === "logframe_status") {
        const allIndicators: any[] = [];
        const collectIndicators = (nodes: any[], parentTitle = "") => {
          nodes.forEach(node => {
            node.indicators?.forEach((ind: any) => {
              const prog = ind.yearlyProgress?.find((p: any) => p.reportYear === year);
              allIndicators.push({
                nodeCode: node.code, nodeTitle: node.title, level: node.level,
                ...ind, currentProg: prog,
              });
            });
            collectIndicators(node.children || [], node.title);
          });
        };
        collectIndicators(tree);

        const indHeaders = [
          "Node Code", "Node Title", "Level", "Indicator Code", "Indicator Name",
          "Unit", "Baseline", "Mid Target", "End Target",
          `${year} Annual Target`, `${year} Annual Result`, `${year} Achievement %`,
          "Male", "Female", "Youth", "Indigenous", "Households", "Evidence Source", "Status",
        ];
        const indRows = allIndicators.map(ind => {
          const p = ind.currentProg;
          const result = p?.annualResult ?? null;
          const target = p?.annualTarget ?? ind.endTarget ?? null;
          const pct = target && result !== null ? Math.round((result / target) * 100) : null;
          const status = result === null ? "No Data" : pct && pct >= 75 ? "On Target" : "Off Track";
          return [
            ind.nodeCode, ind.nodeTitle, ind.level,
            ind.code, ind.name, ind.unit ?? "",
            ind.baseline ?? "", ind.midTarget ?? "", ind.endTarget ?? "",
            p?.annualTarget ?? "", result ?? "", pct !== null ? `${pct}%` : "",
            p?.maleValue ?? "", p?.femaleValue ?? "", p?.youthValue ?? "",
            p?.indigenousValue ?? "", p?.householdValue ?? "", p?.evidenceSource ?? "",
            status,
          ];
        });
        const ws = XLSX.utils.aoa_to_sheet([headerRow, [], indHeaders, ...indRows]);
        XLSX.utils.book_append_sheet(wb, ws, `Logframe ${year}`);
      }

      if (selectedReport === "beneficiary_summary") {
        const distMap: Record<string, any> = {};
        beneficiaries.forEach((b: any) => {
          const d = b.district || "Unknown";
          if (!distMap[d]) distMap[d] = { total: 0, approved: 0, pending: 0, reverted: 0, female: 0, youth: 0, sc: 0, st: 0, obc: 0, phh: 0 };
          distMap[d].total++;
          if (b.applicationStatus === "APPROVED") distMap[d].approved++;
          if (b.applicationStatus === "PENDING") distMap[d].pending++;
          if (b.applicationStatus === "REVERTED") distMap[d].reverted++;
          if (b.isWoman) distMap[d].female++;
          if (b.isYouth) distMap[d].youth++;
          if (b.category === "SC") distMap[d].sc++;
          if (b.category === "ST") distMap[d].st++;
          if (b.category === "OBC") distMap[d].obc++;
          if (b.category === "PHH") distMap[d].phh++;
        });
        const distHeaders = ["District", "Total", "Approved", "Pending", "Reverted", "Female", "Youth", "SC", "ST", "OBC", "PHH", "Approval %"];
        const distRows = Object.entries(distMap).sort((a, b) => b[1].total - a[1].total).map(([dist, d]) => [
          dist, d.total, d.approved, d.pending, d.reverted, d.female, d.youth, d.sc, d.st, d.obc, d.phh,
          `${Math.round((d.approved / d.total) * 100)}%`,
        ]);
        const ws = XLSX.utils.aoa_to_sheet([headerRow, [], distHeaders, ...distRows]);
        XLSX.utils.book_append_sheet(wb, ws, "By District");

        // Full register
        const regHeaders = ["Reference No", "Name", "Gender", "Category", "Status", "District", "Block", "Village", "Woman", "Youth", "BPL"];
        const regRows = beneficiaries.map((b: any) => [
          b.referenceNumber, b.fullName, b.gender ?? "", b.category ?? "", b.applicationStatus ?? b.status,
          b.district ?? "", b.block ?? "", b.village ?? "",
          b.isWoman ? "Y" : "N", b.isYouth ? "Y" : "N", b.isBpl ? "Y" : "N",
        ]);
        const wsReg = XLSX.utils.aoa_to_sheet([headerRow, [], regHeaders, ...regRows]);
        XLSX.utils.book_append_sheet(wb, wsReg, "Full Register");
      }

      if (selectedReport === "component_progress") {
        components.forEach((comp: any) => {
          const rows: any[] = [headerRow, [], [`Component: ${comp.name} (${comp.code})`], []];
          comp.subComponents?.forEach((sc: any) => {
            rows.push([`Sub-component: ${sc.name} (${sc.code})`]);
            rows.push(["Scheme Code", "Scheme Title", "Department", "Status", "Budget", "Target Beneficiaries"]);
            sc.schemes?.forEach((s: any) => {
              rows.push([s.code, s.title, s.department, s.status, s.budget, s.targetBeneficiaries]);
            });
            rows.push([]);
          });
          const ws = XLSX.utils.aoa_to_sheet(rows);
          const sheetName = comp.code.replace(/[^a-zA-Z0-9]/g, "").substring(0, 31);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });
      }

      const filename = `JKCIP_${reportType.id}_${periodLabel.replace(/\s/g, "_")}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Excel generation failed:", err);
      alert("Excel generation failed. Check console.");
    } finally {
      setGeneratingExcel(false);
    }
  };

  // ─── Preview stats ────────────────────────────────────────────────────────
  const previewStats = {
    beneficiaries: beneficiaries.length,
    approved: beneficiaries.filter((b: any) => b.applicationStatus === "APPROVED").length,
    schemes: schemes.length,
    projects: projects.length,
    female: beneficiaries.filter((b: any) => b.isWoman).length,
    youth: beneficiaries.filter((b: any) => b.isYouth).length,
  };

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">All reports are generated from live MIS data and exported as downloadable files</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse" />
          Live data — {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Left — Report selector */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">Select Report Type</p>
          {REPORT_TYPES.map(rt => {
            const Icon = rt.icon;
            const isSelected = selectedReport === rt.id;
            return (
              <button key={rt.id} onClick={() => setSelectedReport(rt.id)}
                className={cn(
                  "w-full text-left p-3.5 rounded-xl border transition-all",
                  isSelected
                    ? "bg-brand-700 border-brand-700 text-white shadow-md"
                    : "bg-white border-slate-200 hover:border-brand-300 hover:bg-brand-50"
                )}>
                <div className="flex items-start gap-3">
                  <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", isSelected ? "text-white" : "text-brand-700")} />
                  <div className="min-w-0">
                    <p className={cn("text-sm font-semibold leading-tight", isSelected ? "text-white" : "text-slate-800")}>
                      {rt.title}
                    </p>
                    <p className={cn("text-[11px] mt-0.5 leading-tight", isSelected ? "text-white/70" : "text-slate-500")}>
                      {rt.subtitle}
                    </p>
                    <span className={cn("inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded",
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    )}>
                      {rt.frequency}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right — Configuration + Preview + Export */}
        <div className="col-span-2 space-y-4">
          {/* Period selector */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Report Period & Filters</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <label className="form-label">Year</label>
                <select className="form-select w-28 py-1.5 text-sm" value={year} onChange={e => setYear(Number(e.target.value))}>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              {reportType.frequency === "Monthly" && (
                <div>
                  <label className="form-label">Month</label>
                  <select className="form-select w-36 py-1.5 text-sm" value={month} onChange={e => setMonth(Number(e.target.value))}>
                    {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                </div>
              )}
              {reportType.frequency === "Quarterly" && (
                <div>
                  <label className="form-label">Quarter</label>
                  <select className="form-select w-40 py-1.5 text-sm" value={quarter} onChange={e => setQuarter(Number(e.target.value))}>
                    {QUARTERS.map((q, i) => <option key={i + 1} value={i + 1}>{q}</option>)}
                  </select>
                </div>
              )}
              <div className="ml-auto flex items-end pb-0.5">
                <div className="flex items-center gap-2 bg-saffron-50 border border-saffron-200 rounded-lg px-3 py-1.5">
                  <Calendar className="w-3.5 h-3.5 text-saffron-700" />
                  <span className="text-sm font-semibold text-saffron-800">{periodLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-800">{reportType.title}</h3>
                <p className="text-xs text-slate-500">Preview — {periodLabel}</p>
              </div>
              <span className="badge bg-brand-100 text-brand-700 text-xs">Live Data</span>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: "Total Beneficiaries", value: previewStats.beneficiaries, icon: Users, color: "text-brand-700", bg: "bg-brand-50" },
                { label: "Approved", value: previewStats.approved, icon: CheckCircle2, color: "text-green-700", bg: "bg-green-50" },
                { label: "Active Schemes", value: schemes.filter((s: any) => s.status === "ACTIVE").length, icon: Layers, color: "text-blue-700", bg: "bg-blue-50" },
                { label: "Female Beneficiaries", value: previewStats.female, icon: Users, color: "text-pink-700", bg: "bg-pink-50" },
                { label: "Youth", value: previewStats.youth, icon: Users, color: "text-purple-700", bg: "bg-purple-50" },
                { label: "Projects", value: previewStats.projects, icon: BarChart3, color: "text-saffron-700", bg: "bg-saffron-50" },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className={cn("rounded-xl p-3 flex items-center gap-3", s.bg)}>
                    <Icon className={cn("w-4 h-4 flex-shrink-0", s.color)} />
                    <div>
                      <p className={cn("text-lg font-bold font-display leading-tight", s.color)}>{formatNumber(s.value)}</p>
                      <p className="text-[10px] text-slate-600">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Report contents */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">This report will include:</p>
              <div className="space-y-1">
                {selectedReport === "output_progress" && [
                  "Summary statistics (beneficiaries, schemes, projects)",
                  "Component-wise progress table",
                  "Gender & category disaggregation (SC/ST/OBC/PHH)",
                  "District-wise beneficiary distribution",
                ].map(item => <p key={item} className="text-xs text-slate-600 flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-brand-600 flex-shrink-0" />{item}</p>)}

                {selectedReport === "quarterly_progress" && [
                  "Executive summary with KPI comparison",
                  "Component-wise approval rates",
                  "Gender & category disaggregation",
                  "District performance table",
                  "Scheme-wise status breakdown",
                ].map(item => <p key={item} className="text-xs text-slate-600 flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-brand-600 flex-shrink-0" />{item}</p>)}

                {selectedReport === "logframe_status" && [
                  `All 88 logframe indicators — ${year} targets vs actuals`,
                  "Achievement % per indicator with on-target/off-track status",
                  "Disaggregation values (male/female/youth/indigenous)",
                  "Evidence sources and verification status",
                ].map(item => <p key={item} className="text-xs text-slate-600 flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-brand-600 flex-shrink-0" />{item}</p>)}

                {selectedReport === "beneficiary_summary" && [
                  "District-wise breakdown (all 20 districts)",
                  "Category breakdown (SC/ST/OBC/PHH/General)",
                  "Application status summary (Approved/Pending/Reverted)",
                  "Full beneficiary register with all fields",
                ].map(item => <p key={item} className="text-xs text-slate-600 flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-brand-600 flex-shrink-0" />{item}</p>)}

                {selectedReport === "component_progress" && [
                  "All 3 components with sub-components",
                  "Scheme listing per sub-component",
                  "Beneficiary counts and approval rates",
                  "Budget utilization per component",
                ].map(item => <p key={item} className="text-xs text-slate-600 flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-brand-600 flex-shrink-0" />{item}</p>)}
              </div>
            </div>
          </div>

          {/* Export buttons */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Export Report</p>
            <div className="flex gap-3">
              <button onClick={generatePDF} disabled={generating}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                {generating ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Generating PDF…</>
                ) : (
                  <><FileText className="w-4 h-4" />Export as PDF</>
                )}
              </button>
              <button onClick={generateExcel} disabled={generatingExcel}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                {generatingExcel ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Generating Excel…</>
                ) : (
                  <><FileSpreadsheet className="w-4 h-4" />Export as Excel</>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              Files are generated from live data and downloaded directly to your device
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
