<?php

use App\Domain\Channel\DTOs\EmailMessageData;

test('multilingual detectAutoReply identifies auto-replies across global languages and headers', function () {
    // Standard RFC Header
    expect(EmailMessageData::detectAutoReply([
        'Headers' => [['Name' => 'Auto-Submitted', 'Value' => 'auto-replied']],
    ], 'Normal subject'))->toBeTrue();

    // English
    expect(EmailMessageData::detectAutoReply([], 'Automatic reply: Out of office'))->toBeTrue();
    expect(EmailMessageData::detectAutoReply([], 'Auto: I am on vacation'))->toBeTrue();

    // Arabic
    expect(EmailMessageData::detectAutoReply([], 'الرد التلقائي: خارج المكتب حالياً'))->toBeTrue();
    expect(EmailMessageData::detectAutoReply([], 'رد تلقائي: في إجازة سنوية'))->toBeTrue();

    // French
    expect(EmailMessageData::detectAutoReply([], 'Réponse automatique : Absence du bureau'))->toBeTrue();

    // German
    expect(EmailMessageData::detectAutoReply([], 'Automatische Antwort: Abwesenheitsnotiz'))->toBeTrue();

    // Spanish
    expect(EmailMessageData::detectAutoReply([], 'Respuesta automática: Fuera de la oficina'))->toBeTrue();

    // Italian
    expect(EmailMessageData::detectAutoReply([], 'Risposta automatica: Fuori sede'))->toBeTrue();

    // Portuguese
    expect(EmailMessageData::detectAutoReply([], 'Resposta automática: Fora do escritório'))->toBeTrue();

    // Russian
    expect(EmailMessageData::detectAutoReply([], 'Автоматический ответ: Вне офиса'))->toBeTrue();

    // Turkish
    expect(EmailMessageData::detectAutoReply([], 'Otomatik yanıt: Ofis dışında'))->toBeTrue();

    // Chinese
    expect(EmailMessageData::detectAutoReply([], '自动回复：休假中'))->toBeTrue();

    // Japanese
    expect(EmailMessageData::detectAutoReply([], '自動応答: 不在通知'))->toBeTrue();

    // Korean
    expect(EmailMessageData::detectAutoReply([], '자동 회신: 휴가 중입니다'))->toBeTrue();

    // Regular inquiry should NOT be detected as auto-reply
    expect(EmailMessageData::detectAutoReply([], 'Question regarding invoice #1024'))->toBeFalse();
    expect(EmailMessageData::detectAutoReply([], 'استفسار عن طريقة الربط بالـ API'))->toBeFalse();
});

test('multilingual stripQuotedReplyText strips email reply headers across major languages', function () {
    // 1. English
    $english = "Thanks for the update!\n\nOn Mon, Sep 3, 2026 at 10:00 AM Support Team <support@inbxer.app> wrote:\n> How can we help?";
    expect(EmailMessageData::stripQuotedReplyText($english))->toBe('Thanks for the update!');

    // 2. Arabic
    $arabic = "شكراً جزيلاً، تم حل المشكلة بنجاح.\n\nفي 3 سبتمبر 2026 10:00 ص، كتب فريق الدعم <support@inbxer.app>:\n> هل لا تزال المشكلة مستمرة؟";
    expect(EmailMessageData::stripQuotedReplyText($arabic))->toBe('شكراً جزيلاً، تم حل المشكلة بنجاح.');

    // 3. French
    $french = "Merci pour votre réponse rapide.\n\nLe 3 sept. 2026 à 10:00, Service Client a écrit :\n> Votre ticket est en cours de traitement.";
    expect(EmailMessageData::stripQuotedReplyText($french))->toBe('Merci pour votre réponse rapide.');

    // 4. Spanish
    $spanish = "Muchas gracias por la ayuda.\n\nEl 3 de septiembre de 2026, Soporte Técnico escribió:\n> Hemos actualizado su cuenta.";
    expect(EmailMessageData::stripQuotedReplyText($spanish))->toBe('Muchas gracias por la ayuda.');

    // 5. German
    $german = "Vielen Dank für Ihre Hilfe.\n\nAm 3. September 2026 schrieb Support Team:\n> Bitte überprüfen Sie die Einstellungen.";
    expect(EmailMessageData::stripQuotedReplyText($german))->toBe('Vielen Dank für Ihre Hilfe.');

    // 6. Russian
    $russian = "Спасибо, всё работает.\n\n3 сентября 2026 г., пользователь Служба поддержки написал:\n> Проверьте статус заявки.";
    expect(EmailMessageData::stripQuotedReplyText($russian))->toBe('Спасибо, всё работает.');

    // 7. Chinese
    $chinese = "收到，感谢您的回复！\n\n在 2026年9月3日，客服团队 写道：\n> 请问问题解决了吗？";
    expect(EmailMessageData::stripQuotedReplyText($chinese))->toBe('收到，感谢您的回复！');

    // 8. Japanese
    $japanese = "ご確認ありがとうございます。\n\n2026年9月3日、サポート担当 は書きました:\n> お問い合わせ内容を確認いたしました。";
    expect(EmailMessageData::stripQuotedReplyText($japanese))->toBe('ご確認ありがとうございます。');

    // 9. Turkish
    $turkish = "Yardımınız için teşekkürler.\n\n3 Eylül 2026 tarihinde Destek Ekibi yazdı:\n> Talebiniz işleme alınmıştır.";
    expect(EmailMessageData::stripQuotedReplyText($turkish))->toBe('Yardımınız için teşekkürler.');
});

