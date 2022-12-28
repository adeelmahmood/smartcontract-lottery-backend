//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract SampleNft is ERC721 {
    string private s_tokenUri;
    uint256 private s_tokenId;

    event SampleNftMinted(uint256 indexed tokenId);

    constructor() ERC721("SampleNft", "SNT") {
        s_tokenUri = "ipfs://QmdwJ23vVttro1tL1gaitQk6ygW8dhNYawMUtfvPPB1wAt";
        s_tokenId = 0;
    }

    function mintNft() public {
        _safeMint(msg.sender, s_tokenId);
        emit SampleNftMinted(s_tokenId);
        s_tokenId += 1;
    }

    function tokenId() public view returns (uint256) {
        return s_tokenId;
    }

    function tokenURI(
        uint256 /*tokenId*/
    ) public view override returns (string memory) {
        return "ipfs://QmdwJ23vVttro1tL1gaitQk6ygW8dhNYawMUtfvPPB1wAt";
    }
}
