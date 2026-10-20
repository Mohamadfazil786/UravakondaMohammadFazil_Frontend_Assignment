import { describe, expect, it } from 'vitest';
import { compareOpportunities, getOpportunities } from '../src/lib/opportunityApi';

describe('Opportunity API mock', () => {
  it('filters opportunities by requested amount and tenure', async () => {
    const result = await getOpportunities({
      amount: 2000000,
      tenure: 24,
      risk: 'Any',
      search: '',
      sort: 'rate_asc',
      page: 1,
      limit: 20
    });

    expect(result.total).toBeGreaterThan(0);
    expect(result.items.every((item) => item.Minimum_Amount_INR <= 2000000)).toBe(true);
    expect(result.items.every((item) => item.Maximum_Amount_INR >= 2000000)).toBe(true);
  });

  it('returns empty results when no opportunity matches the filter', async () => {
    const result = await getOpportunities({
      amount: 200,
      tenure: 12,
      risk: 'Any',
      search: '',
      sort: 'rate_asc',
      page: 1,
      limit: 20
    });

    expect(result.total).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it('returns comparison-ready data for selected opportunity IDs', async () => {
    const result = await compareOpportunities({ opportunity_ids: ['OPP-1001', 'OPP-1004'] });

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.Opportunity_ID)).toEqual(['OPP-1001', 'OPP-1004']);
  });
});
