import { Code2, Hash, Mail, MessageCircle, Slack } from 'lucide-react';

export const CHANNEL_ICONS: Record<string, typeof MessageCircle> = {
    slack: Slack,
    email: Mail,
    chat: MessageCircle,
    api: Code2,
    discord: Hash,
    form: Code2,
};
