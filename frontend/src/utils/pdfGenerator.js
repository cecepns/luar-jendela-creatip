import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

/**
 * Generate a pristine, professional A4 PDF from a DOM element.
 * Uses html-to-image (SVG foreignObject using native browser rendering engine)
 * and fits precisely into an A4 page without clipping or over-zooming.
 *
 * @param {HTMLElement} element - The DOM element to convert
 * @param {string} filename - Filename for downloaded PDF
 * @param {Object} options - Custom options (pixelRatio, width, height, etc.)
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
    // Reset transform temporarily so capture is always 100% unscaled full resolution
    element.style.transform = "none";
    element.style.transformOrigin = "top left";
    element.style.margin = "0";

    // Allow browser one frame to recompute layout
    await new Promise((resolve) => setTimeout(resolve, 80));

    const width = options.width || element.scrollWidth || 690;
    const height = options.height || element.scrollHeight || 980;

    // High resolution render (pixelRatio: 2.2 gives crisp 300 DPI equivalent)
    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: 2.2,
      width,
      height,
      style: {
        transform: "none",
        transformOrigin: "top left",
        margin: "0",
        width: `${width}px`,
        minWidth: `${width}px`,
        maxWidth: `${width}px`,
      },
      backgroundColor: "#ffffff",
      cacheBust: true,
      filter: (node) => {
        return !node.classList || !node.classList.contains("no-print");
      },
      ...options,
    });

    // Create A4 PDF (210mm x 297mm)
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

    // Apply printable margin
    const margin = options.margin !== undefined ? options.margin : 5;
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;

    let printWidth = availableWidth;
    let printHeight = printWidth * imgRatio;

    // If printHeight exceeds available A4 height, scale down proportionally to fit the page!
    if (printHeight > availableHeight) {
      const scaleDown = availableHeight / printHeight;
      printHeight = availableHeight;
      printWidth = printWidth * scaleDown;
    }

    // Center horizontally
    const posX = (pageWidth - printWidth) / 2;
    let posY = margin;
    if (printHeight < availableHeight && options.centerVertical) {
      posY = (pageHeight - printHeight) / 2;
    }

    pdf.addImage(dataUrl, "PNG", posX, posY, printWidth, printHeight, undefined, "FAST");
    pdf.save(filename);
    return true;
  } finally {
    // Restore original transform (for mobile responsive preview)
    element.style.transform = originalTransform;
    element.style.transformOrigin = originalTransformOrigin;
    element.style.margin = originalMargin;
  }
}
