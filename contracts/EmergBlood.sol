// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EmergBlood - Blockchain-Based Emergency Blood Donation Network
 * @author Based on research by Dina Aljuhani et al. (2024)
 * @notice Enhancing Traceability in Blood Supply Chain Management
 * @dev Implements donor registration, blood unit tracking, emergency requests,
 *      blood matching, and donor reward points system.
 *
 * Novelties Added:
 * 1. Time-bound emergency requests (requests expire automatically)
 * 2. Expiry tracking for blood units (42-day typical shelf life)
 * 3. Donor reward points system for motivation
 */
contract EmergBlood {

    // ═══════════════════════════════════════════════════════════════════
    //                          CONSTANTS
    // ═══════════════════════════════════════════════════════════════════

    uint256 public constant BLOOD_EXPIRY_DAYS = 42;
    uint256 public constant REWARD_POINTS_PER_DONATION = 10;

    // ═══════════════════════════════════════════════════════════════════
    //                          DATA STRUCTURES
    // ═══════════════════════════════════════════════════════════════════

    struct Donor {
        address walletAddress;
        string name;
        string bloodType;
        string location;
        uint256 rewardPoints;
        bool isRegistered;
        uint256 registeredAt;
    }

    struct BloodUnit {
        uint256 unitId;
        address donorAddress;
        string bloodType;
        uint256 donationDate;
        uint256 expiryDate;
        string qrCodeHash;
        bool isAvailable;
        bool isExpired;
    }

    struct EmergencyRequest {
        uint256 requestId;
        address hospitalAddress;
        string hospitalName;
        string bloodType;
        uint256 quantityNeeded;
        uint256 quantityFulfilled;
        uint256 deadline;
        bool isActive;
        uint256 createdAt;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                          STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════

    address public admin;

    mapping(address => Donor) public donors;
    address[] public donorAddresses;

    BloodUnit[] public bloodUnits;
    EmergencyRequest[] public emergencyRequests;

    uint256 public totalDonors;
    uint256 public totalBloodUnits;
    uint256 public totalEmergencyRequests;
    uint256 public totalMatches;

    // ═══════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ═══════════════════════════════════════════════════════════════════

    event DonorRegistered(
        address indexed donor,
        string name,
        string bloodType,
        string location,
        uint256 timestamp
    );

    event BloodUnitRegistered(
        uint256 indexed unitId,
        address indexed donor,
        string bloodType,
        uint256 donationDate,
        uint256 expiryDate,
        string qrCodeHash
    );

    event EmergencyRequestPosted(
        uint256 indexed requestId,
        address indexed hospital,
        string hospitalName,
        string bloodType,
        uint256 quantityNeeded,
        uint256 deadline
    );

    event BloodMatched(
        uint256 indexed requestId,
        uint256 indexed unitId,
        address indexed donor,
        string bloodType
    );

    event RewardPointsEarned(
        address indexed donor,
        uint256 pointsEarned,
        uint256 totalPoints
    );

    event EmergencyRequestExpired(
        uint256 indexed requestId
    );

    event BloodUnitExpired(
        uint256 indexed unitId
    );

    // ═══════════════════════════════════════════════════════════════════
    //                           MODIFIERS
    // ═══════════════════════════════════════════════════════════════════

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyRegisteredDonor() {
        require(donors[msg.sender].isRegistered, "You must be a registered donor");
        _;
    }

    modifier validBloodType(string memory _bloodType) {
        require(
            _isValidBloodType(_bloodType),
            "Invalid blood type. Use: A+, A-, B+, B-, AB+, AB-, O+, O-"
        );
        _;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                          CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    constructor() {
        admin = msg.sender;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                      CORE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Register as a blood donor
     * @param _name Donor's full name
     * @param _bloodType Blood type (A+, A-, B+, B-, AB+, AB-, O+, O-)
     * @param _location Donor's city/location
     */
    function registerDonor(
        string memory _name,
        string memory _bloodType,
        string memory _location
    ) public validBloodType(_bloodType) {
        require(!donors[msg.sender].isRegistered, "Donor already registered");
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_location).length > 0, "Location cannot be empty");

        donors[msg.sender] = Donor({
            walletAddress: msg.sender,
            name: _name,
            bloodType: _bloodType,
            location: _location,
            rewardPoints: 0,
            isRegistered: true,
            registeredAt: block.timestamp
        });

        donorAddresses.push(msg.sender);
        totalDonors++;

        emit DonorRegistered(msg.sender, _name, _bloodType, _location, block.timestamp);
    }

    /**
     * @notice Register a blood unit after donation (admin only)
     * @param _donorAddress Address of the donor who donated
     * @param _bloodType Blood type of the unit
     * @param _qrCodeHash Hash of the QR code for tracking
     */
    function registerBloodUnit(
        address _donorAddress,
        string memory _bloodType,
        string memory _qrCodeHash
    ) public onlyAdmin validBloodType(_bloodType) {
        require(donors[_donorAddress].isRegistered, "Donor is not registered");
        require(bytes(_qrCodeHash).length > 0, "QR code hash cannot be empty");

        uint256 unitId = bloodUnits.length;
        uint256 donationDate = block.timestamp;
        uint256 expiryDate = donationDate + (BLOOD_EXPIRY_DAYS * 1 days);

        bloodUnits.push(BloodUnit({
            unitId: unitId,
            donorAddress: _donorAddress,
            bloodType: _bloodType,
            donationDate: donationDate,
            expiryDate: expiryDate,
            qrCodeHash: _qrCodeHash,
            isAvailable: true,
            isExpired: false
        }));

        totalBloodUnits++;

        emit BloodUnitRegistered(unitId, _donorAddress, _bloodType, donationDate, expiryDate, _qrCodeHash);
    }

    /**
     * @notice Post an emergency blood request (any hospital/user)
     * @param _hospitalName Name of the requesting hospital
     * @param _bloodType Required blood type
     * @param _quantity Number of units needed
     * @param _validityHours How many hours the request remains valid
     */
    function postEmergencyRequest(
        string memory _hospitalName,
        string memory _bloodType,
        uint256 _quantity,
        uint256 _validityHours
    ) public validBloodType(_bloodType) {
        require(bytes(_hospitalName).length > 0, "Hospital name cannot be empty");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_validityHours > 0 && _validityHours <= 72, "Validity must be between 1 and 72 hours");

        uint256 requestId = emergencyRequests.length;
        uint256 deadline = block.timestamp + (_validityHours * 1 hours);

        emergencyRequests.push(EmergencyRequest({
            requestId: requestId,
            hospitalAddress: msg.sender,
            hospitalName: _hospitalName,
            bloodType: _bloodType,
            quantityNeeded: _quantity,
            quantityFulfilled: 0,
            deadline: deadline,
            isActive: true,
            createdAt: block.timestamp
        }));

        totalEmergencyRequests++;

        emit EmergencyRequestPosted(requestId, msg.sender, _hospitalName, _bloodType, _quantity, deadline);
    }

    /**
     * @notice Match an available blood unit to an emergency request (admin only)
     * @param _requestId ID of the emergency request
     * @param _unitId ID of the blood unit to match
     */
    function matchBlood(
        uint256 _requestId,
        uint256 _unitId
    ) public onlyAdmin {
        require(_requestId < emergencyRequests.length, "Invalid request ID");
        require(_unitId < bloodUnits.length, "Invalid unit ID");

        EmergencyRequest storage request = emergencyRequests[_requestId];
        BloodUnit storage unit = bloodUnits[_unitId];

        // Check request validity
        require(request.isActive, "Emergency request is no longer active");
        require(block.timestamp <= request.deadline, "Emergency request has expired");
        require(
            request.quantityFulfilled < request.quantityNeeded,
            "Request already fully fulfilled"
        );

        // Check unit validity
        require(unit.isAvailable, "Blood unit is not available");
        require(!unit.isExpired, "Blood unit has expired");
        require(block.timestamp <= unit.expiryDate, "Blood unit has passed its expiry date");

        // Check blood type compatibility
        require(
            keccak256(bytes(unit.bloodType)) == keccak256(bytes(request.bloodType)),
            "Blood type mismatch"
        );

        // Perform the match
        unit.isAvailable = false;
        request.quantityFulfilled++;

        // Check if request is fully fulfilled
        if (request.quantityFulfilled >= request.quantityNeeded) {
            request.isActive = false;
        }

        // Award reward points to donor
        Donor storage donor = donors[unit.donorAddress];
        donor.rewardPoints += REWARD_POINTS_PER_DONATION;

        totalMatches++;

        emit BloodMatched(_requestId, _unitId, unit.donorAddress, unit.bloodType);
        emit RewardPointsEarned(unit.donorAddress, REWARD_POINTS_PER_DONATION, donor.rewardPoints);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                       VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Get donor information
     */
    function getDonorInfo(address _donor) public view returns (
        string memory name,
        string memory bloodType,
        string memory location,
        uint256 rewardPoints,
        bool isRegistered,
        uint256 registeredAt
    ) {
        Donor memory d = donors[_donor];
        return (d.name, d.bloodType, d.location, d.rewardPoints, d.isRegistered, d.registeredAt);
    }

    /**
     * @notice Get blood unit details
     */
    function getBloodUnit(uint256 _unitId) public view returns (
        uint256 unitId,
        address donorAddress,
        string memory bloodType,
        uint256 donationDate,
        uint256 expiryDate,
        string memory qrCodeHash,
        bool isAvailable,
        bool isExpired
    ) {
        require(_unitId < bloodUnits.length, "Invalid unit ID");
        BloodUnit memory u = bloodUnits[_unitId];
        bool expired = u.isExpired || block.timestamp > u.expiryDate;
        return (u.unitId, u.donorAddress, u.bloodType, u.donationDate, u.expiryDate, u.qrCodeHash, u.isAvailable, expired);
    }

    /**
     * @notice Get emergency request details
     */
    function getEmergencyRequest(uint256 _requestId) public view returns (
        uint256 requestId,
        address hospitalAddress,
        string memory hospitalName,
        string memory bloodType,
        uint256 quantityNeeded,
        uint256 quantityFulfilled,
        uint256 deadline,
        bool isActive,
        uint256 createdAt
    ) {
        require(_requestId < emergencyRequests.length, "Invalid request ID");
        EmergencyRequest memory r = emergencyRequests[_requestId];
        bool active = r.isActive && block.timestamp <= r.deadline;
        return (r.requestId, r.hospitalAddress, r.hospitalName, r.bloodType, r.quantityNeeded, r.quantityFulfilled, r.deadline, active, r.createdAt);
    }

    /**
     * @notice Get total count of blood units
     */
    function getBloodUnitsCount() public view returns (uint256) {
        return bloodUnits.length;
    }

    /**
     * @notice Get total count of emergency requests
     */
    function getEmergencyRequestsCount() public view returns (uint256) {
        return emergencyRequests.length;
    }

    /**
     * @notice Get all donor addresses
     */
    function getDonorAddresses() public view returns (address[] memory) {
        return donorAddresses;
    }

    /**
     * @notice Check if a blood unit has expired
     */
    function isBloodUnitExpired(uint256 _unitId) public view returns (bool) {
        require(_unitId < bloodUnits.length, "Invalid unit ID");
        return bloodUnits[_unitId].isExpired || block.timestamp > bloodUnits[_unitId].expiryDate;
    }

    /**
     * @notice Check if an emergency request has expired
     */
    function isRequestExpired(uint256 _requestId) public view returns (bool) {
        require(_requestId < emergencyRequests.length, "Invalid request ID");
        return block.timestamp > emergencyRequests[_requestId].deadline;
    }

    /**
     * @notice Get dashboard statistics
     */
    function getDashboardStats() public view returns (
        uint256 _totalDonors,
        uint256 _totalBloodUnits,
        uint256 _totalEmergencyRequests,
        uint256 _totalMatches
    ) {
        return (totalDonors, totalBloodUnits, totalEmergencyRequests, totalMatches);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                       INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @dev Validate blood type string
     */
    function _isValidBloodType(string memory _bloodType) internal pure returns (bool) {
        bytes32 bt = keccak256(bytes(_bloodType));
        return (
            bt == keccak256("A+") ||
            bt == keccak256("A-") ||
            bt == keccak256("B+") ||
            bt == keccak256("B-") ||
            bt == keccak256("AB+") ||
            bt == keccak256("AB-") ||
            bt == keccak256("O+") ||
            bt == keccak256("O-")
        );
    }
}