test('stripQuotedReplyText handles multilingual Outlook header blocks and dividers', function () {
    // English Outlook block
    $outlookEn = "Please review the attached contract.\n\nFrom: Alice <alice@example.com>\nSent: Thursday, September 3, 2026 9:00 AM\nTo: Bob <bob@example.com>\nSubject: Contract";
    expect(EmailMessageData::stripQuotedReplyText($outlookEn))->toBe('Please review the attached contract.');

    // French Outlook block
    $outlookFr = "C'est bien noté pour la réunion.\n\nDe : Jean <jean@example.com>\nEnvoyé : jeudi 3 septembre 2026 09:00\nÀ : Paul <paul@example.com>\nObjet : Réunion";
    expect(EmailMessageData::stripQuotedReplyText($outlookFr))->toBe("C'est bien noté pour la réunion.");

    // German Outlook block
    $outlookDe = "Ich habe die Dokumente erhalten.\n\nVon: Max <max@example.com>\nGesendet: Donnerstag, 3. September 2026 09:00\nAn: Anna <anna@example.com>\nBetreff: Dokumente";
    expect(EmailMessageData::stripQuotedReplyText($outlookDe))->toBe('Ich habe die Dokumente erhalten.');

    // Arabic Outlook block
    $outlookAr = "تم استلام الطلب.\n\nمن: أحمد <ahmed@example.com>\nتاريخ الإرسال: الخميس 3 سبتمبر 2026 09:00 ص\nإلى: محمد <mohamed@example.com>\nالموضوع: طلب الدعم";
    expect(EmailMessageData::stripQuotedReplyText($outlookAr))->toBe('تم استلام الطلب.');

    // Divider: French Message d'origine
    $dividerFr = "Bonjour,\nTout est en ordre.\n\n-----Message d'origine-----\nDe : test@test.com";
    expect(EmailMessageData::stripQuotedReplyText($dividerFr))->toBe("Bonjour,\nTout est en ordre.");

    // Divider: Arabic الرسالة الأصلية
    $dividerAr = "مرحباً بكم\n\n--- الرسالة الأصلية ---\nمن: test@test.com";
    expect(EmailMessageData::stripQuotedReplyText($dividerAr))->toBe('مرحباً بكم');

    // Divider: German Ursprüngliche Nachricht
    $dividerDe = "Hallo,\nDanke schön.\n\n--- Ursprüngliche Nachricht ---\nVon: test@test.com";
    expect(EmailMessageData::stripQuotedReplyText($dividerDe))->toBe("Hallo,\nDanke schön.");
});

test('stripQuotedReplyText protects original text if message consists entirely of quotes', function () {
    $allQuotes = "> Quoted text line 1\n> Quoted text line 2";
    expect(EmailMessageData::stripQuotedReplyText($allQuotes))->toBe($allQuotes);
});
