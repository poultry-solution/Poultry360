"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatRelativeDate = exports.toISODate = exports.toDisplayDate = void 0;
const nepali_date_converter_1 = __importDefault(require("nepali-date-converter"));
const toDisplayDate = (date, calendarType = "AD", format = "short") => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (calendarType === "BS") {
        const nepaliDate = new nepali_date_converter_1.default(dateObj);
        const year = nepaliDate.getYear();
        const month = nepaliDate.getMonth() + 1;
        const day = nepaliDate.getDate();
        if (format === "long") {
            const monthNames = [
                "Baisakh",
                "Jestha",
                "Ashadh",
                "Shrawan",
                "Bhadra",
                "Ashwin",
                "Kartik",
                "Mangsir",
                "Poush",
                "Magh",
                "Falgun",
                "Chaitra",
            ];
            return `${monthNames[month - 1]} ${day}, ${year}`;
        }
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    // AD format
    if (format === "long") {
        return dateObj.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }
    return dateObj.toISOString().split("T")[0];
};
exports.toDisplayDate = toDisplayDate;
const toISODate = (dateString, calendarType = "AD") => {
    if (calendarType === "BS") {
        const [year, month, day] = dateString.split("-").map(Number);
        const nepaliDate = new nepali_date_converter_1.default(year, month - 1, day);
        return nepaliDate.toJsDate();
    }
    return new Date(dateString);
};
exports.toISODate = toISODate;
const formatRelativeDate = (date, calendarType = "AD") => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0)
        return "Today";
    if (diffDays === 1)
        return "Yesterday";
    if (diffDays === -1)
        return "Tomorrow";
    if (diffDays > 0 && diffDays < 7)
        return `${diffDays} days ago`;
    if (diffDays < 0 && diffDays > -7)
        return `In ${Math.abs(diffDays)} days`;
    return (0, exports.toDisplayDate)(dateObj, calendarType, "long");
};
exports.formatRelativeDate = formatRelativeDate;
