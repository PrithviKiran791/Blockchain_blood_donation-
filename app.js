// ═══════════════════════════════════════════════════════════════════
// EmergBlood – Frontend Application Logic
// Connects to EmergBlood.sol via ethers.js (MetaMask or Hardhat)
// ═══════════════════════════════════════════════════════════════════

// ── Contract ABI ──
const CONTRACT_ABI = [
  "function admin() view returns (address)",
  "function registerDonor(string _name, string _bloodType, string _location)",
  "function registerBloodUnit(address _donorAddress, string _bloodType, string _qrCodeHash)",
  "function postEmergencyRequest(string _hospitalName, string _bloodType, uint256 _quantity, uint256 _validityHours)",
  "function matchBlood(uint256 _requestId, uint256 _unitId)",
  "function getDonorInfo(address _donor) view returns (string name, string bloodType, string location, uint256 rewardPoints, bool isRegistered, uint256 registeredAt)",
  "function getBloodUnit(uint256 _unitId) view returns (uint256 unitId, address donorAddress, string bloodType, uint256 donationDate, uint256 expiryDate, string qrCodeHash, bool isAvailable, bool isExpired)",
  "function getEmergencyRequest(uint256 _requestId) view returns (uint256 requestId, address hospitalAddress, string hospitalName, string bloodType, uint256 quantityNeeded, uint256 quantityFulfilled, uint256 deadline, bool isActive, uint256 createdAt)",
  "function getBloodUnitsCount() view returns (uint256)",
  "function getEmergencyRequestsCount() view returns (uint256)",
  "function getDonorAddresses() view returns (address[])",
  "function getDashboardStats() view returns (uint256 _totalDonors, uint256 _totalBloodUnits, uint256 _totalEmergencyRequests, uint256 _totalMatches)",
  "function isBloodUnitExpired(uint256 _unitId) view returns (bool)",
  "function isRequestExpired(uint256 _requestId) view returns (bool)",
  "event DonorRegistered(address indexed donor, string name, string bloodType, string location, uint256 timestamp)",
  "event BloodUnitRegistered(uint256 indexed unitId, address indexed donor, string bloodType, uint256 donationDate, uint256 expiryDate, string qrCodeHash)",
  "event EmergencyRequestPosted(uint256 indexed requestId, address indexed hospital, string hospitalName, string bloodType, uint256 quantityNeeded, uint256 deadline)",
  "event BloodMatched(uint256 indexed requestId, uint256 indexed unitId, address indexed donor, string bloodType)",
  "event RewardPointsEarned(address indexed donor, uint256 pointsEarned, uint256 totalPoints)"
];

// ── Contract address — UPDATE after deploying ──
let CONTRACT_ADDRESS = localStorage.getItem('emergblood_contract') || '';
const HARDHAT_RPC = 'http://127.0.0.1:8545';
const HARDHAT_CHAIN_ID_HEX = '0x7a69'; // 31337

// ── App State ──
let provider = null;
let signer = null;
let contract = null;
let currentAccount = null;
let isAdmin = false;
let countdownIntervals = [];

// ═══════════════════════════════════════════════════════════════════
//                      INITIALIZATION
// ═══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  setupForms();
  checkExistingConnection();
});

