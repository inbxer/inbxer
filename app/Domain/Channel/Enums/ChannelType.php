<?php

namespace App\Domain\Channel\Enums;

enum ChannelType: string
{
    case Email = 'email';
    case Chat = 'chat';
    case Form = 'form';
    case Slack = 'slack';
    case Discord = 'discord';
    case MsTeams = 'ms_teams';
    case Api = 'api';

    /**
     * Get the display label for the channel type.
     */
    public function label(): string
    {
        return match ($this) {
            self::Email => 'Email',
            self::Chat => 'Chat',
            self::Form => 'Form',
            self::Slack => 'Slack',
            self::Discord => 'Discord',
            self::MsTeams => 'Microsoft Teams',
            self::Api => 'API',
        };
    }

    /**
     * Get the icon name for the channel type.
     */
    public function icon(): string
    {
        return match ($this) {
            self::Email => 'mail',
            self::Chat => 'message-circle',
            self::Form => 'file-text',
            self::Slack => 'slack',
            self::Discord => 'discord',
            self::MsTeams => 'microsoft-teams',
            self::Api => 'code',
        };
    }
}
