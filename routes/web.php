<?php

use App\Domain\Ai\Controllers\AiActivityController;
use App\Domain\Ai\Controllers\AiAutomationsController;
use App\Domain\Ai\Controllers\AiKnowledgeController;
use App\Domain\Ai\Controllers\AiOverviewController;
use App\Domain\Ai\Controllers\AiPlaygroundController;
use App\Domain\Ai\Controllers\AiPreferencesController;
use App\Domain\Ai\Controllers\AiSuggestedResponsesController;
use App\Domain\Ai\Controllers\AiToneController;
use App\Domain\Ai\Controllers\ThreadAiSuggestionController;
use App\Domain\Ai\Controllers\ThreadAiSummaryController;
use App\Domain\Ai\Controllers\ThreadSimilarThreadsController;
use App\Domain\Channel\Controllers\ChannelsHubController;
use App\Domain\Channel\Controllers\ChatChannelController;
use App\Domain\Channel\Controllers\ChatWidgetPreviewController;
use App\Domain\Channel\Controllers\EmailChannelController;
use App\Domain\Channel\Controllers\SlackChannelController;
use App\Domain\Channel\Controllers\SlackOAuthController;
use App\Domain\Channel\Controllers\SlackWorkspaceController;
use App\Domain\HelpCenter\Controllers\SettingsMintlifyController;
use App\Domain\HelpCenter\Controllers\ThreadHelpArticleController;
use App\Domain\Insights\Controllers\InsightsController;
use App\Domain\Integration\Controllers\ApiKeyController;
use App\Domain\Integration\Controllers\WebhookController;
use App\Domain\Label\Controllers\SupportLabelController;
use App\Domain\Sla\Controllers\BusinessHoursController;
use App\Domain\Spam\Controllers\SpamSettingsController;
use App\Domain\Support\Controllers\AutoResponseController;
use App\Domain\Support\Controllers\CsatController;
use App\Domain\Support\Controllers\CsatSettingsController;
use App\Domain\Support\Controllers\SavedViewController;
use App\Domain\Support\Controllers\SnippetController;
use App\Domain\Support\Controllers\SupportFavoriteController;
use App\Domain\Support\Controllers\SupportTaskController;
use App\Domain\Team\Controllers\AwayStatusController;
use App\Domain\Team\Controllers\GeneralSettingsController;
use App\Domain\Team\Controllers\MembersSettingsController;
use App\Domain\Team\Controllers\OnboardingController;
use App\Domain\Team\Controllers\RolesSettingsController;
use App\Domain\Team\Controllers\SettingsOverviewController;
use App\Domain\Team\Controllers\TeamInvitationController;
use App\Domain\Team\Controllers\TeamWorkflowSettingsController;
use App\Domain\Team\Middleware\EnsureTeamMembership;
use App\Domain\Tenant\Controllers\SupportCompanyController;
use App\Domain\Tenant\Controllers\SupportCustomerController;
use App\Domain\Tenant\Controllers\SupportCustomerGroupController;
use App\Domain\Tenant\Controllers\SupportTenantController;
use App\Domain\Thread\Controllers\SupportThreadController;
use App\Domain\Thread\Controllers\ThreadCustomFieldController;
use App\Domain\Thread\Controllers\ThreadLabelController;
use App\Domain\Thread\Controllers\ThreadLinkController;
use App\Domain\Thread\Controllers\ThreadLockController;
use App\Domain\Thread\Controllers\ThreadMergeController;
use App\Domain\Thread\Controllers\ThreadReplyController;
use App\Domain\Thread\Controllers\ThreadTaskLinkController;
use App\Domain\Thread\Controllers\ThreadTimelineController;
use App\Domain\Tier\Controllers\SupportTierController;
use App\Domain\Workflow\Controllers\WorkflowController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    if (! auth()->check()) {
        return to_route('login');
    }

    return auth()->user()->teams()->exists()
        ? to_route('threads.index')
        : to_route('onboarding.workspace');
})->name('home');

Route::get('widget-preview/{appId}', ChatWidgetPreviewController::class)->name('widget.preview');