async function checkExistingConnection() {
  if (window.ethereum) {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
      await connectWallet();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//                      WALLET CONNECTION
// ═══════════════════════════════════════════════════════════════════

async function connectWallet() {
  const btn = document.getElementById('walletBtn');
  try {
    // Try MetaMask first
    if (window.ethereum) {
      const onCorrectNetwork = await ensureHardhatNetwork();
      if (!onCorrectNetwork) {
        showToast('Switch MetaMask to Hardhat Localhost (Chain ID 31337)', 'error');
        return;
      }

      provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      signer = await provider.getSigner();
      currentAccount = accounts[0];
      showToast('Connected via MetaMask', 'success');
    } else {
      // Fallback to Hardhat local node
      provider = new ethers.JsonRpcProvider(HARDHAT_RPC);
      signer = await provider.getSigner(0);
      currentAccount = await signer.getAddress();
      showToast('Connected to Hardhat local node', 'success');
    }

    // Update UI
    btn.classList.add('connected');
    btn.innerHTML = `<span class="dot"></span>${truncateAddress(currentAccount)}`;

    // Connect contract
    if (CONTRACT_ADDRESS) {
      await initContract();
    } else {
      showContractPrompt();
    }
  } catch (err) {
    console.error('Connection failed:', err);
    showToast('Connection failed: ' + (err.reason || err.message), 'error');
  }
}

async function ensureHardhatNetwork() {
  try {
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (currentChainId === HARDHAT_CHAIN_ID_HEX) return true;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: HARDHAT_CHAIN_ID_HEX }]
      });
      return true;
    } catch (switchErr) {
      if (switchErr.code !== 4902) return false;

      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: HARDHAT_CHAIN_ID_HEX,
          chainName: 'Hardhat Localhost',
          rpcUrls: [HARDHAT_RPC],
          nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
          }
        }]
      });

      return true;
    }
  } catch (err) {
    console.error('Network switch error:', err);
    return false;
  }
}

async function initContract() {
  try {
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    const adminAddr = await contract.admin();
    isAdmin = adminAddr.toLowerCase() === currentAccount.toLowerCase();

    document.getElementById('adminBadge').style.display = isAdmin ? 'inline-flex' : 'none';
    document.getElementById('connectionBanner').style.display = 'none';

    await refreshDashboard();
    showToast('Contract connected successfully!', 'success');
  } catch (err) {
    console.error('Contract init failed:', err);
    showToast('Failed to connect to contract. Check the address.', 'error');
    showContractPrompt();
  }
}

function showContractPrompt() {
  document.getElementById('connectionBanner').style.display = 'block';
}

async function setContractAddress() {
  const addr = document.getElementById('contractAddressInput').value.trim();
  if (!ethers.isAddress(addr)) {
    showToast('Invalid contract address', 'error');
    return;
  }
  CONTRACT_ADDRESS = addr;
  localStorage.setItem('emergblood_contract', addr);
  await initContract();
}

// ═══════════════════════════════════════════════════════════════════
//                      TAB NAVIGATION
// ═══════════════════════════════════════════════════════════════════

