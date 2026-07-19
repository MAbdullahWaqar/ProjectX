const fs = require('fs');
const path = require('path');

const STRESS_DIR = path.join(__dirname, '../samples/stress');

const DOCS = {
  // --- Paystub Variants (15) ---
  'ps_tabular.txt': `Northeast Freight LLC
Employee: John Smith
Date: 2026-07-15
Frequency: Bi-weekly

Description   | Hours | Rate  | Current   | YTD
Regular Pay   | 80.0  | 25.00 | $2,000.00 | $28,000.00
Overtime      | 5.0   | 37.50 |   $187.50 |  $2,625.00
Total:        |       |       | $2,187.50 | $30,625.00
`,
  'ps_no_labels.txt': `Acme Corp
John Smith
Biweekly
2026-07-15

Total: $2,187.50
YTD: $30,625.00
`,
  'ps_multiline_employer.txt': `Northeast Freight
Logistics LLC
Employee: John Smith
Pay Date: 2026-07-15
Pay Frequency: Biweekly
Gross Pay: $2,187.50
YTD Gross: $30,625.00
`,
  'ps_extra_whitespace.txt': `Northeast Freight LLC
Employee   :       John Smith
Pay Date               :           2026-07-15
Pay Frequency    :           Biweekly
Current Gross Pay      :           $ 2,187.50
YTD Gross Pay          :           $ 30,625.00
`,
  'ps_comma_separated.txt': `Employer:,Northeast Freight LLC
Employee:,John Smith
Pay Date:,2026-07-15
Pay Frequency:,Biweekly
Gross Pay:,"$2,187.50"
YTD Gross:,"$30,625.00"
`,
  'ps_reversed_date.txt': `Northeast Freight LLC
Employee: John Smith
Pay Frequency: Biweekly
Pay Date: 15/07/2026
Gross Earnings: $2,187.50
YTD Earnings: $30,625.00
`,
  'ps_lowercase.txt': `northeast freight llc
employee name: john smith
pay frequency: biweekly
pay date: 2026-07-15
gross pay this period: $2,187.50
ytd gross pay: $30,625.00
`,
  'ps_abbreviated.txt': `Northeast Freight LLC
Emp: John Smith
Freq: BW
Date: 2026-07-15
Cur Gross: $2187.50
YTD Gross: $30625.00
`,
  'ps_net_only.txt': `Northeast Freight LLC
Employee: John Smith
Pay Frequency: Biweekly
Pay Date: 2026-07-15
Net Pay: $1,500.00
YTD Net: $21,000.00
`,
  'ps_missing_ytd.txt': `Northeast Freight LLC
Employee Name: John Smith
Pay Frequency: Biweekly
Pay Date: 2026-07-15
Gross Pay: $2,187.50
`,
  'ps_zero_gross.txt': `Northeast Freight LLC
Employee: John Smith
Pay Frequency: Biweekly
Pay Date: 2026-07-15
Gross Pay: $0.00
YTD Gross: $30,625.00
`,
  'ps_high_income.txt': `Northeast Freight LLC
Employee: John Smith
Pay Frequency: Biweekly
Pay Date: 2026-07-15
Gross Earnings: $15,000.00
YTD Earnings: $210,000.00
`,
  'ps_multiple_jobs.txt': `Northeast Freight LLC
Employee: John Smith
Pay Frequency: Biweekly
Pay Date: 2026-07-15
Gross Pay: $2,187.50
YTD Gross: $30,625.00

--- Second Job ---
Burger King
Employee: John Smith
Pay Frequency: Weekly
Pay Date: 2026-07-16
Gross Pay: $300.00
YTD Gross: $8,400.00
`,
  'ps_unicode_dollar.txt': `Northeast Freight LLC
Employee: John Smith
Pay Frequency: Biweekly
Pay Date: 2026-07-15
Gross Pay: ＄2,187.50
YTD Gross: ＄30,625.00
`,
  'ps_image_only.txt': `\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x04\x00\x00\x00\x03\x00\x08\x06\x00\x00\x00\x8a\x9d\x94\x00\x00\x00\x04sBIT\x08\x08\x08\x08|\x08\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\x19tEXtSoftware\x00www.inkscape.org\x9b\xee<\x1a\x00\x00\x08\x00IDATx\x9c\xed\xddw\x90`,

  // --- Benefit Letter Variants (10) ---
  'bl_ssdi.txt': `SOCIAL SECURITY ADMINISTRATION
Notice of Award
Beneficiary: John Smith
Program: Social Security Disability Insurance (SSDI)
Date of Entitlement: 2026-02-01
Monthly Payment: $1,250.00
Date of Letter: 2026-03-01
`,
  'bl_va_pension.txt': `DEPARTMENT OF VETERANS AFFAIRS
Award Letter
Name: John Smith
Benefit Type: Veterans Pension
Effective Date: 2026-01-01
Monthly Amount: $850.00
Letter Date: 2026-02-15
`,
  'bl_partial_ssi.txt': `SOCIAL SECURITY ADMINISTRATION
Supplemental Security Income (SSI)
Recipient: John Smith
Award Date: 2026-01-01
Monthly Benefit: $284.00
Date Issued: 2026-02-15
`,
  'bl_no_dates.txt': `SOCIAL SECURITY ADMINISTRATION
Recipient: John Smith
Benefit Type: SSI
Monthly Benefit Amount: $994.00
`,
  'bl_multiple_benefits.txt': `SOCIAL SECURITY ADMINISTRATION
Recipient: John Smith
Letter Date: 2026-02-15

Benefit Type: Social Security Retirement
Effective Date: 2026-01-01
Monthly Benefit Amount: $1,200.00

Benefit Type: SSI
Effective Date: 2026-01-01
Monthly Benefit Amount: $294.00
`,
  'bl_noisy_header.txt': `****************************************
*                                      *
*    SOCIAL SECURITY ADMINISTRATION    *
*        BENEFIT VERIFICATION          *
*                                      *
****************************************
Recipient: John Smith
Benefit Type: SSI
Monthly Benefit Amount: $994.00
Effective Date: 2026-01-01
Date of Letter: 2026-02-15
`,
  'bl_reversed_dates.txt': `SOCIAL SECURITY ADMINISTRATION
Recipient: John Smith
Benefit Type: SSI
Monthly Benefit Amount: $994.00
Effective Date: 2026-06-01
Date of Letter: 2026-02-15
`,
  'bl_non_benefit.txt': `SOCIAL SECURITY ADMINISTRATION
Recipient: John Smith
Letter Date: 2026-02-15
This is an informational notice regarding your Medicare Part B premium.
The premium will increase by $4.50 next month.
`,
  'bl_very_old.txt': `SOCIAL SECURITY ADMINISTRATION
Recipient: John Smith
Benefit Type: SSI
Monthly Benefit Amount: $914.00
Effective Date: 2023-01-01
Date of Letter: 2023-02-15
`,
  'bl_foreign_currency.txt': `SOCIAL SECURITY ADMINISTRATION
Recipient: John Smith
Benefit Type: SSI
Monthly Benefit Amount: €994.00
Effective Date: 2026-01-01
Date of Letter: 2026-02-15
`
};

