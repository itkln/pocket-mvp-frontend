import QRCode from "qrcode";
import { makeVenueSlug } from "../model";
import { issueTableQR, type TableQRCode } from "../../../lib/table-orders-api";

export const localQRCode = (qr: TableQRCode): TableQRCode => {
  const url = new URL(qr.url);
  if (
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
    !["localhost", "127.0.0.1"].includes(window.location.hostname)
  )
    url.hostname = window.location.hostname;
  return { ...qr, url: url.toString() };
};
export const downloadTableQr = async (
  venueName: string,
  tableId: string,
  venueID?: string,
  existingQR?: TableQRCode,
) => {
  if (!venueID) throw new Error("Save the venue before generating a QR code");
  const venueSlug = makeVenueSlug(venueName);
  const qr = existingQR ?? localQRCode(await issueTableQR(venueID, tableId));
  const svg = await QRCode.toString(qr.url, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 2,
    width: 768,
  });
  const objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${venueSlug}-table-${tableId}-qr.svg`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};
