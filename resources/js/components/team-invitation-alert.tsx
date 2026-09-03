import { InfoIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { TeamInvitationContext } from '@/types';

type Props = {
    invitation: TeamInvitationContext;
    action: 'Log in' | 'Register';
};

export default function TeamInvitationAlert({ invitation, action }: Props) {
    return (
        <Alert
            data-test="team-invitation-alert"
            className="border-primary/20 bg-primary/10 text-primary [&>svg]:text-primary"
        >
            <InfoIcon />
            <AlertDescription className="text-primary">
                {action} to join the "{invitation.teamName}" team.
            </AlertDescription>
        </Alert>
    );
}