function initTabs() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(target).classList.add('active');

      // Refresh data on tab switch
      if (contract) {
        if (target === 'dashboard') refreshDashboard();
        else if (target === 'emergency') loadEmergencyRequests();
        else if (target === 'match') loadMatchData();
        else if (target === 'profile') loadProfile();
        else if (target === 'units') loadBloodUnits();
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
//                       FORM SETUP
// ═══════════════════════════════════════════════════════════════════

function setupForms() {
  document.getElementById('donorForm').addEventListener('submit', registerDonor);
  document.getElementById('bloodUnitForm').addEventListener('submit', registerBloodUnit);
  document.getElementById('emergencyForm').addEventListener('submit', postEmergencyRequest);
  document.getElementById('matchForm').addEventListener('submit', matchBlood);
}

// ═══════════════════════════════════════════════════════════════════
//                      CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

async function registerDonor(e) {
  e.preventDefault();
  if (!contract) return showToast('Connect wallet and contract first', 'error');
  const btn = e.target.querySelector('button[type="submit"]');
  setLoading(btn, true);
  try {
    const name = document.getElementById('donorName').value;
    const bloodType = document.getElementById('donorBloodType').value;
    const location = document.getElementById('donorLocation').value;
    const tx = await contract.registerDonor(name, bloodType, location);
    showToast('Transaction sent! Waiting for confirmation...', 'info');
    await tx.wait();
    showToast(`Donor "${name}" registered successfully!`, 'success');
    logTransaction(tx.hash, 'Donor Registration');
    e.target.reset();
    refreshDashboard();
  } catch (err) {
    showToast(parseError(err), 'error');
  }
  setLoading(btn, false);
}

async function registerBloodUnit(e) {
  e.preventDefault();
  if (!contract) return showToast('Connect wallet and contract first', 'error');
  if (!isAdmin) return showToast('Only admin can register blood units', 'error');
  const btn = e.target.querySelector('button[type="submit"]');
  setLoading(btn, true);
  try {
    const donor = document.getElementById('unitDonorAddress').value;
    const bloodType = document.getElementById('unitBloodType').value;
    const qrHash = document.getElementById('unitQrHash').value || generateQRHash();
    const tx = await contract.registerBloodUnit(donor, bloodType, qrHash);
    showToast('Transaction sent! Waiting for confirmation...', 'info');
    await tx.wait();
    showToast('Blood unit registered successfully!', 'success');
    logTransaction(tx.hash, 'Blood Unit Registration');
    e.target.reset();
    refreshDashboard();
  } catch (err) {
    showToast(parseError(err), 'error');
  }
  setLoading(btn, false);
}

async function postEmergencyRequest(e) {
  e.preventDefault();
  if (!contract) return showToast('Connect wallet and contract first', 'error');
  const btn = e.target.querySelector('button[type="submit"]');
  setLoading(btn, true);
  try {
    const hospital = document.getElementById('hospitalName').value;
    const bloodType = document.getElementById('reqBloodType').value;
    const quantity = parseInt(document.getElementById('reqQuantity').value);
    const hours = parseInt(document.getElementById('reqValidity').value);
    const tx = await contract.postEmergencyRequest(hospital, bloodType, quantity, hours);
    showToast('Transaction sent! Waiting for confirmation...', 'info');
    await tx.wait();
    showToast('Emergency request posted!', 'success');
    logTransaction(tx.hash, 'Emergency Request');
    e.target.reset();
    refreshDashboard();
    loadEmergencyRequests();
  } catch (err) {
    showToast(parseError(err), 'error');
  }
  setLoading(btn, false);
}

async function matchBlood(e) {
  e.preventDefault();
  if (!contract) return showToast('Connect wallet and contract first', 'error');
  if (!isAdmin) return showToast('Only admin can match blood', 'error');
  const btn = e.target.querySelector('button[type="submit"]');
  setLoading(btn, true);
  try {
    const reqId = parseInt(document.getElementById('matchRequestId').value);
    const unitId = parseInt(document.getElementById('matchUnitId').value);
    const tx = await contract.matchBlood(reqId, unitId);
    showToast('Transaction sent! Waiting for confirmation...', 'info');
    await tx.wait();
    showToast('Blood matched successfully! Donor rewarded!', 'success');
    logTransaction(tx.hash, 'Blood Match');
    refreshDashboard();
    loadMatchData();
  } catch (err) {
    showToast(parseError(err), 'error');
  }
  setLoading(btn, false);
}

// ═══════════════════════════════════════════════════════════════════
//                      DATA LOADING
// ═══════════════════════════════════════════════════════════════════

async function refreshDashboard() {
  if (!contract) return;
  try {
    const stats = await contract.getDashboardStats();
    animateCounter('statDonors', Number(stats[0]));
    animateCounter('statUnits', Number(stats[1]));
    animateCounter('statRequests', Number(stats[2]));
    animateCounter('statMatches', Number(stats[3]));
  } catch (err) {
    console.error('Dashboard refresh failed:', err);
  }
}

async function loadEmergencyRequests() {
  if (!contract) return;
  const container = document.getElementById('requestsList');
  countdownIntervals.forEach(i => clearInterval(i));
  countdownIntervals = [];
  try {
    const count = Number(await contract.getEmergencyRequestsCount());
    if (count === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon"><img src="icons/siren-icon-emergency-symbol-ambulance-sign-isolate-on-white-background-for-graphic-design-logo-web-site-social-media-mobile-app-ui-vector.jpg" alt="emergency" class="icon-empty" /></div><p>No emergency requests yet</p></div>`;
      return;
    }
    let html = '';
    for (let i = count - 1; i >= 0; i--) {
      const r = await contract.getEmergencyRequest(i);
      const deadline = Number(r.deadline) * 1000;
      const pct = r.quantityNeeded > 0 ? Math.round((Number(r.quantityFulfilled) / Number(r.quantityNeeded)) * 100) : 0;
      html += `
        <div class="request-card">
          <div class="request-header">
            <div>
              <div class="hospital-name">${escapeHtml(r.hospitalName)}</div>
              <div style="color:var(--text-muted);font-size:0.8rem;margin-top:2px;">ID: ${i}</div>
            </div>
            <div class="countdown ${r.isActive ? 'safe' : 'expired'}" id="countdown-${i}" data-deadline="${deadline}">
              ${r.isActive ? 'Active' : 'Expired'}
            </div>
          </div>
          <div class="request-details">
            <div class="detail-item"><span class="blood-badge">${escapeHtml(r.bloodType)}</span></div>
            <div class="detail-item">${Number(r.quantityFulfilled)}/${Number(r.quantityNeeded)} units</div>
            <div class="detail-item">${r.isActive ? 'Active' : 'Closed'}</div>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>`;
    }
    container.innerHTML = html;
    // Start countdowns
    for (let i = count - 1; i >= 0; i--) {
      const el = document.getElementById(`countdown-${i}`);
      if (el) startCountdown(el);
    }
  } catch (err) { console.error(err); container.innerHTML = `<div class="empty-state"><p>Error loading requests</p></div>`; }
}

async function loadBloodUnits() {
  if (!contract) return;
  const container = document.getElementById('unitsList');
  try {
    const count = Number(await contract.getBloodUnitsCount());
    if (count === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon"><img src="icons/red-droplets-glyph-style_78370-4807.avif" alt="blood" class="icon-empty" /></div><p>No blood units registered yet</p></div>`;
      return;
    }
    let html = '<div class="units-grid">';
    for (let i = count - 1; i >= 0; i--) {
      const u = await contract.getBloodUnit(i);
      const expDate = new Date(Number(u.expiryDate) * 1000).toLocaleDateString();
      const donDate = new Date(Number(u.donationDate) * 1000).toLocaleDateString();
      const statusColor = u.isExpired ? 'var(--danger)' : (u.isAvailable ? 'var(--success)' : 'var(--warning)');
      const statusText = u.isExpired ? 'Expired' : (u.isAvailable ? 'Available' : 'Used');
      html += `
        <div class="unit-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
            <span class="blood-badge">${escapeHtml(u.bloodType)}</span>
            <span style="color:${statusColor};font-size:0.8rem;font-weight:600">● ${statusText}</span>
          </div>
          <div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.8">
            <div>Unit #${i}</div>
            <div>Donor: ${truncateAddress(u.donorAddress)}</div>
            <div>Donated: ${donDate}</div>
            <div>Expires: ${expDate}</div>
            <div style="font-family:monospace;font-size:0.75rem;color:var(--text-muted)">QR: ${u.qrCodeHash.substring(0,20)}...</div>
          </div>
        </div>`;
    }
    html += '</div>';
    container.innerHTML = html;
  } catch (err) { console.error(err); container.innerHTML = `<div class="empty-state"><p>Error loading units</p></div>`; }
}

async function loadMatchData() {
  if (!contract) return;
  try {
    // Load active requests into dropdown
    const reqCount = Number(await contract.getEmergencyRequestsCount());
    const reqSelect = document.getElementById('matchRequestId');
    reqSelect.innerHTML = '<option value="">Select a request...</option>';
    for (let i = 0; i < reqCount; i++) {
      const r = await contract.getEmergencyRequest(i);
      if (r.isActive) {
        reqSelect.innerHTML += `<option value="${i}">#${i} - ${escapeHtml(r.hospitalName)} (${escapeHtml(r.bloodType)}, need ${Number(r.quantityNeeded) - Number(r.quantityFulfilled)} more)</option>`;
      }
    }
    // Load available units into dropdown
    const unitCount = Number(await contract.getBloodUnitsCount());
    const unitSelect = document.getElementById('matchUnitId');
    unitSelect.innerHTML = '<option value="">Select a blood unit...</option>';
    for (let i = 0; i < unitCount; i++) {
      const u = await contract.getBloodUnit(i);
      if (u.isAvailable && !u.isExpired) {
        unitSelect.innerHTML += `<option value="${i}">#${i} - ${escapeHtml(u.bloodType)} (Donor: ${truncateAddress(u.donorAddress)})</option>`;
      }
    }
  } catch (err) { console.error(err); }
}

async function loadProfile() {
  if (!contract || !currentAccount) return;
  const container = document.getElementById('profileContent');
  try {
    const d = await contract.getDonorInfo(currentAccount);
    if (!d.isRegistered) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon"><img src="icons/customer-icon-for-your-website-design-logo-app-ui-free-vector.jpg" alt="donor" class="icon-empty" /></div><p>You are not registered as a donor yet.<br>Go to "Register Donor" to sign up.</p></div>`;
      return;
    }
    const regDate = new Date(Number(d.registeredAt) * 1000).toLocaleDateString();
    container.innerHTML = `
      <div class="glass-card profile-header">
        <div class="profile-avatar">${d.name.charAt(0).toUpperCase()}</div>
        <div class="profile-info">
          <h2>${escapeHtml(d.name)}</h2>
          <p>${escapeHtml(d.location)} · <span class="blood-badge">${escapeHtml(d.bloodType)}</span></p>
          <div class="reward-display">Reward Points: ${Number(d.rewardPoints)}</div>
          <p style="color:var(--text-muted);font-size:0.8rem;margin-top:4px">Registered: ${regDate}</p>
        </div>
      </div>
      <div class="glass-card">
        <h3 style="margin-bottom:0.5rem">Wallet Address</h3>
        <p style="font-family:monospace;font-size:0.85rem;color:var(--info);word-break:break-all">${currentAccount}</p>
      </div>`;
  } catch (err) { console.error(err); }
}

