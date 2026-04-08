# EmergBlood: Blockchain-Based Emergency Blood Donation Network

## Research Paper Reference

This project is aligned with the research direction documented in the included paper:

- csit140501.pdf (available in the project root)

The architecture, workflow, and impact discussion in this README are written to reflect that research context and its practical blockchain implementation.

## 1. Research Background

EmergBlood is a practical implementation of a research-driven idea: using blockchain to improve traceability, transparency, and trust in blood supply chain management.

The core concept aligns with recent academic work on blood chain digitization, including the approach referenced in the smart contract comments:

- Dina Aljuhani et al. (2024), focused on traceability in blood supply chain workflows

This project translates research concepts into a working decentralized application (dApp) with:

- Donor registration on-chain
- Blood unit lifecycle tracking
- Emergency request posting with time limits
- Controlled blood matching workflow
- Donor reward points for participation

## 2. Problem Statement

Traditional blood donation systems often face these issues:

- Fragmented records across hospitals and blood banks
- Limited end-to-end traceability of blood units
- Delays in emergency matching
- Weak trust due to mutable centralized records
- Low donor motivation over time

EmergBlood addresses these by recording high-value events on Ethereum-compatible blockchain infrastructure.

## 3. System Overview

### 3.1 Technology Stack

- Smart Contract: Solidity (`0.8.20`)
- Local Blockchain: Hardhat
- Web Frontend: HTML, CSS, JavaScript
- Web3 Library: ethers.js (v6)
- Wallet Integration: MetaMask (or Hardhat local provider fallback)

### 3.2 Core Components

- `contracts/EmergBlood.sol`: Business logic and immutable state
- `scripts/deploy.js`: Contract deployment script
- `app.js`: Frontend-to-contract interaction layer
- `emergblood.html`: User interface structure
- `styles.css`: UI styling/theme

## 4. Data Model (On-Chain)

### 4.1 Donor

Each donor record contains:

- Wallet address
- Name
- Blood type
- Location
- Reward points
- Registration status
- Registration timestamp

### 4.2 Blood Unit

Each blood unit record contains:

- Unit ID
- Donor address
- Blood type
- Donation date
- Expiry date
- QR code hash (traceability reference)
- Availability status
- Expiry status

### 4.3 Emergency Request

Each request contains:

- Request ID
- Requesting hospital address
- Hospital name
- Required blood type
- Quantity needed
- Quantity fulfilled
- Deadline
- Active status
- Creation timestamp

## 5. Entire Working of the Application (End-to-End)

### Step 1: Node and Contract Setup

1. Start local Hardhat blockchain.
2. Compile and deploy `EmergBlood.sol`.
3. Copy deployed contract address.
4. Connect frontend to that address.

### Step 2: Wallet Connection

1. User opens frontend.
2. App connects to MetaMask (preferred) or local RPC fallback.
3. App checks network and initializes signer/provider.
4. Contract instance is created with ABI + deployed address.

### Step 3: Donor Registration

1. Donor enters name, blood type, and location.
2. Frontend calls `registerDonor(...)`.
3. Contract validates blood type and duplicate registration.
4. Donor is stored in mapping and donor list.
5. `DonorRegistered` event is emitted.

### Step 4: Blood Unit Registration (Admin)

1. Admin enters donor address, blood type, QR hash.
2. Frontend calls `registerBloodUnit(...)`.
3. Contract verifies donor exists and admin permissions.
4. Expiry date is auto-calculated (42-day shelf life logic).
5. Unit is marked available and stored on-chain.
6. `BloodUnitRegistered` event is emitted.

### Step 5: Emergency Request Posting

1. Hospital/operator enters hospital name, blood type, quantity, validity hours.
2. Frontend calls `postEmergencyRequest(...)`.
3. Contract validates inputs and sets request deadline.
4. Request is marked active with fulfillment counter initialized.
5. `EmergencyRequestPosted` event is emitted.

### Step 6: Matching Blood to Requests (Admin)

1. Admin selects request ID and blood unit ID.
2. Frontend calls `matchBlood(requestId, unitId)`.
3. Contract enforces:
   - Request exists and is active
   - Request not expired
   - Unit exists and is available
   - Unit not expired
   - Blood type match
4. On success:
   - Unit becomes unavailable
   - Request fulfillment increases
   - Request closes if fulfilled
   - Donor receives reward points
5. Events emitted:
   - `BloodMatched`
   - `RewardPointsEarned`

### Step 7: Dashboard and Monitoring

The frontend continuously loads and displays:

- Total donors
- Total blood units
- Total emergency requests
- Total successful matches
- Requests list with countdown timer
- Blood units list with status
- Donor profile and reward points

## 6. Security and Validation Logic

The contract includes key safeguards:

- `onlyAdmin` modifier for restricted actions
- Blood type validation guard
- Request and unit bounds checks
- Expiry and activity checks before matching
- Prevention of duplicate donor registration

These checks reduce invalid transactions and increase operational reliability.

## 7. Real-World Impact

### 7.1 Healthcare Operations

- Faster emergency response through structured request/match workflow
- Better inventory awareness (available vs expired units)
- Reduced manual reconciliation effort between stakeholders

### 7.2 Transparency and Trust

- Immutable audit trails for key blood supply events
- Shared source of truth across hospitals, blood banks, and administrators
- Greater confidence in data integrity for compliance and audits

### 7.3 Donor Engagement

- Reward points model encourages repeat participation
- Better visibility of contribution impact can strengthen donor retention

### 7.4 Public Health Resilience

- Improved coordination in high-demand periods
- Potential reduction in avoidable delays for transfusion-critical cases

## 8. Practical Limitations and Deployment Considerations

For production use, additional work is required:

- Privacy controls for sensitive health data (off-chain + encrypted references)
- Role governance model across multiple institutions
- Interoperability with hospital information systems
- Gas-cost optimization and scaling strategy
- Regulatory alignment (healthcare, data protection, medical logistics)

## 9. Future Enhancements

- Cross-hospital matching network
- AI-assisted demand prediction and inventory forecasting
- Mobile app interfaces for donors and hospitals
- Tokenized and policy-aware incentive mechanisms
- Geolocation-based nearest compatible donor/bank suggestion

## 10. Conclusion

EmergBlood demonstrates how blockchain can operationalize research ideas in blood supply chain management. By combining on-chain traceability, emergency workflows, and donor incentives, the system shows a practical path toward more transparent and responsive blood donation ecosystems with meaningful real-world healthcare impact.
