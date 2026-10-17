import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";
import { BILL_WIDTH_PX } from "./BillDocument";

/**
 * Bill → image / PDF in the browser, then share (phones) or download (computers).
 * The image is a picture of the A4 bill, so रू and Nepali names look exactly as on screen.
 */

export type BillFiles = { image: File; pdf: File };

const canvasToBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not make the image"))), type)
  );

/** A4 PDF from the bill picture; a long bill continues on more pages. */
function canvasToPdf(canvas: HTMLCanvasElement): Blob {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const margin = 10;
  const pageWidth = 210 - margin * 2;
  const pageHeight = 297 - margin * 2;
  const pxPerMm = canvas.width / pageWidth;
  const slicePx = Math.floor(pageHeight * pxPerMm);

  for (let top = 0, page = 0; top < canvas.height; top += slicePx, page++) {
    const height = Math.min(slicePx, canvas.height - top);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = height;
    const ctx = slice.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, top, canvas.width, height, 0, 0, canvas.width, height);
    if (page > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, pageWidth, height / pxPerMm);
  }
  return pdf.output("blob");
}

/** Makes the PNG and the PDF once; sharing later is then instant (phones need that). */
export async function makeBillFiles(element: HTMLElement, fileName: string): Promise<BillFiles> {
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = await toCanvas(element, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    width: BILL_WIDTH_PX,
    canvasWidth: BILL_WIDTH_PX,
    cacheBust: true,
  });
  const png = await canvasToBlob(canvas, "image/png");
  return {
    image: new File([png], `${fileName}.png`, { type: "image/png" }),
    pdf: new File([canvasToPdf(canvas)], `${fileName}.pdf`, { type: "application/pdf" }),
  };
}

/**
 * True on phones/tablets that can hand files to the share menu (WhatsApp, Viber…).
 * Computers download instead: desktop Chrome can share too, but a download is what people expect there.
 */
export function canShareFiles(sample?: File): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  if (typeof window !== "undefined" && !window.matchMedia?.("(pointer: coarse)").matches) return false;
  const file = sample ?? new File(["x"], "x.png", { type: "image/png" });
  return typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
}

function download(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens the share menu with the file, or downloads it where sharing files is not possible. */
export async function shareOrDownload(file: File, title: string): Promise<"shared" | "downloaded" | "cancelled"> {
  if (canShareFiles(file)) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (error: any) {
      if (error?.name === "AbortError") return "cancelled";
      // Some browsers refuse at the last moment; fall back to a download.
    }
  }
  download(file);
  return "downloaded";
}
