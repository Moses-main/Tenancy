// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract TENANTGovernance is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1e27;
    uint256 public proposalCount;
    uint256 public votingDelay = 1 days;
    uint256 public votingPeriod = 5 days;
    uint256 public proposalThreshold = 100e18;

    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        address target;
        bytes data;
        uint256 value;
        uint256 voteStart;
        uint256 voteEnd;
        bool executed;
        bool cancelled;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
    }

    struct Vote {
        bool support;
        bool voted;
        uint256 weight;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => Vote)) public proposalVotes;

    event ProposalCreated(
        uint256 indexed id,
        address indexed proposer,
        string description,
        address target,
        uint256 value
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );
    event ProposalExecuted(uint256 indexed id);
    event ProposalCancelled(uint256 indexed id);
    event VotingDelayUpdated(uint256 newDelay);
    event VotingPeriodUpdated(uint256 newPeriod);
    event ProposalThresholdUpdated(uint256 newThreshold);

    constructor() ERC20("TENANT Governance", "TENANT") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000e18);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }

    function createProposal(
        string memory description,
        address target,
        bytes memory data,
        uint256 value
    ) external returns (uint256) {
        require(balanceOf(msg.sender) >= proposalThreshold, "Below proposal threshold");
        require(target != address(0), "Invalid target");

        proposalCount++;
        Proposal storage proposal = proposals[proposalCount];
        proposal.id = proposalCount;
        proposal.proposer = msg.sender;
        proposal.description = description;
        proposal.target = target;
        proposal.data = data;
        proposal.value = value;
        proposal.voteStart = block.timestamp + votingDelay;
        proposal.voteEnd = proposal.voteStart + votingPeriod;
        proposal.executed = false;
        proposal.cancelled = false;

        emit ProposalCreated(proposalCount, msg.sender, description, target, value);

        return proposalCount;
    }

    function castVote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.voteStart, "Voting not started");
        require(block.timestamp < proposal.voteEnd, "Voting ended");
        require(!proposal.executed && !proposal.cancelled, "Proposal not active");
        require(!proposalVotes[proposalId][msg.sender].voted, "Already voted");

        uint256 weight = balanceOf(msg.sender);
        require(weight > 0, "No voting power");

        proposalVotes[proposalId][msg.sender] = Vote({
            support: support,
            voted: true,
            weight: weight
        });

        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    function executeProposal(uint256 proposalId) external payable {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.voteEnd, "Voting not ended");
        require(!proposal.executed && !proposal.cancelled, "Proposal already executed/cancelled");

        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        require(totalVotes >= proposalThreshold, "Insufficient participation");
        require(proposal.forVotes > proposal.againstVotes, "Proposal rejected");

        proposal.executed = true;

        (bool success, ) = proposal.target.call{value: proposal.value}(proposal.data);
        require(success, "Execution failed");

        emit ProposalExecuted(proposalId);
    }

    function cancelProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.proposer == msg.sender || msg.sender == owner(), "Not authorized");
        require(!proposal.executed && !proposal.cancelled, "Already executed/cancelled");
        require(block.timestamp < proposal.voteStart, "Voting started");

        proposal.cancelled = true;

        emit ProposalCancelled(proposalId);
    }

    function setVotingDelay(uint256 newDelay) external onlyOwner {
        require(newDelay <= 7 days, "Delay too high");
        votingDelay = newDelay;
        emit VotingDelayUpdated(newDelay);
    }

    function setVotingPeriod(uint256 newPeriod) external onlyOwner {
        require(newPeriod >= 1 days && newPeriod <= 30 days, "Invalid period");
        votingPeriod = newPeriod;
        emit VotingPeriodUpdated(newPeriod);
    }

    function setProposalThreshold(uint256 newThreshold) external onlyOwner {
        proposalThreshold = newThreshold;
        emit ProposalThresholdUpdated(newThreshold);
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return proposalVotes[proposalId][voter].voted;
    }

    function getVote(uint256 proposalId, address voter) external view returns (bool support, uint256 weight) {
        Vote memory vote = proposalVotes[proposalId][voter];
        return (vote.support, vote.weight);
    }
}
