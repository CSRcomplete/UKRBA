import puppeteer from 'puppeteer';
import { execSync } from 'child_process';

let cachedChromiumPath = null;
function getChromiumPath() {
    if (process.platform === 'win32') {
        return undefined; // Let Puppeteer use its bundled Chrome on Windows
    }
    if (cachedChromiumPath !== null) {
        return cachedChromiumPath;
    }
    try {
        const path = execSync('which chromium').toString().trim();
        if (path) {
            console.log(`Found Chromium via 'which': ${path}`);
            cachedChromiumPath = path;
            return path;
        }
    } catch (e) {
        console.warn("Could not find chromium via 'which chromium', letting Puppeteer use default.");
    }
    cachedChromiumPath = "";
    return undefined;
}

export async function generatePdfFromJSON(reportData) {
    const palette = {
        primaryNavy: '#0F172A',
        accentGreen: '#16A34A',
        slate600: '#475569',
        slate100: '#F1F5F9',
        white: '#FFFFFF'
    };

    const sectionsHtml = (reportData.sections || []).map(section => `
        <div class="section">
            <div class="section-title">${section.title}</div>
            <div class="section-content">${section.content}</div>
        </div>
    `).join('');

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @page { margin: 20mm; }
                body { 
                    font-family: 'Helvetica', 'Arial', sans-serif; 
                    color: ${palette.primaryNavy}; 
                    line-height: 1.5; 
                    margin: 0; 
                    padding: 0;
                    font-size: 10pt;
                }
                .header { 
                    border-bottom: 3px solid ${palette.accentGreen}; 
                    padding-bottom: 20px; 
                    margin-bottom: 30px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                }
                .report-title { 
                    font-size: 22pt; 
                    font-weight: bold; 
                    margin: 0; 
                    color: ${palette.primaryNavy};
                    letter-spacing: -0.5px;
                }
                .organisation-name { 
                    font-size: 14pt; 
                    color: ${palette.accentGreen}; 
                    font-weight: bold;
                    margin-top: 5px;
                }
                .summary-grid { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 20px; 
                    background: ${palette.slate100}; 
                    padding: 20px; 
                    border-radius: 8px; 
                    margin-bottom: 30px;
                }
                .summary-item { font-size: 9pt; }
                .summary-label { color: ${palette.slate600}; font-weight: bold; text-transform: uppercase; font-size: 8pt; display: block; }
                .section { margin-bottom: 20px; }
                .section-title { 
                    font-size: 12pt; 
                    font-weight: bold; 
                    color: ${palette.primaryNavy}; 
                    border-left: 4px solid ${palette.accentGreen};
                    padding-left: 10px;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                }
                .section-content { text-align: justify; color: ${palette.primaryNavy}; }
                .footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid ${palette.slate100};
                    font-size: 8pt;
                    color: ${palette.slate600};
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1 class="report-title">UKRBA SUMMARY AUDIT</h1>
                    <div class="organisation-name">${reportData.organisation || reportData.businessName || "Organisation Not Specified"}</div>
                </div>
            </div>

            <div class="summary-grid">
                <div class="summary-item">
                    <span class="summary-label">Accreditation Position</span>
                    <strong>${reportData.overallPosition || "Pending Assessment"}</strong>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Accreditation Level</span>
                    <strong>${reportData.level || "Assessing..."}</strong>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Date Issued</span>
                    ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                <div class="summary-item">
                    <span class="summary-label">Evidence Status</span>
                    Verified via UKRBA Framework
                </div>
            </div>

            ${sectionsHtml}

            <div class="footer">
                This document is a summary of the independent CSR and ESG assessment conducted by UKRBA.<br>
                For the full accreditation report, please refer to the member dashboard.
            </div>
        </body>
        </html>
    `;
    return await generatePdf(htmlContent);
}

async function generatePdf(htmlContent, footerTemplate = null) {
    const launchOptions = {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };
    const chromiumPath = getChromiumPath();
    if (chromiumPath) {
        launchOptions.executablePath = chromiumPath;
    }

    const browser = await puppeteer.launch(launchOptions);
    try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const defaultFooter = `
            <div style="font-family: Arial; font-size: 8pt; color: #475569; width: 100%; padding: 0 40px; border-top: 1px solid #CBD5E1; display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                <span>Verified and issued by UKRBA</span>
                <span>Confidential Business Assessment</span>
            </div>
        `;

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: '<div></div>',
            footerTemplate: footerTemplate || defaultFooter,
            margin: { top: '0', right: '0', bottom: '25mm', left: '0' }
        });
        return pdfBuffer;
    } finally {
        await browser.close();
    }
}

export async function generatePolicyPdf(data, title, content) {
    const palette = {
        primaryNavy: '#0F172A',
        accentGreen: '#16A34A',
        slate600: '#475569',
        slate100: '#F1F5F9'
    };

    // Strip any accidental markdown hashes from the beginning of lines
    // and replace hyphens in bullet lists with clean bullet symbols
    let cleanContent = content
        .replace(/^[#]+\s?/gm, '') // Strips leading hashes (e.g. #### 2.1)
        .replace(/^\s*-\s+/gm, '• ') // Replaces leading hyphens in bullet points
        .trim();

    // Robust Markdown to HTML conversion
    let formattedContent = cleanContent
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/^---$/gim, '<hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;">')
        .replace(/\n/g, '<br>');

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @page { margin: 25mm; }
                body { font-family: Arial, sans-serif; color: ${palette.primaryNavy}; line-height: 1.6; margin: 0; padding: 0; font-size: 11pt; }
                .header { border-bottom: 2px solid ${palette.accentGreen}; padding-bottom: 15px; margin-bottom: 30px; }
                .policy-title { font-size: 24pt; font-weight: bold; margin: 0; text-transform: uppercase; }
                .organisation-line { color: ${palette.accentGreen}; font-weight: bold; margin-top: 5px; font-size: 12pt; }
                .content { text-align: justify; }
                .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid ${palette.slate100}; font-size: 9pt; color: ${palette.slate600}; text-align: center; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 class="policy-title">${title}</h1>
                <div class="organisation-line" style="display: flex; justify-content: space-between;">
                    <span>Organisation: ${data.businessName || data.business_name || 'Not Provided'}</span>
                    <span>Membership No: ${data.membershipNumber || 'PENDING'}</span>
                </div>
            </div>
            <div class="content">${formattedContent}</div>
            <div class="footer">
                &copy; ${new Date().getFullYear()} ${data.businessName || data.business_name || 'The Organisation'}. All Rights Reserved.
            </div>
        </body>
        </html>
    `;

    const policyFooter = `
        <div style="font-family: Arial; font-size: 8pt; color: #475569; width: 100%; padding: 0 40px; border-top: 1px solid #CBD5E1; display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
            <span>Prepared by UKRBA</span>
            <span></span>
        </div>
    `;

    return await generatePdf(htmlContent, policyFooter);
}

