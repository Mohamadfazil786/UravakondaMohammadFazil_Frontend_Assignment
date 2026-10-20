import csvData from '../data/opportunities.csv?raw';

const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => value.trim());
};

const parseOpportunity = (row) => {
  const min = Number(String(row.Minimum_Amount_INR || '0').replace(/,/g, ''));
  const max = Number(String(row.Maximum_Amount_INR || '0').replace(/,/g, ''));
  const interest = Number(String(row.Interest_Rate || '0').replace('%', ''));
  const processingFee = Number(String(row.Processing_Fee || '0').replace('%', ''));
  const tenureRange = String(row.Tenure_Months || '0-0').split('-').map(Number);

  return {
    ...row,
    Minimum_Amount_INR: min,
    Maximum_Amount_INR: max,
    Interest_Rate: interest,
    Processing_Fee: processingFee,
    Tenure_Min_Months: tenureRange[0],
    Tenure_Max_Months: tenureRange[1],
    LTV: Number(String(row.LTV || '0').replace('%', ''))
  };
};

const parseCsvData = () => {
  const lines = csvData.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return parseOpportunity(row);
  });
};

const opportunities = parseCsvData();

const parseTenure = (tenureValue) => {
  const raw = String(tenureValue || '0-0');
  const parts = raw.split('-').map((part) => Number(part.trim()));
  return {
    min: parts[0] || 0,
    max: parts[1] || parts[0] || 0
  };
};

const sortOptions = {
  rate_asc: (a, b) => a.Interest_Rate - b.Interest_Rate,
  fee_asc: (a, b) => a.Processing_Fee - b.Processing_Fee,
  max_amount_desc: (a, b) => b.Maximum_Amount_INR - a.Maximum_Amount_INR,
  provider_asc: (a, b) => a.Provider.localeCompare(b.Provider)
};

export const getOpportunities = async ({
  amount,
  tenure,
  risk,
  search,
  sort = 'rate_asc',
  page = 1,
  limit = 6
}) => {
  const parsedAmount = Number(amount);
  const parsedTenure = Number(tenure);

  let filtered = opportunities.filter((opportunity) => {
    const amountMatches = !Number.isFinite(parsedAmount)
      || (parsedAmount >= opportunity.Minimum_Amount_INR && parsedAmount <= opportunity.Maximum_Amount_INR);

    const tenureMatches = !Number.isFinite(parsedTenure)
      || (() => {
        const range = parseTenure(opportunity.Tenure_Months);
        return parsedTenure >= range.min && parsedTenure <= range.max;
      })();

    const riskMatches = !risk || risk === 'Any' || opportunity.Risk_Profile === risk;

    const searchMatches = !search || `${opportunity.Provider} ${opportunity.Product}`
      .toLowerCase()
      .includes(search.toLowerCase());

    return amountMatches && tenureMatches && riskMatches && searchMatches;
  });

  filtered = filtered.sort(sortOptions[sort] || sortOptions.rate_asc);

  const total = filtered.length;
  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    items: filtered.slice(start, end),
    total,
    page,
    limit
  };
};

export const getOpportunityById = async (id) => {
  const result = opportunities.find((opportunity) => opportunity.Opportunity_ID === id);
  return result || null;
};

export const compareOpportunities = async ({ opportunity_ids }) => (
  opportunity_ids
    .map((id) => opportunities.find((opportunity) => opportunity.Opportunity_ID === id))
    .filter(Boolean)
);

export const checkEligibility = async ({
  opportunity_id,
  amount,
  tenure,
  risk,
  security_type
}) => {
  const opportunity = opportunities.find((item) => item.Opportunity_ID === opportunity_id);

  if (!opportunity) {
    return {
      status: 'not_eligible',
      reasons: ['Opportunity not found.'],
      max_supported_amount: 0
    };
  }

  const requestedAmount = Number(amount);
  const requestedTenure = Number(tenure);
  const range = parseTenure(opportunity.Tenure_Months);
  const reasons = [];

  if (requestedAmount < opportunity.Minimum_Amount_INR) {
    reasons.push('Requested amount is below the minimum supported amount.');
  }

  if (requestedAmount > opportunity.Maximum_Amount_INR) {
    reasons.push('Requested amount is above the maximum supported amount.');
  }

  if (requestedTenure < range.min || requestedTenure > range.max) {
    reasons.push('Requested tenure is outside the supported range for this opportunity.');
  }

  if (security_type && security_type !== 'LAS') {
    reasons.push('This product is tailored for LAS security type only.');
  }

  if (risk && risk === 'Low' && opportunity.Risk_Profile === 'High') {
    reasons.push('This opportunity is better suited for a higher risk profile.');
  }

  const tooCloseToLimit = requestedAmount > opportunity.Maximum_Amount_INR * 0.85;
  const isConditional = reasons.length > 0 && !reasons.some((reason) => reason.includes('above the maximum') || reason.includes('below the minimum') || reason.includes('outside the supported range')) && (tooCloseToLimit || (risk && risk !== 'Any'));

  let status = 'eligible';
  if (reasons.length > 0) {
    status = isConditional ? 'conditional' : 'not_eligible';
  }

  return {
    status,
    reasons,
    max_supported_amount: opportunity.Maximum_Amount_INR,
    next_action: status === 'eligible'
      ? 'Proceed with application and document collection.'
      : status === 'conditional'
        ? 'Review the conditions with the advisor and prepare supporting documents.'
        : 'Consider a lower amount or different tenure before reapplying.'
  };
};
