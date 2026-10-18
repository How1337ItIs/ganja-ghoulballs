// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Original, immutable pixel-edged ghoul confection artwork. All SVG geometry,
///         palette choices, animation and traits are generated onchain. No external assets.
contract GooRenderer {
    GooBackdrop public immutable backdrop;
    constructor() { backdrop = new GooBackdrop(); }

    struct Paint { string body; string shade; string light; string bone; string dark; }

    function _u(uint256 n) internal pure returns (string memory) {
        if (n == 0) return "0";
        // A uint256 has at most78 decimal digits; every digit is0..9.
        unchecked {
            uint256 v = n; uint256 len;
            while (v != 0) { ++len; v /= 10; }
            bytes memory out = new bytes(len);
            while (n != 0) { out[--len] = bytes1(uint8(48 + n % 10)); n /= 10; }
            return string(out);
        }
    }
    function _r(uint256 seed, uint256 domain, uint256 max) internal pure returns (uint256) {
        return uint256(keccak256(abi.encode(seed, domain))) % max;
    }
    /// @notice Packed inherited genome count, bounded even for arbitrary public renderer inputs.
    function ballCount(uint256 genome) public pure returns (uint256) {
        uint256 n = (genome >> 48) & 255;
        return n == 2 || n == 4 || n == 6 ? n : 1;
    }
    function _gold(uint256 seed) internal pure returns (bool) {
        return _r(seed, 43, 10000) < 42;
    }
    function _rgb(uint256 colour) internal pure returns (string memory) {
        bytes memory out = new bytes(7); out[0] = '#';
        bytes16 digits = '0123456789abcdef';
        // Six bounded hex nibbles, independent of input magnitude.
        unchecked { for (uint256 i; i < 6; ++i) out[6-i] = digits[(colour >> (i*4)) & 15]; }
        return string(out);
    }
    function _blend(uint256 a, uint256 b, uint256 weightB) internal pure returns (uint256 colour) {
        for (uint256 i; i < 3; ++i) {
            uint256 shift = i*8;
            colour |= ((((a >> shift) & 255)*(256-weightB) + ((b >> shift) & 255)*weightB)/256) << shift;
        }
    }
    function _radius(uint256 genome) internal pure returns (uint256) {
        uint256 r = (genome >> 72) & 255;
        return r < 5 ? 5 : r > 10 ? 10 : r;
    }
    function _theme(uint256 genome) internal pure returns (uint256) { return (genome >> 136) & 3; }
    function _themeName(uint256 theme) internal pure returns (string memory) {
        return theme == 0 ? 'Midnight' : theme == 1 ? 'Lagoon' : theme == 2 ? 'Ultraviolet' : 'Sunset';
    }
    function _motionName(uint256 m) internal pure returns (string memory) {
        return m == 0 ? 'Ricochet' : m == 1 ? 'Orbit' : m == 2 ? 'Float' : 'Figure Eight';
    }
    function _motionPath(uint256 m) internal pure returns (string memory) {
        if (m == 0) return 'M-12-6 12-10-8 10-12-6';
        if (m == 1) return 'M12 0a12 9 0 1 1-24 0a12 9 0 1 1 24 0';
        if (m == 2) return 'M0 0 0-6 0 0';
        return 'M0 0C8-11 18-11 18 0S8 11 0 0-18-11-18 0-8 11 0 0';
    }
    function _hat(uint256 seed) internal pure returns (uint256) {
        if (_r(seed, 51, 1000) < 21) return 0; // The rare third eye is never hidden by headwear.
        uint256 v = _r(seed, 31, 100);
        return v < 25 ? 0 : v < 45 ? 1 : v < 70 ? 2 : v < 85 ? 3 : v < 95 ? 4 : 5;
    }
    function _prop(uint256 seed) internal pure returns (uint256) {
        uint256 v = _r(seed, 32, 100);
        return v < 25 ? 0 : v < 80 ? 1 : v < 95 ? 2 : 3;
    }
    function materialName(uint256 m) internal pure returns (string memory) {
        return m == 0 ? 'Midnight Hash' : m == 1 ? 'Lagoon Cannabutter' : m == 2 ? 'Ultraviolet Resin' : 'Sunset Crumble';
    }
    function backdropName(uint256 b) internal pure returns (string memory) {
        return b == 0 ? "Graveyard Parking Lot" : b == 1 ? "Crypt Hotbox" : b == 2 ? "Deadwood Sesh" : b == 3 ? "Cursed Shakedown" : b == 4 ? "Basement Seance" : "Astral Ashtray";
    }
    function moodName(uint256 m) internal pure returns (string memory) {
        return m == 0 ? "Dead Stoned" : m == 1 ? "Paranoid" : m == 2 ? "Thousand Yard Stare" : m == 3 ? "Grave Giggles" : "Couch Entombed";
    }
    function _hatName(uint256 h) internal pure returns (string memory) {
        return h == 0 ? "Bare Cranium" : h == 1 ? "Grubby Beanie" : h == 2 ? "Lot Bandana" : h == 3 ? "Crooked Shades" : h == 4 ? "Skull Candle" : "Smokering Halo";
    }
    function _propName(uint256 p) internal pure returns (string memory) {
        return p == 0 ? "Resin Drool" : p == 1 ? "Crooked Spliff" : p == 2 ? "Last Roach" : "Bone Pipe";
    }
    function _paint(uint256 seed, uint256 genome) internal pure returns (Paint memory p) {
        uint256 primary = genome & 0xffffff;
        p.body = _rgb(primary);
        p.shade = _rgb(_blend(primary, 0x0b1112, 150));
        p.light = _rgb((genome >> 24) & 0xffffff);
        p.bone = _gold(seed) ? '#f9d978' : _rgb(_blend(primary, 0xe4d2a0, 170));
        p.dark = _rgb(_blend(primary, 0x070e11, 220));
    }
    /// @notice Inherited fields are explicit; ghoul mutations are deterministic after reveal.
    function attributes(uint256 seed, uint256 genome) external pure returns (string memory result) {
        uint256 form = _r(seed, 47, 3);
        result = string.concat(
            '[{"trait_type":"Ball Count","value":', _u(ballCount(genome)),
            '},{"trait_type":"Inherited Ball Count","value":', _u((genome >> 88) & 255),
            '},{"trait_type":"Scene","value":"', backdropName(((genome >> 56) & 255) % 6),
            '"},{"trait_type":"Inherited Theme","value":"', _themeName(_theme(genome)),
            '"},{"trait_type":"Material","value":"', materialName(_theme(genome)),
            '"},{"trait_type":"Motion","value":"', _motionName((genome >> 64) & 3),
            '"},{"trait_type":"Inherited Motion","value":"', _motionName((genome >> 96) & 3)
        );
        result = string.concat(result,
            '"},{"trait_type":"Body Radius","value":', _u(_radius(genome)),
            '},{"trait_type":"Body Colour","value":"', _rgb(genome & 0xffffff),
            '"},{"trait_type":"Accent Colour","value":"', _rgb((genome >> 24) & 0xffffff),
            '"},{"trait_type":"Sky Colour","value":"', _rgb((genome >> 112) & 0xffffff),
            '"},{"trait_type":"Mutation Flags","value":', _u((genome >> 80) & 255)
        );
        result = string.concat(result,
            '},{"trait_type":"Mood","value":"', moodName(_r(seed, 23, 5)),
            '"},{"trait_type":"Headwear","value":"', _hatName(_hat(seed)),
            '"},{"trait_type":"Mouth Prop","value":"', _propName(_prop(seed)),
            '"},{"trait_type":"Goo Texture","value":"', _r(seed, 37, 3) == 0 ? 'Oat Crust' : _r(seed, 37, 3) == 1 ? 'Chocolate Chunks' : 'Hash Crumble',
            '"},{"trait_type":"Silhouette","value":"', form == 0 ? 'Hand Rolled' : form == 1 ? 'Melted Jaw' : 'Split Cranium',
            '"},{"trait_type":"Eyes","value":"', _r(seed, 41, 8) == 0 ? 'Spectral Acid' : 'Bloodshot Ember',
            '"},{"trait_type":"Third Eye","value":"', _r(seed, 51, 1000) < 21 ? 'Yes' : 'No',
            '"},{"trait_type":"Golden Veins","value":"', _gold(seed) ? 'Yes' : 'No',
            '"}]'
        );
    }
    function _rect(uint256 x, uint256 y, uint256 w, uint256 h, string memory c) internal pure returns (string memory) {
        return string.concat('<rect x="',_u(x),'" y="',_u(y),'" width="',_u(w),'" height="',_u(h),'" fill="',c,'"/>');
    }
    function _shape(uint256 form) internal pure returns (string memory) {
        if (form == 1) return 'M18 8h24v2h10v6h6v8h4v18h-2v8h-6v6h-8v8h-8v-5H26v5H16v-8H8v-6H4V40H2V26h4V18h6v-6h6z';
        if (form == 2) return 'M16 10h14v4h4V6h10v4h8v6h6v8h4v20h-4v8h-8v6H40v3H20v-3H10v-6H6v-8H4V28h2V20h6v-6h4z';
        return 'M18 8h26v2h8v6h6v8h4v18h-2v8h-4v6h-8v4H18v-4H8v-6H4V28h2V20h4v-6h8z';
    }
    function _crumbs(uint256 seed, Paint memory p) internal pure returns (string memory s) {
        s = '<g opacity=".85">';
        uint256 t = _r(seed,37,3);
        for(uint256 i; i < 18; ++i) {
            uint256 edge = i % 4;
            uint256 x = edge == 0 ? 7+_r(seed,400+i,4) : edge == 1 ? 54+_r(seed,400+i,4) : 20+_r(seed,400+i,24);
            uint256 y = edge < 2 ? 25+_r(seed,500+i,16) : edge == 2 ? 12 : 54;
            string memory c = i%3 == 0 ? p.dark : t == 1 ? p.shade : p.light;
            s = string.concat(s,_rect(x,y,i%3==0?3:2,i%2+1,c));
        }
        return string.concat(s,'</g>');
    }
    function _face(uint256 seed, Paint memory p, bool animated) internal pure returns (string memory s) {
        uint256 mood = _r(seed,23,5);
        string memory eye = _r(seed,41,8)==0 ? "#acd950" : "#dc593d";
        s = string.concat(
            '<path fill="',p.shade,'" d="M16 20h12v5h9v-5h11v7h4v13h-8v6H20v-6h-8V27h4z"/>',
            '<path fill="',p.bone,'" d="M18 14h10v3h8v-3h10v4h4v8h-6v-5H34v5h-5v-5H19v5h-5v-8h4zM15 38h6v5h4v4h13v-4h5v-5h6v7h-4v8H20v-4h-5z"/>',
            '<path fill="',p.light,'" opacity=".65" d="M20 10h8v3h-8zm18 1h6v2h-6zM10 28h3v13h-3zm42-1h3v11h-3z"/>',
            '<path fill="#0b1112" d="M15 25h11v3h3v10h-4v3h-9v-3h-3V28h2zM38 24h10v3h3v11h-3v3H37v-4h-2V28h3zM30 37h5v4h3v4h-5v-2h-2v2h-5v-4h4zM20 46h24v7H20z"/>',
            '<g fill="',eye,'">');
        if(mood==1) s=string.concat(s,'<path d="M20 29h4v7h-4zm20 0h4v7h-4z"/>');
        else if(mood==2) s=string.concat(s,'<path d="M18 32h7v3h-7zm20 0h8v3h-8z"/><path fill="#e7b77c" d="M21 32h2v2h-2zm20 0h2v2h-2z"/>');
        else if(mood==3) s=string.concat(s,'<path d="M17 33v-3h3v2h6v3h-6v-2zm20-1h8v-3h3v6H37z"/>');
        else if(mood==4) s=string.concat(s,'<path d="M17 35h9v2h-9zm21-1h10v2H38z"/>');
        else s=string.concat(s,'<path d="M17 33h9v3h-9zm21-1h10v3H38z"/><path fill="#f59763" d="M21 33h2v2h-2zm21-1h2v2h-2z"/>');
        if(animated) s=string.concat(s,'<animate attributeName="opacity" values="1;1;0;1;1" keyTimes="0;.32;.37;.42;1" dur="',_u(3+_r(seed,95,4)),'s" repeatCount="indefinite"/>');
        if(animated) s=string.concat(s,'<animateTransform attributeName="transform" type="translate" values="0 0;1 0;0 0;-1 0;0 0" dur="4s" repeatCount="indefinite"/>');
        s=string.concat(s,'</g><path fill="',p.dark,'" d="M14 25h13v4H14zm23-1h13v4H37z"/>',
            '<g><path fill="',p.bone,'" d="M21 46h3v4h-3zm5 1h3v5h-3zm5-1h3v4h-3zm5 1h3v5h-3zm5-2h3v5h-3z"/>',animated?'<animateTransform attributeName="transform" type="translate" values="0 0;0 1;0 0;0 -1;0 0" dur="3s" repeatCount="indefinite"/>':'','</g>',
            '<path fill="',p.shade,'" d="M25 12h3v4h4v5h-3v-3h-4zm18 28h3v3h-3z"/>');
        if(_r(seed,51,1000)<21) s=string.concat(s,'<path fill="#111716" d="M29 14h7v3h3v3h-3v3h-7v-3h-3v-3h3z"/><path fill="#e4c566" d="M30 17h5v3h-5z"/><path fill="#101415" d="M32 17h1v3h-1z"/>');
    }
    function _smoke(uint256 prop, bool animated) internal pure returns (string memory s) {
        // Both wisps grow from the actual ember. Only their upper curls move.
        string memory a = 'M0 0v-4h-3v-5h4v-5h-5v-6h3';
        string memory b = 'M0 0v-5h4v-6h-5v-7h4v-6h-3';
        s = string.concat('<g transform="translate(',prop==2?'57 46':prop==3?'56 39':'61 44',' )" fill="none" stroke="#c6d5b4" stroke-width="1.2">');
        for(uint256 i;i<2;++i) {
            s=string.concat(s,'<path opacity="',i==0?'.5':'.25','" d="',i==0?a:b,'">');
            if(animated) s=string.concat(s,'<animate attributeName="d" values="',a,';',b,';',a,'" dur="4s" begin="-',i==0?'0':'2','s" repeatCount="indefinite"/><animate attributeName="opacity" values=".12;.65;.12" dur="4s" begin="-',i==0?'0':'2','s" repeatCount="indefinite"/>');
            s=string.concat(s,'</path>');
        }
        return string.concat(s,'</g>');
    }
    function _mouthProp(uint256 seed, bool animated) internal pure returns (string memory s) {
        uint256 p=_prop(seed);
        if(p==0) return '<path fill="#aaab6d" d="M39 52h2v7h2v3h-4z"/><path fill="#d5ca88" d="M39 53h1v5h-1z"/>';
        if(p==1) s='<path fill="#191b18" d="M41 47h7v-2h7v-2h7v5h-7v2h-7v2h-7z"/><path fill="#d1c6a0" d="M43 48h5v-2h7v-2h5v3h-5v2h-7v2h-5z"/><path fill="#8d7956" d="M43 48h4v3h-4z"/>';
        else if(p==2) s='<path fill="#312a21" d="M42 48h9v-3h7v5h-7v3h-9z"/><path fill="#b89d6a" d="M44 49h7v-2h5v2h-5v2h-7z"/>';
        else s='<path fill="#c1b48a" d="M41 48h11v-9h8v13H44v2h-3z"/><path fill="#5c4a31" d="M54 40h4v3h-4z"/>';
        s=string.concat(s,'<g fill="#ec793e"><path d="M',p==2?"56 45h2v3h-2":p==3?"54 38h4v2h-4":"60 43h2v4h-2",'z"/>',animated?'<animate attributeName="opacity" values=".45;1;.45" dur="4s" repeatCount="indefinite"/>':"",'</g>',_smoke(p,animated));
    }
    function _headwear(uint256 seed, bool animated) internal pure returns (string memory s) {
        uint256 h=_hat(seed);
        if(h==0) return '';
        if(h==1) return '<path fill="#131a1c" d="M13 18V9h6V5h26v4h6v9z"/><path fill="#574455" d="M15 14V9h6V6h22v3h6v5z"/><path fill="#846976" d="M12 14h40v6H12z"/><path fill="#4e3c4b" d="M17 14h2v6h-2zm6 0h2v6h-2zm6 0h2v6h-2zm6 0h2v6h-2zm6 0h2v6h-2z"/><path fill="#b19c6d" d="M43 15h6v4h-6z"/>';
        if(h==2) return '<path fill="#1c181b" d="M11 17h40v9H11zM10 21H4v12h5v-5h5z"/><path fill="#793e37" d="M12 18h38v6H12zM5 23h5v7H5z"/><path fill="#c39275" d="M17 19h2v2h-2zm9 2h2v2h-2zm9-2h2v2h-2zm9 2h2v2h-2z"/>';
        if(h==3) return '<path fill="#a28d59" d="M12 27h16v2h7v-2h16v11h-3v4H37v-3h-3v-6h-5v6h-3v3H15v-4h-3z"/><path fill="#1d2830" d="M15 30h10v8H15zm23 0h10v8H38z"/><path fill="#5a6772" d="M16 30h3v7h-3zm23 0h3v7h-3z"/>';
        if(h==4) return string.concat('<path fill="#1b1c19" d="M26 11V2h12v9z"/><path fill="#c3b98d" d="M28 2h8v12h-8zm-3 9h3v6h-3zm12-2h3v5h-3z"/><g fill="#eaa24e"><path d="M30-7h3v3h3v5h-7v-5h1z"/>',animated?'<animate attributeName="opacity" values=".6;1;.6" dur="3s" repeatCount="indefinite"/>':"",'</g><path fill="#f1d88b" d="M31-3h2v3h-2z"/>');
        return string.concat('<g fill="none" stroke="#c1c7a4" opacity=".65"><path d="M19 0h26v2h8v3h-8v2H19V5h-8V2h8z"/>',animated?'<animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0" dur="8s" repeatCount="indefinite"/>':"",'</g>');
    }
    function _position(uint256 n,uint256 i,bool travelling) internal pure returns(string memory) {
        // Reserve complete travel lobes plus rotating accessory bounds.
        if(travelling) {
            if(n==1) return 'translate(141 123) scale(3.6)';
            if(n==2) return i==0?'translate(70 174) scale(1.8)':'translate(326 196) scale(1.8)';
            if(n==4) return string.concat('translate(',i%2==0?'93':'325',' ',i<2?'102':'294',') scale(1.65)');
            return string.concat('translate(',i%3==0?'59':i%3==1?'219':'379',' ',i<3?'133':'321',') scale(1.15)');
        }
        if(n==1) return 'translate(99 100) scale(4.9)';
        if(n==2) return i==0?'translate(28 132) scale(3.4)':'translate(266 154) scale(3.4)';
        if(n==4) return string.concat('translate(',i%2==0?'47':'279',' ',i<2?'72':'246',') scale(2.85)');
        return string.concat('translate(',i%3==0?'22':i%3==1?'187':'352',' ',i<3?'98':'286',') scale(2.2)');
    }
    function _spinValues(uint256 motion, uint256 i) internal pure returns (string memory) {
        if(motion==0) return '-10 32 34;12 32 34;-10 32 34';
        if(motion==2) return '0 32 34;14 32 34;0 32 34;-14 32 34;0 32 34';
        bool clockwise = (i + motion) % 2 == 0;
        return clockwise ? '0 32 34;360 32 34' : '0 32 34;-360 32 34';
    }
    function _ball(uint256 seed,uint256 genome,uint256 i,uint256 n,Paint memory p,bool animated) internal pure returns(string memory s) {
        uint256 f = i==0?seed:uint256(keccak256(abi.encode(seed,"ball",i)));
        uint256 motion = (genome >> 64) & 3;
        uint256 scale = 70 + _radius(genome)*3;
        uint256 chew = 3 + _r(f,96,3);
        s=string.concat('<g transform="',_position(n,i,motion!=2),'" shape-rendering="crispEdges"><g transform="translate(32 32) scale(',scale==100?'1':string.concat('0.',_u(scale)),') translate(-32 -32)"><g>');
        if(animated) {
            uint256 duration = 4 + (((genome >> 144) & 255) + i) % 5;
            s=string.concat(s,'<animateMotion path="',_motionPath(motion),'" dur="',_u(duration),'s" begin="-',_u((((genome >> 144) & 255) + 2*((genome >> 152) & 255) + i*3) % duration),'s" repeatCount="indefinite"/>');
        }
        s=string.concat(s,'<g>');
        if(animated) s=string.concat(s,'<animateTransform attributeName="transform" type="rotate" values="',_spinValues(motion,i),'" dur="',_u(5+motion+i%3),'s" begin="-',_u((((genome >> 152) & 255)+i*2)%(5+motion+i%3)),'s" repeatCount="indefinite"/>');
        s=string.concat(s,'<g transform="translate(32 50)"><g>');
        if(animated) s=string.concat(s,'<animateTransform attributeName="transform" type="scale" values="1 1;1.08 .92;1 1;.94 1.06;1 1" dur="',_u(chew),'s" repeatCount="indefinite"/>');
        s=string.concat(s,'<g transform="translate(-32 -50)"><path d="',_shape(_r(f,47,3)),'" fill="',p.body,'" stroke="#0c1415" stroke-width="2"/>',
            '<path fill="',p.shade,'" d="M44 10h8v6h6v8h4v18h-2v8h-4v6h-8v4H18v-4H8v-6H4v-8h5v6h8v4h25v-5h8v-9h5V22h-4v-6h-7z"/>',
            '<path fill="',p.light,'" d="M14 18h5v-5h8v-3h-7v2h-6zm-4 9h3v-7h-3zm1 16h3v5h-3z"/>',_crumbs(f,p),
            '<g transform="translate(32 34)"><g>');
        if(animated) s=string.concat(s,'<animateTransform attributeName="transform" type="scale" values="1 1;.97 1.03;1 1;1.03 .97;1 1" dur="',_u(chew),'s" repeatCount="indefinite"/>');
        s=string.concat(s,'<g transform="translate(-32 -34)">',_face(f,p,animated),'</g></g></g>',
            '<path fill="',p.body,'" d="M10 46h5v10h3v6h-2v2H9v-2H7v-6h3zM48 48h5v8h2v6h-8v-6h1z">');
        if(animated) s=string.concat(s,'<animate attributeName="d" values="M10 46h5v10h3v6h-2v2H9v-2H7v-6h3zM48 48h5v8h2v6h-8v-6h1z;M10 46h5v13h3v6h-2v2H9v-2H7v-6h3zM48 48h5v6h2v6h-8v-6h1z;M10 46h5v10h3v6h-2v2H9v-2H7v-6h3zM48 48h5v8h2v6h-8v-6h1z;M10 46h5v7h3v6h-2v2H9v-2H7v-6h3zM48 48h5v11h2v6h-8v-6h1z;M10 46h5v10h3v6h-2v2H9v-2H7v-6h3zM48 48h5v8h2v6h-8v-6h1z" dur="',_u(chew),'s" repeatCount="indefinite"/>');
        s=string.concat(s,'</path><path fill="',p.light,'" d="M11 49h1v10h-1zm38 0h1v8h-1z"/>');
        if(i<2) s=string.concat(s,_mouthProp(f,animated),_headwear(f,animated));
        return string.concat(s,'</g></g></g></g></g></g></g>');
    }
    function _digit(uint256 d,uint256 x) internal pure returns(string memory) {
        string memory p = d==0?'M0 0h12v20H0zm4 4v12h4V4z':d==1?'M4 0h8v20H8V4H4z':d==2?'M0 0h12v12H4v4h8v4H0V8h8V4H0z':d==3?'M0 0h12v20H0v-4h8v-4H4V8h4V4H0z':d==4?'M0 0h4v8h4V0h4v20H8v-8H0z':d==5?'M0 0h12v4H4v4h8v12H0v-4h8v-4H0z':d==6?'M0 0h12v4H4v4h8v12H0zm4 12v4h4v-4z':d==7?'M0 0h12v20H8V4H0z':d==8?'M0 0h12v20H0zm4 4v4h4V4zm0 8v4h4v-4z':'M0 0h12v20H0v-4h8v-4H0zm4 4v4h4V4z';
        return string.concat('<path transform="translate(',_u(x),' 474)" d="',p,'" fill-rule="evenodd"/>');
    }
    function pendingSvg(uint256 tokenId,uint256 mintBlock,address minter) external view returns (string memory) {
        return backdrop.pendingSvg(tokenId,mintBlock,minter);
    }

    function svg(uint256 seed,uint256 genome,uint256 tokenId,uint256 mintBlock,address minter,bool animated) external view returns(string memory result) {
        uint256 n=ballCount(genome); Paint memory p=_paint(seed,genome);
        result=string.concat('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" data-mint-block="',_u(mintBlock),'"><title>Ganja Ghoulballs #',_u(tokenId),'</title><desc>Inherited haunted goo. Native onchain SVG.</desc>',backdrop.svg(seed,genome,mintBlock,minter,animated));
        for(uint256 i;i<n;++i) result=string.concat(result,_ball(seed,genome,i,n,p,animated));
        result=string.concat(result,'<g fill="#a0a381" shape-rendering="crispEdges"><path d="M22 474h16v4H26v12h8v-4h-4v-4h8v12H22zM42 474h16v4H46v12h8v-4h-4v-4h8v12H42zM62 474h16v20H62zm4 4v12h8v-12zM82 474h16v20H82zm4 4v12h8v-12z" fill-rule="evenodd"/>',_digit((tokenId/100)%10,438),_digit((tokenId/10)%10,454),_digit(tokenId%10,470),'</g><path d="M8 8h496v496H8z" stroke="#687062" stroke-opacity=".45" stroke-width="2" fill="none"/></svg>');
    }
}


