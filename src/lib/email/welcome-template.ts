const translations = {
  nl: {
    subject: 'Welkom bij Clean Del Sol',
    greeting: 'Hallo',
    intro: 'Je account is aangemaakt. Klik op de knop hieronder om je wachtwoord in te stellen en in te loggen.',
    button: 'Wachtwoord instellen',
    footer: 'Als je deze e-mail niet verwachtte, kun je hem negeren.',
  },
  en: {
    subject: 'Welcome to Clean Del Sol',
    greeting: 'Hello',
    intro: 'Your account has been created. Click the button below to set your password and log in.',
    button: 'Set password',
    footer: 'If you didn\'t expect this email, you can ignore it.',
  },
  es: {
    subject: 'Bienvenido a Clean Del Sol',
    greeting: 'Hola',
    intro: 'Tu cuenta ha sido creada. Haz clic en el botón de abajo para establecer tu contraseña e iniciar sesión.',
    button: 'Establecer contraseña',
    footer: 'Si no esperabas este correo, puedes ignorarlo.',
  },
  uk: {
    subject: 'Ласкаво просимо до Clean Del Sol',
    greeting: 'Привіт',
    intro: 'Ваш обліковий запис створено. Натисніть кнопку нижче, щоб встановити пароль та увійти.',
    button: 'Встановити пароль',
    footer: 'Якщо ви не очікували цього листа, можете його проігнорувати.',
  },
  ru: {
    subject: 'Добро пожаловать в Clean Del Sol',
    greeting: 'Привет',
    intro: 'Ваш аккаунт создан. Нажмите кнопку ниже, чтобы установить пароль и войти.',
    button: 'Установить пароль',
    footer: 'Если вы не ожидали это письмо, можете его проигнорировать.',
  },
}

export function getWelcomeEmail(name: string, resetLink: string, locale: string = 'nl') {
  const t = translations[locale as keyof typeof translations] || translations.nl

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:420px;background:#ffffff;border-radius:16px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <h1 style="margin:0;font-size:20px;font-weight:300;letter-spacing:0.25em;color:#1a1a1a;">CLEAN DEL SOL</h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:16px;">
              <p style="margin:0;font-size:16px;font-weight:600;color:#1a1a1a;">${t.greeting} ${name},</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:28px;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:#555555;">${t.intro}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <a href="${resetLink}" style="display:inline-block;padding:14px 32px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:100px;font-size:15px;font-weight:600;">${t.button}</a>
            </td>
          </tr>
          <tr>
            <td>
              <p style="margin:0;font-size:12px;color:#999999;text-align:center;">${t.footer}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { html, subject: t.subject }
}
