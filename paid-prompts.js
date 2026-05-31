export const PAID_POLICIES = [
    {
        id: 'csr_esg',
        title: 'CSR and ESG Commitment Statement',
        prompt: `Write a formally structured CSR and ESG Commitment Statement for a UK-based business.

STRICT OUTPUT RULES:
- Do not provide any preamble.
- Use professional UK English.
- Minimum 1,000 words.

DOCUMENT HEADER:
Title: CSR and ESG Commitment Statement
Business Name: {business_name}
Effective Date: ${new Date().toLocaleDateString('en-GB')}
Review Date: ${new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-GB')}

BUSINESS DETAILS:
Business name: {business_name}
Business description: {business_description}
Company website: {company_url}
Industry: {industry}

STRUCTURE:
1. Introduction
2. ESG Strategy
3. Operational Commitments
4. Governance and Review
`
    },
    {
        id: 'community',
        title: 'Community and Social Impact Policy',
        prompt: `Write a formally structured Community and Social Impact Policy for a UK-based business.

STRICT OUTPUT RULES:
- Do not provide any preamble.
- Use professional UK English.
- Minimum 1,000 words.

DOCUMENT HEADER:
Title: Community and Social Impact Policy
Business Name: {business_name}
Effective Date: ${new Date().toLocaleDateString('en-GB')}
Review Date: ${new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-GB')}

BUSINESS DETAILS:
Business name: {business_name}
Business description: {business_description}
Company website: {company_url}

STRUCTURE:
1. Introduction
2. Current Activity
3. Future Intent
4. Responsibility and Review
`
    },
    {
        id: 'environmental',
        title: 'Environmental Policy',
        prompt: `Write a formally structured Environmental Policy for a UK-based business.

STRICT OUTPUT RULES:
- Do not provide any preamble.
- Use professional UK English.
- Minimum 1,200 words.

DOCUMENT HEADER:
Title: Environmental Policy
Business Name: {business_name}
Effective Date: ${new Date().toLocaleDateString('en-GB')}
Review Date: ${new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-GB')}

BUSINESS DETAILS:
Business name: {business_name}
Business description: {business_description}
Company website: {company_url}

STRUCTURE:
1. Introduction
2. Environmental Impact
3. Commitments
4. Monitoring and Review
`
    },
    {
        id: 'equality',
        title: 'Equality and Diversity Policy',
        prompt: `Write a formally structured Equality and Diversity Policy for a UK-based business.

STRICT OUTPUT RULES:
- Do not provide any preamble.
- Use professional UK English.
- Minimum 1,100 words.

DOCUMENT HEADER:
Title: Equality and Diversity Policy
Business Name: {business_name}
Effective Date: ${new Date().toLocaleDateString('en-GB')}
Review Date: ${new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-GB')}

BUSINESS DETAILS:
Business name: {business_name}
Business description: {business_description}

STRUCTURE:
1. Introduction
2. Commitment to Equality
3. Workplace Conduct
4. Responsibility and Review
`
    },
    {
        id: 'ethical',
        title: 'Ethical Trading Policy',
        prompt: `Write a formally structured Ethical Trading Policy for a UK-based business.

STRICT OUTPUT RULES:
- Do not provide any preamble.
- Use professional UK English.
- Minimum 1,100 words.

DOCUMENT HEADER:
Title: Ethical Trading Policy
Business Name: {business_name}
Effective Date: ${new Date().toLocaleDateString('en-GB')}
Review Date: ${new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-GB')}

BUSINESS DETAILS:
Business name: {business_name}
Business description: {business_description}

STRUCTURE:
1. Introduction
2. Ethical Principles
3. Supplier Standards
4. Review
`
    },
    {
        id: 'governance',
        title: 'Governance and Responsibility Policy',
        prompt: `Write a formally structured Governance and Responsibility Policy for a UK-based business.

STRICT OUTPUT RULES:
- Do not provide any preamble.
- Use professional UK English.
- Minimum 1,100 words.

DOCUMENT HEADER:
Title: Governance and Responsibility Policy
Business Name: {business_name}
Effective Date: ${new Date().toLocaleDateString('en-GB')}
Review Date: ${new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-GB')}

BUSINESS DETAILS:
Business name: {business_name}
Business description: {business_description}

STRUCTURE:
1. Introduction
2. Governance Structure
3. Accountability
4. Monitoring and Review
`
    },
    {
        id: 'slavery',
        title: 'Modern Slavery Statement',
        prompt: `Write a formally structured Modern Slavery Statement for a UK-based business.

STRICT OUTPUT RULES:
- Do not provide any preamble.
- Use professional UK English.
- Minimum 1,000 words.

DOCUMENT HEADER:
Title: Modern Slavery Statement
Business Name: {business_name}
Effective Date: ${new Date().toLocaleDateString('en-GB')}
Review Date: ${new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-GB')}

BUSINESS DETAILS:
Business name: {business_name}
Business description: {business_description}

STRUCTURE:
1. Introduction
2. Risk Assessment
3. Due Diligence
4. Review
`
    },
    {
        id: 'workforce',
        title: 'Workforce and Wellbeing Policy',
        prompt: `Write a formally structured Workforce and Wellbeing Policy for a UK-based business.

STRICT OUTPUT RULES:
- Do not provide any preamble.
- Use professional UK English.
- Minimum 1,100 words.

DOCUMENT HEADER:
Title: Workforce and Wellbeing Policy
Business Name: {business_name}
Effective Date: ${new Date().toLocaleDateString('en-GB')}
Review Date: ${new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-GB')}

BUSINESS DETAILS:
Business name: {business_name}
Business description: {business_description}

STRUCTURE:
1. Introduction
2. Wellbeing Approach
3. Support Systems
4. Review
`
    },
    {
        id: 'master-report',
        title: 'UKRBA Assessment Report',
        prompt: `Role 
You are a UKRBA (UK Responsible Business Association) accreditation analyst and professional report writer. You produce a full, detailed, evidence-led CSR and ESG Assessment Report of approximately eight pages in clear, natural, professional UK English. The report must read as if written by a senior human assessor and must be suitable for council procurement meetings, public sector tender submissions, contract due diligence, supplier onboarding, and commercial partnerships. You are not an AI assistant. You are writing as an independent accreditation body producing a formal assessment document. 
Core Objective 
Generate a full eight-section CSR and ESG Assessment Report that meets all of the following requirements: 
•	Reads naturally and sounds like a senior human analyst wrote it. 
•	Reflects only verified evidence drawn from the accreditation report, the policies, and the CSR diary. 
•	Explains in detail what the business is actually doing across all three ESG dimensions. 
•	Integrates policy, operational behaviour, accreditation findings, and live diary activity throughout every section. 
•	Includes real, specific, named examples drawn directly from the CSR diary. 
•	Is of sufficient depth and length to satisfy a council procurement panel or public sector due diligence review. 
•	Is commercially credible and free from overstatement. 
•	Covers approximately eight pages in total across eight clearly structured sections. 
•   {status_instruction}

Header Format 
{report_header_title} Report Date: {reportDate}
Organisation: {businessName} 
Website: {companyUrl}
CSR Diary: {diaryUrl} {accreditation_status_label}: {level_display}
{overall_position_label}: {overallPosition} Assessment Date: {reportDate}
Issued By: UKRBA (UK Responsible Business Association) 

Section 1: Executive Summary 
Must cover: the overall accreditation position in plain terms; what that position means for a procurement reviewer; the key finding from the accreditation report summarised in one or two sentences.

Section 2: About the Organisation 
Must cover: what the organisation does and the sector it operates in; the approximate size of the workforce; the operational context relevant to CSR and ESG assessment.

Section 3: Accreditation Position and Assessment Methodology 
Must cover: a brief explanation of the UKRBA framework and what accreditation means.

Section 4: Environmental Responsibility 
Opening: Must Begin Exactly as Follows 
This report provides a full evidence-based assessment of the corporate social responsibility (CSR) and environmental, social and governance (ESG) position of {businessName} at the time of assessment.

Section 5: Social Responsibility and Workforce Conduct 
Must cover: workforce wellbeing and people management, equality, diversity and inclusion, and community contribution in detail.

Section 6: Governance and Accountability 
Must cover: how responsibility for CSR and ESG is assigned and reviewed within the organisation.

Section 7: CSR Diary, Verified Activity Record 
This section is dedicated entirely to the evidence contained in the CSR diary.

Section 8: External Credibility and Procurement Readiness 
Must cover: a summary of the overall evidence position across all three dimensions.

Closing: Must Appear Exactly as Follows 
This report represents a full assessment based on evidence available at the time of review and forms part of the UKRBA accreditation framework. 
Verified and issued by UKRBA (UK Responsible Business Association) 
`
    }
];

export const ACCREDITATION_BADGES = {
    1: "https://static.wixstatic.com/media/1f5588_5ca5b2b6ad4e411f8c3fd61613cf31f6~mv2.png",
    2: "https://static.wixstatic.com/media/1f5588_ccf2f60bc84e452da96a7a04e285acfa~mv2.jpg",
    3: "https://static.wixstatic.com/media/1f5588_1f9994380741488db05f9735e2ae0c7e~mv2.jpg",
    4: "https://static.wixstatic.com/media/1f5588_fbcf0571a1de48cd989b9079fb61cbf4~mv2.png",
    5: "https://static.wixstatic.com/media/1f5588_4070a7b4899547d29ec493231454df7d~mv2.png"
};
