// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract TENToken is ERC20, ERC20Permit, Ownable {
    uint256 public constant MAX_SUPPLY = 100_000_000 * 1e18;

    mapping(address => bool) public minter;

    modifier onlyMinter() {
        require(minter[msg.sender], "TENToken: not a minter");
        _;
    }

    constructor(address initialOwner)
        ERC20("TENANCY", "TEN")
        Ownable(initialOwner)
        ERC20Permit("TENANCY")
    {
        minter[initialOwner] = true;
    }

    function mint(address to, uint256 amount) external onlyMinter {
        require(totalSupply() + amount <= MAX_SUPPLY, "TENToken: exceeds max supply");
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function setMinter(address _minter, bool _status) external onlyOwner {
        minter[_minter] = _status;
    }
}
