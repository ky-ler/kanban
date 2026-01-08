import { format, isValid, parseISO } from "date-fns";

export const formatDate = (dateString: string) => {
  if (!dateString) return "Not set";

  // Check if time is included
  let timeIncluded = false;
  if (dateString.includes("T")) {
    timeIncluded = true;
  }

  const parsed = parseISO(dateString);
  if (!isValid(parsed)) return "Not set";

  if (!timeIncluded) {
    return format(parsed, "MMMM d, yyyy");
  }

  return format(parsed, "MMMM d, yyyy, hh:mm a");
};
