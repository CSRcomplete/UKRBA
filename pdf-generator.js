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

// Colour theme per accreditation level (1 = green, 2 = blue, 3 = silver, 4 = gold, 5 = bronze/copper)
const LEVEL_THEMES = {
    1: { border: '#2F5233', bannerFrom: '#43713A', bannerTo: '#233D1E', badgeFrom: '#E7F3E2', badgeTo: '#345B2C', ring: '#2F5233', text: '#2F5233' },
    2: { border: '#153A63', bannerFrom: '#1F4E85', bannerTo: '#0C2340', badgeFrom: '#E4EDF9', badgeTo: '#1F4E85', ring: '#153A63', text: '#153A63' },
    3: { border: '#6B7788', bannerFrom: '#8D99AA', bannerTo: '#4B5563', badgeFrom: '#F2F4F7', badgeTo: '#8D99AA', ring: '#5B6576', text: '#475264' },
    4: { border: '#B8860B', bannerFrom: '#D4AF37', bannerTo: '#96700D', badgeFrom: '#FCF1C7', badgeTo: '#C9971F', ring: '#96700D', text: '#8A6508' },
    5: { border: '#8B5A2B', bannerFrom: '#B87333', bannerTo: '#6B4423', badgeFrom: '#F2E1CC', badgeTo: '#9C6530', ring: '#6B4423', text: '#6B4423' }
};

function getLevelTheme(level) {
    return LEVEL_THEMES[level] || LEVEL_THEMES[1];
}

function toRoman(num) {
    const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let result = '';
    for (const [value, symbol] of map) {
        while (num >= value) {
            result += symbol;
            num -= value;
        }
    }
    return result;
}

// Lays out a string along the top arc of a circle of the given radius (px), for the badge ring text.
function arcText(text, radius) {
    const chars = text.split('');
    const totalAngle = 150;
    const startAngle = -75;
    const step = chars.length > 1 ? totalAngle / (chars.length - 1) : 0;
    return chars.map((c, i) => {
        const angle = startAngle + i * step;
        return `<span style="position:absolute; left:50%; top:50%; width:0; height:0; transform: rotate(${angle}deg) translate(0, -${radius}px);">
            <span style="position:absolute; left:-6px; top:-6px; display:block; transform: rotate(${-angle}deg); font-size:6.5pt; font-weight:700; letter-spacing:0.5px; color:#FFFFFF;">${c === ' ' ? '&nbsp;' : c}</span>
        </span>`;
    }).join('');
}

function buildBadgeHtml(theme, level) {
    const year = toRoman(new Date().getFullYear());
    return `
        <div class="badge-outer" style="background: linear-gradient(145deg, ${theme.badgeFrom}, ${theme.badgeTo}); border: 3px solid ${theme.ring};">
            <div class="badge-ring-text">${arcText('RESPONSIBLE BUSINESS STANDARD', 107)}</div>
            <div class="badge-inner">
                <div class="badge-shield" style="background: ${theme.ring};">&#10003;</div>
                <div class="badge-name">UK SME<br>Responsible Business<br>Association</div>
                <div class="badge-accredited">ACCREDITED</div>
                <div class="badge-level">LEVEL ${level}</div>
            </div>
            <div class="badge-footer" style="background: ${theme.ring};">Verified in Practice<br>${year}</div>
        </div>
    `;
}

