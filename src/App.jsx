import { useEffect, useMemo, useState } from 'react';
import { checkEligibility, compareOpportunities, getOpportunityById, getOpportunities } from './lib/opportunityApi';

const defaultFilters = {
  amount: '750000',
  tenure: '24',
  risk: 'Any',
  securityType: 'LAS',
  search: ''
};

const sortOptions = [
  { value: 'rate_asc', label: 'Lowest rate' },
  { value: 'fee_asc', label: 'Lowest fee' },
  { value: 'max_amount_desc', label: 'Highest max amount' },
  { value: 'provider_asc', label: 'Provider name' }
];

function App() {
  const [filters, setFilters] = useState(defaultFilters);
  const [sort, setSort] = useState('rate_asc');
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOpportunityIds, setSelectedOpportunityIds] = useState([]);
  const [selectedOpportunityById, setSelectedOpportunityById] = useState({});
  const [selectedDetailId, setSelectedDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonItems, setComparisonItems] = useState([]);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');

  const limit = 6;

  const loadOpportunities = async (nextFilters = filters, nextSort = sort, nextPage = page) => {
    const amount = Number(nextFilters.amount);
    const tenure = Number(nextFilters.tenure);

    if (nextFilters.amount && (!Number.isFinite(amount) || amount <= 0)) {
      setFormError('Please enter a valid amount greater than zero.');
      setLoading(false);
      return;
    }

    if (nextFilters.tenure && (!Number.isFinite(tenure) || tenure <= 0)) {
      setFormError('Please enter a valid tenure greater than zero.');
      setLoading(false);
      return;
    }

    setFormError('');
    setActionError('');
    setLoading(true);
    setError(null);

    try {
      const response = await getOpportunities({
        amount: nextFilters.amount,
        tenure: nextFilters.tenure,
        risk: nextFilters.risk,
        search: nextFilters.search,
        sort: nextSort,
        page: nextPage,
        limit
      });
      setResults(response.items);
      setPage(response.page);
    } catch (err) {
      setError('Could not load opportunities. Please retry.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, []);

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    loadOpportunities(filters, sort, 1);
  };

  const handleInputChange = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const handleRetry = () => {
    loadOpportunities();
  };

  const handleSortChange = (nextSort) => {
    setSort(nextSort);
    loadOpportunities(filters, nextSort, 1);
  };

  const selectedOpportunities = useMemo(
    () => selectedOpportunityIds.map((id) => selectedOpportunityById[id]).filter(Boolean),
    [selectedOpportunityById, selectedOpportunityIds]
  );

  const toggleOpportunitySelection = (opportunity) => {
    const id = opportunity.Opportunity_ID;
    if (selectedOpportunityIds.includes(id)) {
      setSelectedOpportunityIds((current) => current.filter((value) => value !== id));
      setSelectedOpportunityById((items) => {
        const nextItems = { ...items };
        delete nextItems[id];
        return nextItems;
      });
      return;
    }

    if (selectedOpportunityIds.length >= 3) {
      return;
    }

    setSelectedOpportunityIds((current) => [...current, id]);
    setSelectedOpportunityById((items) => ({ ...items, [id]: opportunity }));
  };

  const openOpportunityDetail = async (id) => {
    setActionError('');
    setSelectedDetailId(id);
    try {
      const item = await getOpportunityById(id);
      if (!item) {
        throw new Error('Opportunity details were not found.');
      }
      setDetail(item);
    } catch (err) {
      setDetail(null);
      setActionError('Could not load opportunity details. Please try again.');
    }
  };

  const handleEligibilityCheck = async (opportunity) => {
    setActionError('');
    const payload = {
      opportunity_id: opportunity.Opportunity_ID,
      amount: filters.amount,
      tenure: filters.tenure,
      risk: filters.risk,
      security_type: filters.securityType
    };

    try {
      const result = await checkEligibility(payload);
      setEligibility({ opportunity, ...result });
    } catch (err) {
      setEligibility(null);
      setActionError('Could not check eligibility. Please try again.');
    }
  };

  const openComparison = async () => {
    setActionError('');
    try {
      const items = await compareOpportunities({ opportunity_ids: selectedOpportunityIds });
      if (items.length < 2) {
        throw new Error('At least two opportunities are required for comparison.');
      }
      setComparisonItems(items);
      setComparisonOpen(true);
    } catch (err) {
      setComparisonOpen(false);
      setActionError('Could not load the comparison. Please select two or more opportunities and try again.');
    }
  };

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">K&I Wealth Tech</p>
          <h1>Financial Opportunity Discovery</h1>
        </div>
      </header>

      <main className="app-shell">
        <section className="panel form-panel">
          <h2>Discover opportunities</h2>

          <form onSubmit={handleFilterSubmit} className="filter-form">
            <label>
              Amount (INR)
              <input
                type="number"
                name="amount"
                value={filters.amount}
                onChange={(event) => handleInputChange('amount', event.target.value)}
              />
            </label>

            <label>
              Tenure (months)
              <input
                type="number"
                name="tenure"
                value={filters.tenure}
                onChange={(event) => handleInputChange('tenure', event.target.value)}
              />
            </label>

            <label>
              Risk preference
              <select
                value={filters.risk}
                onChange={(event) => handleInputChange('risk', event.target.value)}
              >
                <option value="Any">Any</option>
                <option value="Moderate">Moderate</option>
                <option value="Moderately High">Moderately High</option>
                <option value="High">High</option>
              </select>
            </label>

            <label>
              Security type
              <select
                value={filters.securityType}
                onChange={(event) => handleInputChange('securityType', event.target.value)}
              >
                <option value="LAS">LAS</option>
                <option value="Mutual Fund">Mutual Fund</option>
                <option value="Equity">Equity</option>
              </select>
            </label>

            <label>
              Search provider or product
              <input
                type="search"
                value={filters.search}
                onChange={(event) => handleInputChange('search', event.target.value)}
                placeholder="Search provider or product"
              />
            </label>

            {formError ? <p className="inline-error">{formError}</p> : null}

            <div className="button-row">
              <button type="submit" className="primary-button">Search opportunities</button>
            </div>
          </form>
        </section>

        <section className="panel list-panel">
          <div className="list-header">
            <h2>Matching opportunities</h2>
            <label className="sort-box">
              Sort by
              <select value={sort} onChange={(event) => handleSortChange(event.target.value)}>
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          {actionError ? (
            <div className="state-card error-card" role="alert">
              <p>{actionError}</p>
              <button className="secondary-button" onClick={() => setActionError('')} type="button">Dismiss</button>
            </div>
          ) : null}

          {error ? (
            <div className="state-card error-card">
              <p>{error}</p>
              <button className="secondary-button" onClick={handleRetry} type="button">Retry</button>
            </div>
          ) : null}

          {loading && !error ? (
            <div className="skeleton-grid" aria-live="polite">
              {[1, 2, 3].map((item) => (
                <div className="skeleton-card" key={item} />
              ))}
            </div>
          ) : null}

          {!loading && !error && results.length === 0 ? (
            <div className="state-card empty-card">
              <h3>No matching opportunities</h3>
              <p>Try adjusting the amount, tenure, risk preference or search text.</p>
            </div>
          ) : null}

          {!loading && !error && results.length > 0 ? (
            <div className="opportunity-grid">
              {results.map((opportunity) => {
                const isSelected = selectedOpportunityIds.includes(opportunity.Opportunity_ID);
                return (
                  <article className="card" key={opportunity.Opportunity_ID}>
                    <div className="card-header">
                      <div>
                        <p className="card-provider">{opportunity.Provider}</p>
                        <h3>{opportunity.Product}</h3>
                      </div>
                      <span className="pill">{opportunity.Risk_Profile}</span>
                    </div>

                    <div className="metrics">
                      <div>
                        <span>Rate</span>
                        <strong>{opportunity.Interest_Rate}%</strong>
                      </div>
                      <div>
                        <span>Amount</span>
                        <strong>₹{Intl.NumberFormat('en-IN').format(opportunity.Minimum_Amount_INR)} - ₹{Intl.NumberFormat('en-IN').format(opportunity.Maximum_Amount_INR)}</strong>
                      </div>
                      <div>
                        <span>Tenure</span>
                        <strong>{opportunity.Tenure_Months} months</strong>
                      </div>
                    </div>

                    <div className="card-row small-row">
                      <span>LTV</span>
                      <strong>{opportunity.LTV}%</strong>
                    </div>
                    <div className="card-row small-row">
                      <span>Processing fee</span>
                      <strong>{opportunity.Processing_Fee}%</strong>
                    </div>

                    <div className="card-actions">
                      <button type="button" className="secondary-button" onClick={() => openOpportunityDetail(opportunity.Opportunity_ID)}>
                        View details
                      </button>
                      <button
                        type="button"
                        className={isSelected ? 'selected-button' : 'primary-button'}
                        onClick={() => toggleOpportunitySelection(opportunity)}
                        disabled={selectedOpportunityIds.length >= 3 && !isSelected}
                      >
                        {isSelected ? 'Selected' : 'Compare'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          <div className="comparison-box">
            <div className="comparison-title-row">
              <h3>Comparison shortlist</h3>
              <button type="button" className="secondary-button" onClick={openComparison} disabled={selectedOpportunities.length < 2}>
                Compare now
              </button>
            </div>

            {selectedOpportunities.length === 0 ? (
              <p>Select 2–3 opportunities to compare.</p>
            ) : (
              <ul className="mini-list">
                {selectedOpportunities.map((opportunity) => (
                  <li key={opportunity.Opportunity_ID}>{opportunity.Provider} • {opportunity.Product}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      {comparisonOpen && comparisonItems.length > 0 ? (
        <div className="modal-backdrop" onClick={() => setComparisonOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Opportunity comparison</h3>
              <button type="button" className="close-button" onClick={() => setComparisonOpen(false)}>x</button>
            </div>

            <div className="compare-grid">
              {comparisonItems.map((opportunity) => (
                <div key={opportunity.Opportunity_ID} className="compare-item">
                  <h4>{opportunity.Provider}</h4>
                  <p>{opportunity.Product}</p>
                  <ul>
                    <li>Rate: {opportunity.Interest_Rate}%</li>
                    <li>Amount: ₹{Intl.NumberFormat('en-IN').format(opportunity.Minimum_Amount_INR)} - ₹{Intl.NumberFormat('en-IN').format(opportunity.Maximum_Amount_INR)}</li>
                    <li>Tenure: {opportunity.Tenure_Months} months</li>
                    <li>LTV: {opportunity.LTV}%</li>
                    <li>Fee: {opportunity.Processing_Fee}%</li>
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {detail ? (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="modal-card detail-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{detail.Provider} • {detail.Product}</h3>
              <button type="button" className="close-button" onClick={() => setDetail(null)}>x</button>
            </div>

            <div className="detail-grid">
              <div>
                <p><strong>Opportunity ID:</strong> {detail.Opportunity_ID}</p>
                <p><strong>Interest rate:</strong> {detail.Interest_Rate}%</p>
                <p><strong>Amount range:</strong> ₹{Intl.NumberFormat('en-IN').format(detail.Minimum_Amount_INR)} - ₹{Intl.NumberFormat('en-IN').format(detail.Maximum_Amount_INR)}</p>
                <p><strong>Tenure:</strong> {detail.Tenure_Months} months</p>
                <p><strong>LTV:</strong> {detail.LTV}%</p>
                <p><strong>Processing fee:</strong> {detail.Processing_Fee}%</p>
              </div>

              <div className="eligibility-box">
                <button type="button" className="primary-button" onClick={() => handleEligibilityCheck(detail)}>
                  Check eligibility
                </button>

                {eligibility && eligibility.opportunity.Opportunity_ID === detail.Opportunity_ID ? (
                  <div className={`eligibility-result ${eligibility.status}`}>
                    <h4>{eligibility.status.toUpperCase()}</h4>
                    <ul>
                      {eligibility.reasons.length > 0 ? eligibility.reasons.map((reason) => <li key={reason}>{reason}</li>) : <li>No reasons were flagged.</li>}
                    </ul>
                    <p><strong>Max supported amount:</strong> ₹{Intl.NumberFormat('en-IN').format(eligibility.max_supported_amount)}</p>
                    <p><strong>Next action:</strong> {eligibility.next_action}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default App;
