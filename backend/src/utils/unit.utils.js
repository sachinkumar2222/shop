import { Prisma } from '@prisma/client';

const Decimal = Prisma.Decimal;

/**
 * Calculates the selling price for a ProductUnit based on:
 *   costPerBase * factorToBase * (1 + marginPercent / 100)
 * Or returns priceOverride if specified.
 * Returns exact Decimal rounded to 2 decimal places (or integer ₹1 if specified).
 */
export const calcSellingPrice = ({
  costPerBase,
  factorToBase,
  marginPercent = 0,
  priceOverride = null,
}) => {
  if (priceOverride !== null && priceOverride !== undefined && String(priceOverride).trim() !== '' && new Decimal(priceOverride.toString()).gt(0)) {
    return new Decimal(priceOverride.toString()).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  const cost = new Decimal(costPerBase ? costPerBase.toString() : '0');
  const factor = new Decimal(factorToBase ? factorToBase.toString() : '1');
  const margin = new Decimal(marginPercent ? marginPercent.toString() : '0');

  // unitCost = costPerBase * factorToBase
  const unitCost = cost.mul(factor);

  // multiplier = 1 + (margin / 100)
  const multiplier = new Decimal(1).add(margin.div(100));

  const rawSellingPrice = unitCost.mul(multiplier);

  // Round to nearest integer ₹1 (standard retail rounding)
  const roundedPrice = rawSellingPrice.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  return roundedPrice.gt(0) ? roundedPrice : rawSellingPrice.ceil();
};

/**
 * Suggests selling prices for product units during Add Batch preview based on pricing_basis setting.
 * pricingBasis: 'latest' (cost from incoming batch) or 'weighted_avg' (weighted average cost of all active stock)
 */
export const suggestUnitPrices = (product, newBatchCostPerBase, existingBatches = [], pricingBasis = 'latest') => {
  let effectiveCostPerBase = new Decimal(newBatchCostPerBase.toString());

  if (pricingBasis === 'weighted_avg' && existingBatches && existingBatches.length > 0) {
    let totalQty = new Decimal(0);
    let totalCostVal = new Decimal(0);

    for (const b of existingBatches) {
      const q = new Decimal(b.qtyRemainingBase.toString());
      const c = new Decimal(b.costPerBase.toString());
      if (q.gt(0)) {
        totalQty = totalQty.add(q);
        totalCostVal = totalCostVal.add(q.mul(c));
      }
    }

    if (totalQty.gt(0)) {
      effectiveCostPerBase = totalCostVal.div(totalQty);
    }
  }

  const suggestions = {};
  if (product.units && product.units.length > 0) {
    for (const u of product.units) {
      const suggestedPrice = calcSellingPrice({
        costPerBase: effectiveCostPerBase,
        factorToBase: u.factorToBase,
        marginPercent: u.marginPercent,
        priceOverride: u.priceOverride,
      });
      suggestions[u.id] = suggestedPrice.toNumber();
    }
  }

  return {
    effectiveCostPerBase: effectiveCostPerBase.toFixed(4),
    suggestions,
  };
};

/**
 * Formats stock quantities into base unit + breakdown in purchase/sell units.
 * Examples:
 *   formatStock(450, { baseUnit: 'kg', units: [{ nameEn: 'bori', factorToBase: 50 }] })
 *   => "450 kg (9 bori)"
 *
 *   formatStock(399, { baseUnit: 'kg', units: [{ nameEn: 'bori', factorToBase: 50 }] })
 *   => "399 kg (7 bori 49 kg)"
 *
 *   formatStock(10, { baseUnit: 'kg', units: [] })
 *   => "10 kg"
 */
export const formatStock = (qtyBaseInput, product) => {
  const qtyBase = Number(qtyBaseInput || 0);
  const baseUnit = product?.baseUnit || 'piece';

  if (!product?.units || product.units.length === 0) {
    return `${qtyBase} ${baseUnit}`;
  }

  // Find the largest unit with factorToBase > 1
  const higherUnits = product.units
    .filter((u) => Number(u.factorToBase) > 1)
    .sort((a, b) => Number(b.factorToBase) - Number(a.factorToBase));

  if (higherUnits.length === 0) {
    return `${qtyBase} ${baseUnit}`;
  }

  const topUnit = higherUnits[0];
  const factor = Number(topUnit.factorToBase);

  const fullUnitCount = Math.floor(qtyBase / factor);
  const remainderBase = qtyBase % factor;

  if (fullUnitCount === 0) {
    return `${qtyBase} ${baseUnit}`;
  }

  if (remainderBase === 0) {
    return `${qtyBase} ${baseUnit} (${fullUnitCount} ${topUnit.nameEn})`;
  }

  // Round remainder neatly if decimal
  const formattedRemainder = Number.isInteger(remainderBase)
    ? remainderBase
    : Number(remainderBase.toFixed(3));

  return `${qtyBase} ${baseUnit} (${fullUnitCount} ${topUnit.nameEn} ${formattedRemainder} ${baseUnit})`;
};

/**
 * Utility to round monetary figures to 2 decimal places.
 */
export const roundMoney = (val) => {
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
};
