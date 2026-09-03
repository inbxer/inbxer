import { Head, usePage, router } from '@inertiajs/react';
import {
    Copy,
    Check,
    ArrowRight,
    Plus,
    Trash2,
    ShieldCheck,
    RefreshCw,
    Server,
    Send,
} from 'lucide-react';
import React, { useState } from 'react';

interface EmailChannelPageProps {
    config?: {
        support_email: string;
        inbound_forwarding_address: string;
        inbound_forwarding_enabled: boolean;
        sending_enabled: boolean;
        dns_spf_verified: boolean;
        dns_dkim_verified: boolean;
        dns_mx_verified: boolean;
        channel_enabled: boolean;
        alternate_emails: string[];
        bcc_emails: string[];
        cc_bomb_protection: boolean;
        webhook_url?: string;
    };
}

export default function EmailChannelPage({ config }: EmailChannelPageProps) {
    const { props } = usePage();
    const currentTeam = props.currentTeam as any;
    const authUser = (props.auth as any)?.user;
    const teamSlug = currentTeam?.slug ?? 'default';
    const teamName = currentTeam?.name ?? 'Workspace';
    const userName = authUser?.name ?? 'Agent';

    const [copiedInbound, setCopiedInbound] = useState(false);
    const [copiedWebhook, setCopiedWebhook] = useState(false);
    const [copiedDns, setCopiedDns] = useState<string | null>(null);

    const [supportEmail, setSupportEmail] = useState(
        config?.support_email || '',
    );
    const [forwardingChecked, setForwardingChecked] = useState(
        config?.inbound_forwarding_enabled ?? false,
    );
    const [sendingEnabled, setSendingEnabled] = useState(
        config?.sending_enabled ?? false,
    );
    const [channelEnabled, setChannelEnabled] = useState(
        config?.channel_enabled ?? true,
    );
    const [ccBombProtection, setCcBombProtection] = useState(
        config?.cc_bomb_protection ?? false,
    );

    const [isVerifyingDns, setIsVerifyingDns] = useState(false);
    const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
    const [testEmailSent, setTestEmailSent] = useState(false);

    const [alternateEmails, setAlternateEmails] = useState<string[]>(
        config?.alternate_emails || [],
    );
    const [bccEmails, setBccEmails] = useState<string[]>(
        config?.bcc_emails || [],
    );

    const [showAltModal, setShowAltModal] = useState(false);
    const [newAltEmail, setNewAltEmail] = useState('');

    const [showBccModal, setShowBccModal] = useState(false);
    const [newBccEmail, setNewBccEmail] = useState('');

    const inboundAddress =
        config?.inbound_forwarding_address ||
        `inbound-${teamSlug}@inbound.inbxer.com`;
    const webhookUrl =
        config?.webhook_url ||
        `${window.location.origin}/api/v1/webhooks/email/inbound`;

    const flash = (props as any).flash;

    const handleSave = (extraFields?: Record<string, any>) => {
        router.post(`/settings/channels/email`, {
            support_email: supportEmail,
            inbound_forwarding_enabled: forwardingChecked,
            sending_enabled: sendingEnabled,
            channel_enabled: channelEnabled,
            dns_spf_verified: true,
            dns_dkim_verified: true,
            dns_mx_verified: true,
            alternate_emails: alternateEmails,
            bcc_emails: bccEmails,
            cc_bomb_protection: ccBombProtection,
            ...extraFields,
        });
    };

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);

        if (key === 'inbound') {
            setCopiedInbound(true);
            setTimeout(() => setCopiedInbound(false), 2000);
        } else if (key === 'webhook') {
            setCopiedWebhook(true);
            setTimeout(() => setCopiedWebhook(false), 2000);
        } else {
            setCopiedDns(key);
            setTimeout(() => setCopiedDns(null), 2000);
        }
    };

    const handleVerifyDns = () => {
        setIsVerifyingDns(true);
        router.post(
            `/settings/channels/email/verify-dns`,
            {},
            {
                onFinish: () => setIsVerifyingDns(false),
                onSuccess: () => setSendingEnabled(true),
            },
        );
    };

    const handleSendTestInboundEmail = () => {
        setIsSendingTestEmail(true);
        router.post(
            `/settings/channels/email/test-inbound`,
            {},
            {
                onFinish: () => setIsSendingTestEmail(false),
                onSuccess: () => {
                    setTestEmailSent(true);
                    setTimeout(() => setTestEmailSent(false), 4000);
                },
            },
        );
    };

    const handleSendTestOutboundEmail = () => {
        setIsSendingTestEmail(true);
        router.post(
            `/settings/channels/email/test-outbound`,
            {},
            {
                onFinish: () => setIsSendingTestEmail(false),
            },
        );
    };

    const handleAddAlternateEmail = (e: React.FormEvent) => {
        e.preventDefault();

        if (!newAltEmail.trim()) {
            return;
        }

        const updated = [...alternateEmails, newAltEmail.trim()];
        setAlternateEmails(updated);
        setNewAltEmail('');
        setShowAltModal(false);
        handleSave({ alternate_emails: updated });
    };

    const handleRemoveAlternateEmail = (emailToRemove: string) => {
        const updated = alternateEmails.filter((e) => e !== emailToRemove);
        setAlternateEmails(updated);
        handleSave({ alternate_emails: updated });
    };

    const handleAddBccEmail = (e: React.FormEvent) => {
        e.preventDefault();

        if (!newBccEmail.trim()) {
            return;
        }

        const updated = [...bccEmails, newBccEmail.trim()];
        setBccEmails(updated);
        setNewBccEmail('');
        setShowBccModal(false);
        handleSave({ bcc_emails: updated });
    };

    const handleRemoveBccEmail = (emailToRemove: string) => {
        const updated = bccEmails.filter((e) => e !== emailToRemove);
        setBccEmails(updated);
        handleSave({ bcc_emails: updated });
    };

    return (
        <>
            <Head title="Email Settings — Settings" />

            <div className="mx-auto max-w-4xl space-y-8 p-8 text-foreground select-none">
                {/* Flash Banners */}
                {flash?.success && (
                    <div className="flex animate-in items-center gap-2 rounded-xl border border-success/20 bg-success/10 p-3.5 text-xs font-semibold text-success fade-in">
                        <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="flex animate-in items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs font-semibold text-destructive fade-in">
                        <span className="text-sm">⚠️</span>
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between border-b border-border pb-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Emails
                            </h1>
                            <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${channelEnabled ? 'border border-success/20 bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}
                            >
                                {channelEnabled ? 'Active' : 'Disabled'}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Set up email support for this workspace. Configure
                            inbound email forwarding and domain DNS keys.
                        </p>
                    </div>
                </div>

                {/* 1. YOUR CUSTOMER SERVICE EMAIL ADDRESS */}
                <div className="space-y-3 border-b border-border pb-6">
                    <h2 className="text-sm font-bold text-foreground">
                        1. Your customer service email address
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        Choose the email address where you want customers to
                        contact your company. Outgoing emails to customers will
                        also be sent from this email address.
                    </p>

                    <div className="space-y-2">
                        <input
                            type="email"
                            placeholder="e.g. support@acme.com"
                            value={supportEmail}
                            onChange={(e) => setSupportEmail(e.target.value)}
                            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Outgoing emails will be sent using the email
                            author's public name and your public workspace name,
                            for example:{' '}
                            <span className="font-medium text-foreground">
                                {userName} at {teamName} (
                                {supportEmail || 'help@domain.com'})
                            </span>
                        </p>
                    </div>

                    <button
                        onClick={() => handleSave()}
                        className="cursor-pointer rounded-lg bg-foreground px-4 py-2 text-xs font-bold text-background shadow-sm transition-all hover:bg-foreground/90"
                    >
                        Save and continue
                    </button>

                    <div className="space-y-2 pt-3">
                        <div className="text-[11px] font-bold text-foreground">
                            Documentation
                        </div>
                        <div className="rounded-xl border border-border/60 bg-card/40 p-3.5">
                            <a
                                href="#"
                                className="group flex items-center justify-between text-xs text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <span className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        🔗
                                    </span>
                                    <span>
                                        What email address should I use?
                                    </span>
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* 2. RECEIVING EMAILS */}
                <div className="space-y-4 border-b border-border pb-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-foreground">
                            2. Receiving emails
                        </h2>
                        {forwardingChecked && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Forwarding Active
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        To receive customer emails in Inbxer, log in to your
                        email provider (Google Workspace, Office 365, Outlook,
                        or cPanel) and set up an auto-forwarding rule to send
                        all emails arriving at{' '}
                        <span className="font-mono text-foreground">
                            {supportEmail || 'support@yourdomain.com'}
                        </span>{' '}
                        to your unique Inbxer inbound address below:
                    </p>

                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-muted-foreground">
                            Forward inbound emails to this unique address:
                        </label>
                        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
                            <span className="flex-1 truncate font-mono text-xs font-semibold text-foreground">
                                {inboundAddress}
                            </span>
                            <button
                                onClick={() =>
                                    handleCopy(inboundAddress, 'inbound')
                                }
                                className="flex cursor-pointer items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/80"
                            >
                                {copiedInbound ? (
                                    <Check className="h-3.5 w-3.5 text-success" />
                                ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                )}
                                <span>{copiedInbound ? 'Copied' : 'Copy'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3 pt-1">
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
                            <input
                                type="checkbox"
                                checked={forwardingChecked}
                                onChange={(e) =>
                                    setForwardingChecked(e.target.checked)
                                }
                                className="cursor-pointer rounded border-border bg-card text-primary focus:ring-0"
                            />
                            <span className="font-medium">
                                Inbound email forwarding is set up in my email
                                provider
                            </span>
                        </label>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleSave()}
                                className="cursor-pointer rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-all hover:bg-muted"
                            >
                                Save and continue
                            </button>
                            <button
                                onClick={handleSendTestInboundEmail}
                                disabled={isSendingTestEmail}
                                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-50"
                            >
                                {isSendingTestEmail ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Send className="h-3.5 w-3.5" />
                                )}
                                <span>
                                    {testEmailSent
                                        ? 'Test inbound email dispatched!'
                                        : 'Send test inbound email'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. SENDING EMAILS (DNS SPF & DKIM) */}
                <div className="space-y-4 border-b border-border pb-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-foreground">
                            3. Sending emails (DNS & Domain Setup)
                        </h2>
                        {sendingEnabled ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                DNS Verified
                            </span>
                        ) : (
                            <span className="rounded-full border border-warning/20 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning">
                                Pending DNS Verification
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        To send emails from your custom domain without
                        triggering spam filters, add these TXT/CNAME records to
                        your DNS provider (Cloudflare, GoDaddy, Namecheap,
                        Route53):
                    </p>

                    <div className="overflow-hidden rounded-xl border border-border bg-card/30">
                        <table className="w-full text-left text-xs">
                            <thead className="border-b border-border bg-card text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                                <tr>
                                    <th className="p-3">Type</th>
                                    <th className="p-3">Host / Name</th>
                                    <th className="p-3">Value</th>
                                    <th className="p-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border font-mono text-foreground">
                                <tr>
                                    <td className="p-3 font-semibold text-primary">
                                        TXT (SPF)
                                    </td>
                                    <td className="p-3">@</td>
                                    <td className="max-w-xs truncate p-3 text-muted-foreground">
                                        v=spf1 include:inbxer.com ~all
                                    </td>
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={() =>
                                                handleCopy(
                                                    'v=spf1 include:inbxer.com ~all',
                                                    'spf',
                                                )
                                            }
                                            className="p-1 text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            {copiedDns === 'spf' ? (
                                                <Check className="h-4 w-4 text-success" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </button>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-semibold text-primary">
                                        TXT (DKIM)
                                    </td>
                                    <td className="p-3">inbxer._domainkey</td>
                                    <td className="max-w-xs truncate p-3 text-muted-foreground">
                                        k=rsa; p=MIGfMA0GCSqGSIb3DQE...
                                    </td>
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={() =>
                                                handleCopy(
                                                    'k=rsa; p=MIGfMA0GCSqGSIb3DQE...',
                                                    'dkim',
                                                )
                                            }
                                            className="p-1 text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            {copiedDns === 'dkim' ? (
                                                <Check className="h-4 w-4 text-success" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </button>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-semibold text-primary">
                                        CNAME
                                    </td>
                                    <td className="p-3">pm-bounces</td>
                                    <td className="max-w-xs truncate p-3 text-muted-foreground">
                                        pm.inbxer.com
                                    </td>
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={() =>
                                                handleCopy(
                                                    'pm.inbxer.com',
                                                    'cname',
                                                )
                                            }
                                            className="p-1 text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            {copiedDns === 'cname' ? (
                                                <Check className="h-4 w-4 text-success" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                        <button
                            onClick={handleVerifyDns}
                            disabled={isVerifyingDns}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-all hover:bg-muted"
                        >
                            {isVerifyingDns ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                            ) : (
                                <Server className="h-3.5 w-3.5" />
                            )}
                            <span>
                                {isVerifyingDns
                                    ? 'Verifying DNS records...'
                                    : 'Verify DNS records'}
                            </span>
                        </button>

                        <button
                            onClick={handleSendTestOutboundEmail}
                            disabled={isSendingTestEmail}
                            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-50"
                        >
                            {isSendingTestEmail ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Send className="h-3.5 w-3.5" />
                            )}
                            <span>Send test outbound email</span>
                        </button>
                    </div>
                </div>

                {/* 4. ENABLE EMAIL */}
                <div className="space-y-4 border-b border-border pb-6">
                    <h2 className="text-sm font-bold text-foreground">
                        4. Enable email channel
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        Inbound webhook URL for receiving webhooks from
                        Postmark, SendGrid, or custom mail services:
                    </p>

                    <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
                        <span className="flex-1 truncate font-mono text-xs font-semibold text-foreground">
                            {webhookUrl}
                        </span>
                        <button
                            onClick={() => handleCopy(webhookUrl, 'webhook')}
                            className="flex cursor-pointer items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/80"
                        >
                            {copiedWebhook ? (
                                <Check className="h-3.5 w-3.5 text-success" />
                            ) : (
                                <Copy className="h-3.5 w-3.5" />
                            )}
                            <span>
                                {copiedWebhook ? 'Copied' : 'Copy Webhook'}
                            </span>
                        </button>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <span className="text-xs font-semibold text-foreground">
                            Email Support Channel Active
                        </span>
                        <button
                            onClick={() => {
                                const nextVal = !channelEnabled;
                                setChannelEnabled(nextVal);
                                handleSave({ channel_enabled: nextVal });
                            }}
                            className={`relative h-5 w-9 cursor-pointer rounded-full p-0.5 transition-colors ${
                                channelEnabled ? 'bg-success' : 'bg-muted'
                            }`}
                        >
                            <div
                                className={`h-4 w-4 rounded-full bg-white transition-transform ${
                                    channelEnabled
                                        ? 'translate-x-4'
                                        : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {/* ALTERNATE EMAILS */}
                <div className="space-y-3 border-b border-border pb-6">
                    <h2 className="text-xs font-bold text-foreground">
                        Alternate emails
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        In addition to your main support email address, you can
                        specify up to 24 additional email addresses for the same
                        domain.
                    </p>

                    {alternateEmails.length > 0 ? (
                        <div className="space-y-2">
                            {alternateEmails.map((email, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                                >
                                    <span className="font-mono text-xs font-semibold text-foreground">
                                        {email}
                                    </span>
                                    <button
                                        onClick={() =>
                                            handleRemoveAlternateEmail(email)
                                        }
                                        className="cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-1 rounded-xl border border-border/60 bg-card/30 p-6 text-center text-xs text-muted-foreground">
                            <p className="font-semibold text-foreground">
                                You have no alternate emails
                            </p>
                            <p className="text-[11px]">
                                Want to have hello@ and help@ in the same
                                workspace? You've come to the right place.
                            </p>
                        </div>
                    )}

                    <button
                        onClick={() => setShowAltModal(true)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground transition-all hover:bg-muted"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add email</span>
                    </button>
                </div>

                {/* BCC EMAIL ADDRESSES */}
                <div className="space-y-3 border-b border-border pb-6">
                    <h2 className="text-xs font-bold text-foreground">
                        BCC email addresses
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        Ensure every customer message is backed up. Add up to 5
                        BCC addresses to automatically receive copies for
                        compliance.
                    </p>

                    {bccEmails.length > 0 ? (
                        <div className="space-y-2">
                            {bccEmails.map((email, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                                >
                                    <span className="font-mono text-xs font-semibold text-foreground">
                                        {email}
                                    </span>
                                    <button
                                        onClick={() =>
                                            handleRemoveBccEmail(email)
                                        }
                                        className="cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-1 rounded-xl border border-border/60 bg-card/30 p-6 text-center text-xs text-muted-foreground">
                            <p className="font-semibold text-foreground">
                                No BCC email addresses configured
                            </p>
                            <p className="text-[11px]">
                                Add email addresses that should receive a BCC
                                copy of all outgoing emails to customers.
                            </p>
                        </div>
                    )}

                    <button
                        onClick={() => setShowBccModal(true)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground transition-all hover:bg-muted"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add BCC email</span>
                    </button>
                </div>

                {/* CC BOMB PROTECTION */}
                <div className="space-y-3">
                    <h2 className="text-xs font-bold text-foreground">
                        CC bomb protection
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        When an email is addressed to the support@ or help@
                        addresses of 15+ companies, we mark it as ignored,
                        skipping your queue.
                    </p>

                    <div className="flex items-center gap-3 pt-1">
                        <span className="text-xs font-semibold text-muted-foreground">
                            {ccBombProtection ? 'Enabled' : 'Disabled'}
                        </span>
                        <button
                            onClick={() => {
                                const nextVal = !ccBombProtection;
                                setCcBombProtection(nextVal);
                                handleSave({ cc_bomb_protection: nextVal });
                            }}
                            className={`relative h-5 w-9 cursor-pointer rounded-full p-0.5 transition-colors ${
                                ccBombProtection ? 'bg-primary' : 'bg-muted'
                            }`}
                        >
                            <div
                                className={`h-4 w-4 rounded-full bg-foreground transition-transform ${
                                    ccBombProtection
                                        ? 'translate-x-4'
                                        : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Modal Add Alternate Email */}
                {showAltModal && (
                    <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm fade-in">
                        <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-background p-6 shadow-2xl">
                            <h3 className="text-lg font-bold text-foreground">
                                Add alternate email
                            </h3>
                            <form
                                onSubmit={handleAddAlternateEmail}
                                className="space-y-4"
                            >
                                <input
                                    type="email"
                                    placeholder="hello@yourdomain.com"
                                    value={newAltEmail}
                                    onChange={(e) =>
                                        setNewAltEmail(e.target.value)
                                    }
                                    autoFocus
                                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-primary/50 focus:outline-none"
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAltModal(false)}
                                        className="rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground"
                                    >
                                        Add
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal Add BCC Email */}
                {showBccModal && (
                    <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm fade-in">
                        <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-background p-6 shadow-2xl">
                            <h3 className="text-lg font-bold text-foreground">
                                Add BCC compliance email
                            </h3>
                            <form
                                onSubmit={handleAddBccEmail}
                                className="space-y-4"
                            >
                                <input
                                    type="email"
                                    placeholder="audit@yourdomain.com"
                                    value={newBccEmail}
                                    onChange={(e) =>
                                        setNewBccEmail(e.target.value)
                                    }
                                    autoFocus
                                    className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-xs text-foreground focus:border-primary/50 focus:outline-none"
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowBccModal(false)}
                                        className="rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground"
                                    >
                                        Add
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
