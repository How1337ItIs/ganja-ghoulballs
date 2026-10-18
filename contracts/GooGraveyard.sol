// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Accepts safe deposits only from the immutable GanjaGhoulballs redeemer.
/// @dev Raw ERC-721 transferFrom can bypass receiver hooks. Such accidental deposits
///      are permanently locked too, but never count toward minting a GGOO.
/// @dev No owner, arbitrary execution, approval, transfer, withdrawal, or upgrade path exists.
contract GooGraveyard {
    error UnauthorizedDeposit();

    address public immutable originalCollection;
    address public immutable redeemer;

    constructor(address originalCollection_, address redeemer_) {
        originalCollection = originalCollection_;
        redeemer = redeemer_;
    }

    function onERC721Received(address operator, address, uint256, bytes calldata)
        external view returns (bytes4)
    {
        if (msg.sender != originalCollection || operator != redeemer) revert UnauthorizedDeposit();
        return this.onERC721Received.selector;
    }
}
