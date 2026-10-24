// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ============================================================
 *  AGENTIC MINER (AGENMINER) — BEP-20 di BNB Smart Chain
 * ============================================================
 *  Nama        : AGENTIC MINER
 *  Ticker      : AGENMINER
 *  Suplai maks : 100.000.000 (hard cap, tidak bisa dilampaui)
 *  Desimal     : 18
 *
 *  MODEL AUTO-MINT PENARIKAN:
 *  - Tidak ada initial mint saat deploy. Suplai dicetak ON-DEMAND.
 *  - Backend game (owner) memanggil `mintWithdrawal(to, amount, feeBps)`
 *    setiap ada penarikan game-balance:
 *      → net   di-mint langsung ke wallet penambang (BEP-20)
 *      → fee   di-mint ke `liquidityPool` (pair AGENMINER/BNB
 *        PancakeSwap) sehingga fee penarikan otomatis menambah
 *        likuiditas DEX PancakeSwap.
 *  - `mintOwner()`: khusus owner utk alokasi tim / marketing / seed
 *    likuiditas — tetap terkunci hard cap 100M.
 *  - Total yang bisa dicetak SELAMANYA ≤ 100.000.000 → suplai
 *    tetap terkunci secara matematis.
 *
 *  Fitur lain:
 *  - BEP-20 standar penuh (transfer, approve, allowance)
 *  - `airdrop()`: distribusi batch (hemat gas) oleh owner
 *  - `burn()`: pemegang dapat membakar tokennya sendiri
 *
 *  CATATAN KEAMANAN:
 *  - Hanya owner (backend game) yang bisa mint, dan hanya dari
 *    sisa kapasitas hard cap.
 *  - Set `liquidityPool` ke alamat pair PancakeSwap (AGENMINER/BNB).
 *    Setelah fee di-mint ke pair, panggil `pair.sync()` (permissionless)
 *    atau pasangkan dengan BNB via addLiquidity agar reserve ter-update.
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

    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18; // hard cap 100 juta

    address public immutable owner;
    address public liquidityPool; // pair PancakeSwap AGENMINER/BNB

    uint256 private _totalSupply;

    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    event WithdrawalMinted(address indexed to, uint256 netAmount, uint256 liquidityFee);
    event LiquidityPoolUpdated(address indexed oldPool, address indexed newPool);

    modifier onlyOwner() {
        require(msg.sender == owner, "AGENTIC: not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        _totalSupply = 0; // tanpa initial mint — suplai dicetak on-demand
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    /** @dev Sisa kapasitas yang masih boleh di-mint (menuju hard cap 100M). */
    function remainingMintable() external view returns (uint256) {
        return MAX_SUPPLY - _totalSupply;
    }

    function setLiquidityPool(address pool) external onlyOwner {
        require(pool != address(0), "AGENTIC: zero pool");
        emit LiquidityPoolUpdated(liquidityPool, pool);
        liquidityPool = pool;
    }

    /**
     * @dev INTI AUTO-MINT PENARIKAN — dipanggil backend game (owner)
     * setiap penarikan game-balance:
     *  - amount : total token ditarik (net + fee), dalam wei (18 desimal)
     *  - feeBps : fee dalam basis point, mis. 500 = 5% → masuk likuiditas
     *    PancakeSwap (liquidityPool). Sisanya (net) di-mint ke wallet user.
     */
    function mintWithdrawal(address to, uint256 amount, uint16 feeBps) external onlyOwner {
        require(to != address(0), "AGENTIC: zero address");
        require(feeBps <= 5_000, "AGENTIC: feeBps > 50%");
        require(_totalSupply + amount <= MAX_SUPPLY, "AGENTIC: cap 100M terlampaui");

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

    /**
     * @dev Mint oleh owner untuk alokasi tim / marketing / seed likuiditas.
     * Tetap tunduk hard cap 100M.
     */
    function mintOwner(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "AGENTIC: zero address");
        require(_totalSupply + amount <= MAX_SUPPLY, "AGENTIC: cap 100M terlampaui");
        _totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
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
     * @dev Distribusi token yang dipegang owner secara batch
     * (contoh: kirim reward ke 50 penambang dalam 1 transaksi).
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
