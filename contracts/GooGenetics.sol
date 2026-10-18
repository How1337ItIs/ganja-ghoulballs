// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Compact, permanent snapshots of the verified original Ghoulballs recipe.
/// @dev This library never calls tokenURI, imageURI, GIF, or a mutable art service.
library GooGenetics {
    struct Ball { uint256 radius; uint256 xPhase; uint256 yPhase; bytes3 colour; }
    struct Recipe { uint256 seed; uint256 scene; uint256 ballCount; bytes palette; Ball[] balls; uint256 theme; uint256 motion; }

    error InvalidParentRecipe(uint256 tokenId);
    error InvalidParentSet();

    /// @dev Every operation canonicalizes the set, so selection order is irrelevant.
    function canonicalize(uint256[13] memory ids) internal pure returns (uint256[13] memory) {
        unchecked { // Inputs and every loop/sum are bounded by validated parent chromosomes.

        for (uint256 i; i < 13; ++i) {
            if (ids[i] == 0 || ids[i] > 6667) revert InvalidParentSet();
            uint256 value = ids[i]; uint256 j = i;
            while (j > 0 && ids[j - 1] > value) { ids[j] = ids[j - 1]; --j; }
            ids[j] = value;
        }
        for (uint256 i = 1; i < 13; ++i) if (ids[i] == ids[i - 1]) revert InvalidParentSet();
        return ids;
            }
}

    function snapshot(address original, uint256 chainId, uint256[13] memory ids)
        internal view returns (uint256[13] memory genes, bytes32 digest)
    {
        uint256[13] memory seeds;
        for (uint256 i; i < 13; ++i) {
            Recipe memory p = IGhoulballsRecipe(original).recipeOf(ids[i]);
            seeds[i] = uint256(keccak256(abi.encode("SOL_VIDEO_NFT_V1", chainId, original, ids[i])));
            if (p.seed != seeds[i]) revert InvalidParentRecipe(ids[i]);
            genes[i] = pack(p, ids[i]);
        }
        digest = keccak256(abi.encode("GGOO_PARENT_GENETICS_V3", chainId, original, ids, genes, seeds));
    }

    /// @dev Parent word: six RGB24s[0..143], six radius4s[144..167], count8[168..175],
    /// theme8[176..183], motion8[184..191], scene8[192..199], mean sky RGB24[200..223],
    /// mean X phase8[224..231], mean Y phase8[232..239], version8[240..247]=3.
    function pack(Recipe memory p, uint256 tokenId) internal pure returns (uint256 gene) {
        unchecked { // Inputs and every loop/sum are bounded by validated parent chromosomes.

        uint256 count = p.ballCount;
        if ((count != 1 && count != 2 && count != 4 && count != 6) || p.balls.length != count ||
            p.palette.length != 48 || p.theme > 3 || p.motion > 3 ||
            p.scene != (count == 1 ? 7 : count == 2 ? 8 : count == 4 ? 9 : 10)) {
            revert InvalidParentRecipe(tokenId);
        }
        uint256 x; uint256 y;
        for (uint256 i; i < count; ++i) {
            Ball memory b = p.balls[i];
            if (b.radius < 5 || b.radius > 10 || b.xPhase >= 2 * (63 - 2 * b.radius) ||
                b.yPhase >= 2 * (63 - 2 * b.radius) || uint24(b.colour) != rgbAt(p.palette, 24 + i * 3)) {
                revert InvalidParentRecipe(tokenId);
            }
            gene |= uint256(uint24(b.colour)) << (i * 24);
            gene |= b.radius << (144 + i * 4);
            x += b.xPhase; y += b.yPhase;
        }
        uint256 red; uint256 green; uint256 blue;
        for (uint256 i; i < 8; ++i) {
            uint256 c = rgbAt(p.palette, i * 3);
            red += c >> 16; green += (c >> 8) & 255; blue += c & 255;
        }
        uint256 sky = ((red / 8) << 16) | ((green / 8) << 8) | (blue / 8);
        gene |= (count << 168) | (p.theme << 176) | (p.motion << 184) | (p.scene << 192) |
            (sky << 200) | ((x / count) << 224) | ((y / count) << 232) | (uint256(3) << 240);
            }
}

    function rgbAt(bytes memory palette, uint256 offset) internal pure returns (uint24) {
        return (uint24(uint8(palette[offset])) << 16) | (uint24(uint8(palette[offset + 1])) << 8) |
            uint24(uint8(palette[offset + 2]));
    }

    function seed(bytes32 parentDigest, uint256 entropy) internal pure returns (uint256) {
        return uint256(keccak256(abi.encode("GGOO_RANDOM_REVEAL_V3", parentDigest, entropy)));
    }

    /// @dev Each parent contributes equally to the family colour/radius/phase averages
    /// while count/motion/theme recombine paired alleles. Donor colours retain parent hues.
    function combine(uint256[13] memory parents, uint256 finalSeed) internal pure returns (uint256 genome) {
        unchecked { // Inputs and every loop/sum are bounded by validated parent chromosomes.

        uint256[5] memory family = familyValues(parents);
        uint256 bodyDonor = random(finalSeed, 101, 13);
        uint256 accentDonor = (bodyDonor + 1 + random(finalSeed, 102, 12)) % 13;
        uint256 skyDonor = random(finalSeed, 103, 13);
        uint256 bodyBall = random(finalSeed, 104, field(parents[bodyDonor], 168));
        uint256 accentBall = random(finalSeed, 105, field(parents[accentDonor], 168));
        uint256 body = mix((parents[bodyDonor] >> (24 * bodyBall)) & 0xffffff, family[0]);
        uint256 accent = mix((parents[accentDonor] >> (24 * accentBall)) & 0xffffff, family[0]);
        uint256 skyRGB = mix((parents[skyDonor] >> 200) & 0xffffff, family[1]);
        genome = (accent << 24) | (uint256(3) << 104) | (skyRGB << 112) |
            (family[3] << 144) | (family[4] << 152) | (bodyDonor << 160) |
            (accentDonor << 168) | (skyDonor << 176) | (bodyBall << 184) | (accentBall << 192);
        // Each locus draws two distinct parent chromosomes, so allele frequency
        // in the thirteen-parent pool directly weights inheritance. These are
        // artistic dominance rules, not a claim about biological genetics.
        uint256[3] memory locus;
        locus[0] = express(parents, finalSeed, 301, 168);
        locus[1] = express(parents, finalSeed, 311, 184);
        locus[2] = express(parents, finalSeed, 321, 176);
        uint256 radius = family[2];
        uint256 count = locus[0] & 255; uint256 motion = locus[1] & 255; uint256 flags;
        // Bounded one-shot mutations. These consume final entropy, never mint order.
        if (random(finalSeed, 201, 8) == 0) {
            uint256 category = count == 1 ? 0 : count == 2 ? 1 : count == 4 ? 2 : 3;
            if (category == 0) category = 1;
            else if (category == 3) category = 2;
            else category = random(finalSeed, 202, 2) == 0 ? category - 1 : category + 1;
            count = category == 0 ? 1 : category == 1 ? 2 : category == 2 ? 4 : 6;
            flags |= 1;
        }
        if (random(finalSeed, 203, 10) == 0) { motion = (motion + 1 + random(finalSeed, 204, 3)) % 4; flags |= 2; }
        if (random(finalSeed, 205, 5) == 0) { body = tint(body, random(finalSeed, 206, 2) == 0); flags |= 4; }
        if (random(finalSeed, 207, 10) == 0) {
            if (radius == 5) ++radius;
            else if (radius == 10) --radius;
            else radius = random(finalSeed, 208, 2) == 0 ? radius - 1 : radius + 1;
            flags |= 8;
        }
        uint256 scene = ((locus[2] & 255) + random(finalSeed, 209, 2) * 4) % 6;
        genome |= body | (count << 48) | (scene << 56) | (motion << 64) |
            (radius << 72) | (flags << 80) | ((locus[0] & 255) << 88) | ((locus[1] & 255) << 96) |
            ((locus[2] & 255) << 136) | ((locus[0] >> 8) << 200) |
            ((locus[1] >> 8) << 216) | ((locus[2] >> 8) << 232);
            }
}

    function familyValues(uint256[13] memory parents) internal pure returns (uint256[5] memory values) {
        unchecked { // Inputs and every loop/sum are bounded by validated parent chromosomes.

        uint256[9] memory sums;
        for (uint256 i; i < 13; ++i) {
            uint256 p = parents[i]; uint256 n = field(p, 168);
            uint256 r; uint256 g; uint256 b; uint256 radius;
            for (uint256 j; j < n; ++j) {
                uint256 c = (p >> (24 * j)) & 0xffffff;
                r += c >> 16; g += (c >> 8) & 255; b += c & 255;
                radius += (p >> (144 + 4 * j)) & 15;
            }
            sums[0] += r / n; sums[1] += g / n; sums[2] += b / n;
            uint256 sky = (p >> 200) & 0xffffff;
            sums[3] += sky >> 16; sums[4] += (sky >> 8) & 255; sums[5] += sky & 255;
            sums[6] += radius * 100 / n;
            sums[7] += field(p, 224); sums[8] += field(p, 232);
        }
        values[0] = ((sums[0] / 13) << 16) | ((sums[1] / 13) << 8) | (sums[2] / 13);
        values[1] = ((sums[3] / 13) << 16) | ((sums[4] / 13) << 8) | (sums[5] / 13);
        values[2] = (sums[6] + 650) / 1300; values[3] = sums[7] / 13; values[4] = sums[8] / 13;
            }
}

    function field(uint256 word, uint256 offset) internal pure returns (uint256) { return (word >> offset) & 255; }
    function random(uint256 s, uint256 domain, uint256 max) internal pure returns (uint256) {
        return uint256(keccak256(abi.encode(s, domain))) % max;
    }
    /// @dev Count dominance 2 > 4 > 1 > 6; motion/theme dominance 0 > 1 > 2 > 3.
    /// Homozygotes express their shared allele; heterozygotes express the dominant
    /// allele 3/4 of the time and the recessive allele 1/4, before rare mutation.
    function express(uint256[13] memory parents, uint256 s, uint256 domain, uint256 offset)
        internal pure returns (uint256 result)
    {
        uint256 a = random(s, domain, 13); uint256 b = (a + 1 + random(s, domain + 1, 12)) % 13;
        uint256 x = field(parents[a], offset); uint256 y = field(parents[b], offset);
        uint256 rankX = offset == 168 ? (x == 2 ? 0 : x == 4 ? 1 : x == 1 ? 2 : 3) : x;
        uint256 rankY = offset == 168 ? (y == 2 ? 0 : y == 4 ? 1 : y == 1 ? 2 : 3) : y;
        bool dominant = random(s, domain + 2, 4) != 0;
        uint256 value = rankX <= rankY ? (dominant ? x : y) : (dominant ? y : x);
        result = value | (a << 8) | (b << 16);
    }
    /// @dev 75% actual donor hue and 25% family average, independently per RGB channel.
    function mix(uint256 donor, uint256 family) internal pure returns (uint256 c) {
        unchecked { // Inputs and every loop/sum are bounded by validated parent chromosomes.

        for (uint256 i; i < 24; i += 8) c |= ((((donor >> i) & 255) * 3 + ((family >> i) & 255)) / 4) << i;
            }
}
    /// @dev Rare +8/-8 tint, clamped instead of wrapping colour channels.
    function tint(uint256 c, bool lighter) internal pure returns (uint256 out) {
        unchecked { // Inputs and every loop/sum are bounded by validated parent chromosomes.

        for (uint256 i; i < 24; i += 8) {
            uint256 v = (c >> i) & 255;
            v = lighter ? (v > 247 ? 255 : v + 8) : (v < 8 ? 0 : v - 8);
            out |= v << i;
        }
            }
}
}

interface IGhoulballsRecipe {
    function recipeOf(uint256 tokenId) external view returns (GooGenetics.Recipe memory);
}
