import PDFDocument from "pdfkit";
import { Response } from "express";

/* ============================= */
/*     PAYSLIP PDF GENERATOR     */
/* ============================= */

export function generatePayslipPDF(payroll: any, res: Response) {
    const emp = payroll.employee || {};
    const company = payroll.company || {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthLabel = `${monthNames[(payroll.month || 1) - 1]} ${payroll.year}`;
    const empName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
    const filename = `Payslip_${empName.replace(/\s+/g, "_")}_${monthLabel}.pdf`;

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    const W = doc.page.width - 80; // usable width

    /* ---------- HEADER ---------- */
    doc.rect(40, 40, W, 70).fill("#1e293b");
    doc.fillColor("#ffffff")
        .fontSize(20).font("Helvetica-Bold")
        .text(company.name || "Company Name", 60, 55, { width: W - 120 });
    doc.fontSize(10).font("Helvetica")
        .text(`SALARY SLIP — ${monthLabel.toUpperCase()}`, 60, 82, { width: W - 120 });

    // Status badge
    const statusColors: Record<string, string> = { Paid: "#22c55e", Processing: "#f59e0b", Pending: "#6b7280" };
    const statusColor = statusColors[payroll.paymentStatus] || "#6b7280";
    doc.roundedRect(W - 50, 53, 80, 24, 4).fill(statusColor);
    doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold")
        .text(payroll.paymentStatus || "Pending", W - 46, 60, { width: 72, align: "center" });

    /* ---------- EMPLOYEE INFO ---------- */
    doc.fillColor("#1e293b").fontSize(11).font("Helvetica-Bold")
        .text("Employee Details", 40, 130);
    doc.moveTo(40, 145).lineTo(40 + W, 145).strokeColor("#e2e8f0").lineWidth(1).stroke();

    const info = [
        ["Employee Name", empName],
        ["Employee ID", emp.employeeId || "-"],
        ["Email", emp.email || "-"],
        ["Pay Period", `${monthLabel}`],
        ["Account No.", payroll.accountNumber || payroll.employee?.accountNumber || "-"],
        ["Bank", payroll.bankName || payroll.employee?.bankName || "-"],
        ["Payment Status", payroll.paymentStatus || "Pending"],
        ["Payment Date", payroll.paymentDate ? new Date(payroll.paymentDate).toLocaleDateString("en-IN") : "-"],
    ];

    let y = 155;
    const col1 = 40, col2 = 240, col3 = 320, col4 = 520;

    info.forEach(([label, value], i) => {
        if (i % 2 === 0) {
            doc.fillColor("#64748b").fontSize(8).font("Helvetica").text(label, col1, y);
            doc.fillColor("#1e293b").fontSize(9).font("Helvetica-Bold").text(value, col2, y - 1, { width: 130 });
        } else {
            doc.fillColor("#64748b").fontSize(8).font("Helvetica").text(label, col3, y);
            doc.fillColor("#1e293b").fontSize(9).font("Helvetica-Bold").text(value, col4 - 140, y - 1, { width: 130 });
            y += 20;
        }
    });

    /* ---------- ATTENDANCE SUMMARY ---------- */
    y += 10;
    doc.fillColor("#1e293b").fontSize(11).font("Helvetica-Bold").text("Attendance Summary", 40, y);
    y += 15;
    doc.moveTo(40, y).lineTo(40 + W, y).strokeColor("#e2e8f0").stroke();
    y += 10;

    const attCols = [
        { label: "Working Days", value: payroll.totalWorkingDays ?? "-" },
        { label: "Days Worked", value: payroll.daysWorked ?? "-" },
        { label: "Paid Leaves", value: payroll.paidLeaves ?? "-" },
        { label: "LOP Days", value: payroll.lop ?? "-" },
    ];

    const attW = W / attCols.length;
    attCols.forEach((col, i) => {
        const x = 40 + i * attW;
        doc.rect(x, y, attW - 6, 44).fill(i % 2 === 0 ? "#f8fafc" : "#f1f5f9");
        doc.fillColor("#64748b").fontSize(8).font("Helvetica").text(col.label, x + 8, y + 8, { width: attW - 20 });
        doc.fillColor("#1e293b").fontSize(18).font("Helvetica-Bold").text(String(col.value), x + 8, y + 18, { width: attW - 20 });
    });
    y += 58;

    /* ---------- EARNINGS & DEDUCTIONS TABLE ---------- */
    doc.fillColor("#1e293b").fontSize(11).font("Helvetica-Bold").text("Earnings & Deductions", 40, y);
    y += 15;
    doc.moveTo(40, y).lineTo(40 + W, y).strokeColor("#e2e8f0").stroke();
    y += 5;

    // Table header
    const halfW = (W - 10) / 2;
    doc.rect(40, y, halfW, 20).fill("#1e293b");
    doc.rect(50 + halfW, y, halfW, 20).fill("#dc2626");
    doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold")
        .text("EARNINGS", 44, y + 6, { width: halfW - 8 });
    doc.text("DEDUCTIONS", 54 + halfW, y + 6, { width: halfW - 8 });
    y += 24;

    const earnings = [
        ["Basic Salary", payroll.basicSalary],
        ["HRA", payroll.hra],
        ["DA", payroll.da],
        ["Conveyance Allowance", payroll.conveyanceAllowance],
        ["Medical Allowance", payroll.medicalAllowance],
        ["Special Allowance", payroll.specialAllowance],
        ["Other Allowances", payroll.otherAllowances],
        ["Overtime", payroll.overtime],
        ["Bonus", payroll.bonus],
        ["Incentive", payroll.incentive],
    ].filter(([, v]) => v);

    const deductions = [
        ["Provident Fund (PF)", payroll.pf],
        ["ESI", payroll.esi],
        ["Professional Tax", payroll.professionalTax],
        ["TDS", payroll.tds],
        ["Loan Deduction", payroll.loanDeduction],
        ["Advance Deduction", payroll.advanceDeduction],
        ["LOP Deduction", payroll.otherDeductions],
    ].filter(([, v]) => v);

    const maxRows = Math.max(earnings.length, deductions.length);
    for (let i = 0; i < maxRows; i++) {
        const bg = i % 2 === 0 ? "#f8fafc" : "#ffffff";
        doc.rect(40, y, halfW, 18).fill(bg);
        doc.rect(50 + halfW, y, halfW, 18).fill(bg);

        if (earnings[i]) {
            doc.fillColor("#475569").fontSize(8).font("Helvetica").text(String(earnings[i][0]), 44, y + 5, { width: halfW / 2 });
            doc.fillColor("#1e293b").fontSize(8).font("Helvetica-Bold")
                .text(`₹ ${Number(earnings[i][1]).toLocaleString("en-IN")}`, 44 + halfW / 2, y + 5, { width: halfW / 2 - 8, align: "right" });
        }
        if (deductions[i]) {
            doc.fillColor("#475569").fontSize(8).font("Helvetica").text(String(deductions[i][0]), 54 + halfW, y + 5, { width: halfW / 2 });
            doc.fillColor("#dc2626").fontSize(8).font("Helvetica-Bold")
                .text(`₹ ${Number(deductions[i][1]).toLocaleString("en-IN")}`, 54 + halfW + halfW / 2, y + 5, { width: halfW / 2 - 8, align: "right" });
        }
        y += 18;
    }

    // Totals row
    doc.rect(40, y, halfW, 22).fill("#e2e8f0");
    doc.rect(50 + halfW, y, halfW, 22).fill("#fee2e2");
    doc.fillColor("#1e293b").fontSize(9).font("Helvetica-Bold")
        .text("Gross Earnings", 44, y + 7, { width: halfW / 2 });
    doc.text(`₹ ${Number(payroll.grossEarnings || 0).toLocaleString("en-IN")}`, 44 + halfW / 2, y + 7, { width: halfW / 2 - 8, align: "right" });
    doc.fillColor("#dc2626")
        .text("Total Deductions", 54 + halfW, y + 7, { width: halfW / 2 });
    doc.text(`₹ ${Number(payroll.totalDeductions || 0).toLocaleString("en-IN")}`, 54 + halfW + halfW / 2, y + 7, { width: halfW / 2 - 8, align: "right" });
    y += 26;

    /* ---------- NET SALARY ---------- */
    doc.rect(40, y, W, 36).fill("#1e293b");
    doc.fillColor("#94a3b8").fontSize(10).font("Helvetica").text("NET SALARY (Take Home)", 48, y + 10);
    doc.fillColor("#22c55e").fontSize(16).font("Helvetica-Bold")
        .text(`₹ ${Number(payroll.netSalary || 0).toLocaleString("en-IN")}`, 48, y + 8, { width: W - 16, align: "right" });
    y += 50;

    /* ---------- FOOTER ---------- */
    doc.fillColor("#94a3b8").fontSize(7).font("Helvetica")
        .text("This is a computer-generated payslip and does not require a signature.", 40, y, { width: W, align: "center" });
    doc.text(`Generated on ${new Date().toLocaleDateString("en-IN")} | ${company.name || ""}`, 40, y + 12, { width: W, align: "center" });

    doc.end();
}
