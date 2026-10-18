// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IGhoulballs {
    function mintTo(address recipient) external returns (uint256);
    function totalSupply() external view returns (uint256);
}

// Creates a fresh address that uses its single eligible mint for `recipient`.
// No NFTs are ever held by this contract.
contract SingleMint {
    constructor(address recipient) {
        IGhoulballs(0xf3654D0ce6CF518F4eFbbe490F4a26483FB0969C).mintTo(recipient);
    }
}

// Constructor-only batch: deploy once, mint all in the SAME wallet confirmation.
// It is non-payable, stores no NFTs and grants no approvals or admin powers.
contract GhoulBatchDeploy {
    constructor(uint256 quantity) {
        require(block.chainid == 8453, "Base only");
        require(quantity > 0 && quantity <= 30, "Choose 1-30");
        IGhoulballs collection = IGhoulballs(0xf3654D0ce6CF518F4eFbbe490F4a26483FB0969C);
        require(collection.totalSupply() + quantity <= 6667, "Not enough left");
        for (uint256 i; i < quantity; ) {
            new SingleMint(msg.sender);
            unchecked { ++i; }
        }
    }
}
