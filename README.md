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

---

## 11. Getting Started & Installation

### Prerequisites

Ensure you have installed:

- **Node.js** (v16 or higher): https://nodejs.org/
- **npm** (comes with Node.js)
- **MetaMask Browser Extension** (optional, for production testing)

### Step 1: Clone the Repository

```bash
git clone https://github.com/PrithviKiran791/Blockchain_blood_donation-.git
cd Blockchain_blood_donation-
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs:
- Hardhat (local blockchain framework)
- ethers.js (Web3 library)
- All required dependencies

### Step 3: Start the Local Hardhat Blockchain Node

In a **new terminal window**, run:

```bash
npm run node
```

**Expected output:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
Accounts:
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
0x70997970C51812e339D9B73b0245ad59ca3534E5 (10000 ETH)
...
```

**Keep this terminal running** (do not close). The blockchain will stay active on port 8545.

### Step 4: Compile the Smart Contract

In a **new terminal window**, run:

```bash
npm run compile
```

**Expected output:**
```
Compiled 1 Solidity file successfully (evm target: paris).
```

### Step 5: Deploy the Smart Contract

In the **same terminal**, run:

```bash
npm run deploy
```

**Expected output:**
```
🩸 Deploying EmergBlood contract...

📋 Deployer (Admin): 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
💰 Balance: 9999.996126489666015625 ETH

═══════════════════════════════════════════════════════════════════
✅ EmergBlood deployed successfully!
📍 Contract Address: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
👑 Admin Address:    0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
═══════════════════════════════════════════════════════════════════
```

**⚠️ Save the Contract Address** (you'll need it in Step 7).

### Step 6: Open the Frontend

Open the HTML file in your browser:

**Windows (PowerShell):**
```bash
Start-Process ".\emergblood.html"
```

**macOS (Terminal):**
```bash
open emergblood.html
```

**Linux (Terminal):**
```bash
xdg-open emergblood.html
```

Or manually navigate to:
```
file:///C:/Users/prith/Desktop/My Projects/Blockchain/emergblood.html
```

### Step 7: Connect Wallet & Smart Contract

1. **Click the "Connect Wallet" button** in the top-right corner
   - If MetaMask is installed, it will prompt you to connect
   - If not, it auto-connects to the local Hardhat RPC (http://127.0.0.1:8545)

2. **A red banner appears**: "Connect to Smart Contract"
   - Paste the **Contract Address** from Step 5 into the text field
   - Click **"Connect Contract"**

3. **You should see the Dashboard** with:
   - 0 Registered Donors
   - 0 Blood Units
   - 0 Emergency Requests
   - 0 Successful Matches

### Step 8: Test the Application

#### Register as a Donor:

1. Click **"Register Donor"** tab
2. Fill in:
   - Full Name: `John Doe`
   - Blood Type: `O+`
   - Location: `New York`
3. Click **"Register on Blockchain"**
4. A transaction will be sent
5. Check the Dashboard - **"Registered Donors" should now be 1**

#### Register a Blood Unit (Admin Only):

1. Click **"Blood Units"** tab
2. Fill in:
   - Donor Wallet Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (from Step 5)
   - Blood Type: `O+`
   - QR Code Hash: (leave empty or enter any text)
3. Click **"Register Blood Unit"**
4. Dashboard will update - **"Blood Units" should now be 1**

#### Post an Emergency Request:

1. Click **"Emergency"** tab
2. Fill in:
   - Hospital Name: `City General Hospital`
   - Blood Type Needed: `O+`
   - Units Needed: `2`
   - Validity Period: `4` hours
3. Click **"Post Emergency Request"**
4. Dashboard will update - **"Emergency Requests" should now be 1**
5. You'll see a countdown timer 

#### Match Blood to Request (Admin Only):

1. Click **"Match Blood"** tab
2. Select:
   - Emergency Request: The hospital request you just created
   - Blood Unit: The O+ unit you registered
3. Click **"Match & Reward Donor"**
4. If successful:
   - Request progress increases
   - Donor earns reward points
   - Dashboard counts update
   - Transaction appears in log

#### View Your Profile:

1. Click **"My Profile"** tab
2. You'll see:
   - Your donor information
   - Blood type
   - Location
   - Reward points earned
   - Wallet address

---

## 12. Command Reference

| Command | Purpose |
|---------|---------|
| `npm install` | Install all dependencies |
| `npm run node` | Start local Hardhat blockchain |
| `npm run compile` | Compile Solidity smart contract |
| `npm run deploy` | Deploy contract to local blockchain |

---

## 13. Troubleshooting

### Issue: "Failed to connect to contract"

**Solution:**
- Ensure Hardhat node is running (`npm run node`)
- Verify the contract address is correct
- Check that MetaMask is connected to localhost chain ID 31337

To switch MetaMask manually:
1. Open MetaMask
2. Click network dropdown
3. Click "Add Network"
4. Fill in:
   - Network Name: `Hardhat Localhost`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency: `ETH`

### Issue: Port 8545 Already in Use

**Solution:**
```bash
# Find process using port 8545
netstat -ano | findstr :8545

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Try running node again
npm run node
```

### Issue: "Quantity must be greater than 0"

**Solution:** Ensure all numeric fields have values > 0

### Issue: "You must be a registered donor"

**Solution:** Register as a donor first via the "Register Donor" tab

### Issue: Transactions Not Appearing

**Solution:**
- Ensure you're connected to the correct contract
- Check browser console (F12) for error messages
- Refresh the page and reconnect

---

## 14. Project Structure

```
Blockchain_blood_donation-/
├── contracts/
│   └── EmergBlood.sol              (Smart contract source)
├── scripts/
│   └── deploy.js                   (Deployment script)
├── icons/                          (UI icon images)
├── artifacts/                      (Compiled contract artifacts)
├── app.js                          (Frontend application logic)
├── emergblood.html                 (HTML structure)
├── styles.css                      (Red & black theme styling)
├── hardhat.config.js               (Hardhat configuration)
├── package.json                    (Project dependencies)
├── README.md                       (This file)
└── .gitignore                      (Git ignore rules)
```

---

## 15. Key Features Checklist

- ✅ Donor registration with blockchain storage
- ✅ Blood unit lifecycle tracking (42-day expiry)
- ✅ Emergency request posting with countdown timers
- ✅ Admin-controlled blood matching workflow
- ✅ Donor reward points system
- ✅ Real-time dashboard with statistics
- ✅ Transaction logging
- ✅ Red & black modern UI theme
- ✅ MetaMask wallet integration
- ✅ Hardhat local blockchain support
