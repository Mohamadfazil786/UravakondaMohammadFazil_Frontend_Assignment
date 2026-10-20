# K&I Wealth Tech - Frontend Assessment

This project is a simple, human-readable financial opportunity discovery interface built from the provided dataset in `src/data/opportunities.csv`.

## Objective

The app helps a customer discover Loan Against Securities (LAS) opportunities by:
- entering amount, tenure, risk preference and security type
- searching and sorting opportunities
- viewing details
- comparing 2–3 opportunities
- checking eligibility and understanding reasons
- handling loading, empty, retry and validation states

## Dataset and API contract

The data used for the app is the exact dataset supplied in the assessment package:
- `src/data/opportunities.csv`

The mock API follows the expected contract in the assessment package:
- `GET /api/opportunities`
- `GET /api/opportunities/{id}`
- `POST /api/eligibility/check`
- `POST /api/compare`

## Project structure

- `src/` – app source files
- `src/data/opportunities.csv` – supplied dataset
- `src/lib/opportunityApi.js` – mock service layer that reads the CSV and exposes mock endpoints
- `src/App.jsx` – UI and state management
- `src/styles.css` – responsive styling
- `tests/` – meaningful UI and utility tests

## Setup and run

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Production build

```bash
npm run build
```

## Tests

```bash
npm test
```

## Architecture notes

This app keeps the logic in a simple service layer rather than putting all data logic directly inside the UI component. The mock API layer reads the CSV and applies filters/sorts/eligibility checks before returning data to the UI. This keeps the UI simpler and easier to explain and maintain.

## Assumptions

- The dataset is fictional and is meant only for assessment/demo purposes.
- The app uses a mock service rather than a live backend API.
- Comparison is limited to 2–3 opportunities to match the assessment requirement.
- Eligibility result is heuristic and uses the fictional risk and amount data provided in the dataset.

## Notes

This project is intentionally simple, readable and production-style without being overly complex. It is designed to be easier for human reviewers to explain and understand.

## Submission ZIP

Create the submission archive from the project root with:

```powershell
$staging = "CandidateName_Frontend_Assignment"
New-Item -ItemType Directory -Path $staging -Force
Copy-Item src,tests,index.html,package.json,package-lock.json,vite.config.js,README.md,.gitignore -Destination $staging -Recurse
Compress-Archive -Path $staging -DestinationPath CandidateName_Frontend_Assignment.zip -Force
Remove-Item $staging -Recurse -Force
```

The archive should not include `node_modules/` or `dist/`.