// ═══════════════════════════════════════════════════════════════════
//                       UTILITIES
// ═══════════════════════════════════════════════════════════════════

function truncateAddress(addr) {
  if (!addr) return '';
  return addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function generateQRHash() {
  return '0x' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

function parseError(err) {
  if (err.reason) return err.reason;
  if (err.data?.message) return err.data.message;
  const match = err.message?.match(/reason="([^"]+)"/);
  if (match) return match[1];
  if (err.message?.includes('user rejected')) return 'Transaction rejected by user';
  return err.message || 'Transaction failed';
}

function setLoading(btn, loading) {
  if (loading) { btn.classList.add('loading'); btn.disabled = true; }
  else { btn.classList.remove('loading'); btn.disabled = false; }
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const duration = 600;
  const startTime = performance.now();
  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function startCountdown(el) {
  const deadline = parseInt(el.dataset.deadline);
  function tick() {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      el.textContent = 'Expired';
      el.className = 'countdown expired';
      return;
    }
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    el.textContent = `${h}h ${m}m ${s}s`;
    if (remaining < 3600000) { el.className = 'countdown expired'; }
    else { el.className = 'countdown safe'; }
  }
  tick();
  const interval = setInterval(tick, 1000);
  countdownIntervals.push(interval);
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: 'Success', error: 'Error', info: 'Info' };
  toast.innerHTML = `<span>${icons[type] || 'Info'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

const txLog = [];
function logTransaction(hash, type) {
  txLog.unshift({ hash, type, time: new Date().toLocaleTimeString() });
  const container = document.getElementById('txLog');
  if (!container) return;
  container.innerHTML = txLog.slice(0, 20).map(tx =>
    `<div class="tx-item">
      <span>${tx.time}</span>
      <span style="flex:1;font-weight:500">${tx.type}</span>
      <span class="tx-hash">${truncateAddress(tx.hash)}</span>
    </div>`
  ).join('');
}

// Listen for MetaMask account changes
if (window.ethereum) {
  window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length === 0) {
      location.reload();
    } else {
      currentAccount = accounts[0];
      connectWallet();
    }
  });
  window.ethereum.on('chainChanged', () => location.reload());
}
