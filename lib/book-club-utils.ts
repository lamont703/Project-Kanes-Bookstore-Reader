export const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export function getMonthNumber(monthName: string): number {
    return MONTHS.indexOf(monthName);
}

export function getCurrentStatus(month: string, year: number): 'past' | 'current' | 'upcoming' {
    const now = new Date();
    const currentMonthNum = now.getMonth();
    const currentYear = now.getFullYear();
    const targetMonthNum = getMonthNumber(month);

    if (year < currentYear) return 'past';
    if (year > currentYear) return 'upcoming';

    // Same year
    if (targetMonthNum < currentMonthNum) return 'past';
    if (targetMonthNum > currentMonthNum) return 'upcoming';

    return 'current';
}

export function sortSelections(selections: any[]) {
    return [...selections].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return getMonthNumber(b.month) - getMonthNumber(a.month);
    });
}
