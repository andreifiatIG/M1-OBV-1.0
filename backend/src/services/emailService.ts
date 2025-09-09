import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: options.from || process.env.SMTP_USER,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        to: options.to,
        subject: options.subject,
        messageId: result.messageId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  // Onboarding notification templates
  async sendOnboardingSubmittedEmail(
    adminEmails: string[],
    villaName: string,
    ownerName: string,
    ownerEmail: string,
    villaId: string
  ) {
    const subject = `New Villa Onboarding Submitted: ${villaName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Villa Onboarding Submitted</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151; margin-top: 0;">New Villa Requires Review</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #0d9488;">
            <h3 style="color: #0d9488; margin-top: 0;">Villa Details</h3>
            <p><strong>Villa Name:</strong> ${villaName}</p>
            <p><strong>Owner:</strong> ${ownerName}</p>
            <p><strong>Email:</strong> ${ownerEmail}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.FRONTEND_URL}/admin/approvals" 
               style="background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Review Application
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            Please review this villa application and approve or request changes as needed.
          </p>
        </div>
        
        <div style="background: #374151; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>M1 Villa Management System | Admin Notification</p>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: adminEmails,
      subject,
      html,
    });
  }

  async sendOnboardingApprovedEmail(
    ownerEmail: string,
    ownerName: string,
    villaName: string,
    approvedBy: string,
    villaId: string
  ) {
    const subject = `Congratulations! Your villa "${villaName}" has been approved`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🎉 Villa Approved!</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151; margin-top: 0;">Welcome to M1 Villa Management!</h2>
          
          <p>Dear ${ownerName},</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #059669;">
            <p style="color: #059669; font-weight: bold; margin-top: 0;">Great news! Your villa application has been approved.</p>
            <p><strong>Villa:</strong> ${villaName}</p>
            <p><strong>Approved by:</strong> ${approvedBy}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.FRONTEND_URL}/dashboard" 
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin-right: 10px;">
              Access Dashboard
            </a>
            <a href="${process.env.FRONTEND_URL}/villa-management/${villaId}/profile" 
               style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              View Villa Profile
            </a>
          </div>
          
          <p>You can now start managing your villa through our platform. Access your dashboard to:</p>
          <ul style="color: #6b7280;">
            <li>Manage bookings and availability</li>
            <li>Upload and organize documents</li>
            <li>Track financial reports</li>
            <li>Communicate with your assigned staff</li>
          </ul>
        </div>
        
        <div style="background: #374151; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>M1 Villa Management System</p>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: ownerEmail,
      subject,
      html,
    });
  }

  async sendOnboardingRejectedEmail(
    ownerEmail: string,
    ownerName: string,
    villaName: string,
    rejectedBy: string,
    rejectionReason: string,
    villaId: string
  ) {
    const subject = `Application Update Required: ${villaName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Application Requires Updates</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151; margin-top: 0;">Updates Required for ${villaName}</h2>
          
          <p>Dear ${ownerName},</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626;">
            <p style="color: #dc2626; font-weight: bold; margin-top: 0;">Your villa application requires some updates before approval.</p>
            <p><strong>Reviewed by:</strong> ${rejectedBy}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">Required Changes:</h3>
            <p style="color: #374151;">${rejectionReason}</p>
          </div>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.FRONTEND_URL}/onboarding" 
               style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Update Application
            </a>
          </div>
          
          <p style="color: #6b7280;">
            Please make the requested changes and resubmit your application. If you have any questions, 
            please contact our support team.
          </p>
        </div>
        
        <div style="background: #374151; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>M1 Villa Management System | Need help? Contact our support team</p>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: ownerEmail,
      subject,
      html,
    });
  }

  async sendVillaProfileUpdatedEmail(
    ownerEmail: string,
    ownerName: string,
    villaName: string,
    updatedFields: string[],
    villaId: string
  ) {
    const subject = `Villa Profile Updated: ${villaName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Villa Profile Updated</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151; margin-top: 0;">Profile Changes Confirmed</h2>
          
          <p>Dear ${ownerName},</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #0d9488;">
            <p style="color: #0d9488; font-weight: bold; margin-top: 0;">Your villa profile has been updated successfully.</p>
            <p><strong>Villa:</strong> ${villaName}</p>
            <p><strong>Updated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Fields Updated:</strong> ${updatedFields.join(', ')}</p>
          </div>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.FRONTEND_URL}/villa-management/${villaId}/profile" 
               style="background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              View Updated Profile
            </a>
          </div>
        </div>
        
        <div style="background: #374151; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>M1 Villa Management System</p>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: ownerEmail,
      subject,
      html,
    });
  }
}

export default new EmailService();