function buildCertificateHtml(data, level, variant) {
    const theme = getLevelTheme(level);
    const businessName = (data.businessName || 'YOUR BUSINESS').toUpperCase();
    const isMembership = variant === 'membership';

    const title = 'UK SME Responsible Business Association ' + (isMembership ? 'Membership Certificate' : 'Complete Accreditation Certificate');
    const bannerText = isMembership
        ? `UK SME Responsible Business Association<br>Accredited Member &ndash; LEVEL ${level}`
        : `UK SME Responsible Business Association<br>Complete Accredited &ndash; LEVEL ${level}`;
    const achievedText = isMembership
        ? `is a verified member of the UK SME Responsible Business Association, holding accreditation`
        : `has achieved`;
    const bodyText = isMembership
        ? `Membership is based on declared, recorded, and reviewable Corporate Social Responsibility (CSR) and Environmental, Social &amp; Governance (ESG) business practices assessed within the UK SME Responsible Business Association framework.`
        : `This accreditation is based on declared, recorded, and reviewable Corporate Social Responsibility (CSR) and Environmental, Social &amp; Governance (ESG) business practices assessed within the UK SME Responsible Business Association framework.`;
    const footerText = isMembership
        ? `Membership reflects the organisation's current level of CSR and ESG practice maturity and is subject to ongoing review.`
        : `Accreditation reflects the organisation's current level of CSR and ESG practice maturity and is subject to ongoing review.`;

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @page { size: 13in 9in; margin: 0; }
                * { box-sizing: border-box; }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Helvetica', 'Arial', sans-serif;
                    width: 13in;
                    height: 9in;
                    background: #FFFFFF;
                }
                .frame {
                    box-sizing: border-box;
                    width: 100%;
                    height: 100%;
                    border: 3px solid ${theme.border};
                    padding: 30px 60px;
                    position: relative;
                }
                .rule { border-top: 1px solid ${theme.border}; border-bottom: 1px solid ${theme.border}; height: 3px; margin: 0 0 24px 0; }
                h1.title { font-size: 25pt; color: #0F172A; text-align: center; margin: 0 0 6px 0; font-weight: 700; }
                .subtitle { text-align: center; font-size: 13pt; color: #334155; margin: 0 0 22px 0; }
                .certifies-row { display: flex; align-items: center; justify-content: center; gap: 16px; margin: 6px 0; }
                .hr-flank { flex: 1; max-width: 220px; border-top: 1px solid #94A3B8; }
                .certifies-label { font-size: 12pt; color: #334155; white-space: nowrap; }
                .business-name { text-align: center; font-size: 18pt; font-weight: 700; color: #0F172A; margin: 26px 0 6px 0; min-height: 26pt; border-bottom: 1px solid #CBD5E1; padding-bottom: 6px; }
                .banner {
                    background: linear-gradient(90deg, ${theme.bannerFrom}, ${theme.bannerTo});
                    color: #FFFFFF;
                    text-align: center;
                    font-size: 18pt;
                    font-weight: 700;
                    line-height: 1.4;
                    padding: 14px 40px;
                    margin: 18px 300px 22px 0;
                }
                .body-text { text-align: center; font-size: 11.5pt; color: #1E293B; line-height: 1.6; max-width: 720px; margin: 0 0 14px 0; }
                .footer-text { text-align: center; font-size: 11.5pt; color: #1E293B; line-height: 1.6; max-width: 720px; margin: 0 0 14px 0; }
                .verified-at { position: absolute; left: 60px; bottom: 34px; font-size: 10.5pt; color: #1E293B; }
                .verified-at strong { display: block; font-weight: 700; }
                .signoff { position: absolute; right: 300px; bottom: 34px; text-align: center; }
                .signoff .sig { font-family: 'Segoe Script', cursive; font-size: 22pt; color: #1E293B; }
                .signoff .line { border-top: 1px solid #94A3B8; margin-top: 4px; padding-top: 4px; font-size: 10.5pt; color: #1E293B; }

                .badge-outer {
                    position: absolute;
                    top: 200px;
                    right: 50px;
                    width: 240px;
                    height: 240px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .badge-ring-text { position: absolute; width: 100%; height: 100%; top: 0; left: 0; }
                .badge-inner {
                    width: 190px;
                    height: 190px;
                    border-radius: 50%;
                    background: #FFFFFF;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding-top: 8px;
                }
                .badge-shield { width: 30px; height: 30px; border-radius: 6px; color: #FFFFFF; font-size: 15pt; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
                .badge-name { font-size: 8.5pt; font-weight: 700; color: #0F172A; line-height: 1.2; margin-bottom: 4px; }
                .badge-accredited { font-size: 6.5pt; letter-spacing: 1.5px; color: #64748B; font-weight: 700; }
                .badge-level { font-size: 15pt; font-weight: 700; color: ${theme.text}; }
                .badge-footer {
                    position: absolute;
                    bottom: 6px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 190px;
                    color: #FFFFFF;
                    font-size: 7.5pt;
                    font-weight: 700;
                    text-align: center;
                    line-height: 1.3;
                    padding: 5px 0;
                    border-radius: 0 0 95px 95px;
                }
            </style>
        </head>
        <body>
            <div class="frame">
                <div class="rule"></div>
                <h1 class="title">${title}</h1>
                <div class="subtitle">Corporate Social Responsibility (CSR) and Environmental, Social &amp; Governance (ESG)</div>

                <div class="certifies-row">
                    <div class="hr-flank"></div>
                    <div class="certifies-label">This certifies that</div>
                    <div class="hr-flank"></div>
                </div>

                <div class="business-name">${businessName}</div>

                <div class="certifies-row" style="margin-top: 4px;">
                    <div class="hr-flank"></div>
                    <div class="certifies-label">${achievedText}</div>
                    <div class="hr-flank"></div>
                </div>

                <div class="banner">${bannerText}</div>

                <div class="body-text">${bodyText}</div>
                <div class="footer-text">${footerText}</div>

                <div class="verified-at">
                    Verified at:
                    <strong>ukrba.org</strong>
                </div>

                <div class="signoff">
                    <div class="sig">UKRBA</div>
                    <div class="line">Authorised by<br>UK SME Responsible Business Association</div>
                </div>

                ${buildBadgeHtml(theme, level)}
            </div>
        </body>
        </html>
    `;
}

async function renderCertificate(htmlContent) {
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
            width: '13in',
            height: '9in',
            printBackground: true
        });

        return pdfBuffer;
    } finally {
        await browser.close();
    }
}

export async function generateCertificatePdf(data, level) {
    return renderCertificate(buildCertificateHtml(data, level, 'accreditation'));
}

export async function generateMembershipCertificatePdf(data, level) {
    return renderCertificate(buildCertificateHtml(data, level, 'membership'));
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
