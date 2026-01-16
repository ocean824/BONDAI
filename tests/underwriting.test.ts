import { describe, it, expect, beforeEach } from "vitest";
import { 
  calculateRiskScore, 
  runMonteCarloSimulation 
} from "../server/services/underwritingEnhancedService";

describe("Underwriting Risk Scoring", () => {
  it("should calculate risk score for low-risk case", () => {
    const factors = {
      claimToAssetRatio: 50,    // 50% ratio (good)
      collectionProbability: 80, // 80% collection probability (good)
      debtorFinancialHealth: 75,
      assetLiquidity: 70,
      lienPositionStrength: 80,
      jurisdictionFavorability: 75,
      documentationQuality: 90,
      marketConditions: 60,
      industryRisk: 70,
      economicConditions: 65,
    };

    const result = calculateRiskScore(factors);

    expect(result.overallScore).toBeGreaterThanOrEqual(70);
    expect(result.riskTier).toBe("LOW");
    expect(result.confidence).toBe(1);
  });

  it("should calculate risk score for high-risk case", () => {
    const factors = {
      claimToAssetRatio: 150,   // 150% ratio (bad)
      collectionProbability: 30, // 30% collection probability (bad)
      debtorFinancialHealth: 20,
      assetLiquidity: 20,
      lienPositionStrength: 25,
      jurisdictionFavorability: 30,
      documentationQuality: 40,
      marketConditions: 35,
      industryRisk: 25,
      economicConditions: 40,
    };

    const result = calculateRiskScore(factors);

    expect(result.overallScore).toBeLessThanOrEqual(50);
    expect(result.riskTier).toBe("HIGH" as any);
  });

  it("should calculate recovery probability correctly", () => {
    const factors = {
      claimToAssetRatio: 100,
      collectionProbability: 50,
      debtorFinancialHealth: 50,
      assetLiquidity: 50,
      lienPositionStrength: 50,
      jurisdictionFavorability: 50,
      documentationQuality: 50,
      marketConditions: 50,
      industryRisk: 50,
      economicConditions: 50,
    };

    const result = calculateRiskScore(factors);

    // Recovery probability should match overall score
    expect(result.recoveryProbability).toBe(result.overallScore);
  });
});

describe("Monte Carlo Simulation", () => {
  it("should run simulation with valid parameters", () => {
    const result = runMonteCarloSimulation(70, 0.2, 1000);

    expect(result.simulations).toBe(1000);
    expect(result.meanRecovery).toBeGreaterThan(0);
    expect(result.medianRecovery).toBeGreaterThan(0);
    expect(result.percentile5).toBeLessThanOrEqual(result.percentile50);
    expect(result.percentile95).toBeGreaterThanOrEqual(result.percentile50);
  });

  it("should calculate probability of loss", () => {
    const result = runMonteCarloSimulation(30, 0.3, 2000);

    // With low base recovery, probability of loss should be higher
    expect(result.probabilityOfLoss).toBeGreaterThan(0);
    expect(result.probabilityOfLoss).toBeLessThanOrEqual(100);
  });

  it("should calculate probability of high recovery", () => {
    const result = runMonteCarloSimulation(85, 0.15, 2000);

    // With high base recovery, probability of high recovery should be higher
    expect(result.probabilityOfHighRecovery).toBeGreaterThan(0);
  });
});
