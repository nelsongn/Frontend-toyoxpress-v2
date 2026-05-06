import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatExcelDate(serial: any): string {
  if (!serial) return "";
  
  // If it's already a date-like string (contains / or -), return as is
  if (typeof serial === 'string' && (serial.includes('/') || serial.includes('-'))) {
    return serial;
  }

  const n = Number(serial);
  // Excel serial dates are typically > 30000 for dates after 1982
  if (isNaN(n) || n < 20000) return String(serial); 

  try {
    // 25569 is the offset between Excel (1900) and Unix (1970) epochs
    const date = new Date((n - 25569) * 86400 * 1000);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return String(serial);

    return date.toLocaleDateString("es-VE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return String(serial);
  }
}

