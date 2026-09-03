export function formatRelativeTime(dateStr?: string): string {
    if (!dateStr) {
        return '';
    }

    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 60) {
        return `${Math.max(1, diffMin)}min ago`;
    }

    const diffHours = Math.floor(diffMin / 60);

    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);

    return `${diffDays}d ago`;
}

export function formatFullMarkdownDate(dateStr?: string): string {
    if (!dateStr) {
        return '';
    }

    const date = new Date(dateStr);
    const months = [
        'August',
        'September',
        'October',
        'November',
        'December',
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
    ];
    const monthName = months[date.getMonth()] || 'August';
    const day = date.getDate();
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${monthName} ${day}, ${year} at ${hours.toString().padStart(2, '0')}:${minutes}:${seconds} ${ampm} GMT+3`;
}
