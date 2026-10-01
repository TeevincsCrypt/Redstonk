import { describe, expect, it } from "vitest";
import BN from "bn.js";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  DEV_LAUNCHPAD_PROGRAM,
  LAUNCHPAD_PROGRAM,
  LaunchpadConfig,
  LaunchpadPool,
  PlatformConfig,
  getPdaLaunchpadPoolId,
} from "@raydium-io/raydium-sdk-v2";
import {
  CONFIG_SPAN,
  PLATFORM_SPAN,
  POOL_SPAN,
  curveProgress,
  decodeConfig,
  decodePlatform,
  decodePool,
  launchPoolId,
} from "@/lib/launchlab-layout";
import { LAUNCHLAB_PROGRAM_IDS } from "@/lib/env";

const key = () => Keypair.generate().publicKey;

// The SDK layouts carry an 8-byte discriminator/padding prefix that encode() writes as a blob.
function encode(layout: { span: number; encode: (src: any, b: Buffer) => number; fields: any[] }, src: any): Buffer {
  const b = Buffer.alloc(layout.span);
  const filled: any = { ...src };
  for (const f of layout.fields) {
    if (f.property && !(f.property in filled)) {
      filled[f.property] = f.span === 32 ? PublicKey.default : f.span >= 64 ? Buffer.alloc(f.span) : f.span > 8 ? [] : new BN(0);
    }
  }
  layout.encode(filled, b);
  return b;
}

describe("LaunchLab decoders match the SDK layouts", () => {
  it("program ids", () => {
    expect(LAUNCHLAB_PROGRAM_IDS["mainnet-beta"]).toBe(LAUNCHPAD_PROGRAM.toBase58());
    expect(LAUNCHLAB_PROGRAM_IDS.devnet).toBe(DEV_LAUNCHPAD_PROGRAM.toBase58());
  });

  it("spans", () => {
    expect(LaunchpadConfig.span).toBe(CONFIG_SPAN);
    expect(LaunchpadPool.span).toBe(POOL_SPAN);
    expect(PlatformConfig.span).toBe(PLATFORM_SPAN);
  });

  it("GlobalConfig", () => {
    const mintB = key();
    const data = Buffer.alloc(CONFIG_SPAN);
    // Write through the SDK's field offsets.
    LaunchpadConfig.encode(
      {
        epoch: new BN(1),
        curveType: 0,
        index: 3,
        migrateFee: new BN(7),
        tradeFeeRate: new BN(2500),
        maxShareFeeRate: new BN(0),
        minSupplyA: new BN(10_000_000),
        maxLockRate: new BN(0),
        minSellRateA: new BN(1),
        minMigrateRateA: new BN(150_000),
        minFundRaisingB: new BN(42),
        mintB,
        protocolFeeOwner: key(),
        migrateFeeOwner: key(),
        migrateToAmmWallet: key(),
        migrateToCpmmWallet: key(),
        padding: Array(16).fill(new BN(0)),
      } as any,
      data,
    );
    const d = decodeConfig(data);
    expect(d.mintB.equals(mintB)).toBe(true);
    expect(d.tradeFeeRate).toBe(BigInt(2500));
    expect(d.minFundRaisingB).toBe(BigInt(42));
    expect(d.index).toBe(3);
    expect(d.migrateFee).toBe(BigInt(7));
  });

  it("Pool and progress", () => {
    const mintA = key();
    const mintB = key();
    const platformId = key();
    const configId = key();
    const creator = key();
    const sdkDecoded = {
      epoch: new BN(1),
      bump: 254,
      status: 0,
      mintDecimalsA: 6,
      mintDecimalsB: 8,
      migrateType: 1,
      supply: new BN("1000000000000000"),
      totalSellA: new BN("793100000000000"),
      virtualA: new BN(11),
      virtualB: new BN(12),
      realA: new BN(13),
      realB: new BN(250),
      totalFundRaisingB: new BN(1000),
      protocolFee: new BN(0),
      platformFee: new BN(0),
      migrateFee: new BN(0),
      vestingSchedule: {
        totalLockedAmount: new BN(0),
        cliffPeriod: new BN(0),
        unlockPeriod: new BN(0),
        startTime: new BN(0),
        totalAllocatedShare: new BN(0),
      },
      configId,
      platformId,
      mintA,
      mintB,
      vaultA: key(),
      vaultB: key(),
      creator,
      mintProgramFlag: 0,
      cpmmCreatorFeeOn: 0,
      platformVestingShare: new BN(0),
      padding: Array(7).fill(new BN(0)),
    };
    const data = Buffer.alloc(POOL_SPAN);
    LaunchpadPool.encode(sdkDecoded as any, data);
    const roundTrip = LaunchpadPool.decode(data);
    const d = decodePool(data);
    expect(d.mintA.equals(roundTrip.mintA)).toBe(true);
    expect(d.mintB.equals(mintB)).toBe(true);
    expect(d.platformId.equals(platformId)).toBe(true);
    expect(d.configId.equals(configId)).toBe(true);
    expect(d.creator.equals(creator)).toBe(true);
    expect(d.totalSellA.toString()).toBe(roundTrip.totalSellA.toString());
    expect(d.realB).toBe(BigInt(250));
    expect(d.mintDecimalsB).toBe(8);
    expect(curveProgress(d)).toBeCloseTo(0.25);
    expect(curveProgress({ ...d, status: 2 })).toBe(1);
  });

  it("Platform", () => {
    const cp = key();
    const name = Buffer.alloc(64);
    name.write("RedStonk");
    const data = encode(PlatformConfig as any, {
      epoch: new BN(1),
      platformClaimFeeWallet: key(),
      platformLockNftWallet: key(),
      platformScale: new BN(0),
      creatorScale: new BN(0),
      burnScale: new BN(1_000_000),
      feeRate: new BN(5000),
      name: [...name],
      web: Array(256).fill(0),
      img: Array(256).fill(0),
      cpConfigId: cp,
      creatorFeeRate: new BN(5000),
      transferFeeExtensionAuth: key(),
      platformVestingWallet: key(),
      platformVestingScale: new BN(0),
      platformCpCreator: key(),
      restrictGlobalConfig: 0,
      restrictCurveParam: 1,
      curveRuleManager: key(),
    });
    const sdk = PlatformConfig.decode(data);
    const d = decodePlatform(data);
    expect(d.name).toBe("RedStonk");
    expect(d.feeRate).toBe(BigInt(sdk.feeRate.toString()));
    expect(d.creatorFeeRate).toBe(BigInt(5000));
    expect(d.burnScale).toBe(BigInt(1_000_000));
    expect(d.cpConfigId.equals(cp)).toBe(true);
    expect(d.restrictCurveParam).toBe(1);
  });

  it("pool PDA", () => {
    const a = key();
    const b = key();
    expect(launchPoolId(LAUNCHPAD_PROGRAM, a, b).equals(getPdaLaunchpadPoolId(LAUNCHPAD_PROGRAM, a, b).publicKey)).toBe(true);
  });
});
