// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ============================================================
 *  AGENTIC MINER (AGENMINER) — BEP-20 di BNB Smart Chain
 * ============================================================
 *  Nama        : AGENTIC MINER
 *  Ticker      : AGENMINER
 *  Suplai      : 100.000.000 (tetap, tanpa mint tambahan)
 *  Desimal     : 18
 *
 *  Fitur:
 *  - BEP-20 standar penuh (transfer, approve, allowance)
 *  - Suplai tetap: seluruh 100 juta dicetak sekali ke deployer
 *  - `airdrop()`: khusus owner (backend game) untuk distribusi
 *    reward mining on-chain secara batch (hemat gas)
 *  - `burn()`: pemegang dapat membakar tokennya sendiri
 *
 *  CATATAN KEAMANAN:
 *  - Tidak ada mekanisme mint setelah deploy → suplai terkunci 100M
 *  - Owner hanya bisa membelanjakan saldo yang DISETOR (approve) kepadanya,
 *    atau token yang masih berada di wallet owner sendiri.
 *  - Audit mandiri sebelum deploy mainnet sangat disarankan.
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

    uint256 public constant TOTAL_SUPPLY = 100_000_000 * 10 ** 18; // 100 juta

    address public immutable owner;

    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    uint256 private _totalSupply;

    modifier onlyOwner() {
        require(msg.sender == owner, "AGENTIC: bukan owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        _totalSupply = TOTAL_SUPPLY;
        balanceOf[msg.sender] = TOTAL_SUPPLY;
        emit Transfer(address(0), msg.sender, TOTAL_SUPPLY);
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "AGENTIC: allowance kurang");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    /**
     * @dev Distribusi reward mining oleh backend game (owner).
     * Owner harus memegang token yang akan didistribusikan.
     * Contoh: kirim ke 50 penambang sekaligus dalam 1 transaksi.
     */
    function airdrop(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "AGENTIC: panjang tidak sama");
        require(recipients.length <= 200, "AGENTIC: maksimal 200 penerima");
        for (uint256 i = 0; i < recipients.length; i++) {
            _transfer(msg.sender, recipients[i], amounts[i]);
        }
    }

    /** @dev Bakar token sendiri (mengurangi total suplai). */
    function burn(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "AGENTIC: saldo kurang");
        balanceOf[msg.sender] -= amount;
        _totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "AGENTIC: transfer ke nol");
        require(balanceOf[from] >= amount, "AGENTIC: saldo kurang");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