const GOLD = {
  'ps_tabular.txt': {
    employer_name: { re: "Northeast Freight" }, employee_name: { re: "John Smith" },
    pay_frequency: { re: "Bi-weekly" }, pay_date: '2026-07-15',
    gross_pay_current: 2187.50, gross_pay_ytd: 30625.00
  },
  'ps_no_labels.txt': {
    employer_name: { re: "Acme Corp" }, employee_name: { re: "John Smith" },
    pay_frequency: { re: "Biweekly" }, pay_date: '2026-07-15',
    gross_pay_current: 2187.50, gross_pay_ytd: 30625.00
  },
  'ps_multiline_employer.txt': {
    employer_name: { re: "Northeast Freight" }, employee_name: { re: "John Smith" },
    pay_frequency: { re: "Biweekly" }, pay_date: '2026-07-15',
    gross_pay_current: 2187.50, gross_pay_ytd: 30625.00
  },
  'ps_extra_whitespace.txt': {
    employer_name: { re: "Northeast Freight" }, employee_name: { re: "John Smith" },
    pay_frequency: { re: "Biweekly" }, pay_date: '2026-07-15',
    gross_pay_current: 2187.50, gross_pay_ytd: 30625.00
  },
  'ps_comma_separated.txt': {
    employer_name: { re: "Northeast Freight" }, employee_name: { re: "John Smith" },
    pay_frequency: { re: "Biweekly" }, pay_date: '2026-07-15',
    gross_pay_current: 2187.50, gross_pay_ytd: 30625.00
  },
  'ps_reversed_date.txt': {
    employer_name: { re: "Northeast Freight" }, employee_name: { re: "John Smith" },
    pay_frequency: { re: "Biweekly" }, pay_date: '2026-07-15',
    gross_pay_current: 2187.50, gross_pay_ytd: 30625.00
  },
  'ps_lowercase.txt': {
    employer_name: { re: "northeast freight" }, employee_name: { re: "john smith" },
    pay_frequency: { re: "biweekly" }, pay_date: '2026-07-15',
    gross_pay_current: 2187.50, gross_pay_ytd: 30625.00
  },
  'ps_abbreviated.txt': {
    employer_name: { re: "Northeast Freight" }, employee_name: { re: "John Smith" },
    pay_frequency: { re: "BW" }, pay_date: '2026-07-15',
    gross_pay_current: 2187.50, gross_pay_ytd: 30625.00
  },
  'ps_net_only.txt': {
    employer_name: { re: "Northeast Freight" }, employee_name: { re: "John Smith" },
    pay_frequency: { re: "Biweekly" }, pay_date: '2026-07-15',
    gross_pay_current: null, gross_pay_ytd: null
  },
  'ps_missing_ytd.txt': {
    employer_name: { re: "Northeast Freight" }, employee_name: { re: "John Smith" },
    pay_frequency: { re: "Biweekly" }, pay_date: '2026-07-15',
    gross_pay_current: 2187.50, gross_pay_ytd: null
  },
  'ps_zero_gross.txt': {
    employer_name: { re: "Northeast Freight" }, employee_name: { re: "John Smith" },
    pay_frequency: { re: "Biweekly" }, pay_date: '2026-07-15',
    gross_pay_current: 0, gross_pay_ytd: 30625.00
  },
  'ps_high_income.txt': {
    employer_name: { re: "Northeast Freight" }, employee_name: { re: "John Smith" },
    pay_frequency: { re: "Biweekly" }, pay_date: '2026-07-15',
    gross_pay_current: 15000.00, gross_pay_ytd: 210000.00
  },
  'ps_multiple_jobs.txt': {
    employer_name: { re: "Northeast Freight" }, employee_name: { re: "John Smith" },
    pay_frequency: { re: "Biweekly" }, pay_date: '2026-07-15',
    gross_pay_current: 2187.50, gross_pay_ytd: 30625.00
  },
  'ps_unicode_dollar.txt': {
    employer_name: { re: "Northeast Freight" }, employee_name: { re: "John Smith" },
    pay_frequency: { re: "Biweekly" }, pay_date: '2026-07-15',
    gross_pay_current: 2187.50, gross_pay_ytd: 30625.00
  },
  'ps_image_only.txt': null,

  'bl_ssdi.txt': {
    recipient_name: { re: "John Smith" }, benefit_type: { re: "Social Security Disability Insurance" },
    monthly_benefit_amount: 1250.00, award_effective_date: '2026-02-01', letter_date: '2026-03-01'
  },
  'bl_va_pension.txt': {
    recipient_name: { re: "John Smith" }, benefit_type: { re: "Veterans Pension" },
    monthly_benefit_amount: 850.00, award_effective_date: '2026-01-01', letter_date: '2026-02-15'
  },
  'bl_partial_ssi.txt': {
    recipient_name: { re: "John Smith" }, benefit_type: { re: "Supplemental Security Income" },
    monthly_benefit_amount: 284.00, award_effective_date: '2026-01-01', letter_date: '2026-02-15'
  },
  'bl_no_dates.txt': {
    recipient_name: { re: "John Smith" }, benefit_type: { re: "SSI" },
    monthly_benefit_amount: 994.00, award_effective_date: null, letter_date: null
  },
  'bl_multiple_benefits.txt': {
    recipient_name: { re: "John Smith" }, benefit_type: { re: "Social Security Retirement" },
    monthly_benefit_amount: 1200.00, award_effective_date: '2026-01-01', letter_date: '2026-02-15'
  },
  'bl_noisy_header.txt': {
    recipient_name: { re: "John Smith" }, benefit_type: { re: "SSI" },
    monthly_benefit_amount: 994.00, award_effective_date: '2026-01-01', letter_date: '2026-02-15'
  },
  'bl_reversed_dates.txt': {
    recipient_name: { re: "John Smith" }, benefit_type: { re: "SSI" },
    monthly_benefit_amount: 994.00, award_effective_date: '2026-06-01', letter_date: '2026-02-15'
  },
  'bl_non_benefit.txt': null,
  'bl_very_old.txt': {
    recipient_name: { re: "John Smith" }, benefit_type: { re: "SSI" },
    monthly_benefit_amount: 914.00, award_effective_date: '2023-01-01', letter_date: '2023-02-15'
  },
  'bl_foreign_currency.txt': {
    recipient_name: { re: "John Smith" }, benefit_type: { re: "SSI" },
    monthly_benefit_amount: null, award_effective_date: '2026-01-01', letter_date: '2026-02-15'
  }
};

for (const [filename, content] of Object.entries(DOCS)) {
  fs.writeFileSync(path.join(STRESS_DIR, filename), content);
}
fs.writeFileSync(path.join(__dirname, '../test/stress-gold.json'), JSON.stringify(GOLD, null, 2));
console.log('Stress corpus generated.');
