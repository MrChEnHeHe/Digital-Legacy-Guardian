import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

interface ShareEmailData {
  guardianName: string
  guardianEmail: string
  guardianId: string
  planName: string
  planId: string
  shareId: string
  shareIndex: number
  threshold: number
  totalShares: number
  creatorName?: string
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null
  private isConfigured: boolean = false

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter() {
    try {
      const smtpHost = process.env.SMTP_HOST
      const smtpPort = process.env.SMTP_PORT
      const smtpUser = process.env.SMTP_USER
      const smtpPass = process.env.SMTP_PASS
      
      if (smtpHost && smtpUser && smtpPass) {
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort || '587'),
          secure: parseInt(smtpPort || '587') === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        })
        
        // 暂时禁用 SMTP 连接验证，避免服务器崩溃
        this.isConfigured = true
        console.log('Email service configured with SMTP (connection verification disabled)')
      } else {
        console.log('Email service not configured. Using console logging for emails.')
        console.log('To enable email sending, set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env')
        this.isConfigured = false
      }
    } catch (error) {
      console.error('Error initializing email transporter:', error instanceof Error ? error.message : String(error))
      this.isConfigured = false
      console.log('Email service will use console logging for emails.')
    }
  }

  async sendShareEmail(data: ShareEmailData): Promise<boolean> {
    const emailContent = this.generateShareEmailContent(data)

    if (this.isConfigured && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: data.guardianEmail,
          subject: `【数字遗产管家】您已被指定为监护人 - ${data.planName}`,
          html: emailContent,
        })
        console.log(`Email sent successfully to ${data.guardianEmail}`)
        return true
      } catch (error) {
        console.error('Failed to send email:', error)
        return false
      }
    } else {
      console.log('\n========================================')
      console.log('📧 邮件发送模拟（SMTP未配置）')
      console.log('========================================')
      console.log(`收件人: ${data.guardianEmail}`)
      console.log(`收件人姓名: ${data.guardianName}`)
      console.log(`主题: 【数字遗产管家】您已被指定为监护人 - ${data.planName}`)
      console.log('----------------------------------------')
      console.log('邮件内容:')
      console.log(emailContent)
      console.log('========================================\n')
      return true
    }
  }

  private generateShareEmailContent(data: ShareEmailData): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>监护人邀请 - 数字遗产管家</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #4F46E5;
    }
    .title {
      font-size: 22px;
      font-weight: 600;
      color: #1F2937;
      margin-bottom: 20px;
    }
    .content {
      margin-bottom: 30px;
    }
    .info-box {
      background-color: #F3F4F6;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #E5E7EB;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #6B7280;
    }
    .info-value {
      font-weight: 500;
      color: #1F2937;
    }
    .share-box {
      background-color: #FEF3C7;
      border: 2px solid #F59E0B;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .share-id {
      font-family: monospace;
      font-size: 14px;
      word-break: break-all;
      background-color: #FFFBEB;
      padding: 10px;
      border-radius: 4px;
      margin-top: 10px;
    }
    .warning-box {
      background-color: #FEE2E2;
      border: 1px solid #EF4444;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
    }
    .warning-title {
      color: #DC2626;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .warning-list {
      color: #991B1B;
      margin: 0;
      padding-left: 20px;
    }
    .warning-list li {
      margin: 5px 0;
    }
    .footer {
      text-align: center;
      color: #9CA3AF;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🔐 数字遗产管家</div>
    </div>
    
    <h1 class="title">尊敬的 ${data.guardianName}，您好！</h1>
    
    <div class="content">
      <p>${data.creatorName || '某用户'} 已将您指定为数字遗产计划的监护人。作为监护人，您将在继承触发时协助验证并提交您的份额，以帮助继承人获取数字资产。</p>
      
      <div class="info-box">
        <h3 style="margin-top: 0; color: #4F46E5;">📋 计划信息</h3>
        <div class="info-row">
          <span class="info-label">计划名称</span>
          <span class="info-value">${data.planName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">计划ID</span>
          <span class="info-value">${data.planId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">门限配置</span>
          <span class="info-value">${data.threshold}-of-${data.totalShares}</span>
        </div>
        <div class="info-row">
          <span class="info-label">您的监护人ID</span>
          <span class="info-value">${data.guardianId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">您的份额序号</span>
          <span class="info-value">#${data.shareIndex}</span>
        </div>
      </div>
      
      <div class="share-box">
        <h3 style="margin-top: 0; color: #B45309;">🔑 您的份额信息</h3>
        <p style="margin-bottom: 5px;"><strong>份额ID（请妥善保管）：</strong></p>
        <div class="share-id">${data.shareId}</div>
        <p style="font-size: 12px; color: #92400E; margin-top: 10px;">
          ⚠️ 此份额ID是恢复数字资产的关键，请勿泄露给他人！
        </p>
      </div>
      
      <div class="warning-box">
        <div class="warning-title">⚠️ 重要安全提示</div>
        <ul class="warning-list">
          <li>请妥善保管此邮件和份额ID</li>
          <li>份额ID丢失将无法恢复，请备份保存</li>
          <li>请勿将份额ID告知他人，包括其他监护人</li>
          <li>继承触发时，需要 ${data.threshold} 位监护人同时提交份额</li>
          <li>如有疑问，请联系计划创建者确认</li>
        </ul>
      </div>
      
      <h3>📖 如何操作？</h3>
      <ol>
        <li>当继承触发时，您将收到通知</li>
        <li>访问数字遗产管家系统</li>
        <li>进入"监护人"页面</li>
        <li>输入计划ID、您的监护人ID和份额ID</li>
        <li>提交份额完成验证</li>
      </ol>
    </div>
    
    <div class="footer">
      <p>此邮件由数字遗产管家系统自动发送，请勿回复。</p>
      <p>© ${new Date().getFullYear()} Digital Legacy Guardian. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  }

  async sendInheritanceNotification(data: {
    guardianName: string
    guardianEmail: string
    planName: string
    planId: string
    heirAddress: string
  }): Promise<boolean> {
    const emailContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background: #fff; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .alert { background: #FEF3C7; border: 2px solid #F59E0B; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .info-box { background: #F3F4F6; border-radius: 8px; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔔 继承请求通知</h1>
    <p>尊敬的 ${data.guardianName}，</p>
    <p>数字遗产计划 <strong>${data.planName}</strong> 已发起继承请求。</p>
    
    <div class="info-box">
      <p><strong>计划ID:</strong> ${data.planId}</p>
      <p><strong>继承人地址:</strong> ${data.heirAddress}</p>
    </div>
    
    <div class="alert">
      <h3>⚠️ 请确认以下事项：</h3>
      <ul>
        <li>确认继承请求的合法性</li>
        <li>确认计划创建者确实已去世或失能</li>
        <li>如有疑问，请联系其他监护人或法律顾问</li>
      </ul>
    </div>
    
    <p>如确认无误，请登录系统提交您的份额以完成继承流程。</p>
  </div>
</body>
</html>
    `

    if (this.isConfigured && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: data.guardianEmail,
          subject: `【数字遗产管家】继承请求通知 - ${data.planName}`,
          html: emailContent,
        })
        return true
      } catch (error) {
        console.error('Failed to send notification email:', error)
        return false
      }
    } else {
      console.log('\n========================================')
      console.log('📧 继承通知邮件模拟')
      console.log('========================================')
      console.log(`收件人: ${data.guardianEmail}`)
      console.log(`计划: ${data.planName}`)
      console.log('========================================\n')
      return true
    }
  }

  async sendHeirNotification(data: {
    heirName: string
    heirEmail: string
    planName: string
    planId: string
    assets: any[]
  }): Promise<boolean> {
    const emailContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>继承成功通知 - 数字遗产管家</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #4F46E5;
    }
    .title {
      font-size: 22px;
      font-weight: 600;
      color: #1F2937;
      margin-bottom: 20px;
    }
    .content {
      margin-bottom: 30px;
    }
    .success-box {
      background-color: #D1FAE5;
      border: 2px solid #10B981;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .assets-box {
      background-color: #F3F4F6;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .asset-item {
      padding: 10px 0;
      border-bottom: 1px solid #E5E7EB;
    }
    .asset-item:last-child {
      border-bottom: none;
    }
    .asset-name {
      font-weight: 600;
      color: #1F2937;
    }
    .asset-type {
      font-size: 12px;
      color: #6B7280;
    }
    .asset-value {
      font-size: 14px;
      color: #4B5563;
      margin-top: 5px;
    }
    .footer {
      text-align: center;
      color: #9CA3AF;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🔐 数字遗产管家</div>
    </div>
    
    <h1 class="title">尊敬的 ${data.heirName}，您好！</h1>
    
    <div class="content">
      <div class="success-box">
        <h3 style="margin-top: 0; color: #059669;">🎉 继承成功！</h3>
        <p>数字遗产计划 <strong>${data.planName}</strong> 的继承流程已完成，您已成功获得以下数字资产。</p>
      </div>
      
      <div class="assets-box">
        <h3 style="margin-top: 0; color: #4F46E5;">📋 遗产内容</h3>
        ${data.assets.map((asset) => `
        <div class="asset-item">
          <div class="asset-name">${asset.name}</div>
          <div class="asset-type">类型：${asset.type}</div>
          <div class="asset-value">详情：${asset.value}</div>
        </div>
        `).join('')}
      </div>
      
      <p>请妥善保管这些资产信息，如需帮助，请联系系统管理员。</p>
    </div>
    
    <div class="footer">
      <p>此邮件由数字遗产管家系统自动发送，请勿回复。</p>
      <p>© ${new Date().getFullYear()} Digital Legacy Guardian. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `

    if (this.isConfigured && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: data.heirEmail,
          subject: `【数字遗产管家】继承成功通知 - ${data.planName}`,
          html: emailContent,
        })
        console.log(`Heir notification email sent successfully to ${data.heirEmail}`)
        return true
      } catch (error) {
        console.error('Failed to send heir notification email:', error)
        return false
      }
    } else {
      console.log('\n========================================')
      console.log('📧 继承人通知邮件模拟')
      console.log('========================================')
      console.log(`收件人: ${data.heirEmail}`)
      console.log(`计划: ${data.planName}`)
      console.log('资产数量:', data.assets.length)
      console.log('========================================\n')
      return true
    }
  }

  async sendGuardianShareSubmittedNotification(data: {
    guardianName: string
    guardianEmail: string
    planName: string
    planId: string
    submittedAt: Date
  }): Promise<boolean> {
    const emailContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>份额提交成功 - 数字遗产管家</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #4F46E5;
    }
    .title {
      font-size: 22px;
      font-weight: 600;
      color: #1F2937;
      margin-bottom: 20px;
    }
    .content {
      margin-bottom: 30px;
    }
    .success-box {
      background-color: #D1FAE5;
      border: 2px solid #10B981;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .info-box {
      background-color: #F3F4F6;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #E5E7EB;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #6B7280;
    }
    .info-value {
      font-weight: 500;
      color: #1F2937;
    }
    .footer {
      text-align: center;
      color: #9CA3AF;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🔐 数字遗产管家</div>
    </div>
    
    <h1 class="title">尊敬的 ${data.guardianName}，您好！</h1>
    
    <div class="content">
      <div class="success-box">
        <h3 style="margin-top: 0; color: #059669;">✅ 份额提交成功！</h3>
        <p>您已成功提交数字遗产计划 <strong>${data.planName}</strong> 的监护人份额。</p>
      </div>
      
      <div class="info-box">
        <h3 style="margin-top: 0; color: #4F46E5;">📋 提交信息</h3>
        <div class="info-row">
          <span class="info-label">计划名称</span>
          <span class="info-value">${data.planName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">计划ID</span>
          <span class="info-value">${data.planId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">提交时间</span>
          <span class="info-value">${data.submittedAt.toLocaleString('zh-CN')}</span>
        </div>
      </div>
      
      <p>感谢您的配合。当达到门限数量的监护人提交份额后，继承流程将继续进行。</p>
    </div>
    
    <div class="footer">
      <p>此邮件由数字遗产管家系统自动发送，请勿回复。</p>
      <p>© ${new Date().getFullYear()} Digital Legacy Guardian. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `

    if (this.isConfigured && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: data.guardianEmail,
          subject: `【数字遗产管家】份额提交成功 - ${data.planName}`,
          html: emailContent,
        })
        console.log(`Guardian share submitted notification sent to ${data.guardianEmail}`)
        return true
      } catch (error) {
        console.error('Failed to send guardian share submitted notification:', error)
        return false
      }
    } else {
      console.log('\n========================================')
      console.log('📧 监护人份额提交成功通知模拟')
      console.log('========================================')
      console.log(`收件人: ${data.guardianEmail}`)
      console.log(`计划: ${data.planName}`)
      console.log('========================================\n')
      return true
    }
  }

  async sendVerificationCodeEmail(data: {
    userName: string
    userEmail: string
    code: string
    purpose: string
  }): Promise<boolean> {
    const emailContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>验证码 - 数字遗产管家</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #4F46E5;
    }
    .title {
      font-size: 22px;
      font-weight: 600;
      color: #1F2937;
      margin-bottom: 20px;
    }
    .code-box {
      background-color: #EEF2FF;
      border: 2px solid #4F46E5;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    }
    .code {
      font-size: 32px;
      font-weight: bold;
      color: #4F46E5;
      letter-spacing: 8px;
    }
    .warning {
      color: #DC2626;
      font-size: 14px;
      margin-top: 20px;
    }
    .footer {
      text-align: center;
      color: #9CA3AF;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🔐 数字遗产管家</div>
    </div>
    
    <h1 class="title">尊敬的 ${data.userName}，您好！</h1>
    
    <p>您正在进行${data.purpose}操作，请使用以下验证码完成验证：</p>
    
    <div class="code-box">
      <div class="code">${data.code}</div>
    </div>
    
    <p class="warning">⚠️ 验证码有效期为5分钟，请勿将验证码告知他人。</p>
    
    <div class="footer">
      <p>此邮件由数字遗产管家系统自动发送，请勿回复。</p>
      <p>© ${new Date().getFullYear()} Digital Legacy Guardian. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `

    if (this.isConfigured && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: data.userEmail,
          subject: `【数字遗产管家】${data.purpose}验证码`,
          html: emailContent,
        })
        console.log(`Verification code email sent successfully to ${data.userEmail}`)
        return true
      } catch (error) {
        console.error('Failed to send verification code email:', error)
        return false
      }
    } else {
      console.log('\n========================================')
      console.log('📧 验证码邮件模拟')
      console.log('========================================')
      console.log(`收件人: ${data.userEmail}`)
      console.log(`用户名: ${data.userName}`)
      console.log(`用途: ${data.purpose}`)
      console.log(`验证码: ${data.code}`)
      console.log('========================================\n')
      return true
    }
  }
}

export const emailService = new EmailService()
