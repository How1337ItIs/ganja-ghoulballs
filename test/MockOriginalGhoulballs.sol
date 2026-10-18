// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITestReceiver {
    function onERC721Received(address operator, address from, uint256 id, bytes calldata data) external returns (bytes4);
}

/// @dev TEST ONLY. Arbitrary minting/failure knobs must never be deployed as the production source.
contract MockOriginalGhoulballs {
    mapping(uint256 => address) private owners;
    mapping(uint256 => address) public getApproved;
    mapping(address => mapping(address => bool)) public isApprovedForAll;
    uint256 public totalSupply;
    uint256 public failAt;
    uint256 public pretendAt;
    address public callback;
    bytes public callbackData;
    bool public callbackSucceeded;
    uint256 public transferCalls;
    uint256 public stealAt;
    uint256 public stealId;
    bool public supports721 = true;
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    function supportsInterface(bytes4 interfaceId) external view returns (bool) { return supports721 && (interfaceId == 0x80ac58cd || interfaceId == 0x01ffc9a7); }
    function setSupport(bool value) external { supports721 = value; }
    function ownerOf(uint256 id) public view returns (address) { require(owners[id] != address(0), "NONEXISTENT"); return owners[id]; }
    function mintRange(address to, uint256 first, uint256 count) external {
        for (uint256 i; i < count; ++i) { uint256 id = first + i; require(owners[id] == address(0)); owners[id] = to; ++totalSupply; }
    }
    function approve(address to, uint256 id) external { require(ownerOf(id) == msg.sender || isApprovedForAll[ownerOf(id)][msg.sender]); getApproved[id] = to; }
    function setApprovalForAll(address operator, bool value) external { isApprovedForAll[msg.sender][operator] = value; }
    function setSteal(uint256 triggerId, uint256 victimId) external { stealAt = triggerId; stealId = victimId; }
    function setFailure(uint256 id, uint256 pretend) external { failAt = id; pretendAt = pretend; }
    function setCallback(address target, bytes calldata data) external { callback = target; callbackData = data; callbackSucceeded = false; }
    function transferFrom(address from, address to, uint256 id) public {
        require(ownerOf(id) == from && to != address(0), "OWNER");
        require(msg.sender == from || getApproved[id] == msg.sender || isApprovedForAll[from][msg.sender], "APPROVAL");
        require(id != failAt, "TRANSFER_FAIL"); ++transferCalls;
        if (callback != address(0)) { (callbackSucceeded,) = callback.call(callbackData); }
        if (id == pretendAt) return;
        owners[id] = to; delete getApproved[id]; emit Transfer(from, to, id);
        if (id == stealAt) owners[stealId] = from;
    }
    function safeTransferFrom(address from, address to, uint256 id) external {
        transferFrom(from, to, id);
        if (to.code.length != 0) require(ITestReceiver(to).onERC721Received(msg.sender, from, id, "") == 0x150b7a02, "RECEIVER");
    }
    function spoofReceiver(address receiver, address operator, address from, uint256 id) external returns(bytes4) {
        return ITestReceiver(receiver).onERC721Received(operator, from, id, "");
    }
}

interface ITestGoo {
    function mint(uint256[13] calldata ids) external returns(uint256);
    function transferFrom(address from,address to,uint256 id) external;
}

contract MintReceiver {
    uint256 public mode;
    bool public reentrySucceeded;
    bytes public reentryError;
    address public goo;
    uint256[13] private nextIds;
    uint256 public calls;
    function configure(address goo_, uint256 mode_, uint256[13] calldata ids) external { goo = goo_; mode = mode_; nextIds = ids; }
    function redeem(address original, uint256[13] calldata ids) external {
        MockOriginalGhoulballs(original).setApprovalForAll(goo, true);
        ITestGoo(goo).mint(ids);
    }
    function onERC721Received(address, address, uint256 tokenId, bytes calldata) external returns (bytes4) {
        ++calls;
        if (mode == 1) revert("NO_NFT");
        if (mode == 2) return 0xffffffff;
        if (mode == 3) { (reentrySucceeded, reentryError) = goo.call(abi.encodeCall(ITestGoo.mint, (nextIds))); }
        if (mode == 4) ITestGoo(goo).transferFrom(address(this), address(0xBEEF), tokenId);
        return 0x150b7a02;
    }
}

contract NonReceiver {}
contract InterfaceLiar { function supportsInterface(bytes4) external pure returns(bool) {return false;} }

contract ERC721InterfaceStub { function supportsInterface(bytes4 id) external pure returns(bool) { return id == 0x80ac58cd; } }
