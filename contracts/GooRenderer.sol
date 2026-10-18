// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Original, immutable pixel-edged ghoul confection artwork. All SVG geometry,
///         palette choices, animation and traits are generated onchain. No external assets.
contract GooRenderer {
    struct Paint { string body; string shade; string light; string bone; string dark; }

    function _u(uint256 n) internal pure returns (string memory) {
        if (n == 0) return "0";
        uint256 v = n; uint256 len;
        while (v != 0) { ++len; v /= 10; }
        bytes memory out = new bytes(len);
        while (n != 0) { out[--len] = bytes1(uint8(48 + n % 10)); n /= 10; }
        return string(out);
    }
    function _r(uint256 seed, uint256 domain, uint256 max) internal pure returns (uint256) {
        return uint256(keccak256(abi.encode(seed, domain))) % max;
    }
    function ballCount(uint256 seed) public pure returns (uint256) {
        uint256 v = _r(seed, 11, 100);
        return v < 44 ? 1 : v < 76 ? 2 : v < 94 ? 4 : 6;
    }
    function _mat(uint256 seed) internal pure returns (uint256) {
        if (_r(seed, 43, 10000) < 42) return 5;
        return _r(seed, 44, 5);
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
    function materialName(uint256 m) public pure returns (string memory) {
        return m == 0 ? "Rotten Cannabutter" : m == 1 ? "Chocolate Oat" : m == 2 ? "Purple Hash" : m == 3 ? "Amber Resin" : m == 4 ? "Ashen Mint" : "Golden Grave Goo";
    }
    function backdropName(uint256 b) public pure returns (string memory) {
        return b == 0 ? "Graveyard Parking Lot" : b == 1 ? "Crypt Hotbox" : b == 2 ? "Deadwood Sesh" : b == 3 ? "Cursed Shakedown" : b == 4 ? "Basement Seance" : "Astral Ashtray";
    }
    function moodName(uint256 m) public pure returns (string memory) {
        return m == 0 ? "Dead Stoned" : m == 1 ? "Paranoid" : m == 2 ? "Thousand Yard Stare" : m == 3 ? "Grave Giggles" : "Couch Entombed";
    }
    function _hatName(uint256 h) internal pure returns (string memory) {
        return h == 0 ? "Bare Cranium" : h == 1 ? "Grubby Beanie" : h == 2 ? "Lot Bandana" : h == 3 ? "Crooked Shades" : h == 4 ? "Skull Candle" : "Smokering Halo";
    }
    function _propName(uint256 p) internal pure returns (string memory) {
        return p == 0 ? "Resin Drool" : p == 1 ? "Crooked Spliff" : p == 2 ? "Last Roach" : "Bone Pipe";
    }
    function _paint(uint256 m) internal pure returns (Paint memory p) {
        if (m == 0) return Paint("#69773a", "#344329", "#a7b66a", "#c5bd8d", "#1b291e");
        if (m == 1) return Paint("#70482e", "#3c2a24", "#b48750", "#d1bb89", "#241a1b");
        if (m == 2) return Paint("#68435e", "#382c42", "#ac7899", "#c1a9b4", "#231c2b");
        if (m == 3) return Paint("#9d682b", "#503925", "#ddb15c", "#e0c993", "#2b231c");
        if (m == 4) return Paint("#718875", "#354c43", "#adc0a4", "#d4d8b7", "#1d302b");
        return Paint("#b39032", "#655028", "#f9d978", "#ffedb0", "#352a1e");
    }
    function attributes(uint256 seed) external pure returns (string memory) {
        uint256 m = _mat(seed);
        uint256 form = _r(seed, 47, 3);
        return string.concat(
            '[{"trait_type":"Ball Count","value":', _u(ballCount(seed)),
            '},{"trait_type":"Scene","value":"', backdropName(_r(seed, 19, 6)),
            '"},{"trait_type":"Material","value":"', materialName(m),
            '"},{"trait_type":"Mood","value":"', moodName(_r(seed, 23, 5)),
            '"},{"trait_type":"Headwear","value":"', _hatName(_hat(seed)),
            '"},{"trait_type":"Mouth Prop","value":"', _propName(_prop(seed)),
            '"},{"trait_type":"Goo Texture","value":"', _r(seed, 37, 3) == 0 ? "Oat Crust" : _r(seed, 37, 3) == 1 ? "Chocolate Chunks" : "Hash Crumble",
            '"},{"trait_type":"Silhouette","value":"', form == 0 ? "Hand Rolled" : form == 1 ? "Melted Jaw" : "Split Cranium",
            '"},{"trait_type":"Eyes","value":"', _r(seed, 41, 8) == 0 ? "Spectral Acid" : "Bloodshot Ember",
            '"},{"trait_type":"Third Eye","value":"', _r(seed, 51, 1000) < 21 ? "Yes" : "No",
            '"},{"trait_type":"Golden Goo","value":"', m == 5 ? "Yes" : "No",
            '"},{"trait_type":"Motion","value":"Slow Sesh / Living Drip"},',
            '{"trait_type":"Art Version","value":"GANJA_GHOULBALLS_PIXEL_GOO_V2"}]'
        );
    }
    function _rect(uint256 x, uint256 y, uint256 w, uint256 h, string memory c) internal pure returns (string memory) {
        return string.concat('<rect x="',_u(x),'" y="',_u(y),'" width="',_u(w),'" height="',_u(h),'" fill="',c,'"/>');
    }
    function _sky(uint256 seed, uint256 bg) internal pure returns (string memory s) {
        string memory sky = bg == 0 ? "#191b27" : bg == 1 ? "#1d1b20" : bg == 2 ? "#162323" : bg == 3 ? "#31202f" : bg == 4 ? "#25212a" : "#1d192c";
        string memory glow = bg == 3 ? "#bd7443" : bg == 2 ? "#829579" : "#9c8da9";
        s = string.concat('<rect width="512" height="512" fill="#0b1012"/>', _rect(12,12,488,438,sky),
            '<g shape-rendering="crispEdges" opacity=".35">');
        for(uint256 i; i < 16; ++i) s = string.concat(s,_rect(24+_r(seed,190+i,116)*4,24+_r(seed,290+i,73)*4,4,4,glow));
        s = string.concat(s,'</g>');
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
            '<path fill="#777c69" opacity=".2" d="M76 436h80v4H76zm212-8h116v4H288z"/>');
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
        if(animated) s=string.concat(s,'<animate attributeName="opacity" values="1;1;0;1;1" keyTimes="0;.76;.79;.82;1" dur="',_u(5+_r(seed,95,5)),'s" repeatCount="indefinite"/>');
        s=string.concat(s,'</g><path fill="',p.dark,'" d="M14 25h13v4H14zm23-1h13v4H37z"/>',
            '<path fill="',p.bone,'" d="M21 46h3v4h-3zm5 1h3v5h-3zm5-1h3v4h-3zm5 1h3v5h-3zm5-2h3v5h-3z"/>',
            '<path fill="',p.shade,'" d="M25 12h3v4h4v5h-3v-3h-4zm18 28h3v3h-3z"/>');
        if(_r(seed,51,1000)<21) s=string.concat(s,'<path fill="#111716" d="M29 14h7v3h3v3h-3v3h-7v-3h-3v-3h3z"/><path fill="#e4c566" d="M30 17h5v3h-5z"/><path fill="#101415" d="M32 17h1v3h-1z"/>');
    }
    function _smoke(bool animated) internal pure returns (string memory) {
        return string.concat('<g fill="none" stroke="#9eac91" stroke-width="1" opacity=".4"><path d="M60 43v-5h-4v-6h3v-5h-4v-7h2"/>',animated?'<animateTransform attributeName="transform" type="translate" values="0 1;0 -3;0 1" dur="7s" repeatCount="indefinite"/>':"",'</g>');
    }
    function _mouthProp(uint256 seed, bool animated) internal pure returns (string memory s) {
        uint256 p=_prop(seed);
        if(p==0) return '<path fill="#aaab6d" d="M39 52h2v7h2v3h-4z"/><path fill="#d5ca88" d="M39 53h1v5h-1z"/>';
        if(p==1) s='<path fill="#191b18" d="M41 47h7v-2h7v-2h7v5h-7v2h-7v2h-7z"/><path fill="#d1c6a0" d="M43 48h5v-2h7v-2h5v3h-5v2h-7v2h-5z"/><path fill="#8d7956" d="M43 48h4v3h-4z"/>';
        else if(p==2) s='<path fill="#312a21" d="M42 48h9v-3h7v5h-7v3h-9z"/><path fill="#b89d6a" d="M44 49h7v-2h5v2h-5v2h-7z"/>';
        else s='<path fill="#c1b48a" d="M41 48h11v-9h8v13H44v2h-3z"/><path fill="#5c4a31" d="M54 40h4v3h-4z"/>';
        s=string.concat(s,'<g fill="#ec793e"><path d="M',p==2?"56 45h2v3h-2":p==3?"54 38h4v2h-4":"60 43h2v4h-2",'z"/>',animated?'<animate attributeName="opacity" values=".45;1;.45" dur="4s" repeatCount="indefinite"/>':"",'</g>',_smoke(animated));
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
    function _position(uint256 n,uint256 i) internal pure returns(string memory) {
        if(n==1) return 'translate(64 84) scale(6)';
        if(n==2) return i==0?'translate(20 132) scale(3.8)':'translate(256 164) scale(3.8)';
        if(n==4) return string.concat('translate(',i%2==0?'38':'270',' ',i<2?'68':'274',') scale(3.2)');
        return string.concat('translate(',i%3==0?'18':i%3==1?'183':'348',' ',i<3?'94':'294',') scale(2.35)');
    }
    function _ball(uint256 seed,uint256 i,uint256 n,Paint memory p,bool animated) internal pure returns(string memory s) {
        uint256 f = i==0?seed:uint256(keccak256(abi.encode(seed,"ball",i)));
        uint256 form=_r(f,47,3);
        s=string.concat('<g transform="',_position(n,i),'" shape-rendering="crispEdges"><g>');
        if(animated) s=string.concat(s,'<animateTransform attributeName="transform" type="translate" values="0 0;0 -1;0 0" dur="',_u(5+i),'s" repeatCount="indefinite"/>');
        s=string.concat(s,'<path d="',_shape(form),'" fill="',p.body,'" stroke="#0c1415" stroke-width="2"/>',
            '<path fill="',p.shade,'" d="M44 10h8v6h6v8h4v18h-2v8h-4v6h-8v4H18v-4H8v-6H4v-8h5v6h8v4h25v-5h8v-9h5V22h-4v-6h-7z"/>',
            '<path fill="',p.light,'" d="M14 18h5v-5h8v-3h-7v2h-6zm-4 9h3v-7h-3zm1 16h3v5h-3z"/>',_crumbs(f,p),_face(f,p,animated),
            '<g fill="',p.body,'"><path d="M10 46h5v10h3v6h-2v2H9v-2H7v-6h3zM48 48h5v8h2v6h-8v-6h1z"/>');
        if(animated) s=string.concat(s,'<animateTransform attributeName="transform" type="translate" values="0 0;0 1;0 0" dur="',_u(6+i),'s" repeatCount="indefinite"/>');
        s=string.concat(s,'</g><path fill="',p.light,'" d="M11 49h1v10h-1zm38 0h1v8h-1z"/>');
        if(i<2) s=string.concat(s,_mouthProp(f,animated),_headwear(f,animated));
        return string.concat(s,'</g></g>');
    }
    function _digit(uint256 d,uint256 x) internal pure returns(string memory) {
        string memory p = d==0?'M0 0h12v20H0zm4 4v12h4V4z':d==1?'M4 0h8v20H8V4H4z':d==2?'M0 0h12v12H4v4h8v4H0V8h8V4H0z':d==3?'M0 0h12v20H0v-4h8v-4H4V8h4V4H0z':d==4?'M0 0h4v8h4V0h4v20H8v-8H0z':d==5?'M0 0h12v4H4v4h8v12H0v-4h8v-4H0z':d==6?'M0 0h12v4H4v4h8v12H0zm4 12v4h4v-4z':d==7?'M0 0h12v20H8V4H0z':d==8?'M0 0h12v20H0zm4 4v4h4V4zm0 8v4h4v-4z':'M0 0h12v20H0v-4h8v-4H0zm4 4v4h4V4z';
        return string.concat('<path transform="translate(',_u(x),' 474)" d="',p,'" fill-rule="evenodd"/>');
    }
    function svg(uint256 seed,uint256 tokenId,bool animated) external pure returns(string memory result) {
        uint256 bg=_r(seed,19,6); uint256 n=ballCount(seed); Paint memory p=_paint(_mat(seed));
        result=string.concat('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img"><title>Ganja Ghoulballs #',_u(tokenId),' - ',backdropName(bg),'</title><desc>Original onchain pixel-edged haunted goo confections. ',materialName(_mat(seed)),'. ',moodName(_r(seed,23,5)),'.</desc>',_sky(seed,bg));
        for(uint256 i;i<n;++i) result=string.concat(result,_ball(seed,i,n,p,animated));
        result=string.concat(result,'<g fill="#a0a381" shape-rendering="crispEdges"><path d="M22 474h16v4H26v12h8v-4h-4v-4h8v12H22zM42 474h16v4H46v12h8v-4h-4v-4h8v12H42zM62 474h16v20H62zm4 4v12h8v-12zM82 474h16v20H82zm4 4v12h8v-12z" fill-rule="evenodd"/>',_digit((tokenId/100)%10,438),_digit((tokenId/10)%10,454),_digit(tokenId%10,470),'</g><path d="M8 8h496v496H8z" stroke="#687062" stroke-opacity=".45" stroke-width="2" fill="none"/></svg>');
    }
}
