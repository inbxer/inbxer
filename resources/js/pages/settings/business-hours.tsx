import { Head, router } from '@inertiajs/react';
import { CalendarClock, Trash2 } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

const DAY_LABELS: Record<string, string> = {
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
    sun: 'Sunday',
};

interface BusinessHoursPageProps {
    businessHours: {
        id: string;
        name: string;
        timezone: string;
        schedule: Record<string, { start: string; end: string }>;
    } | null;
    days: string[];
    timezones: string[];
}

export default function BusinessHoursPage({
    businessHours,
    days,
    timezones,
}: BusinessHoursPageProps) {
    const [configured, setConfigured] = React.useState(businessHours !== null);
    const [timezone, setTimezone] = React.useState(
        businessHours?.timezone ?? 'UTC',
    );
    const [timezoneQuery, setTimezoneQuery] = React.useState('');

    const filteredTimezones = React.useMemo(() => {
        const query = timezoneQuery.trim().toLowerCase();

        if (!query) {
            return timezones;
        }

        return timezones.filter((tz) => tz.toLowerCase().includes(query));
    }, [timezones, timezoneQuery]);
    const [activeDays, setActiveDays] = React.useState<Set<string>>(
        () =>
            new Set(businessHours ? Object.keys(businessHours.schedule) : days),
    );
    const [schedule, setSchedule] = React.useState<
        Record<string, { start: string; end: string }>
    >(
        () =>
            businessHours?.schedule ??
            Object.fromEntries(
                days.map((day) => [day, { start: '09:00', end: '17:00' }]),
            ),
    );
    const [saving, setSaving] = React.useState(false);

    const toggleDay = (day: string) => {
        setActiveDays((prev) => {
            const next = new Set(prev);

            if (next.has(day)) {
                next.delete(day);
            } else {
                next.add(day);
            }

            return next;
        });
    };

    const updateTime = (day: string, field: 'start' | 'end', value: string) => {
        setSchedule((prev) => ({
            ...prev,
            [day]: { ...prev[day], [field]: value },
        }));
    };

    const handleSave = () => {
        setSaving(true);
        const payload = Object.fromEntries(
            days.filter((d) => activeDays.has(d)).map((d) => [d, schedule[d]]),
        );

        router.post(
            window.location.pathname,
            { timezone, schedule: payload },
            { preserveScroll: true, onFinish: () => setSaving(false) },
        );
    };

    if (!configured) {
        return (
            <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
                <Head title="Business hours" />
                <div>
                    <h1 className="text-xl font-semibold">Business hours</h1>
                    <p className="text-sm text-muted-foreground">
                        Define when your team is available. Business hours are
                        used to calculate SLAs and control when auto-responses
                        are sent.
                    </p>
                </div>

                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <CalendarClock />
                        </EmptyMedia>
                        <EmptyTitle>Set up business hours</EmptyTitle>
                        <EmptyDescription>
                            Business hours are not currently configured
                        </EmptyDescription>
                    </EmptyHeader>
                    <Button onClick={() => setConfigured(true)}>Create</Button>
                </Empty>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
            <Head title="Business hours" />

            <div>
                <h1 className="text-xl font-semibold">Business hours</h1>
                <p className="text-sm text-muted-foreground">
                    Define when your team is available. Business hours are used
                    to calculate SLAs and control when auto-responses are sent.
                </p>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                    Timezone
                </label>
                <p className="text-[11px] text-muted-foreground">
                    The timezone in which these business hours are active.
                </p>
                <Select
                    value={timezone}
                    onValueChange={setTimezone}
                    onOpenChange={(open) => {
                        if (!open) {
                            setTimezoneQuery('');
                        }
                    }}
                >
                    <SelectTrigger className="w-full max-w-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                        <Input
                            value={timezoneQuery}
                            onChange={(e) => setTimezoneQuery(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            placeholder="Search timezone…"
                            className="mb-1 h-8 text-xs"
                        />
                        {filteredTimezones.length === 0 ? (
                            <p className="px-2 py-1.5 text-xs text-muted-foreground">
                                No timezones found.
                            </p>
                        ) : (
                            filteredTimezones.map((tz) => (
                                <SelectItem key={tz} value={tz}>
                                    {tz}
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Schedule</h2>
                    <div className="flex items-center gap-2">
                        {days.map((day) => (
                            <button
                                key={day}
                                type="button"
                                onClick={() => toggleDay(day)}
                                title={DAY_LABELS[day]}
                                className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold uppercase transition-colors ${
                                    activeDays.has(day)
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground'
                                }`}
                            >
                                {day.charAt(0)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {days
                        .filter((day) => activeDays.has(day))
                        .map((day) => (
                            <div
                                key={day}
                                className="flex items-center gap-3 px-3 py-2.5"
                            >
                                <span className="w-24 text-xs font-semibold">
                                    {DAY_LABELS[day]}
                                </span>
                                <Input
                                    type="time"
                                    value={schedule[day]?.start ?? '09:00'}
                                    onChange={(e) =>
                                        updateTime(day, 'start', e.target.value)
                                    }
                                    className="h-8 w-32 text-xs"
                                />
                                <span className="text-xs text-muted-foreground">
                                    to
                                </span>
                                <Input
                                    type="time"
                                    value={schedule[day]?.end ?? '17:00'}
                                    onChange={(e) =>
                                        updateTime(day, 'end', e.target.value)
                                    }
                                    className="h-8 w-32 text-xs"
                                />
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => toggleDay(day)}
                                            className="ml-auto text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Delete business hours
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        ))}
                </div>
            </div>

            <Button disabled={saving} onClick={handleSave}>
                Save
            </Button>
        </div>
    );
}
