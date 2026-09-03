/** Formats a duration in seconds as a compact human string ("17s", "16h 2m", "4d 1h"). */
export function formatDuration(seconds: number | null): string {
    if (seconds === null) {
        return 'N/A';
    }

    if (seconds < 60) {
        return `${Math.round(seconds)}s`;
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        const remMinutes = minutes % 60;

        return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    const remHours = hours % 24;

    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}
