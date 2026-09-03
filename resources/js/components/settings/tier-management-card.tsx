import { GripVertical, Trash2 } from 'lucide-react';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface TierData {
    id: string;
    name: string;
    color?: string;
    external_id?: string;
    priority?: string;
    threads_count?: number;
}

interface TierManagementCardProps {
    tier: TierData;
    onEdit: (tier: TierData) => void;
    onDelete: (tierId: string, e: React.MouseEvent) => void;
}

export function TierManagementCard({
    tier,
    onEdit,
    onDelete,
}: TierManagementCardProps) {
    return (
        <div
            onClick={() => onEdit(tier)}
            onKeyDown={(event) => {
                if (event.key === 'Enter') {
                    onEdit(tier);
                }
            }}
            role="button"
            tabIndex={0}
            className="group flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
        >
            <div className="flex items-center gap-3">
                <GripVertical className="size-4 cursor-grab text-muted-foreground" />
                <span aria-hidden="true">💎</span>

                <div>
                    <span className="block text-sm font-medium">
                        {tier.name}
                    </span>
                    {tier.external_id && (
                        <span className="block font-mono text-xs text-muted-foreground">
                            {tier.external_id}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Badge variant="outline">
                    {tier.threads_count ?? 0} threads
                </Badge>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${tier.name}`}
                    onClick={(event) => onDelete(tier.id, event)}
                >
                    <Trash2 />
                </Button>
            </div>
        </div>
    );
}
