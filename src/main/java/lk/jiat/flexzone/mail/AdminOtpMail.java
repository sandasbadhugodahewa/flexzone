package lk.jiat.flexzone.mail;

import io.rocketbase.mail.model.HtmlTextEmail;
import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import lk.jiat.flexzone.util.Env;

public class AdminOtpMail extends Mailable {

    private final String to;
    private final String otpCode;

    public AdminOtpMail(String to, String otpCode) {
        this.to = to;
        this.otpCode = otpCode;
    }

    @Override
    public void build(Message message) throws MessagingException {
        message.setRecipient(Message.RecipientType.TO, new InternetAddress(to));
        message.setSubject("Admin Login OTP - " + Env.get("app.name"));

        HtmlTextEmail htmlTextEmail = getEmailTemplateBuilder()
                .header()
                .logo("assets/images/logo/flexzonelogo.png")
                .logoHeight(40).and()
                .text("ADMIN LOGIN VERIFICATION").h1().center().and()
                .text("You requested to login to the FleXZone Admin Panel.").center().and()
                .text("Your One-Time Password (OTP):").center().and()
                .text(otpCode).h1().center().and()
                .text("This OTP is valid for 5 minutes. Do not share it with anyone.").center().and()
                .text("If you did not request this, please ignore this email.").center().and()
                .copyright(Env.get("app.name"))
                .url(Env.get("app.url"))
                .suffix(". All Rights Reserved").and()
                .build();

        message.setContent(htmlTextEmail.getHtml(), "text/html; charset=utf-8");
    }
}
