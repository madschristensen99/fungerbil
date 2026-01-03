// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

/**
 * @title wXMR - Wrapped Monero
 * @notice ERC20 token representing Monero on Arbitrum
 */
contract wXMR {
    
    string public constant name = "Wrapped Monero";
    string public constant symbol = "wXMR";
    uint8 public constant decimals = 12; // Match Monero's 12 decimals
    
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    address public bridge;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event BridgeUpdated(address indexed newBridge);
    
    modifier onlyBridge() {
        require(msg.sender == bridge, "Only bridge can mint/burn");
        _;
    }
    
    constructor() {
        bridge = msg.sender; // Deployer is initial bridge
    }
    
    /**
     * @notice Update bridge address (one-time setup)
     */
    function setBridge(address _bridge) external {
        require(bridge == msg.sender, "Only current bridge");
        require(_bridge != address(0), "Invalid bridge address");
        bridge = _bridge;
        emit BridgeUpdated(_bridge);
    }
    
    /**
     * @notice Mint wXMR (only bridge)
     */
    function mint(address to, uint256 amount) external onlyBridge {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
    
    /**
     * @notice Burn wXMR (only bridge)
     */
    function burn(address from, uint256 amount) external onlyBridge {
        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }
    
    /**
     * @notice Transfer tokens
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    /**
     * @notice Approve spender
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    /**
     * @notice Transfer from approved address
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
