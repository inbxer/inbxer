<?php

namespace App\Domain\HelpCenter\Enums;

enum KnowledgeSourceKind: string
{
    case Sitemap = 'sitemap';
    case Url = 'url';
}
