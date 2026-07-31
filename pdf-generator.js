import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

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

// Fixed canvas size of the supplied certificate template PNGs.
const TEMPLATE_WIDTH = 1536;
const TEMPLATE_HEIGHT = 1024;

const templateDataUriCache = new Map();

function getTemplateDataUri(relativePath) {
    if (!templateDataUriCache.has(relativePath)) {
        const filePath = path.join(process.cwd(), relativePath);
        const buffer = fs.readFileSync(filePath);
        templateDataUriCache.set(relativePath, `data:image/png;base64,${buffer.toString('base64')}`);
    }
    return templateDataUriCache.get(relativePath);
}

// Renders plain text overlays on top of a background template image (no drawn certificate design, just the client's own artwork).
function buildImageCertificateHtml(imageDataUri, overlays) {
    const overlayHtml = overlays.map(o => `
        <div style="position:absolute; top:${o.top}; left:${o.left}; width:${o.width}; text-align:${o.textAlign || 'center'}; font-family:'Helvetica','Arial',sans-serif; font-size:${o.fontSize}; font-weight:${o.fontWeight || 700}; color:${o.color || '#0F172A'}; letter-spacing:${o.letterSpacing || 'normal'}; white-space:${o.whiteSpace || 'normal'};">${o.text}</div>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                * { box-sizing: border-box; }
                body { margin: 0; padding: 0; width: ${TEMPLATE_WIDTH}px; height: ${TEMPLATE_HEIGHT}px; }
                .cert {
                    position: relative;
                    width: ${TEMPLATE_WIDTH}px;
                    height: ${TEMPLATE_HEIGHT}px;
                    background-image: url(${imageDataUri});
                    background-size: ${TEMPLATE_WIDTH}px ${TEMPLATE_HEIGHT}px;
                    background-repeat: no-repeat;
                }
            </style>
        </head>
        <body>
            <div class="cert">${overlayHtml}</div>
        </body>
        </html>
    `;
}

function buildAccreditationCertificateHtml(data, level) {
    const imageDataUri = getTemplateDataUri(`certificate-templates/accreditation/level-${level}.png`);
    const businessName = (data.businessName || 'YOUR BUSINESS').toUpperCase();

    return buildImageCertificateHtml(imageDataUri, [
        { text: businessName, top: '338px', left: '420px', width: '710px', fontSize: '30px', whiteSpace: 'nowrap' }
    ]);
}

function buildMembershipCertificateHtml(data) {
    const imageDataUri = getTemplateDataUri('certificate-templates/membership/default.png');
    const businessName = (data.businessName || 'YOUR BUSINESS').toUpperCase();
    const memberSince = data.reportDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

    return buildImageCertificateHtml(imageDataUri, [
        { text: businessName, top: '392px', left: '350px', width: '860px', fontSize: '28px', whiteSpace: 'nowrap' },
        { text: memberSince, top: '892px', left: '660px', width: '210px', fontSize: '15px', fontWeight: 600 }
    ]);
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
        await page.setViewport({ width: TEMPLATE_WIDTH, height: TEMPLATE_HEIGHT });
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            width: `${TEMPLATE_WIDTH}px`,
            height: `${TEMPLATE_HEIGHT}px`,
            printBackground: true
        });

        return pdfBuffer;
    } finally {
        await browser.close();
    }
}

export async function generateCertificatePdf(data, level) {
    return renderCertificate(buildAccreditationCertificateHtml(data, level));
}

export async function generateMembershipCertificatePdf(data, level) {
    return renderCertificate(buildMembershipCertificateHtml(data));
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
