// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {GooGraveyard} from "./GooGraveyard.sol";
import {GooRenderer} from "./GooRenderer.sol";
import {GooGenetics} from "./GooGenetics.sol";

interface IGooVRFWrapper {
    function calculateRequestPriceNative(uint32 callbackGasLimit, uint32 numWords) external view returns (uint256);
    function requestRandomWordsInNative(uint32 callbackGasLimit, uint16 requestConfirmations, uint32 numWords, bytes calldata extraArgs) external payable returns (uint256 requestId);
}

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

    event RandomnessRequested(uint256 indexed tokenId, uint256 indexed requestId, uint256 paid);
    event RandomnessReceived(uint256 indexed tokenId, uint256 indexed requestId);
    event MetadataUpdate(uint256 tokenId);
    event ReserveDonated(address indexed donor, uint256 amount);

    error InvalidWrapper();
    error InvalidPriceCap();
    error RequestTooExpensive();
    error ReserveInsufficient();
    error InvalidRequestId();
    error OnlyWrapper();
    error RevealPending();
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
    string public constant ART_VERSION = "GANJA_GHOULBALLS_INHERITED_GOO_V3";
    uint256 public constant MAX_SUPPLY = 420;
    uint256 public constant SACRIFICE_COUNT = 13;
    address public constant BASE_ORIGINAL = 0xf3654D0ce6CF518F4eFbbe490F4a26483FB0969C;
    address public constant BASE_WRAPPER = 0xb0407dbe851f8318bd31404A49e658143C982F23;
    bytes32 private constant BASE_ORIGINAL_CODEHASH = 0x4fe189e2554350c36d652e3573f8bbd0dc3b45c99a4bf799998623339ab3873a;
    bytes32 private constant BASE_WRAPPER_CODEHASH = 0x469c7e3d9661f7d7e41033d44b6198bcfdc4a501b0a9466a395f7842f02a2a8f;
    address public constant BASE_PARENT_RENDERER = 0x5902E513C974f5d644DDe577b46626a4BF7CEB30;
    bytes32 private constant BASE_PARENT_RENDERER_CODEHASH = 0x39d1a5801e46373b0ec825b695c523d0c50bf2a823db9457ef066f4f2c2d11ad;
    uint32 public constant CALLBACK_GAS_LIMIT = 100000;
    uint16 public constant REQUEST_CONFIRMATIONS = 3;
    uint32 public constant NUM_WORDS = 1;
    uint256 public immutable deploymentChainId;
    IGooVRFWrapper public immutable vrfWrapper;
    uint256 public immutable maxRequestPrice;

    IOriginalGhoulballs public immutable originalCollection;
    GooGraveyard public immutable graveyard;
    GooRenderer public immutable renderer;

    uint256 public totalSupply;
    uint256 private _lock = 1;
    mapping(uint256 => uint256) public packedIngredients;
    mapping(uint256 => uint256) public mintBlockOf;
    mapping(uint256 => address) public mintedBy;
    mapping(uint256 => uint256[13]) private _parentGenes;
    mapping(uint256 => bytes32) public parentDigestOf;
    mapping(uint256 => uint256) public requestIdOf;
    mapping(uint256 => uint256) public requestPaid;
    mapping(uint256 => uint256) public requestToken;
    mapping(uint256 => uint256) public randomWordOf;
    mapping(uint256 => bool) public revealed;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _approvals;
    mapping(address => mapping(address => bool)) private _operators;

    constructor(address original_, address wrapper_, uint256 maxRequestPriceWei_) {
        // Production is permanently bound to the original Base collection. The only
        // other supported networks are Base Sepolia and a local development chain.
        if (block.chainid != 8453 && block.chainid != 84532 && block.chainid != 31337) {
            revert UnsupportedChain();
        }
        if (block.chainid == 8453 && original_ != BASE_ORIGINAL) revert WrongNetworkSource();
        if (block.chainid == 8453 && (original_.codehash != BASE_ORIGINAL_CODEHASH ||
            BASE_PARENT_RENDERER.codehash != BASE_PARENT_RENDERER_CODEHASH)) revert InvalidOriginal();
        if (wrapper_.code.length == 0 || (block.chainid == 8453 &&
            (wrapper_ != BASE_WRAPPER || wrapper_.codehash != BASE_WRAPPER_CODEHASH))) revert InvalidWrapper();
        if (maxRequestPriceWei_ == 0 || maxRequestPriceWei_ > 0.0001 ether) revert InvalidPriceCap();
        vrfWrapper = IGooVRFWrapper(wrapper_);
        maxRequestPrice = maxRequestPriceWei_;
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
    /// @dev Any input order is canonicalized. Originals and genetics are committed
    /// before the paid VRF request. A failure anywhere rolls back the entire mint.
    function mint(uint256[13] calldata selectedIds) external returns (uint256 tokenId) {
        if (_lock != 1) revert Reentered();
        _lock = 2;
        if (totalSupply >= MAX_SUPPLY) revert SoldOut();
        uint256 price = quoteRandomness();
        if (price > maxRequestPrice) revert RequestTooExpensive();
        if (address(this).balance < price) revert ReserveInsufficient();
        uint256[13] memory originalIds = GooGenetics.canonicalize(selectedIds);
        bool approvedForAll = originalCollection.isApprovedForAll(msg.sender, address(this));
        uint256 packed;
        for (uint256 i; i < 13; ++i) {
            uint256 id = originalIds[i];
            if (originalCollection.ownerOf(id) != msg.sender) revert NotIngredientOwner(id);
            if (!approvedForAll && originalCollection.getApproved(id) != address(this)) {
                revert IngredientNotApproved(id);
            }
            packed |= id << (i * 16);
        }
        (uint256[13] memory genes, bytes32 digest) = GooGenetics.snapshot(address(originalCollection), deploymentChainId, originalIds);
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
        mintBlockOf[tokenId] = block.number;
        mintedBy[tokenId] = msg.sender;
        _parentGenes[tokenId] = genes;
        parentDigestOf[tokenId] = digest;
        // Native direct funding matches Chainlink's official wrapper ABI. The
        // wrapper is an external service; no admin, retries, or entropy fallback.
        uint256 requestId = vrfWrapper.requestRandomWordsInNative{value: price}(
            CALLBACK_GAS_LIMIT, REQUEST_CONFIRMATIONS, NUM_WORDS,
            abi.encodeWithSelector(bytes4(keccak256("VRF ExtraArgsV1")), true)
        );
        if (requestId == 0 || requestToken[requestId] != 0) revert InvalidRequestId();
        requestToken[requestId] = tokenId;
        requestIdOf[tokenId] = requestId;
        requestPaid[tokenId] = price;
        emit RandomnessRequested(tokenId, requestId, price);
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

    /// @notice Anyone may sponsor future requests. Donations and leftovers cannot be withdrawn.
    receive() external payable { emit ReserveDonated(msg.sender, msg.value); }

    function quoteRandomness() public view returns (uint256) {
        return vrfWrapper.calculateRequestPriceNative(CALLBACK_GAS_LIMIT, NUM_WORDS);
    }

    /// @dev Constant-work callback: no art, recombination, receiver, or external call.
    /// Unknown, duplicate, or malformed callbacks are ignored, never rerolled.
    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external {
        if (msg.sender != address(vrfWrapper)) revert OnlyWrapper();
        uint256 tokenId = requestToken[requestId];
        if (tokenId == 0 || revealed[tokenId] || randomWords.length != 1) return;
        randomWordOf[tokenId] = randomWords[0];
        revealed[tokenId] = true;
        emit RandomnessReceived(tokenId, requestId);
        emit MetadataUpdate(tokenId);
    }

    function parentGenesOf(uint256 tokenId) external view returns (uint256[13] memory) {
        ownerOf(tokenId); return _parentGenes[tokenId];
    }

    function lineageOf(uint256 tokenId) external view returns (uint256[13] memory ids, uint256[13] memory genes, bytes32 digest) {
        ownerOf(tokenId);
        uint256 packed = packedIngredients[tokenId];
        for (uint256 i; i < 13; ++i) ids[i] = (packed >> (i * 16)) & 0xffff;
        return (ids, _parentGenes[tokenId], parentDigestOf[tokenId]);
    }

    function seedOf(uint256 tokenId) public view returns (uint256) {
        ownerOf(tokenId);
        if (!revealed[tokenId]) revert RevealPending();
        return GooGenetics.seed(parentDigestOf[tokenId], randomWordOf[tokenId]);
    }

    function genomeOf(uint256 tokenId) public view returns (uint256) {
        return GooGenetics.combine(_parentGenes[tokenId], seedOf(tokenId));
    }

    function svg(uint256 tokenId) public view returns (string memory) {
        ownerOf(tokenId);
        if (!revealed[tokenId]) return renderer.pendingSvg(tokenId, mintBlockOf[tokenId], mintedBy[tokenId]);
        return renderer.svg(seedOf(tokenId), genomeOf(tokenId), tokenId, mintBlockOf[tokenId], mintedBy[tokenId], true);
    }

    function svgStill(uint256 tokenId) external view returns (string memory) {
        ownerOf(tokenId);
        if (!revealed[tokenId]) return renderer.pendingSvg(tokenId, mintBlockOf[tokenId], mintedBy[tokenId]);
        return renderer.svg(seedOf(tokenId), genomeOf(tokenId), tokenId, mintBlockOf[tokenId], mintedBy[tokenId], false);
    }

    function traitsOf(uint256 tokenId) public view returns (string memory) {
        ownerOf(tokenId);
        if (!revealed[tokenId]) return '[{"trait_type":"Reveal","value":"Pending Chainlink VRF"}]';
        return renderer.attributes(seedOf(tokenId), genomeOf(tokenId));
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        string memory image = string.concat("data:image/svg+xml;base64,", GooBase64.encode(bytes(svg(tokenId))));
        string memory json = string.concat(
            '{"name":"Ganja Ghoulballs #', GooNumbers.toString(tokenId),
            '\","description":"Onchain goo ghost inheriting DNA-inspired traits from 13 permanently locked Ghoulballs, with one-shot Chainlink VRF recombination. Artistic genetics. Unaffiliated.",',
            '"image":"', image, '","attributes":', traitsOf(tokenId),
            ',"properties":{"sacrifice":"13 original Ghoulballs irrevocably locked in immutable GooGraveyard","graveyard":"',
            GooNumbers.toHexAddress(address(graveyard)),
            '","original_collection":"', GooNumbers.toHexAddress(address(originalCollection)),
            '","chain_id":', GooNumbers.toString(deploymentChainId),
            ',"mint_block":"', GooNumbers.toString(mintBlockOf[tokenId]), '"',
            ',"minted_by":"', GooNumbers.toHexAddress(mintedBy[tokenId]), '"',
            ',"revealed":', revealed[tokenId] ? "true" : "false",
            ',"request_id":"', GooNumbers.toString(requestIdOf[tokenId]),
            '","genome":"', GooNumbers.toString(revealed[tokenId] ? genomeOf(tokenId) : 0),
            '","parent_genes":', _parentGenesJSON(tokenId),
            ',"original_ids":', _ingredientsJSON(tokenId), '}}'
        );
        return string.concat("data:application/json;base64,", GooBase64.encode(bytes(json)));
    }

    function _parentGenesJSON(uint256 tokenId) private view returns (string memory result) {
        result = "[";
        for (uint256 i; i < 13; ++i) {
            result = string.concat(result, i == 0 ? "" : ",", '\"', GooNumbers.toString(_parentGenes[tokenId][i]), '\"');
        }
        return string.concat(result, "]");
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
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x80ac58cd || interfaceId == 0x5b5e139f || interfaceId == 0x49064906;
    }
}

library GooNumbers {
    bytes16 private constant HEX = "0123456789abcdef";

    function toString(uint256 x) internal pure returns (string memory) {
        unchecked { // A uint256 has at most78 decimal digits; both loops strictly decrease.

        if (x == 0) return "0";
        uint256 n = x;
        uint256 len;
        while (n != 0) { ++len; n /= 10; }
        bytes memory str = new bytes(len);
        while (x != 0) { str[--len] = bytes1(uint8(48 + x % 10)); x /= 10; }
        return string(str);
            }
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
        assembly ("memory-safe") {
            let length := mload(data)
            let tablePtr := add(table, 1)
            let resultPtr := add(output, 32)
            for { let i := 0 } lt(i, length) { i := add(i, 3) } {
                let n := 0
                switch sub(length, i)
                // Load ending exactly at the final input byte, never past it.
                case 1 { n := shl(16, and(mload(add(data, length)), 0xff)) }
                case 2 { n := shl(8, and(mload(add(data, length)), 0xffff)) }
                default { n := mload(add(add(data, i), 3)) }
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
