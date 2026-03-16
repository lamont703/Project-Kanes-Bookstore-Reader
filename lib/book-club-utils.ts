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

export function isEventPast(dateStr: string): boolean {
    if (!dateStr) return false;
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return false;
    
    // month is 0-indexed in JS Date constructor
    const eventDate = new Date(year, month - 1, day);
    if (isNaN(eventDate.getTime())) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
}

export function getEventStatus(event: any): 'upcoming' | 'past' {
    return isEventPast(event.date) ? 'past' : 'upcoming';
}

export function sortEvents(events: any[]) {
    return [...events].sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
}