Route::get('csat/{survey:token}', [CsatController::class, 'show'])->name('csat.show');
Route::post('csat/{survey:token}', [CsatController::class, 'store'])->name('csat.store');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('onboarding/workspace', [OnboardingController::class, 'create'])->name('onboarding.workspace');
    Route::post('onboarding/workspace', [OnboardingController::class, 'store'])->name('onboarding.workspace.store');
});

Route::middleware(['auth', 'verified', EnsureTeamMembership::class])
    ->group(function () {

        // Favorites API
        Route::post('favorites/toggle', [SupportFavoriteController::class, 'toggle'])->name('favorites.toggle');

        // Tasks Support API
        Route::get('tasks', [SupportTaskController::class, 'index'])->name('tasks.index');
        Route::post('tasks', [SupportTaskController::class, 'store'])->name('tasks.store');
        Route::patch('tasks/{task}', [SupportTaskController::class, 'update'])->name('tasks.update');
        Route::delete('tasks/{task}', [SupportTaskController::class, 'destroy'])->name('tasks.destroy');

        // Threads Support API
        Route::get('threads', [SupportThreadController::class, 'index'])->name('threads.index');
        Route::get('threads/yours', [SupportThreadController::class, 'index'])->name('threads.yours');
        Route::get('threads/unassigned', [SupportThreadController::class, 'index'])->name('threads.unassigned');
        Route::get('threads/all', [SupportThreadController::class, 'index'])->name('threads.all');
        Route::get('threads/views', [SupportThreadController::class, 'index'])->name('threads.views');

        // Saved Views API
        Route::patch('me/away', [AwayStatusController::class, 'update'])->name('me.away.update');

        Route::get('saved-views', [SavedViewController::class, 'index'])->name('saved-views.index');
        Route::post('saved-views', [SavedViewController::class, 'store'])->name('saved-views.store');
        Route::patch('saved-views/{savedView}', [SavedViewController::class, 'update'])->name('saved-views.update');
        Route::delete('saved-views/{savedView}', [SavedViewController::class, 'destroy'])->name('saved-views.destroy');
        Route::get('threads/labels/{label}', [SupportThreadController::class, 'index'])->name('threads.labels');
        Route::get('threads/tiers/{tier}', [SupportThreadController::class, 'index'])->name('threads.tiers');
        Route::get('threads/tires/{tier}', [SupportThreadController::class, 'index']);
        Route::get('threads/channels/{channel}', [SupportThreadController::class, 'index'])->name('threads.channels');
        Route::post('threads', [SupportThreadController::class, 'store'])->name('threads.store');
        Route::patch('threads/{thread}', [SupportThreadController::class, 'update'])->name('threads.update');
        Route::post('threads/{thread}/reply', ThreadReplyController::class)->name('threads.reply');
        Route::patch('threads/{thread}/timeline/{entry}', [ThreadTimelineController::class, 'update'])->name('threads.timeline.update');
        Route::post('threads/{thread}/labels', ThreadLabelController::class)->name('threads.sync-labels');
        Route::post('threads/{thread}/tasks', ThreadTaskLinkController::class)->name('threads.link-task');
        Route::post('threads/{thread}/link-thread', [ThreadLinkController::class, 'store'])->name('threads.link-thread');
        Route::delete('threads/{thread}/unlink-thread/{relatedThread}', [ThreadLinkController::class, 'destroy'])->name('threads.unlink-thread');
        Route::post('threads/{thread}/custom-fields', ThreadCustomFieldController::class)->name('threads.custom-fields');
        Route::post('threads/{thread}/lock', ThreadLockController::class)->name('threads.lock');
        Route::post('threads/{thread}/merge', ThreadMergeController::class)->name('threads.merge');
        Route::get('threads/{thread}/help-articles', ThreadHelpArticleController::class)->name('threads.help-articles');
        Route::get('threads/{thread}/ai-suggestion', ThreadAiSuggestionController::class)->name('threads.ai-suggestion');
        Route::get('threads/{thread}/ai-summary', ThreadAiSummaryController::class)->name('threads.ai-summary');
        Route::get('threads/{thread}/similar', ThreadSimilarThreadsController::class)->name('threads.similar');
        Route::get('snippets', [SnippetController::class, 'index'])->name('snippets.index');
        Route::post('snippets', [SnippetController::class, 'store'])->name('snippets.store');
        Route::delete('snippets/{snippet}', [SnippetController::class, 'destroy'])->name('snippets.destroy');
        Route::post('threads/{thread}/timeline/{entry}/slack-reaction', [ThreadTimelineController::class, 'addSlackReaction'])->name('threads.timeline.slack-reaction');
        Route::get('threads/{thread}/timeline/{entry}/slack-link', [ThreadTimelineController::class, 'getSlackPermalink'])->name('threads.timeline.slack-link');

        // Companies Support API
        Route::get('companies', [SupportCompanyController::class, 'index'])->name('companies.index');
        Route::post('companies', [SupportCompanyController::class, 'store'])->name('companies.store');
        Route::get('companies/{company}', [SupportCompanyController::class, 'show'])->name('companies.show');
        Route::patch('companies/{company}', [SupportCompanyController::class, 'update'])->name('companies.update');
        Route::delete('companies/{company}', [SupportCompanyController::class, 'destroy'])->name('companies.destroy');

        // Tenants Support API
        Route::get('tenants', [SupportTenantController::class, 'index'])->name('tenants.index');
        Route::post('tenants', [SupportTenantController::class, 'store'])->name('tenants.store');
        Route::get('tenants/{tenant}', [SupportTenantController::class, 'show'])->name('tenants.show');
        Route::patch('tenants/{tenant}', [SupportTenantController::class, 'update'])->name('tenants.update');
        Route::post('tenants/{tenant}/groups', [SupportTenantController::class, 'syncGroups'])->name('tenants.sync-groups');
        Route::delete('tenants/{tenant}', [SupportTenantController::class, 'destroy'])->name('tenants.destroy');

        // Customers Support API
        Route::post('customers', [SupportCustomerController::class, 'store'])->name('customers.store');
        Route::get('customers/{customer}', [SupportCustomerController::class, 'show'])->name('customers.show');
        Route::patch('customers/{customer}', [SupportCustomerController::class, 'update'])->name('customers.update');
        Route::delete('customers/{customer}', [SupportCustomerController::class, 'destroy'])->name('customers.destroy');

        // Settings: Labels & Tiers Management API
        Route::get('settings/labels', [SupportLabelController::class, 'index'])->name('settings.labels.index');
        Route::post('settings/labels', [SupportLabelController::class, 'store'])->name('settings.labels.store');
        Route::patch('settings/labels/{label}', [SupportLabelController::class, 'update'])->name('settings.labels.update');
        Route::delete('settings/labels/{label}', [SupportLabelController::class, 'destroy'])->name('settings.labels.destroy');

        Route::get('settings/tiers', [SupportTierController::class, 'index'])->name('settings.tiers.index');
        Route::get('settings/tires', [SupportTierController::class, 'index']);
        Route::post('settings/tiers', [SupportTierController::class, 'store'])->name('settings.tiers.store');
        Route::patch('settings/tiers/{tier}', [SupportTierController::class, 'update'])->name('settings.tiers.update');
        Route::delete('settings/tiers/{tier}', [SupportTierController::class, 'destroy'])->name('settings.tiers.destroy');

        Route::get('settings/groups', [SupportCustomerGroupController::class, 'index'])->name('settings.groups.index');
        Route::post('settings/groups', [SupportCustomerGroupController::class, 'store'])->name('settings.groups.store');
        Route::patch('settings/groups/{group}', [SupportCustomerGroupController::class, 'update'])->name('settings.groups.update');
        Route::delete('settings/groups/{group}', [SupportCustomerGroupController::class, 'destroy'])->name('settings.groups.destroy');

        // Settings: Workflow behavior, Snippets, Business hours, Auto-responses
        Route::get('settings/workflow', [TeamWorkflowSettingsController::class, 'index'])->name('settings.workflow.index');
        Route::patch('settings/workflow', [TeamWorkflowSettingsController::class, 'update'])->name('settings.workflow.update');

        Route::get('settings/snippets', [SnippetController::class, 'settingsIndex'])->name('settings.snippets.index');
        Route::post('settings/snippets', [SnippetController::class, 'store'])->name('settings.snippets.store');
        Route::patch('settings/snippets/{snippet}', [SnippetController::class, 'update'])->name('settings.snippets.update');
        Route::delete('settings/snippets/{snippet}', [SnippetController::class, 'destroy'])->name('settings.snippets.destroy');

        Route::get('settings/business-hours', [BusinessHoursController::class, 'index'])->name('settings.business-hours.index');
        Route::post('settings/business-hours', [BusinessHoursController::class, 'store'])->name('settings.business-hours.store');

        Route::get('settings/autoresponses', [AutoResponseController::class, 'index'])->name('settings.autoresponses.index');
        Route::post('settings/autoresponses', [AutoResponseController::class, 'store'])->name('settings.autoresponses.store');
        Route::get('settings/autoresponses/{autoResponse}', [AutoResponseController::class, 'show'])->name('settings.autoresponses.show');
        Route::patch('settings/autoresponses/{autoResponse}', [AutoResponseController::class, 'update'])->name('settings.autoresponses.update');
        Route::post('settings/autoresponses/{autoResponse}/toggle', [AutoResponseController::class, 'toggle'])->name('settings.autoresponses.toggle');
        Route::delete('settings/autoresponses/{autoResponse}', [AutoResponseController::class, 'destroy'])->name('settings.autoresponses.destroy');

        // Workflows: standalone system, not nested under settings
        Route::get('workflows/templates', [WorkflowController::class, 'templates'])->name('workflows.templates');
        Route::get('workflows/runs', [WorkflowController::class, 'runs'])->name('workflows.runs');
        Route::get('workflows', [WorkflowController::class, 'index'])->name('workflows.index');
        Route::post('workflows', [WorkflowController::class, 'store'])->name('workflows.store');
        Route::get('workflows/{workflow}', [WorkflowController::class, 'show'])->name('workflows.show');
        Route::patch('workflows/{workflow}', [WorkflowController::class, 'update'])->name('workflows.update');
        Route::post('workflows/{workflow}/publish', [WorkflowController::class, 'publish'])->name('workflows.publish');
        Route::post('workflows/{workflow}/unpublish', [WorkflowController::class, 'unpublish'])->name('workflows.unpublish');
        Route::post('workflows/{workflow}/run', [WorkflowController::class, 'run'])->name('workflows.run');
        Route::delete('workflows/{workflow}', [WorkflowController::class, 'destroy'])->name('workflows.destroy');

        // Insights: reporting & analytics, standalone system
        Route::get('insights', [InsightsController::class, 'index'])->name('insights.index');
        Route::get('insights/team', [InsightsController::class, 'team'])->name('insights.team');
        Route::get('insights/companies', [InsightsController::class, 'companies'])->name('insights.companies');
        Route::get('insights/tenants', [InsightsController::class, 'tenants'])->name('insights.tenants');
        Route::get('insights/tiers', [InsightsController::class, 'tiers'])->name('insights.tiers');
        Route::get('insights/labels', [InsightsController::class, 'labels'])->name('insights.labels');
        Route::get('insights/groups', [InsightsController::class, 'groups'])->name('insights.groups');
        Route::get('insights/channels', [InsightsController::class, 'channels'])->name('insights.channels');
        Route::get('insights/priorities', [InsightsController::class, 'priorities'])->name('insights.priorities');
        Route::get('insights/top-issues', [InsightsController::class, 'topIssues'])->name('insights.top-issues');

        // Settings: Workspace (General / Members / Roles)
        Route::get('settings', [SettingsOverviewController::class, 'index'])->name('settings.overview');

        Route::get('settings/general', [GeneralSettingsController::class, 'index'])->name('settings.general.index');
        Route::patch('settings/general', [GeneralSettingsController::class, 'update'])->name('settings.general.update');
        Route::post('settings/general/logo', [GeneralSettingsController::class, 'uploadLogo'])->name('settings.general.logo');
        Route::get('settings/members', [MembersSettingsController::class, 'index'])->name('settings.members.index');
        Route::get('settings/roles', [RolesSettingsController::class, 'index'])->name('settings.roles.index');
        Route::get('settings/csat', [CsatSettingsController::class, 'index'])->name('settings.csat.index');
        Route::patch('settings/csat', [CsatSettingsController::class, 'update'])->name('settings.csat.update');

        Route::get('settings/integrations/mintlify', [SettingsMintlifyController::class, 'index'])->name('settings.integrations.mintlify.index');
        Route::post('settings/integrations/mintlify', [SettingsMintlifyController::class, 'store'])->name('settings.integrations.mintlify.store');
        Route::patch('settings/integrations/mintlify/{connection}', [SettingsMintlifyController::class, 'update'])->name('settings.integrations.mintlify.update');
        Route::post('settings/integrations/mintlify/{connection}/sync', [SettingsMintlifyController::class, 'syncNow'])->name('settings.integrations.mintlify.sync');
        Route::delete('settings/integrations/mintlify/{connection}', [SettingsMintlifyController::class, 'destroy'])->name('settings.integrations.mintlify.destroy');

        // AI Agent
        Route::get('ai', [AiOverviewController::class, 'index'])->name('ai.overview');
        Route::get('ai/activity', [AiActivityController::class, 'index'])->name('ai.activity.index');
        Route::post('ai/activity/{log}/approve', [AiActivityController::class, 'approve'])->name('ai.activity.approve');
        Route::post('ai/activity/{log}/reject', [AiActivityController::class, 'reject'])->name('ai.activity.reject');
        Route::get('ai/preferences', [AiPreferencesController::class, 'index'])->name('ai.preferences.index');
        Route::patch('ai/preferences', [AiPreferencesController::class, 'update'])->name('ai.preferences.update');
        Route::post('ai/preferences/avatar', [AiPreferencesController::class, 'uploadAvatar'])->name('ai.preferences.avatar.upload');
        Route::delete('ai/preferences/avatar', [AiPreferencesController::class, 'removeAvatar'])->name('ai.preferences.avatar.remove');
        Route::get('ai/playground', [AiPlaygroundController::class, 'index'])->name('ai.playground.index');
        Route::post('ai/playground', [AiPlaygroundController::class, 'generate'])->name('ai.playground.generate');
        Route::post('ai/playground/stream', [AiPlaygroundController::class, 'stream'])->name('ai.playground.stream');
        Route::get('ai/knowledge-sources', [AiKnowledgeController::class, 'index'])->name('ai.knowledge-sources.index');
        Route::post('ai/knowledge-sources/sitemaps', [AiKnowledgeController::class, 'storeSitemap'])->name('ai.knowledge-sources.sitemaps.store');
        Route::post('ai/knowledge-sources/urls', [AiKnowledgeController::class, 'storeUrl'])->name('ai.knowledge-sources.urls.store');
        Route::delete('ai/knowledge-sources/{source}', [AiKnowledgeController::class, 'destroySource'])->name('ai.knowledge-sources.destroy');
        Route::post('ai/knowledge-sources/{source}/resync', [AiKnowledgeController::class, 'resyncSource'])->name('ai.knowledge-sources.resync');
        Route::get('ai/automations', [AiAutomationsController::class, 'index'])->name('ai.automations.index');
        Route::patch('ai/automations', [AiAutomationsController::class, 'update'])->name('ai.automations.update');
        Route::get('ai/configuration/tone', [AiToneController::class, 'index'])->name('ai.configuration.tone.index');
        Route::patch('ai/configuration/tone', [AiToneController::class, 'update'])->name('ai.configuration.tone.update');
        Route::post('ai/configuration/tone/generate', [AiToneController::class, 'generate'])->name('ai.configuration.tone.generate');
        Route::get('ai/suggested-responses', [AiSuggestedResponsesController::class, 'index'])->name('ai.suggested-responses.index');
        Route::patch('ai/suggested-responses', [AiSuggestedResponsesController::class, 'update'])->name('ai.suggested-responses.update');

        Route::get('settings/api-keys', [ApiKeyController::class, 'index'])->name('settings.api-keys.index');
        Route::post('settings/api-keys', [ApiKeyController::class, 'store'])->name('settings.api-keys.store');
        Route::delete('settings/api-keys/{apiKey}', [ApiKeyController::class, 'destroy'])->name('settings.api-keys.destroy');

        Route::get('settings/webhooks', [WebhookController::class, 'index'])->name('settings.webhooks.index');
        Route::post('settings/webhooks', [WebhookController::class, 'store'])->name('settings.webhooks.store');
        Route::patch('settings/webhooks/{webhook}', [WebhookController::class, 'update'])->name('settings.webhooks.update');
        Route::delete('settings/webhooks/{webhook}', [WebhookController::class, 'destroy'])->name('settings.webhooks.destroy');

        Route::get('settings/spam', [SpamSettingsController::class, 'index'])->name('settings.spam.index');
        Route::patch('settings/spam', [SpamSettingsController::class, 'update'])->name('settings.spam.update');
        Route::post('settings/spam/{thread}/restore', [SpamSettingsController::class, 'restore'])->name('settings.spam.restore');

        // Settings: Channels & Integrations API
        Route::get('settings/channels', [ChannelsHubController::class, 'index'])->name('settings.channels.index');
        Route::get('settings/channels/email', [EmailChannelController::class, 'show'])->name('settings.channels.email');
        Route::post('settings/channels/email', [EmailChannelController::class, 'update'])->name('settings.channels.email.update');
        Route::post('settings/channels/email/verify-dns', [EmailChannelController::class, 'verifyDns'])->name('settings.channels.email.verify-dns');
        Route::post('settings/channels/email/test-inbound', [EmailChannelController::class, 'testInbound'])->name('settings.channels.email.test-inbound');
        Route::post('settings/channels/email/test-outbound', [EmailChannelController::class, 'testOutbound'])->name('settings.channels.email.test-outbound');
        Route::get('settings/channels/slack', [SlackChannelController::class, 'index'])->name('settings.channels.slack');
        Route::get('settings/channels/slack/connect', [SlackOAuthController::class, 'redirect'])->name('settings.channels.slack.connect');
        Route::get('settings/channels/slack/callback', [SlackOAuthController::class, 'callback'])->name('settings.channels.slack.callback');
        Route::get('settings/channels/slack/{channel}', [SlackChannelController::class, 'show'])->name('settings.channels.slack.show');
        Route::post('settings/channels/slack/{channel}', [SlackWorkspaceController::class, 'update'])->name('settings.channels.slack.update');
        Route::delete('settings/channels/slack/{channel}', [SlackWorkspaceController::class, 'destroy'])->name('settings.channels.slack.destroy');
        Route::post('settings/channels/slack/{channel}/auto-join', [SlackWorkspaceController::class, 'addAutoJoinRule'])->name('settings.channels.slack.auto-join.store');
        Route::delete('settings/channels/slack/{channel}/auto-join/{ruleIndex}', [SlackWorkspaceController::class, 'removeAutoJoinRule'])->name('settings.channels.slack.auto-join.destroy');
        Route::post('settings/channels/slack/{channel}/sync', [SlackWorkspaceController::class, 'syncChannels'])->name('settings.channels.slack.sync');
        Route::post('settings/channels/slack/{channel}/bulk-join', [SlackWorkspaceController::class, 'bulkJoinChannels'])->name('settings.channels.slack.bulk-join');
        Route::get('settings/channels/slack/{channel}/authorize-replies', [SlackOAuthController::class, 'authorizeReplies'])->name('settings.channels.slack.authorize-replies');
        Route::delete('settings/channels/slack/{channel}/unlink-replies', [SlackOAuthController::class, 'unlinkReplies'])->name('settings.channels.slack.unlink-replies');
        Route::get('settings/channels/chat', [ChatChannelController::class, 'index'])->name('settings.channels.chat.index');
        Route::post('settings/channels/chat/create', [ChatChannelController::class, 'store'])->name('settings.channels.chat.store');
        Route::get('settings/channels/chat/{appId}', [ChatChannelController::class, 'show'])->name('settings.channels.chat.show');
        Route::post('settings/channels/chat', [ChatChannelController::class, 'update'])->name('settings.channels.chat.update');
        Route::post('settings/channels/chat/secret', [ChatChannelController::class, 'regenerateSecret'])->name('settings.channels.chat.secret');
        Route::delete('settings/channels/chat/{appId}', [ChatChannelController::class, 'destroy'])->name('settings.channels.chat.destroy');
        Route::get('settings/integrations', [ChannelsHubController::class, 'index'])->name('settings.integrations.index');
    });

Route::middleware(['auth'])->group(function () {
    Route::get('auth/slack/callback', [SlackOAuthController::class, 'callback'])->name('auth.slack.callback');
    Route::post('invitations/{invitation}/accept', [TeamInvitationController::class, 'accept'])->name('invitations.accept');
    Route::delete('invitations/{invitation}', [TeamInvitationController::class, 'decline'])->name('invitations.decline');
});

require __DIR__.'/settings.php';
