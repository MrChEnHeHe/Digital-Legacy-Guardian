// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LegacyContract {
    enum TriggerMode { TimeLock, Consensus, Hybrid }
    enum PlanStatus { Active, Triggered, Completed }

    struct Guardian {
        address guardianAddress;
        bytes32 commitment;
        bool hasSubmitted;
    }

    struct LegacyPlan {
        string planId;
        address owner;
        address heir;
        uint256 threshold;
        uint256 totalShares;
        TriggerMode triggerMode;
        uint256 timeLock;
        uint256 createdAt;
        PlanStatus status;
        mapping(address => Guardian) guardians;
        address[] guardianList;
        bytes32[] commitments;
    }

    mapping(string => LegacyPlan) public plans;
    string[] public planIds;

    event PlanCreated(
        string indexed planId,
        address indexed owner,
        address heir,
        uint256 threshold,
        uint256 totalShares
    );

    event PlanTriggered(string indexed planId, uint256 timestamp);
    event ShareSubmitted(string indexed planId, address indexed guardian);
    event PlanCompleted(string indexed planId, address indexed heir);

    modifier onlyOwner(string memory planId) {
        require(
            plans[planId].owner == msg.sender,
            "Only owner can call this function"
        );
        _;
    }

    modifier onlyGuardian(string memory planId) {
        require(
            plans[planId].guardians[msg.sender].guardianAddress != address(0),
            "Only guardian can call this function"
        );
        _;
    }

    function createPlan(
        string memory planId,
        address heir,
        uint256 threshold,
        uint256 totalShares,
        TriggerMode triggerMode,
        uint256 timeLock,
        address[] memory guardianAddresses,
        bytes32[] memory commitments
    ) public {
        require(
            guardianAddresses.length == totalShares,
            "Guardian count must match total shares"
        );
        require(
            commitments.length == totalShares,
            "Commitments count must match total shares"
        );
        require(
            threshold <= totalShares,
            "Threshold cannot exceed total shares"
        );
        require(
            plans[planId].owner == address(0),
            "Plan already exists"
        );

        LegacyPlan storage plan = plans[planId];
        plan.planId = planId;
        plan.owner = msg.sender;
        plan.heir = heir;
        plan.threshold = threshold;
        plan.totalShares = totalShares;
        plan.triggerMode = triggerMode;
        plan.timeLock = timeLock;
        plan.createdAt = block.timestamp;
        plan.status = PlanStatus.Active;

        for (uint256 i = 0; i < guardianAddresses.length; i++) {
            plan.guardians[guardianAddresses[i]] = Guardian({
                guardianAddress: guardianAddresses[i],
                commitment: commitments[i],
                hasSubmitted: false
            });
            plan.guardianList.push(guardianAddresses[i]);
            plan.commitments.push(commitments[i]);
        }

        planIds.push(planId);

        emit PlanCreated(
            planId,
            msg.sender,
            heir,
            threshold,
            totalShares
        );
    }

    function triggerPlan(string memory planId) public {
        LegacyPlan storage plan = plans[planId];
        require(plan.owner != address(0), "Plan does not exist");
        require(plan.status == PlanStatus.Active, "Plan is not active");

        bool canTrigger = false;

        if (plan.triggerMode == TriggerMode.TimeLock) {
            require(
                block.timestamp >= plan.createdAt + plan.timeLock,
                "Time lock not expired"
            );
            canTrigger = true;
        } else if (plan.triggerMode == TriggerMode.Consensus) {
            uint256 submittedCount = 0;
            for (uint256 i = 0; i < plan.guardianList.length; i++) {
                if (plan.guardians[plan.guardianList[i]].hasSubmitted) {
                    submittedCount++;
                }
            }
            require(submittedCount >= plan.threshold, "Not enough guardian submissions");
            canTrigger = true;
        } else if (plan.triggerMode == TriggerMode.Hybrid) {
            require(
                block.timestamp >= plan.createdAt + plan.timeLock,
                "Time lock not expired"
            );
            uint256 submittedCount = 0;
            for (uint256 i = 0; i < plan.guardianList.length; i++) {
                if (plan.guardians[plan.guardianList[i]].hasSubmitted) {
                    submittedCount++;
                }
            }
            require(submittedCount >= plan.threshold, "Not enough guardian submissions");
            canTrigger = true;
        }

        require(canTrigger, "Trigger conditions not met");

        plan.status = PlanStatus.Triggered;

        emit PlanTriggered(planId, block.timestamp);
    }

    function submitShare(
        string memory planId,
        bytes32 shareHash
    ) public onlyGuardian(planId) {
        LegacyPlan storage plan = plans[planId];
        require(plan.status == PlanStatus.Active, "Plan is not active");

        Guardian storage guardian = plan.guardians[msg.sender];
        require(!guardian.hasSubmitted, "Already submitted");

        guardian.hasSubmitted = true;

        emit ShareSubmitted(planId, msg.sender);
    }

    function verifyCommitment(
        string memory planId,
        address guardianAddress,
        bytes32 commitment
    ) public view returns (bool) {
        LegacyPlan storage plan = plans[planId];
        return plan.guardians[guardianAddress].commitment == commitment;
    }

    function getPlan(string memory planId)
        public
        view
        returns (
            address owner,
            address heir,
            uint256 threshold,
            uint256 totalShares,
            TriggerMode triggerMode,
            uint256 timeLock,
            uint256 createdAt,
            PlanStatus status
        )
    {
        LegacyPlan storage plan = plans[planId];
        return (
            plan.owner,
            plan.heir,
            plan.threshold,
            plan.totalShares,
            plan.triggerMode,
            plan.timeLock,
            plan.createdAt,
            plan.status
        );
    }

    function getGuardians(string memory planId)
        public
        view
        returns (address[] memory)
    {
        return plans[planId].guardianList;
    }

    function getGuardianInfo(string memory planId, address guardianAddress)
        public
        view
        returns (bytes32 commitment, bool hasSubmitted)
    {
        Guardian storage guardian = plans[planId].guardians[guardianAddress];
        return (guardian.commitment, guardian.hasSubmitted);
    }

    function getSubmittedCount(string memory planId)
        public
        view
        returns (uint256)
    {
        LegacyPlan storage plan = plans[planId];
        uint256 count = 0;
        for (uint256 i = 0; i < plan.guardianList.length; i++) {
            if (plan.guardians[plan.guardianList[i]].hasSubmitted) {
                count++;
            }
        }
        return count;
    }

    function completePlan(string memory planId) public {
        LegacyPlan storage plan = plans[planId];
        require(plan.status == PlanStatus.Triggered, "Plan is not triggered");

        uint256 submittedCount = getSubmittedCount(planId);
        require(submittedCount >= plan.threshold, "Not enough shares submitted");

        plan.status = PlanStatus.Completed;

        emit PlanCompleted(planId, plan.heir);
    }

    function getAllPlanIds() public view returns (string[] memory) {
        return planIds;
    }
}
