import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

/**
 * Generate a pristine, professional A4 PDF from a DOM element.
 * Uses html-to-image (SVG foreignObject using native browser rendering engine)
 * instead of html2canvas to eliminate font shifting, misplaced borders, and text overlap bugs.
 *
 * @param {HTMLElement} element - The DOM element to convert
 * @param {string} filename - Filename for downloaded PDF
 * @param {Object} options - Custom options (pixelRatio, orientation, etc.)
 */
export async function exportElementToPdf(element, filename = "document.pdf", options = {}) {
  if (!element) {
    throw new Error("Element dokumen tidak ditemukan.");
  }

  // Ensure all web fonts are fully loaded before rendering
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue even if font ready promise rejects
    }
  }

  // Save current styles that might affect rendering (like mobile transform scale)
  const originalTransform = element.style.transform;
  const originalTransformOrigin = element.style.transformOrigin;
  const originalMargin = element.style.margin;

  try {
    // Reset transform temporarily so capture is always 100% full resolution
    element.style.transform = "none";
    element.style.transformOrigin = "top left";
    element.style.margin = "0";

    // Allow browser one frame to recompute layout
    await new Promise((resolve) => setTimeout(resolve, 50));

    // High resolution render (pixelRatio: 2.5 gives razor-sharp 300 DPI equivalent print)
    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: 2.5,
      backgroundColor: "#ffffff",
      cacheBust: true,
      filter: (node) => {
        // Exclude UI controls if any inside element
        return !node.classList || !node.classList.contains("no-print");
      },
      ...options,
    });

    // Create A4 PDF
    const orientation = options.orientation || "portrait";
    const pdf = new jsPDF({
      orientation,
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

    // Calculate dimensions maintaining aspect ratio
    const imgProps = pdf.getImageProperties(dataUrl);
    const imgRatio = imgProps.height / imgProps.width;

    // Apply clean print margins (5mm all around)
    const margin = options.margin !== undefined ? options.margin : 6;
    const printWidth = pageWidth - margin * 2;
    const printHeight = printWidth * imgRatio;

    // Center vertically if it fits within one page
    let posY = margin;
    if (printHeight < pageHeight - margin * 2 && options.centerVertical) {
      posY = (pageHeight - printHeight) / 2;
    }

    pdf.addImage(dataUrl, "PNG", margin, posY, printWidth, printHeight, undefined, "FAST");
    pdf.save(filename);
    return true;
  } finally {
    // Restore original transform (for mobile responsive preview)
    element.style.transform = originalTransform;
    element.style.transformOrigin = originalTransformOrigin;
    element.style.margin = originalMargin;
  }
}
