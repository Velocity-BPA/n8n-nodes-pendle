/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
  calculateImpliedAPY,
  calculateFixedYield,
  calculatePTPrice,
  calculateYTLeverage,
  calculateDaysToMaturity,
  calculatePTDiscount,
} from '../../nodes/Pendle/utils/yieldUtils';

import {
  isExpired,
  isExpiringSoon,
  getTimeRemainingFormatted,
  formatExpiryDate,
  roundToWeek,
  validateLockExpiry,
} from '../../nodes/Pendle/utils/maturityUtils';

import {
  formatTokenAmount,
  parseTokenAmount,
  calculatePriceImpact,
  calculateMinOutput,
  isValidAddress,
  truncateAddress,
} from '../../nodes/Pendle/utils/priceUtils';

import {
  calculateLPShare,
  calculatePoolComposition,
  calculateImpermanentLoss,
  calculateFeeAPR,
} from '../../nodes/Pendle/utils/lpUtils';

describe('Yield Utilities', () => {
  describe('calculateImpliedAPY', () => {
    it('should calculate correct implied APY', () => {
      const apy = calculateImpliedAPY(0.95, 365);
      expect(apy).toBeCloseTo(5.26, 1);
    });

    it('should return 0 for expired markets', () => {
      const apy = calculateImpliedAPY(0.95, 0);
      expect(apy).toBe(0);
    });

    it('should throw for invalid PT price', () => {
      expect(() => calculateImpliedAPY(0, 365)).toThrow();
      expect(() => calculateImpliedAPY(1.5, 365)).toThrow();
    });
  });

  describe('calculateFixedYield', () => {
    it('should calculate correct fixed yield', () => {
      const yield_ = calculateFixedYield(0.95);
      expect(yield_).toBeCloseTo(5.26, 1);
    });
  });

  describe('calculatePTPrice', () => {
    it('should calculate PT price from APY', () => {
      const price = calculatePTPrice(5, 365);
      expect(price).toBeCloseTo(0.9524, 3);
    });

    it('should return 1 at maturity', () => {
      const price = calculatePTPrice(5, 0);
      expect(price).toBe(1);
    });
  });

  describe('calculateYTLeverage', () => {
    it('should calculate correct leverage', () => {
      const leverage = calculateYTLeverage(0.05);
      expect(leverage).toBe(20);
    });

    it('should throw for zero price', () => {
      expect(() => calculateYTLeverage(0)).toThrow();
    });
  });

  describe('calculateDaysToMaturity', () => {
    it('should calculate positive days for future expiry', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 86400 * 30;
      const days = calculateDaysToMaturity(futureTimestamp);
      expect(days).toBeCloseTo(30, 0);
    });

    it('should calculate negative days for past expiry', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 86400;
      const days = calculateDaysToMaturity(pastTimestamp);
      expect(days).toBeLessThan(0);
    });
  });

  describe('calculatePTDiscount', () => {
    it('should calculate correct discount', () => {
      const discount = calculatePTDiscount(0.95);
      expect(discount).toBe(5);
    });
  });
});

describe('Maturity Utilities', () => {
  describe('isExpired', () => {
    it('should return true for past timestamp', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 86400;
      expect(isExpired(pastTimestamp)).toBe(true);
    });

    it('should return false for future timestamp', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 86400;
      expect(isExpired(futureTimestamp)).toBe(false);
    });
  });

  describe('isExpiringSoon', () => {
    it('should return true within threshold', () => {
      const soonTimestamp = Math.floor(Date.now() / 1000) + 86400 * 3;
      expect(isExpiringSoon(soonTimestamp, 7)).toBe(true);
    });

    it('should return false outside threshold', () => {
      const laterTimestamp = Math.floor(Date.now() / 1000) + 86400 * 30;
      expect(isExpiringSoon(laterTimestamp, 7)).toBe(false);
    });
  });

  describe('getTimeRemainingFormatted', () => {
    it('should return "Expired" for past timestamp', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 86400;
      expect(getTimeRemainingFormatted(pastTimestamp)).toBe('Expired');
    });
  });

  describe('roundToWeek', () => {
    it('should round to week boundary', () => {
      const timestamp = 604800 * 10 + 1000;
      const rounded = roundToWeek(timestamp);
      expect(rounded % 604800).toBe(0);
    });
  });
});

describe('Price Utilities', () => {
  describe('formatTokenAmount', () => {
    it('should format wei to human readable', () => {
      const formatted = formatTokenAmount(BigInt('1000000000000000000'), 18, 2);
      expect(formatted).toBe('1');
    });
  });

  describe('parseTokenAmount', () => {
    it('should parse human readable to wei', () => {
      const parsed = parseTokenAmount('1.0', 18);
      expect(parsed.toString()).toBe('1000000000000000000');
    });
  });

  describe('calculatePriceImpact', () => {
    it('should calculate positive impact', () => {
      const impact = calculatePriceImpact(100, 105);
      expect(impact).toBe(5);
    });

    it('should calculate negative impact', () => {
      const impact = calculatePriceImpact(100, 95);
      expect(impact).toBe(-5);
    });
  });

  describe('calculateMinOutput', () => {
    it('should apply slippage correctly', () => {
      const minOutput = calculateMinOutput(BigInt(1000), 1);
      expect(minOutput).toBe(BigInt(990));
    });
  });

  describe('isValidAddress', () => {
    it('should validate correct address', () => {
      expect(isValidAddress('0x0000000000000000000000000000000000000000')).toBe(true);
    });

    it('should reject invalid address', () => {
      expect(isValidAddress('invalid')).toBe(false);
    });
  });

  describe('truncateAddress', () => {
    it('should truncate address correctly', () => {
      const truncated = truncateAddress('0x1234567890abcdef1234567890abcdef12345678');
      expect(truncated).toBe('0x1234...5678');
    });
  });
});

describe('LP Utilities', () => {
  describe('calculateLPShare', () => {
    it('should calculate correct share', () => {
      const share = calculateLPShare(BigInt(100), BigInt(1000));
      expect(share).toBe(0.1);
    });

    it('should return 0 for zero total supply', () => {
      const share = calculateLPShare(BigInt(100), BigInt(0));
      expect(share).toBe(0);
    });
  });

  describe('calculatePoolComposition', () => {
    it('should calculate 50/50 composition', () => {
      const composition = calculatePoolComposition(BigInt(1000), BigInt(1000));
      expect(composition.syPercentage).toBe(50);
      expect(composition.ptPercentage).toBe(50);
    });
  });

  describe('calculateImpermanentLoss', () => {
    it('should return 0 for no price change', () => {
      const il = calculateImpermanentLoss(1, 1);
      expect(il).toBeCloseTo(0, 5);
    });

    it('should calculate IL for price change', () => {
      const il = calculateImpermanentLoss(1, 2);
      expect(il).toBeLessThan(0);
    });
  });

  describe('calculateFeeAPR', () => {
    it('should calculate correct fee APR', () => {
      const apr = calculateFeeAPR(1000000, 100000000, 10);
      expect(apr).toBeCloseTo(0.365, 2);
    });

    it('should return 0 for zero TVL', () => {
      const apr = calculateFeeAPR(1000000, 0, 10);
      expect(apr).toBe(0);
    });
  });
});
