// ============================================
// Food Cache Model - MongoDB/Mongoose
// ============================================
// One document per food item (not per query).
// Indexed by nameLower so regex search works across all cached foods.
// When a food is searched, related USDA results are cached so future partial
// searches can be served from MongoDB without another API call.

import mongoose, { Schema, type Document } from 'mongoose';
import type { FoodCategory } from '@/types';

export interface IFoodDocument extends Document {
  foodId: string;       // unique: 'fdc_2038064'
  name: string;
  nameLower: string;    // for case-insensitive regex search
  category: FoodCategory;
  servingSize: number;  // always 100 (per 100g/ml base unit)
  servingUnit: 'g' | 'ml';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  isVegetarian: boolean;
  isVegan: boolean;
  tags: string[];
  source: string;
  expiresAt: Date;  // TTL index - MongoDB auto-deletes after this timestamp
  measures: { label: string; grams: number }[]; // natural serving options from USDA
}

const FoodSchema = new Schema<IFoodDocument>(
  {
    foodId:       { type: String, required: true },
    name:         { type: String, required: true },
    nameLower:    { type: String, required: true },
    category:     { type: String, default: 'other' },
    servingSize:  { type: Number, default: 100 },
    servingUnit:  { type: String, default: 'g' },
    calories:     { type: Number, default: 0 },
    protein:      { type: Number, default: 0 },
    carbs:        { type: Number, default: 0 },
    fat:          { type: Number, default: 0 },
    fiber:        { type: Number, default: 0 },
    isVegetarian: { type: Boolean, default: false },
    isVegan:      { type: Boolean, default: false },
    tags:     { type: [String], default: [] },
    source:   { type: String, default: 'usda' },
    expiresAt:{ type: Date, required: true, index: { expireAfterSeconds: 0 } },
    measures: { type: [{ label: String, grams: Number }], default: [] },
  },
  { timestamps: false, collection: 'foods' }
);

FoodSchema.index({ foodId: 1 }, { unique: true });
FoodSchema.index({ nameLower: 1 });
FoodSchema.index({ category: 1 });

const Food =
  mongoose.models.Food ||
  mongoose.model<IFoodDocument>('Food', FoodSchema);

export default Food;
