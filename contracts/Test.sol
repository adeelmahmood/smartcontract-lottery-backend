//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract Test {
    function getName() public pure returns (string memory) {
        return "My name is Test";
    }
}