export async function generateCertificatePdf(data, level) {
    const palette = {
        navy: '#0F172A',
        gold: '#F59E0B',
        accentGreen: '#16A34A',
        lightGray: '#F8FAFC'
    };

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @page { 
                    size: 16in 9in; 
                    margin: 0; 
                }
                body { 
                    margin: 0; 
                    padding: 0; 
                    font-family: 'Helvetica', 'Arial', sans-serif; 
                    background: ${palette.navy};
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                }
                .cert-container {
                    width: 90%;
                    height: 85%;
                    border: 12px solid ${palette.gold};
                    background: white;
                    padding: 40px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-around;
                    align-items: center;
                    text-align: center;
                    position: relative;
                }
                .decor-line {
                    position: absolute;
                    width: 150px;
                    height: 150px;
                    border: 20px solid ${palette.gold};
                }
                .tl { top: -10px; left: -10px; border-right: 0; border-bottom: 0; }
                .tr { top: -10px; right: -10px; border-left: 0; border-bottom: 0; }
                .bl { bottom: -10px; left: -10px; border-right: 0; border-top: 0; }
                .br { bottom: -10px; right: -10px; border-left: 0; border-top: 0; }

                .header { font-size: 24pt; letter-spacing: 4px; color: ${palette.gold}; font-weight: bold; }
                .cert-title { font-size: 44pt; color: ${palette.navy}; font-weight: bold; margin: 10px 0; }
                .company-name { font-size: 52pt; color: ${palette.navy}; font-weight: bold; border-bottom: 3px solid ${palette.gold}; padding-bottom: 5px; margin: 20px 0; }
                .award-text { font-size: 20pt; color: #475569; max-width: 800px; line-height: 1.4; }
                .level-box { background: ${palette.accentGreen}; color: white; padding: 10px 40px; font-size: 28pt; font-weight: bold; border-radius: 50px; margin: 20px 0; }
                
                .footer { width: 100%; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 40px; }
                .sig-box { width: 250px; border-top: 1px solid #CBD5E1; padding-top: 10px; font-size: 14pt; color: #64748B; }
                .seal { width: 140px; height: 140px; background: ${palette.gold}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="cert-container">
                <div class="decor-line tl"></div>
                <div class="decor-line tr"></div>
                <div class="decor-line bl"></div>
                <div class="decor-line br"></div>

                <div class="header">ACCREDITATION VERIFIED</div>
                <div class="cert-title">CERTIFICATE OF EXCELLENCE</div>
                <p style="font-size: 18pt; color: #64748B;">This is to certify that</p>
                <div class="company-name">${data.businessName.toUpperCase()}</div>
                <p class="award-text">has successfully completed the CSR and ESG assessment framework and is hereby recognized for their commitment to responsible business practices.</p>
                <div class="level-box">UKRBA LEVEL ${level}</div>
                <div style="font-size: 16pt; color: #475569; font-weight: bold; margin-bottom: 20px; letter-spacing: 1px;">MEMBERSHIP NO: ${data.membershipNumber || 'PENDING'}</div>

                <div class="footer">
                    <div class="sig-box">
                        DATE ISSUED<br>
                        <strong>${data.reportDate || new Date().toLocaleDateString('en-GB')}</strong>
                    </div>
                    <div class="seal">UKRBA</div>
                    <div class="sig-box">
                        ISSUED BY<br>
                        <strong>UKRBA</strong>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    const launchOptions = {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };
    const chromiumPath = getChromiumPath();
    if (chromiumPath) {
        launchOptions.executablePath = chromiumPath;
    }

    const browser = await puppeteer.launch(launchOptions);
    try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
            width: '16in',
            height: '9in',
            printBackground: true
        });
        
        return pdfBuffer;
    } finally {
        await browser.close();
    }
}

