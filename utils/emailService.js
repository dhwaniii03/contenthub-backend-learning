import emailjs from '@emailjs/nodejs';
import { emailTemplates } from './emailTemplates.js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize EmailJS with your public and private keys
emailjs.init({
  publicKey: process.env.EMAILJS_PUBLIC_KEY,
  privateKey: process.env.EMAILJS_PRIVATE_KEY,
});

/**
 * Unified function to send emails using EmailJS
 * 
 * @param {string} templateKey - Key from emailTemplates.js (e.g., 'PASSWORD_RESET')
 * @param {string} toEmail - Recipient's email address
 * @param {Object} dynamicData - Data to replace placeholders in the template (e.g., { name: 'John', reset_link: '...' })
 */
export const sendEmail = async (templateKey, toEmail, dynamicData) => {
  const templateConfig = emailTemplates[templateKey];

  if (!templateConfig) {
    throw new Error(`Email template '${templateKey}' not found.`);
  }

  // Replace placeholders in subject and content
  let dynamicSubject = templateConfig.subject;
  let dynamicContent = templateConfig.content;

  Object.keys(dynamicData).forEach(key => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    dynamicSubject = dynamicSubject.replace(placeholder, dynamicData[key]);
    dynamicContent = dynamicContent.replace(placeholder, dynamicData[key]);
  });

  const templateParams = {
    to_email: toEmail,
    subject: dynamicSubject,
    message_html: dynamicContent,
    ...dynamicData // Pass additional data directly if needed by the EmailJS template
  };

  try {
    const result = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      templateParams
    );
    console.log(`✅ Email sent successfully: ${templateKey} to ${toEmail}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to send email: ${templateKey} to ${toEmail}`);
    console.error(error);
    throw error;
  }
};
