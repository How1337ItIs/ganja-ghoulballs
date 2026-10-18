// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {GooGraveyard} from "./GooGraveyard.sol";
import {GooRenderer} from "./GooRenderer.sol";

interface IOriginalGhoulballs {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getApproved(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

interface IGooReceiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data)
        external returns (bytes4);
}

/// @notice Exactly 420 native SVG NFTs, each minted only by locking 13 Base Ghoulballs forever.
/// @dev Self-contained ERC-721 implementation, immutable renderer and vault; no privileged functions.
contract GanjaGhoulballs {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event GhoulballsSacrificed(address indexed redeemer, uint256 indexed gooId, uint256[13] originalIds);

    error WrongNetworkSource();
    error InvalidOriginal();
    error UnsupportedChain();
    error IngredientNotApproved(uint256 tokenId);
    error IngredientNotLocked(uint256 tokenId);
    error SoldOut();
    error WrongIngredientOrder();
    error NotIngredientOwner(uint256 tokenId);
    error Reentered();
    error ZeroAddress();
    error NonexistentToken();
    error NotAuthorized();
    error WrongFrom();
    error NonReceiver();

    string public constant name = "Ganja Ghoulballs";
    string public constant symbol = "GGOO";
    string public constant ART_VERSION = "GANJA_GHOULBALLS_PIXEL_GOO_V2";
    uint256 public constant MAX_SUPPLY = 420;
    uint256 public constant SACRIFICE_COUNT = 13;
    address public constant BASE_ORIGINAL = 0xf3654D0ce6CF518F4eFbbe490F4a26483FB0969C;
    uint256 public immutable deploymentChainId;

    IOriginalGhoulballs public immutable originalCollection;
    GooGraveyard public immutable graveyard;
    GooRenderer public immutable renderer;

    uint256 public totalSupply;
    uint256 private _lock = 1;
    mapping(uint256 => uint256) public packedIngredients;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _approvals;
    mapping(address => mapping(address => bool)) private _operators;

    constructor(address original_) {
        // Production is permanently bound to the original Base collection. The only
        // other supported networks are Base Sepolia and a local development chain.
        if (block.chainid != 8453 && block.chainid != 84532 && block.chainid != 31337) {
            revert UnsupportedChain();
        }
        if (block.chainid == 8453 && original_ != BASE_ORIGINAL) revert WrongNetworkSource();
        if (original_ == address(0) || original_.code.length == 0) revert InvalidOriginal();
        try IOriginalGhoulballs(original_).supportsInterface(0x80ac58cd) returns (bool supported) {
            if (!supported) revert InvalidOriginal();
        } catch { revert InvalidOriginal(); }
        deploymentChainId = block.chainid;
        originalCollection = IOriginalGhoulballs(original_);
        graveyard = new GooGraveyard(original_, address(this));
        renderer = new GooRenderer();
    }

    /// @notice All 13 originals are transferred atomically before a GGOO is minted.
    /// @dev IDs MUST be strictly ascending; once deposited, originals are permanently inaccessible.
    function mint(uint256[13] calldata originalIds) external returns (uint256 tokenId) {
        if (_lock != 1) revert Reentered();
        _lock = 2;
        if (totalSupply >= MAX_SUPPLY) revert SoldOut();
        bool approvedForAll = originalCollection.isApprovedForAll(msg.sender, address(this));
        uint256 previous;
        uint256 packed;
        for (uint256 i; i < 13; ++i) {
            uint256 id = originalIds[i];
            if (id == 0 || id > 6667 || id <= previous) revert WrongIngredientOrder();
            if (originalCollection.ownerOf(id) != msg.sender) revert NotIngredientOwner(id);
            if (!approvedForAll && originalCollection.getApproved(id) != address(this)) {
                revert IngredientNotApproved(id);
            }
            packed |= id << (i * 16);
            previous = id;
        }
        for (uint256 i; i < 13; ++i) {
            originalCollection.safeTransferFrom(msg.sender, address(graveyard), originalIds[i]);
        }
        // A successful call alone is insufficient: every ingredient must now be
        // in the permanent vault before issuing the new token. Any failure rolls
        // back the entire transaction, including all original NFT transfers.
        for (uint256 i; i < SACRIFICE_COUNT; ++i) {
            if (originalCollection.ownerOf(originalIds[i]) != address(graveyard)) {
                revert IngredientNotLocked(originalIds[i]);
            }
        }
        tokenId = ++totalSupply;
        packedIngredients[tokenId] = packed;
        _owners[tokenId] = msg.sender;
        _balances[msg.sender]++;
        emit Transfer(address(0), msg.sender, tokenId);
        emit GhoulballsSacrificed(msg.sender, tokenId, originalIds);
        _checkReceiver(address(0), msg.sender, tokenId, "");
        _lock = 1;
    }

    function ingredientsOf(uint256 tokenId) external view returns (uint256[13] memory ids) {
        ownerOf(tokenId);
        uint256 packed = packedIngredients[tokenId];
        for (uint256 i; i < 13; ++i) ids[i] = (packed >> (i * 16)) & 0xffff;
    }

    function seedOf(uint256 tokenId) public view returns (uint256) {
        ownerOf(tokenId);
        return uint256(keccak256(abi.encode("GANJA_GHOULBALLS_PIXEL_GOO_V2", deploymentChainId, address(this), tokenId, packedIngredients[tokenId])));
    }

    function svg(uint256 tokenId) public view returns (string memory) {
        return renderer.svg(seedOf(tokenId), tokenId, true);
    }

    function svgStill(uint256 tokenId) external view returns (string memory) {
        return renderer.svg(seedOf(tokenId), tokenId, false);
    }

    function traitsOf(uint256 tokenId) external view returns (string memory) {
        return renderer.attributes(seedOf(tokenId));
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        uint256 seed = seedOf(tokenId);
        string memory image = string.concat("data:image/svg+xml;base64,", GooBase64.encode(bytes(renderer.svg(seed, tokenId, true))));
        string memory json = string.concat(
            '{"name":"Ganja Ghoulballs #', GooNumbers.toString(tokenId),
            '","description":"One of 420 fully onchain animated goo ghosts. Summoned by permanently locking 13 original Ghoulballs on Base. They cannot be recovered. Unaffiliated with the original project.",',
            '"image":"', image, '","attributes":', renderer.attributes(seed),
            ',"properties":{"sacrifice":"13 original Ghoulballs irrevocably locked in immutable GooGraveyard","graveyard":"',
            GooNumbers.toHexAddress(address(graveyard)),
            '","original_collection":"', GooNumbers.toHexAddress(address(originalCollection)),
            '","chain_id":', GooNumbers.toString(deploymentChainId),
            ',"original_ids":', _ingredientsJSON(tokenId), '}}' 
        );
        return string.concat("data:application/json;base64,", GooBase64.encode(bytes(json)));
    }

    function _ingredientsJSON(uint256 tokenId) private view returns (string memory result) {
        result = "[";
        uint256 packed = packedIngredients[tokenId];
        for (uint256 i; i < SACRIFICE_COUNT; ++i) {
            result = string.concat(result, i == 0 ? "" : ",", GooNumbers.toString((packed >> (i * 16)) & 0xffff));
        }
        return string.concat(result, "]");
    }

    function ownerOf(uint256 tokenId) public view returns (address owner) {
        owner = _owners[tokenId];
        if (owner == address(0)) revert NonexistentToken();
    }

    function balanceOf(address owner) public view returns (uint256) {
        if (owner == address(0)) revert ZeroAddress();
        return _balances[owner];
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        ownerOf(tokenId);
        return _approvals[tokenId];
    }

    function isApprovedForAll(address owner, address operator) public view returns (bool) {
        return _operators[owner][operator];
    }

    function approve(address approved, uint256 tokenId) external {
        address owner = ownerOf(tokenId);
        if (msg.sender != owner && !_operators[owner][msg.sender]) revert NotAuthorized();
        _approvals[tokenId] = approved;
        emit Approval(owner, approved, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operators[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        address owner = ownerOf(tokenId);
        if (owner != from) revert WrongFrom();
        if (to == address(0)) revert ZeroAddress();
        if (msg.sender != owner && msg.sender != _approvals[tokenId] && !_operators[owner][msg.sender]) {
            revert NotAuthorized();
        }
        delete _approvals[tokenId];
        --_balances[from];
        ++_balances[to];
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
        _checkReceiver(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external {
        transferFrom(from, to, tokenId);
        _checkReceiver(from, to, tokenId, data);
    }

    function _checkReceiver(address from, address to, uint256 tokenId, bytes memory data) private {
        if (to.code.length == 0) return;
        try IGooReceiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 ret) {
            if (ret != IGooReceiver.onERC721Received.selector) revert NonReceiver();
        } catch {
            revert NonReceiver();
        }
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x80ac58cd || interfaceId == 0x5b5e139f;
    }
}

library GooNumbers {
    bytes16 private constant HEX = "0123456789abcdef";

    function toString(uint256 x) internal pure returns (string memory) {
        if (x == 0) return "0";
        uint256 n = x;
        uint256 len;
        while (n != 0) { ++len; n /= 10; }
        bytes memory str = new bytes(len);
        while (x != 0) { str[--len] = bytes1(uint8(48 + x % 10)); x /= 10; }
        return string(str);
    }

    function toHexAddress(address a) internal pure returns (string memory) {
        bytes memory s = new bytes(42);
        s[0] = '0'; s[1] = 'x';
        uint160 x = uint160(a);
        for (uint256 i; i < 40; ++i) {
            s[41 - i] = HEX[x & 0xf];
            x >>= 4;
        }
        return string(s);
    }
}

library GooBase64 {
    bytes internal constant TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    /// @dev Base64 encodes in 3-byte groups. Padding masks avoid depending on
    ///      bytes beyond the input length; outputs are allocated and bounded.
    function encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        bytes memory table = TABLE;
        bytes memory output = new bytes(4 * ((data.length + 2) / 3));
        assembly {
            let length := mload(data)
            let tablePtr := add(table, 1)
            let resultPtr := add(output, 32)
            for { let i := 0 } lt(i, length) { i := add(i, 3) } {
                let n := mload(add(add(data, i), 3))
                switch sub(length, i)
                case 1 { n := and(n, 0xff0000) }
                case 2 { n := and(n, 0xffff00) }
                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, n), 63))))
                mstore8(add(resultPtr, 1), mload(add(tablePtr, and(shr(12, n), 63))))
                mstore8(add(resultPtr, 2), mload(add(tablePtr, and(shr(6, n), 63))))
                mstore8(add(resultPtr, 3), mload(add(tablePtr, and(n, 63))))
                resultPtr := add(resultPtr, 4)
            }
            switch mod(length, 3)
            case 1 { mstore8(sub(resultPtr, 2), 61) mstore8(sub(resultPtr, 1), 61) }
            case 2 { mstore8(sub(resultPtr, 1), 61) }
        }
        return string(output);
    }
}
