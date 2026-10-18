// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {GooGenetics} from "./GooGenetics.sol";
interface IRecipeRenderer { function recipe(uint256 seed) external view returns (GooGenetics.Recipe memory); }

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
    address public recipeRenderer;
    uint256 public recipeFault;
    function setRecipeRenderer(address renderer_) external { recipeRenderer = renderer_; }
    function setRecipeFault(uint256 fault_) external { recipeFault = fault_; }
    function seedOf(uint256 id) public view returns (uint256) {
        ownerOf(id);
        return uint256(keccak256(abi.encode("SOL_VIDEO_NFT_V1", block.chainid, address(this), id)));
    }
    function recipeOf(uint256 id) external view returns (GooGenetics.Recipe memory p) {
        if (recipeFault == 10) revert("RECIPE_FAIL");
        uint256 seed = seedOf(id);
        if (recipeRenderer != address(0)) p = IRecipeRenderer(recipeRenderer).recipe(seed);
        else {
            uint256 key = uint256(keccak256(abi.encode("GHOULBALLS_VAPOR_V3", seed)));
            p.seed = seed; p.scene = 7 + key % 4;
            p.ballCount = p.scene == 7 ? 1 : p.scene == 8 ? 2 : p.scene == 9 ? 4 : 6;
            p.theme = (key >> 8) % 4; p.motion = (key >> 16) % 4;
            p.palette = new bytes(48);
            for (uint256 i; i < 48; ++i) p.palette[i] = bytes1(uint8(uint256(keccak256(abi.encode(seed, i)))));
            p.balls = new GooGenetics.Ball[](p.ballCount);
            for (uint256 i; i < p.ballCount; ++i) {
                uint256 h = uint256(keccak256(abi.encode(seed, i)));
                uint256 radius = 5 + (h >> 24) % 6;
                uint256 period = 2 * (63 - 2 * radius);
                p.balls[i] = GooGenetics.Ball(radius, (h >> 40) % period, (h >> 72) % period, bytes3(GooGenetics.rgbAt(p.palette, 24 + i * 3)));
            }
        }
        if (recipeFault == 1) p.seed += 1;
        if (recipeFault == 2) p.palette = new bytes(47);
        if (recipeFault == 3) p.balls[0].radius = 11;
        if (recipeFault == 4) p.balls[0].colour = bytes3(uint24(p.balls[0].colour) ^ 1);
        if (recipeFault == 5) p.theme = 4;
        if (recipeFault == 6) p.motion = 4;
        if (recipeFault == 7) p.balls[0].xPhase = 255;
        if (recipeFault == 8) p.scene = 0;
        if (recipeFault == 9) p.ballCount = 3;
    }
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

contract GeneticsHarness {
    function canonicalize(uint256[13] memory ids) external pure returns (uint256[13] memory) { return GooGenetics.canonicalize(ids); }
    function snapshot(address original, uint256 chainId, uint256[13] memory ids) external view returns (uint256[13] memory genes, bytes32 digest) {
        return GooGenetics.snapshot(original, chainId, GooGenetics.canonicalize(ids));
    }
    function combine(uint256[13] memory parents, uint256 finalSeed) external pure returns (uint256) { return GooGenetics.combine(parents, finalSeed); }
    function seed(bytes32 digest, uint256 entropy) external pure returns(uint256) { return GooGenetics.seed(digest, entropy); }
    function pack(GooGenetics.Recipe memory recipe, uint256 id) external pure returns(uint256) { return GooGenetics.pack(recipe, id); }
}

interface IVRFCallback { function rawFulfillRandomWords(uint256 requestId, uint256[] calldata words) external; }
contract MockVRFWrapper {
    uint256 public price = 1000000000000;
    uint256 public nextRequestId = 1;
    uint256 public requests;
    uint256 public mode;
    address public reentryTarget;
    bytes public reentryData;
    bool public reentrySucceeded;
    mapping(uint256 => address) public consumer;
    function setPrice(uint256 price_) external { price = price_; }
    function setMode(uint256 mode_) external { mode = mode_; }
    function setNextRequestId(uint256 id) external { nextRequestId = id; }
    function setReentry(address target, bytes calldata data) external { reentryTarget=target; reentryData=data; }
    function calculateRequestPriceNative(uint32 gasLimit, uint32 words) external view returns (uint256) {
        require(gasLimit == 100000 && words == 1, "PARAMS");
        require(mode != 1, "QUOTE_FAIL"); return price;
    }
    function requestRandomWordsInNative(uint32 gasLimit, uint16 confirmations, uint32 words, bytes calldata extraArgs)
        external payable returns (uint256 id)
    {
        require(gasLimit==100000 && confirmations==3 && words==1, "PARAMS");
        require(keccak256(extraArgs)==keccak256(abi.encodeWithSelector(bytes4(keccak256("VRF ExtraArgsV1")),true)), "NATIVE_ARGS");
        require(msg.value==price && mode!=2, "REQUEST_FAIL");
        ++requests; id=nextRequestId++; consumer[id]=msg.sender;
        if(reentryTarget!=address(0)) (reentrySucceeded,)=reentryTarget.call(reentryData);
        if(mode==3) { uint256[] memory w=new uint256[](1);w[0]=7; IVRFCallback(msg.sender).rawFulfillRandomWords(id,w); }
    }
    function fulfill(uint256 id, uint256[] calldata words) external {
        IVRFCallback(consumer[id]).rawFulfillRandomWords(id,words);
    }
    function fulfillTo(address target, uint256 id, uint256[] calldata words) external {
        IVRFCallback(target).rawFulfillRandomWords(id,words);
    }
}
