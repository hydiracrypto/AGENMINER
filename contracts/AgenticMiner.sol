// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ============================================================
 *  AGENTIC MINER (AGENMINER) — BEP-20 on BNB Smart Chain
 * ============================================================
 *  Name        : AGENTIC MINER
 *  Ticker      : AGENMINER
 *  Max supply  : 100,000,000 (hard cap, can never be exceeded)
 *  Decimals    : 18
 *
 *  WITHDRAWAL AUTO-MINT MODEL:
 *  - No initial mint at deploy time. Supply is minted ON-DEMAND.
 *  - The game backend (owner) calls `mintWithdrawal(to, amount, feeBps)`
 *    for every game-balance withdrawal:
 *      → net   is minted directly to the miner's wallet (BEP-20)
 *      → fee   is minted to `liquidityPool` (the AGENMINER/BNB pair
 *        on PancakeSwap), so every withdrawal fee automatically
 *        deepens the PancakeSwap DEX liquidity.
 *  - `mintOwner()`: owner-only mint for team / marketing / seed
 *    liquidity allocations — still locked by the 100M hard cap.
 *  - Total supply that can EVER be printed ≤ 100,000,000 → the
 *    supply is mathematically locked.
 *
 *  Other features:
 *  - Full standard BEP-20 (transfer, approve, allowance)
 *  - `increaseAllowance()` / `decreaseAllowance()`: safe approval
 *    helpers (prevents the well-known approve race condition)
 *  - `airdrop()`: gas-efficient batch distribution by owner
 *    (transfers from the owner's own balance)
 *  - `airdropMint()`: batch mint straight from the remaining hard
 *    cap — ideal for distributing fresh mining rewards without
 *    pre-minting to the owner first
 *  - `burn()`: holders can burn their own tokens
 *  - `transferOwnership()`: rotate the backend minter key
 *
 *  SECURITY NOTES:
 *  - Only the owner (game backend) can mint, and only from the
 *    remaining hard-cap capacity.
 *  - Set `liquidityPool` to the PancakeSwap pair address
 *    (AGENMINER/BNB). After fees are minted to the pair, anyone can
 *    call `pair.sync()` (permissionless) or pair it with BNB via
 *    addLiquidity so reserves are updated.
 *  - While `liquidityPool` is still unset, withdrawal fees are minted
 *    to the owner as a safe fallback.
 *  - A self-audit before mainnet deployment is strongly recommended.
 * ============================================================
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract AgenticMiner is IERC20 {
    string public constant name = "AGENTIC MINER";
    string public constant symbol = "AGENMINER";
    uint8 public constant decimals = 18;

    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18; // hard cap: 100 million

    address public owner;
    address public liquidityPool; // PancakeSwap AGENMINER/BNB pair

    uint256 private _totalSupply;

    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    event WithdrawalMinted(address indexed to, uint256 netAmount, uint256 liquidityFee);
    event LiquidityPoolUpdated(address indexed oldPool, address indexed newPool);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "AGENTIC: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
        // No initial mint — supply is minted on-demand (totalSupply starts at 0)
    }

    // ------------------------------------------------------------ //
    //  ERC20 core views                                            //
    // ------------------------------------------------------------ //

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    /// @dev Remaining capacity that can still be minted (up to the 100M hard cap).
    function remainingMintable() external view returns (uint256) {
        return MAX_SUPPLY - _totalSupply;
    }

    // ------------------------------------------------------------ //
    //  Ownership management                                        //
    // ------------------------------------------------------------ //

    /// @dev Rotate the backend minter/owner wallet (key migration or compromise).
    ///      This is critical: the previous `immutable owner` design made key
    ///      rotation impossible and could permanently lock the mint authority.
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "AGENTIC: zero owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ------------------------------------------------------------ //
    //  Liquidity configuration                                     //
    // ------------------------------------------------------------ //

    /// @dev Point withdrawal fees at the PancakeSwap AGENMINER/BNB pair.
    ///      State is updated BEFORE the event is emitted (checks-effects-
    ///      interactions best practice).
    function setLiquidityPool(address pool) external onlyOwner {
        require(pool != address(0), "AGENTIC: zero pool");
        address oldPool = liquidityPool;
        liquidityPool = pool;
        emit LiquidityPoolUpdated(oldPool, pool);
    }

    // ------------------------------------------------------------ //
    //  Minting (owner / game backend only)                         //
    // ------------------------------------------------------------ //

    /**
     * @dev CORE OF THE WITHDRAWAL AUTO-MINT — called by the game backend
     * (owner) for every game-balance withdrawal:
     *  - amount : total tokens withdrawn (net + fee), in wei (18 decimals)
     *  - feeBps : fee in basis points, e.g. 500 = 5% → minted to the
     *    PancakeSwap liquidity pool (`liquidityPool`). The remainder
     *    (net) is minted straight to the user's wallet.
     *
     * NOTE: the signature (address, uint256, uint16) MUST stay stable —
     * it is hard-coded in the game backend ABI (src/lib/onchain-mint.ts).
     */
    function mintWithdrawal(address to, uint256 amount, uint16 feeBps) external onlyOwner {
        require(to != address(0), "AGENTIC: zero address");
        require(amount > 0, "AGENTIC: zero amount");
        require(feeBps <= 5_000, "AGENTIC: feeBps > 50%");
        require(_totalSupply + amount <= MAX_SUPPLY, "AGENTIC: 100M cap exceeded");

        uint256 fee = (amount * feeBps) / 10_000;
        uint256 net = amount - fee;

        if (net > 0) {
            balanceOf[to] += net;
            emit Transfer(address(0), to, net);
        }
        if (fee > 0) {
            address pool = liquidityPool != address(0) ? liquidityPool : owner;
            balanceOf[pool] += fee;
            emit Transfer(address(0), pool, fee);
        }
        _totalSupply += amount;
        emit WithdrawalMinted(to, net, fee);
    }

    /// @dev Owner-only mint for team / marketing / seed-liquidity allocations.
    ///      Always bounded by the 100M hard cap.
    function mintOwner(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "AGENTIC: zero address");
        require(amount > 0, "AGENTIC: zero amount");
        require(_totalSupply + amount <= MAX_SUPPLY, "AGENTIC: 100M cap exceeded");
        _totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    // ------------------------------------------------------------ //
    //  BEP-20 core                                                 //
    // ------------------------------------------------------------ //

    function transfer(address to, uint256 amount) external override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /// @dev Atomically increase allowance (prevents the approve race condition).
    function increaseAllowance(address spender, uint256 addedValue) external returns (bool) {
        uint256 newAllowance = allowance[msg.sender][spender] + addedValue; // reverts on overflow (0.8.x)
        allowance[msg.sender][spender] = newAllowance;
        emit Approval(msg.sender, spender, newAllowance);
        return true;
    }

    /// @dev Atomically decrease allowance (prevents the approve race condition).
    function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool) {
        uint256 current = allowance[msg.sender][spender];
        require(current >= subtractedValue, "AGENTIC: decreased allowance below zero");
        uint256 newAllowance = current - subtractedValue;
        allowance[msg.sender][spender] = newAllowance;
        emit Approval(msg.sender, spender, newAllowance);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "AGENTIC: insufficient allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    // ------------------------------------------------------------ //
    //  Batch utilities (gas-efficient distribution)                //
    // ------------------------------------------------------------ //

    /**
     * @dev Batch-distribute tokens already held by the owner
     * (e.g. send rewards to 50 miners in a single transaction).
     * Pre-mint to the owner with `mintOwner()` first when needed.
     */
    function airdrop(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "AGENTIC: length mismatch");
        require(recipients.length <= 200, "AGENTIC: too many recipients");
        for (uint256 i = 0; i < recipients.length; i++) {
            _transfer(msg.sender, recipients[i], amounts[i]);
        }
    }

    /**
     * @dev Batch-MINT fresh tokens directly from the remaining hard cap
     * to multiple recipients in one transaction — no pre-mint to the
     * owner is required. Ideal for distributing mining rewards from
     * scratch while the hard cap still guarantees the 100M supply lock.
     */
    function airdropMint(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "AGENTIC: length mismatch");
        require(recipients.length <= 200, "AGENTIC: too many recipients");

        uint256 total = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(recipients[i] != address(0), "AGENTIC: zero address");
            total += amounts[i]; // reverts on overflow (0.8.x)
        }
        require(_totalSupply + total <= MAX_SUPPLY, "AGENTIC: 100M cap exceeded");

        _totalSupply += total;
        for (uint256 i = 0; i < recipients.length; i++) {
            uint256 amount = amounts[i];
            if (amount == 0) continue;
            balanceOf[recipients[i]] += amount;
            emit Transfer(address(0), recipients[i], amount);
        }
    }

    // ------------------------------------------------------------ //
    //  Burn                                                        //
    // ------------------------------------------------------------ //

    /// @dev Burn your own tokens (reduces the total supply).
    function burn(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "AGENTIC: insufficient balance");
        balanceOf[msg.sender] -= amount;
        _totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }

    // ------------------------------------------------------------ //
    //  Internal                                                    //
    // ------------------------------------------------------------ //

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "AGENTIC: transfer to zero address");
        require(balanceOf[from] >= amount, "AGENTIC: insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
