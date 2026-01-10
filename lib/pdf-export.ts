import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

// ✅ แค่ import ก็พอ (ไฟล์นี้ register font ให้ jsPDF แล้ว)
import "@/lib/fonts/Sarabun-Regular-normal";

interface Team {
  id: string;
  name: string;
  positions: string[];
}

interface Schedule {
  id: string;
  teamId: string;
  date: string;
  assignments: Record<string, string>;
}

export async function exportScheduleToPDF(
  team: Team,
  schedules: Schedule[]
) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // ✅ สำคัญมาก: ใช้ฟอนต์ไทย
  doc.setFont("Sarabun-Regular", "normal");

  // ===== Title =====
  doc.setFontSize(18);
  doc.text(`ตารางเวร - ${team.name}`, 14, 20);

  // ===== Subtitle =====
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Exported: ${format(new Date(), "d MMM yyyy HH:mm")}`,
    14,
    28
  );
  doc.setTextColor(0);

  // ===== Table data =====
  const headers = ["วันที่", ...team.positions];

  const rows = schedules.map((schedule) => {
    const dateFormatted = format(
      new Date(schedule.date),
      "d/MM/yyyy"
    );
    const positionData = team.positions.map(
      (pos) => schedule.assignments[pos] || "-"
    );
    return [dateFormatted, ...positionData];
  });

  // ===== Table =====
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 35,

    styles: {
      font: "Sarabun-Regular", // ✅ ไทยขึ้น
      fontSize: 10,
      cellPadding: 4,
      overflow: "linebreak",
      halign: "left",
    },

    headStyles: {
      font: "Sarabun-Regular", // ✅ กัน fallback
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontStyle: "normal",
    },

    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },

    columnStyles: {
      0: {
        cellWidth: 45,
        font: "Sarabun-Regular", // ✅ ชัวร์
      },
    },

    margin: { top: 35, right: 14, bottom: 20, left: 14 },

    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      const pageNumber = data.pageNumber;

      doc.setFont("Sarabun-Regular");
      doc.setFontSize(9);
      doc.setTextColor(100);

      doc.text(
        `หน้า ${pageNumber} / ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );

      doc.setTextColor(0);
    },
  });

  const fileName = `schedule-${team.name.replace(
    /\s+/g,
    "-"
  )}-${format(new Date(), "yyyy-MM-dd")}.pdf`;

  doc.save(fileName);
}
