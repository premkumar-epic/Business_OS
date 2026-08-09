import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generateInvoicePDF(elementId, filename = 'Invoice.pdf') {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found.`);
    return false;
  }

  try {
    // Render high-DPI canvas
    const canvas = await html2canvas(element, {
      scale: 2.5, // Crisp vector-like quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // Standard A4 PDF dimensions in mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm

    // Calculate scaled dimensions to fit 1 single A4 page with zero multi-page overflow
    let renderWidth = pageWidth;
    let renderHeight = (canvas.height * pageWidth) / canvas.width;

    if (renderHeight > pageHeight) {
      renderHeight = pageHeight;
      renderWidth = (canvas.width * pageHeight) / canvas.height;
    }

    // Center horizontally if aspect ratio is narrower than A4
    const xOffset = (pageWidth - renderWidth) / 2;
    const yOffset = (pageHeight - renderHeight) / 2;

    pdf.addImage(imgData, 'JPEG', xOffset, yOffset > 0 ? yOffset : 0, renderWidth, renderHeight);
    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    window.print();
    return false;
  }
}
