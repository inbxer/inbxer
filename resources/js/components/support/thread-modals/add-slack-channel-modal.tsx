import { Search, X } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface AddSlackChannelModalProps {
    show: boolean;
    setShow: (show: boolean) => void;
    slackSearchQuery: string;
    setSlackSearchQuery: (query: string) => void;
    filteredSlackChannels: string[];
    newSlackChannelName: string;
    setNewSlackChannelName: (name: string) => void;
    handleAddSlackChannelSubmit: (e: React.FormEvent) => void;
}

export function AddSlackChannelModal({
    show,
    setShow,
    slackSearchQuery,
    setSlackSearchQuery,
    filteredSlackChannels,
    newSlackChannelName,
    setNewSlackChannelName,
    handleAddSlackChannelSubmit,
}: AddSlackChannelModalProps) {
    return (
        <Dialog open={show} onOpenChange={setShow}>
            <DialogContent className="max-w-md overflow-hidden border-border bg-background p-0 text-foreground">
                <DialogHeader className="flex flex-row items-center justify-between border-b border-border p-4">
                    <DialogTitle className="text-xs font-bold text-foreground">
                        Add Slack channel
                    </DialogTitle>
                    <X
                        className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground"
                        onClick={() => setShow(false)}
                    />
                </DialogHeader>

                <div className="flex items-center gap-2 border-b border-border bg-card p-3">
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        type="text"
                        value={slackSearchQuery}
                        onChange={(e) => setSlackSearchQuery(e.target.value)}
                        placeholder="Search Slack channel..."
                        className="w-full bg-transparent text-xs text-foreground placeholder-muted-foreground focus:outline-none"
                        autoFocus
                    />
                </div>

                <form
                    onSubmit={handleAddSlackChannelSubmit}
                    className="space-y-3 p-3"
                >
                    <div className="max-h-40 space-y-1 overflow-y-auto">
                        {filteredSlackChannels.map((sc, idx) => (
                            <div
                                key={idx}
                                className="rounded bg-muted p-2 font-mono text-xs text-success"
                            >
                                #{sc}
                            </div>
                        ))}

                        {filteredSlackChannels.length === 0 && (
                            <div className="p-6 text-center text-xs text-muted-foreground">
                                No Slack channels found
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 border-t border-border pt-3">
                        <Input
                            type="text"
                            value={newSlackChannelName}
                            onChange={(e) =>
                                setNewSlackChannelName(e.target.value)
                            }
                            placeholder="Enter channel name (e.g. support-team)"
                            className="flex-1 rounded border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                        />
                        <Button
                            type="submit"
                            disabled={!newSlackChannelName.trim()}
                            className="h-8 rounded-lg bg-primary px-3 text-xs text-primary-foreground hover:opacity-90"
                        >
                            Add
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
