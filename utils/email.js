const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

//? Whenever you want to send an email, import Email class
//* se you can send email for different scenarios
// new Email(user, url).sendWelcome()
// new Email(user, url).resetPassword()
// new Email(user, url).contact()

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Mohammed Ben Aoumeur <${process.env.EMAIL_FROM}>`;
  }

  //? 1) Create and return a transporter:
  newTransport() {
    //* The transporter is the service that actually sends the email like Gmail and NOT the NodeJs
    if (process.env.NODE_ENV === 'production') {
      //* SendGrid for production
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }

    //* MailTrap for development
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  //? 2) Send the actual email
  async send(template, subject) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });
    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.htmlToText(html),
    };

    // 3) Create a template and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours family');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)'
    );
  }
};

//! NOTE
//* We don't USE Gmail service because it's not a good idea for Production app.
//* You can only send 500 email per day, and you will be marked as a spammer

//? For production, we use sendGrid or MailGun

//? For development, we use a Mailtrap service which fakes emails to real addresses