export async function generateFullReportPdf(data, content) {
    let cleanContent = content
        .replace(/```html/g, '')
        .replace(/```/g, '')
        .replace(/^[#]+\s?/gm, '')
        .replace(/^[-\*_]{3,}/gm, '')
        .replace(/[|｜│┃┆┇┊┋]/g, '')
        .replace(/^>\s?/gm, '')
        .replace(/Note to report user:.*$/gim, '')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n\n+/g, '\n\n')
        .trim();

    const palette = {
        primaryNavy: '#0F172A',
        secondarySlate: '#334155',
        lightSlate: '#E2E8F0',
        baseOffWhite: '#F8FAFC',
        accentGreen: '#16A34A',
        darkNavy: '#020617',
        midGrey: '#475569',
        dividerGrey: '#CBD5E1'
    };

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <style>
                @page { margin-top: 15mm; } /* Default top margin for Pages 2+ */
                @page :first { margin-top: 0; } /* Header on Page 1 stays flush */
                body { font-family: Arial, sans-serif; background-color: ${palette.baseOffWhite}; color: ${palette.secondarySlate}; margin: 0; padding: 0; line-height: 1.4; font-size: 10.5pt; }
                .report-header { background-color: ${palette.darkNavy}; color: white; padding: 60px 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid ${palette.accentGreen}; margin-bottom: 30px; }
                .accreditation-box { background-color: ${palette.lightSlate}; border-left: 6px solid ${palette.accentGreen}; padding: 20px; margin-bottom: 25px; color: ${palette.primaryNavy}; font-weight: bold; }
                .content { text-align: justify; white-space: pre-wrap; padding: 0 40px; }
                strong { color: ${palette.primaryNavy}; font-weight: 700; }
            </style>
        </head>
        <body>
            <div class="report-header">
                <div>
                    <div style="font-size: 16pt; font-weight: bold; text-transform: uppercase; max-width: 500px;">${data.report_header_title || 'CSR & ESG ASSESSMENT REPORT'}</div>
                    <div style="color: ${palette.accentGreen}; font-weight: bold; font-size: 12pt; margin-top: 5px;">${data.accreditation_status_label || 'Accreditation Level'}: ${data.level_display || ('UKRBA Level ' + data.level)}</div>
                </div>
                <div style="text-align: right; font-size: 9pt; color: #94A3B8;">DATE: ${data.reportDate || new Date().toLocaleDateString('en-GB')}</div>
            </div>
            <div class="accreditation-box">
                <table style="width: 100%; border-collapse: collapse; font-weight: bold; color: ${palette.primaryNavy}; font-size: 11pt;">
                    <tr>
                        <td style="padding: 2px 0;">Organisation: ${data.businessName}</td>
                        <td style="text-align: right; padding: 2px 0;">Membership No: ${data.membershipNumber || 'PENDING'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0 2px 0;" colspan="2">${data.overall_position_label || 'Overall Position'}: ${data.overallPosition}</td>
                    </tr>
                </table>
            </div>
            <div class="content">${cleanContent}</div>
        </body>
        </html>
    `;
    return await generatePdf(htmlContent);
}
