import { X } from 'lucide-react';
import type { OptionItem } from './types';

interface TriggerConfigPanelProps {
    triggerType: string;
    triggerOptions: OptionItem[];
    onChange: (triggerType: string) => void;
    onClose: () => void;
}

export function TriggerConfigPanel({
    triggerType,
    triggerOptions,
    onChange,
    onClose,
}: TriggerConfigPanelProps) {
    return (
        <div className="flex h-full w-80 flex-col border-l border-border bg-background">
            <div className="flex items-center justify-between border-b border-border p-3">
                <h3 className="text-sm font-semibold">Configure trigger</h3>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <X className="size-3.5" />
                </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-3">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                        Event
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                        This workflow runs automatically whenever this event
                        happens.
                    </p>
                    <select
                        value={triggerType}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    >
                        {triggerOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