/// @notice Immutable onchain backdrop geometry, deployed only by the renderer.
contract GooBackdrop {
    /// @dev Eighteen faint floor glints encode the full mint block and original minter.
    function _birthmark(uint256 mintBlock,address minter) internal pure returns(string memory s) {
        s='<g opacity=".18">';
        // i<=17 bounds all positions and shifts; i-11 executes only in that branch.
        unchecked { for(uint256 i;i<18;++i) s=string.concat(s,_rect(24+i*25,455+(i%4)*4,2,2,_rgb(i<11?mintBlock>>(i*24):uint160(minter)>>((i-11)*24)))); }
        return string.concat(s,'</g>');
    }
    function _rgb(uint256 colour) internal pure returns (string memory) {
        bytes memory out = new bytes(7); out[0] = '#';
        bytes16 digits = '0123456789abcdef';
        // Six bounded hex nibbles, independent of input magnitude.
        unchecked { for (uint256 i; i < 6; ++i) out[6-i] = digits[(colour >> (i*4)) & 15]; }
        return string(out);
    }

    function _u(uint256 n) internal pure returns (string memory) {
        if (n == 0) return "0";
        // A uint256 has at most78 decimal digits; every digit is0..9.
        unchecked {
            uint256 v = n; uint256 len;
            while (v != 0) { ++len; v /= 10; }
            bytes memory out = new bytes(len);
            while (n != 0) { out[--len] = bytes1(uint8(48 + n % 10)); n /= 10; }
            return string(out);
        }
    }
    function _r(uint256 seed, uint256 domain, uint256 max) internal pure returns (uint256) {
        return uint256(keccak256(abi.encode(seed, domain))) % max;
    }
    function _rect(uint256 x, uint256 y, uint256 w, uint256 h, string memory c) internal pure returns (string memory) {
        return string.concat('<rect x="',_u(x),'" y="',_u(y),'" width="',_u(w),'" height="',_u(h),'" fill="',c,'"/>');
    }
    function pendingSvg(uint256 tokenId,uint256 mintBlock,address minter) external pure returns (string memory) {
        return string.concat('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" data-mint-block="',_u(mintBlock),'"><title>Ganja Ghoulballs #',_u(tokenId),' - Sealed Recipe</title><desc>13 parent genomes sealed. Awaiting random reveal.</desc><rect width="512" height="512" fill="#0b1012"/><path fill="#343b38" d="M192 80h128v40h24v280H168V120h24z"/><path fill="#111d19" d="M184 136h144v248H184z"/><path fill="#53664a" d="M200 224h112v24h16v96H184v-96h16z"/><path fill="#26362c" d="M216 200h80v24h16v104H200V224h16z"/><path fill="#9ca780" d="M236 228h40v12h12v28h-12v12h-12v16h-16v-28h16v-12h8v-12h-24v12h-12zm12 84h16v16h-16z"/><path fill="#747b67" d="M192 96h128v16H192zM160 400h192v16H160z"/><path fill="#b5ba91" d="M206 444h100v8H206z"/><path fill="none" stroke="#687062" stroke-width="2" d="M8 8h496v496H8z"/>',_birthmark(mintBlock,minter),'</svg>');
    }
    function svg(uint256 seed, uint256 genome, uint256 mintBlock, address minter, bool animated) external pure returns (string memory s) {
        uint256 bg = ((genome >> 56) & 255) % 6;
        string memory sky = _rgb((genome >> 112) & 0xffffff);
        string memory glow = _rgb((genome >> 24) & 0xffffff);
        s = string.concat('<rect width="512" height="512" fill="#0b1012"/>', _rect(12,12,488,438,sky),
            '<g shape-rendering="crispEdges" opacity=".35">');
        for(uint256 i; i < 16; ++i) s = string.concat(s,_rect(24+_r(seed,190+i,116)*4,24+_r(seed,290+i,73)*4,4,4,glow));
        s = string.concat(s,animated?'<animate attributeName="opacity" values=".25;.5;.25" dur="6s" repeatCount="indefinite"/>':'','</g>');
        if (bg == 0) s = string.concat(s,
            '<path fill="#c4b18a" d="M384 52h40v8h12v32h-8v12h-36v-8h-12V64h4z"/>',
            '<path fill="#82796b" d="M408 60h12v8h8v12h-12v-8h-8zm-16 24h12v12h-12z"/>',
            '<path fill="#0e141c" d="M12 354h44V244h8v-36h8v36h8v110h284v-26h72v12h32v24h32v86H12z"/>',
            '<path stroke="#080d12" fill="none" stroke-width="4" d="M12 192q120 96 488-20M12 216q140 70 488-20"/>',
            '<path fill="#3e4246" d="M328 376v-32h84l28 24v52H324v-44zm12-20v20h28v-20zm40 0v20h28v-20z" fill-rule="evenodd"/>',
            '<path fill="#c3a76a" d="M428 382h8v8h-8z"/><path fill="#b79055" opacity=".15" d="M436 382l64-28v90l-64-54z"/>',
            '<path fill="#070d10" d="M338 412h24v20h-24zm64 0h24v20h-24zM40 422v-46h8v-8h28v8h8v46z"/>');
        else if (bg == 1) s = string.concat(s,
            '<path fill="#41413c" d="M40 450V132h16V96h24V72h32V48h288v24h32v24h24v36h16v318h-28V144h-16v-32h-28V88H112v24H84v32H68v306z"/>',
            '<path stroke="#141a1a" stroke-width="5" d="M40 170h28m-28 62h28m-28 62h28m-28 62h28m376-186h28m-28 62h28m-28 62h28m-28 62h28M112 48v40m72-40v40m144-40v40m72-40v40"/>',
            '<path fill="#76684b" d="M84 366h20v56H84zm324 0h20v56h-20z"/><path fill="#d6a557" d="M88 342h12v20H88zm324 0h12v20h-12z"/>',
            '<path fill="#303431" d="M68 422h376v28H68z"/>');
        else if (bg == 2) s = string.concat(s,
            '<path fill="#87947a" d="M370 52h48v8h12v40h-12v12h-48v-12h-12V64h12z"/>',
            '<path fill="#0e191b" d="M20 440V156H8l32-48 28 48H56v284zm72 0V248H72l40-64 40 64h-20v192zm324 0V188h-20l36-72 40 72h-20v252zm64 0V296h-24l36-60 28 60h-16v144z"/>',
            '<path fill="#26372e" d="M20 216H4l28-44 32 44H48v16H20zm388 48h-20l44-52 44 52h-20v16h-48z"/>',
            '<path fill="#171f1b" d="M12 428l56-20 48 16 48-16 64 24 80-16 68 12 64-20 60 24v18H12z"/>');
        else if (bg == 3) s = string.concat(s,
            '<path fill="#944e42" d="M12 224h488v84H12z"/><path fill="#be7b48" d="M12 260h488v20H12z"/>',
            '<path fill="#bc9258" d="M192 116h128v12h24v20h12v68H180v-68h12z"/>',
            '<path fill="#31202f" d="M180 166h176v8H180zm0 24h176v8H180zm0 22h176v8H180z"/>',
            '<path fill="#16191e" d="M12 316l52-28 40 28 28-12 68 36 48-16 60 16 68-44 48 28 36-20 40 20v126H12z"/>',
            '<path fill="#47423c" d="M44 384h96v8H44zm16 8h8v40h-8zm56 0h8v40h-8zm276-12h64v8h-64zm8 8h8v40h-8zm40 0h8v40h-8z"/>');
        else if (bg == 4) s = string.concat(s,
            '<path fill="#323329" d="M12 92h488v8H12zm0 104h488v8H12zm0 104h488v8H12z"/>',
            '<path fill="#10191e" d="M352 48h100v152H352z"/><path stroke="#6b6659" fill="none" stroke-width="8" d="M352 48h100v152H352zM400 48v152m-48-76h100"/>',
            '<path fill="#775a3d" d="M56 360h400v72H56z"/><path fill="#3c4031" d="M36 340h56v84H36zm388 0h52v84h-52zM88 348h160v36H88zm176 0h160v36H264z"/>',
            '<path fill="#141e1b" d="M68 424h24v20H68zm352 0h24v20h-24z"/>');
        else s = string.concat(s,
            '<g fill="none" stroke="#66546e" opacity=".6"><path stroke-width="4" d="M108 64h296v316H108zM80 92h352v260H80z"/>',
            '<circle cx="256" cy="214" r="166"/><circle cx="256" cy="214" r="148"/></g>',
            '<path fill="#987e9d" d="M72 80h8v-8h8v8h8v8h-8v8h-8v-8h-8zm356 244h8v-8h8v8h8v8h-8v8h-8v-8h-8z"/>');
        s = string.concat(s,
            '<path fill="#101519" d="M12 444h488v56H12z"/><path stroke="#647264" stroke-width="2" opacity=".18" d="M12 450h488M12 468h488M12 492h488M256 442L72 500m184-58 184 58M256 442L8 480m248-38 248 38"/>',
            '<path fill="#777c69" opacity=".2" d="M76 436h80v4H76zm212-8h116v4H288z"/>',_birthmark(mintBlock,minter));
    }
}
