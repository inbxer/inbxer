<?php

namespace App\Domain\Team\Enums;

enum TeamPermission: string
{
    case UpdateTeam = 'team:update';
    case DeleteTeam = 'team:delete';

    case AddMember = 'member:add';
    case UpdateMember = 'member:update';
    case RemoveMember = 'member:remove';

    case CreateInvitation = 'invitation:create';
    case CancelInvitation = 'invitation:cancel';

    case MessageCustomers = 'support:message-customers';
    case ViewSupportRequests = 'support:view-requests';
    case ParticipateInternalDiscussions = 'support:internal-discussions';

    case ManageApiKeys = 'workspace:manage-api-keys';
}
