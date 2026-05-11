import { formatDistanceToNow, format, differenceInMilliseconds } from "date-fns";

export const formatDate = (date: Date | string, pattern = "yyyy-MM-dd HH:mm:ss"): string => {
    return format(new Date(date), pattern);
};

export const humanizeDate = (date: Date | string): string => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const diffMs = (start: Date | string, end: Date | string): number => {
    return differenceInMilliseconds(new Date(end), new Date(start));
};
