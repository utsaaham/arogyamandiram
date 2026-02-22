// ============================================
// Indian Food Database
// ============================================
// Comprehensive nutritional data for Indian foods.
// Values are per standard serving size.
// Sources: IFCT 2017, NIN Hyderabad, USDA cross-referenced.

import type { FoodItem, FoodCategory } from '@/types';

// ---------- CURRIES ----------
const curries: FoodItem[] = [
  { id: 'cur_001', name: 'Paneer Butter Masala', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 340, protein: 14, carbs: 12, fat: 26, fiber: 2, isVegetarian: true, isVegan: false, tags: ['paneer', 'north indian', 'rich', 'gravy'] },
  { id: 'cur_002', name: 'Chicken Curry', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 280, protein: 24, carbs: 10, fat: 16, fiber: 2, isVegetarian: false, isVegan: false, tags: ['chicken', 'non-veg', 'gravy'] },
  { id: 'cur_003', name: 'Mutton Rogan Josh', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 320, protein: 26, carbs: 8, fat: 20, fiber: 2, isVegetarian: false, isVegan: false, tags: ['mutton', 'kashmiri', 'spicy'] },
  { id: 'cur_004', name: 'Chole (Chickpea Curry)', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 240, protein: 12, carbs: 32, fat: 8, fiber: 8, isVegetarian: true, isVegan: true, tags: ['chole', 'punjabi', 'protein'] },
  { id: 'cur_005', name: 'Palak Paneer', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 260, protein: 14, carbs: 10, fat: 18, fiber: 4, isVegetarian: true, isVegan: false, tags: ['spinach', 'paneer', 'iron'] },
  { id: 'cur_006', name: 'Aloo Gobi', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 180, protein: 4, carbs: 24, fat: 8, fiber: 4, isVegetarian: true, isVegan: true, tags: ['potato', 'cauliflower', 'dry'] },
  { id: 'cur_007', name: 'Malai Kofta', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 380, protein: 10, carbs: 20, fat: 30, fiber: 2, isVegetarian: true, isVegan: false, tags: ['rich', 'creamy', 'north indian'] },
  { id: 'cur_008', name: 'Fish Curry (Macher Jhol)', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 220, protein: 22, carbs: 8, fat: 12, fiber: 1, isVegetarian: false, isVegan: false, tags: ['fish', 'bengali', 'light'] },
  { id: 'cur_009', name: 'Egg Curry', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 260, protein: 16, carbs: 10, fat: 18, fiber: 2, isVegetarian: false, isVegan: false, tags: ['egg', 'protein', 'gravy'] },
  { id: 'cur_010', name: 'Rajma (Kidney Bean Curry)', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 230, protein: 14, carbs: 34, fat: 4, fiber: 10, isVegetarian: true, isVegan: true, tags: ['rajma', 'punjabi', 'protein', 'fiber'] },
  { id: 'cur_011', name: 'Baingan Bharta', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 160, protein: 4, carbs: 14, fat: 10, fiber: 6, isVegetarian: true, isVegan: true, tags: ['eggplant', 'smoky', 'punjabi'] },
  { id: 'cur_012', name: 'Kadhi Pakora', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 200, protein: 6, carbs: 16, fat: 12, fiber: 2, isVegetarian: true, isVegan: false, tags: ['yogurt', 'pakora', 'tangy'] },
  { id: 'cur_013', name: 'Butter Chicken', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 340, protein: 22, carbs: 12, fat: 24, fiber: 2, isVegetarian: false, isVegan: false, tags: ['chicken', 'butter', 'creamy', 'popular'] },
  { id: 'cur_014', name: 'Prawn Curry (Jheenga Masala)', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 240, protein: 20, carbs: 8, fat: 14, fiber: 1, isVegetarian: false, isVegan: false, tags: ['prawn', 'seafood', 'coastal'] },
  { id: 'cur_015', name: 'Chicken Tikka Masala', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 320, protein: 24, carbs: 14, fat: 20, fiber: 2, isVegetarian: false, isVegan: false, tags: ['chicken', 'tikka', 'creamy'] },
  { id: 'cur_016', name: 'Mixed Vegetable Curry', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 160, protein: 4, carbs: 18, fat: 8, fiber: 5, isVegetarian: true, isVegan: true, tags: ['mixed veg', 'healthy', 'light'] },
  { id: 'cur_017', name: 'Keema (Minced Meat Curry)', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 300, protein: 24, carbs: 10, fat: 18, fiber: 2, isVegetarian: false, isVegan: false, tags: ['keema', 'minced', 'spicy'] },
  { id: 'cur_018', name: 'Shahi Paneer', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 360, protein: 14, carbs: 14, fat: 28, fiber: 1, isVegetarian: true, isVegan: false, tags: ['paneer', 'royal', 'rich', 'creamy'] },
  { id: 'cur_019', name: 'Aloo Matar', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 190, protein: 6, carbs: 26, fat: 7, fiber: 4, isVegetarian: true, isVegan: true, tags: ['potato', 'peas', 'simple'] },
  { id: 'cur_020', name: 'Korma (Veg)', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 280, protein: 8, carbs: 18, fat: 20, fiber: 3, isVegetarian: true, isVegan: false, tags: ['korma', 'mild', 'creamy', 'cashew'] },
  { id: 'cur_021', name: 'Bhindi Masala (Okra)', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 150, protein: 4, carbs: 14, fat: 9, fiber: 5, isVegetarian: true, isVegan: true, tags: ['okra', 'bhindi', 'dry'] },
  { id: 'cur_022', name: 'Chicken Vindaloo', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 290, protein: 22, carbs: 10, fat: 18, fiber: 2, isVegetarian: false, isVegan: false, tags: ['chicken', 'goan', 'spicy', 'vinegar'] },
  { id: 'cur_023', name: 'Mushroom Masala', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 170, protein: 6, carbs: 12, fat: 11, fiber: 3, isVegetarian: true, isVegan: true, tags: ['mushroom', 'low cal', 'protein'] },
  { id: 'cur_024', name: 'Paneer Tikka Masala', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 350, protein: 16, carbs: 14, fat: 26, fiber: 2, isVegetarian: true, isVegan: false, tags: ['paneer', 'tikka', 'grilled'] },
  { id: 'cur_025', name: 'Sambar', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 140, protein: 6, carbs: 20, fat: 4, fiber: 4, isVegetarian: true, isVegan: true, tags: ['sambar', 'south indian', 'lentil', 'tamarind'] },
];

// ---------- DALS (Lentil Dishes) ----------
const dals: FoodItem[] = [
  { id: 'dal_001', name: 'Dal Tadka (Yellow Dal)', category: 'dal', servingSize: 200, servingUnit: 'g', calories: 180, protein: 10, carbs: 24, fat: 5, fiber: 6, isVegetarian: true, isVegan: true, tags: ['toor dal', 'everyday', 'protein'] },
  { id: 'dal_002', name: 'Dal Makhani', category: 'dal', servingSize: 200, servingUnit: 'g', calories: 260, protein: 12, carbs: 28, fat: 12, fiber: 6, isVegetarian: true, isVegan: false, tags: ['urad dal', 'butter', 'rich', 'punjabi'] },
  { id: 'dal_003', name: 'Moong Dal', category: 'dal', servingSize: 200, servingUnit: 'g', calories: 160, protein: 12, carbs: 22, fat: 3, fiber: 4, isVegetarian: true, isVegan: true, tags: ['moong', 'light', 'easy digest'] },
  { id: 'dal_004', name: 'Chana Dal', category: 'dal', servingSize: 200, servingUnit: 'g', calories: 200, protein: 12, carbs: 28, fat: 4, fiber: 8, isVegetarian: true, isVegan: true, tags: ['chana', 'fiber', 'protein'] },
  { id: 'dal_005', name: 'Masoor Dal (Red Lentil)', category: 'dal', servingSize: 200, servingUnit: 'g', calories: 170, protein: 12, carbs: 24, fat: 3, fiber: 5, isVegetarian: true, isVegan: true, tags: ['masoor', 'quick cook', 'iron'] },
  { id: 'dal_006', name: 'Rasam', category: 'dal', servingSize: 200, servingUnit: 'g', calories: 80, protein: 3, carbs: 12, fat: 2, fiber: 2, isVegetarian: true, isVegan: true, tags: ['rasam', 'south indian', 'soup', 'light'] },
  { id: 'dal_007', name: 'Dal Fry', category: 'dal', servingSize: 200, servingUnit: 'g', calories: 200, protein: 10, carbs: 24, fat: 7, fiber: 5, isVegetarian: true, isVegan: true, tags: ['dal fry', 'everyday', 'fried onion'] },
  { id: 'dal_008', name: 'Panchmel Dal', category: 'dal', servingSize: 200, servingUnit: 'g', calories: 190, protein: 12, carbs: 26, fat: 4, fiber: 7, isVegetarian: true, isVegan: true, tags: ['mixed dal', 'rajasthani', 'five lentils'] },
];

// ---------- BREADS ----------
const breads: FoodItem[] = [
  { id: 'brd_001', name: 'Roti / Chapati', category: 'bread', servingSize: 40, servingUnit: 'g', calories: 104, protein: 3, carbs: 18, fat: 2.5, fiber: 2, isVegetarian: true, isVegan: true, tags: ['roti', 'chapati', 'whole wheat', 'everyday'] },
  { id: 'brd_002', name: 'Naan (Plain)', category: 'bread', servingSize: 80, servingUnit: 'g', calories: 260, protein: 8, carbs: 42, fat: 6, fiber: 2, isVegetarian: true, isVegan: false, tags: ['naan', 'tandoor', 'maida'] },
  { id: 'brd_003', name: 'Butter Naan', category: 'bread', servingSize: 85, servingUnit: 'g', calories: 310, protein: 8, carbs: 42, fat: 12, fiber: 2, isVegetarian: true, isVegan: false, tags: ['naan', 'butter', 'tandoor'] },
  { id: 'brd_004', name: 'Garlic Naan', category: 'bread', servingSize: 85, servingUnit: 'g', calories: 300, protein: 8, carbs: 44, fat: 10, fiber: 2, isVegetarian: true, isVegan: false, tags: ['naan', 'garlic', 'tandoor'] },
  { id: 'brd_005', name: 'Paratha (Plain)', category: 'bread', servingSize: 60, servingUnit: 'g', calories: 200, protein: 4, carbs: 24, fat: 10, fiber: 2, isVegetarian: true, isVegan: true, tags: ['paratha', 'layered', 'ghee'] },
  { id: 'brd_006', name: 'Aloo Paratha', category: 'bread', servingSize: 100, servingUnit: 'g', calories: 280, protein: 6, carbs: 36, fat: 12, fiber: 3, isVegetarian: true, isVegan: true, tags: ['paratha', 'stuffed', 'potato', 'punjabi'] },
  { id: 'brd_007', name: 'Gobi Paratha', category: 'bread', servingSize: 100, servingUnit: 'g', calories: 260, protein: 6, carbs: 32, fat: 12, fiber: 3, isVegetarian: true, isVegan: true, tags: ['paratha', 'stuffed', 'cauliflower'] },
  { id: 'brd_008', name: 'Paneer Paratha', category: 'bread', servingSize: 100, servingUnit: 'g', calories: 300, protein: 10, carbs: 30, fat: 16, fiber: 2, isVegetarian: true, isVegan: false, tags: ['paratha', 'stuffed', 'paneer'] },
  { id: 'brd_009', name: 'Methi Paratha', category: 'bread', servingSize: 80, servingUnit: 'g', calories: 220, protein: 5, carbs: 28, fat: 10, fiber: 3, isVegetarian: true, isVegan: true, tags: ['paratha', 'fenugreek', 'healthy'] },
  { id: 'brd_010', name: 'Puri', category: 'bread', servingSize: 30, servingUnit: 'g', calories: 120, protein: 2, carbs: 14, fat: 6, fiber: 1, isVegetarian: true, isVegan: true, tags: ['puri', 'deep fried', 'festive'] },
  { id: 'brd_011', name: 'Bhatura', category: 'bread', servingSize: 80, servingUnit: 'g', calories: 300, protein: 6, carbs: 38, fat: 14, fiber: 1, isVegetarian: true, isVegan: true, tags: ['bhatura', 'chole bhature', 'fried'] },
  { id: 'brd_012', name: 'Kulcha', category: 'bread', servingSize: 80, servingUnit: 'g', calories: 270, protein: 7, carbs: 40, fat: 8, fiber: 2, isVegetarian: true, isVegan: false, tags: ['kulcha', 'amritsari', 'tandoor'] },
  { id: 'brd_013', name: 'Rumali Roti', category: 'bread', servingSize: 40, servingUnit: 'g', calories: 90, protein: 3, carbs: 16, fat: 1.5, fiber: 1, isVegetarian: true, isVegan: true, tags: ['rumali', 'thin', 'handkerchief'] },
  { id: 'brd_014', name: 'Tandoori Roti', category: 'bread', servingSize: 50, servingUnit: 'g', calories: 120, protein: 4, carbs: 22, fat: 2, fiber: 2, isVegetarian: true, isVegan: true, tags: ['tandoori', 'whole wheat', 'clay oven'] },
  { id: 'brd_015', name: 'Missi Roti', category: 'bread', servingSize: 50, servingUnit: 'g', calories: 130, protein: 5, carbs: 20, fat: 3, fiber: 3, isVegetarian: true, isVegan: true, tags: ['besan', 'gram flour', 'rajasthani'] },
  { id: 'brd_016', name: 'Makki ki Roti', category: 'bread', servingSize: 60, servingUnit: 'g', calories: 140, protein: 3, carbs: 26, fat: 3, fiber: 2, isVegetarian: true, isVegan: true, tags: ['corn flour', 'punjabi', 'winter'] },
  { id: 'brd_017', name: 'Thepla', category: 'bread', servingSize: 50, servingUnit: 'g', calories: 150, protein: 4, carbs: 20, fat: 6, fiber: 2, isVegetarian: true, isVegan: true, tags: ['gujarati', 'fenugreek', 'travel food'] },
  { id: 'brd_018', name: 'Appam', category: 'bread', servingSize: 70, servingUnit: 'g', calories: 120, protein: 2, carbs: 22, fat: 2, fiber: 1, isVegetarian: true, isVegan: true, tags: ['kerala', 'rice batter', 'fermented'] },
  { id: 'brd_019', name: 'Dosa (Plain)', category: 'bread', servingSize: 100, servingUnit: 'g', calories: 130, protein: 4, carbs: 22, fat: 3, fiber: 1, isVegetarian: true, isVegan: true, tags: ['dosa', 'south indian', 'fermented', 'rice'] },
  { id: 'brd_020', name: 'Masala Dosa', category: 'bread', servingSize: 200, servingUnit: 'g', calories: 280, protein: 6, carbs: 40, fat: 10, fiber: 3, isVegetarian: true, isVegan: true, tags: ['dosa', 'potato', 'south indian'] },
  { id: 'brd_021', name: 'Uttapam', category: 'bread', servingSize: 120, servingUnit: 'g', calories: 180, protein: 5, carbs: 28, fat: 5, fiber: 2, isVegetarian: true, isVegan: true, tags: ['uttapam', 'south indian', 'thick pancake'] },
  { id: 'brd_022', name: 'Lachha Paratha', category: 'bread', servingSize: 70, servingUnit: 'g', calories: 240, protein: 4, carbs: 28, fat: 12, fiber: 1, isVegetarian: true, isVegan: false, tags: ['layered', 'flaky', 'restaurant'] },
  { id: 'brd_023', name: 'Bajra Roti', category: 'bread', servingSize: 50, servingUnit: 'g', calories: 120, protein: 3, carbs: 22, fat: 2, fiber: 3, isVegetarian: true, isVegan: true, tags: ['millet', 'rajasthani', 'gluten free'] },
  { id: 'brd_024', name: 'Jowar Roti', category: 'bread', servingSize: 50, servingUnit: 'g', calories: 115, protein: 3, carbs: 22, fat: 1.5, fiber: 3, isVegetarian: true, isVegan: true, tags: ['sorghum', 'maharashtrian', 'gluten free'] },
];

// ---------- RICE DISHES ----------
const riceDishes: FoodItem[] = [
  { id: 'ric_001', name: 'Steamed Rice (White)', category: 'rice', servingSize: 150, servingUnit: 'g', calories: 195, protein: 4, carbs: 44, fat: 0.5, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['rice', 'plain', 'staple'] },
  { id: 'ric_002', name: 'Brown Rice', category: 'rice', servingSize: 150, servingUnit: 'g', calories: 180, protein: 4, carbs: 38, fat: 1.5, fiber: 3, isVegetarian: true, isVegan: true, tags: ['brown rice', 'healthy', 'fiber'] },
  { id: 'ric_003', name: 'Jeera Rice', category: 'rice', servingSize: 150, servingUnit: 'g', calories: 220, protein: 4, carbs: 40, fat: 5, fiber: 1, isVegetarian: true, isVegan: true, tags: ['cumin', 'flavored', 'everyday'] },
  { id: 'ric_004', name: 'Veg Biryani', category: 'rice', servingSize: 250, servingUnit: 'g', calories: 340, protein: 8, carbs: 52, fat: 12, fiber: 3, isVegetarian: true, isVegan: true, tags: ['biryani', 'dum', 'festive'] },
  { id: 'ric_005', name: 'Chicken Biryani', category: 'rice', servingSize: 300, servingUnit: 'g', calories: 450, protein: 22, carbs: 50, fat: 18, fiber: 2, isVegetarian: false, isVegan: false, tags: ['biryani', 'hyderabadi', 'popular'] },
  { id: 'ric_006', name: 'Mutton Biryani', category: 'rice', servingSize: 300, servingUnit: 'g', calories: 480, protein: 24, carbs: 48, fat: 22, fiber: 2, isVegetarian: false, isVegan: false, tags: ['biryani', 'lucknowi', 'festive'] },
  { id: 'ric_007', name: 'Egg Biryani', category: 'rice', servingSize: 250, servingUnit: 'g', calories: 380, protein: 16, carbs: 48, fat: 14, fiber: 2, isVegetarian: false, isVegan: false, tags: ['biryani', 'egg', 'budget'] },
  { id: 'ric_008', name: 'Pulao (Veg)', category: 'rice', servingSize: 200, servingUnit: 'g', calories: 260, protein: 5, carbs: 42, fat: 8, fiber: 2, isVegetarian: true, isVegan: true, tags: ['pulao', 'mild', 'aromatic'] },
  { id: 'ric_009', name: 'Lemon Rice', category: 'rice', servingSize: 200, servingUnit: 'g', calories: 240, protein: 4, carbs: 42, fat: 6, fiber: 1, isVegetarian: true, isVegan: true, tags: ['south indian', 'lemon', 'tangy'] },
  { id: 'ric_010', name: 'Curd Rice (Dahi Chawal)', category: 'rice', servingSize: 200, servingUnit: 'g', calories: 220, protein: 6, carbs: 38, fat: 5, fiber: 0.5, isVegetarian: true, isVegan: false, tags: ['curd', 'cooling', 'south indian'] },
  { id: 'ric_011', name: 'Khichdi', category: 'rice', servingSize: 200, servingUnit: 'g', calories: 200, protein: 8, carbs: 34, fat: 4, fiber: 3, isVegetarian: true, isVegan: true, tags: ['comfort', 'light', 'easy digest'] },
  { id: 'ric_012', name: 'Tamarind Rice (Puliyogare)', category: 'rice', servingSize: 200, servingUnit: 'g', calories: 250, protein: 4, carbs: 44, fat: 7, fiber: 2, isVegetarian: true, isVegan: true, tags: ['tamarind', 'south indian', 'temple'] },
  { id: 'ric_013', name: 'Fried Rice (Indo-Chinese)', category: 'rice', servingSize: 250, servingUnit: 'g', calories: 340, protein: 8, carbs: 48, fat: 14, fiber: 2, isVegetarian: true, isVegan: true, tags: ['fried rice', 'indo chinese', 'street food'] },
];

// ---------- SWEETS & DESSERTS ----------
const sweets: FoodItem[] = [
  { id: 'swt_001', name: 'Gulab Jamun', category: 'sweet', servingSize: 50, servingUnit: 'g', calories: 175, protein: 2, carbs: 28, fat: 6, fiber: 0, isVegetarian: true, isVegan: false, tags: ['gulab jamun', 'syrup', 'festive'] },
  { id: 'swt_002', name: 'Rasgulla', category: 'sweet', servingSize: 50, servingUnit: 'g', calories: 130, protein: 3, carbs: 24, fat: 2, fiber: 0, isVegetarian: true, isVegan: false, tags: ['rasgulla', 'bengali', 'spongy'] },
  { id: 'swt_003', name: 'Jalebi', category: 'sweet', servingSize: 50, servingUnit: 'g', calories: 190, protein: 1, carbs: 32, fat: 7, fiber: 0, isVegetarian: true, isVegan: true, tags: ['jalebi', 'crispy', 'syrup'] },
  { id: 'swt_004', name: 'Ladoo (Besan)', category: 'sweet', servingSize: 40, servingUnit: 'g', calories: 180, protein: 3, carbs: 22, fat: 9, fiber: 1, isVegetarian: true, isVegan: false, tags: ['ladoo', 'besan', 'ghee', 'festive'] },
  { id: 'swt_005', name: 'Ladoo (Boondi)', category: 'sweet', servingSize: 40, servingUnit: 'g', calories: 170, protein: 2, carbs: 24, fat: 8, fiber: 0, isVegetarian: true, isVegan: false, tags: ['ladoo', 'boondi', 'prasad'] },
  { id: 'swt_006', name: 'Barfi (Kaju)', category: 'sweet', servingSize: 30, servingUnit: 'g', calories: 140, protein: 3, carbs: 18, fat: 6, fiber: 0.5, isVegetarian: true, isVegan: false, tags: ['barfi', 'cashew', 'premium'] },
  { id: 'swt_007', name: 'Kheer (Rice Pudding)', category: 'sweet', servingSize: 150, servingUnit: 'g', calories: 220, protein: 5, carbs: 34, fat: 7, fiber: 0.5, isVegetarian: true, isVegan: false, tags: ['kheer', 'rice', 'milk', 'festive'] },
  { id: 'swt_008', name: 'Halwa (Gajar)', category: 'sweet', servingSize: 100, servingUnit: 'g', calories: 250, protein: 4, carbs: 30, fat: 14, fiber: 2, isVegetarian: true, isVegan: false, tags: ['halwa', 'carrot', 'winter', 'ghee'] },
  { id: 'swt_009', name: 'Halwa (Sooji)', category: 'sweet', servingSize: 100, servingUnit: 'g', calories: 270, protein: 4, carbs: 36, fat: 12, fiber: 1, isVegetarian: true, isVegan: false, tags: ['halwa', 'semolina', 'prasad'] },
  { id: 'swt_010', name: 'Halwa (Moong Dal)', category: 'sweet', servingSize: 100, servingUnit: 'g', calories: 300, protein: 6, carbs: 32, fat: 16, fiber: 2, isVegetarian: true, isVegan: false, tags: ['halwa', 'moong', 'rich'] },
  { id: 'swt_011', name: 'Peda', category: 'sweet', servingSize: 30, servingUnit: 'g', calories: 120, protein: 3, carbs: 16, fat: 5, fiber: 0, isVegetarian: true, isVegan: false, tags: ['peda', 'milk', 'mathura'] },
  { id: 'swt_012', name: 'Mysore Pak', category: 'sweet', servingSize: 40, servingUnit: 'g', calories: 220, protein: 3, carbs: 20, fat: 14, fiber: 1, isVegetarian: true, isVegan: false, tags: ['mysore', 'besan', 'ghee', 'south indian'] },
  { id: 'swt_013', name: 'Sandesh', category: 'sweet', servingSize: 40, servingUnit: 'g', calories: 110, protein: 4, carbs: 16, fat: 3, fiber: 0, isVegetarian: true, isVegan: false, tags: ['sandesh', 'bengali', 'chenna'] },
  { id: 'swt_014', name: 'Payasam (Vermicelli)', category: 'sweet', servingSize: 150, servingUnit: 'g', calories: 240, protein: 5, carbs: 38, fat: 8, fiber: 0.5, isVegetarian: true, isVegan: false, tags: ['payasam', 'south indian', 'festive'] },
  { id: 'swt_015', name: 'Kulfi', category: 'sweet', servingSize: 80, servingUnit: 'g', calories: 180, protein: 4, carbs: 22, fat: 8, fiber: 0, isVegetarian: true, isVegan: false, tags: ['kulfi', 'frozen', 'pistachio'] },
  { id: 'swt_016', name: 'Malpua', category: 'sweet', servingSize: 60, servingUnit: 'g', calories: 200, protein: 3, carbs: 28, fat: 9, fiber: 0.5, isVegetarian: true, isVegan: false, tags: ['malpua', 'pancake', 'syrup'] },
  { id: 'swt_017', name: 'Rasmalai', category: 'sweet', servingSize: 80, servingUnit: 'g', calories: 190, protein: 5, carbs: 26, fat: 7, fiber: 0, isVegetarian: true, isVegan: false, tags: ['rasmalai', 'bengali', 'creamy'] },
  { id: 'swt_018', name: 'Imarti', category: 'sweet', servingSize: 50, servingUnit: 'g', calories: 200, protein: 2, carbs: 30, fat: 8, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['imarti', 'urad', 'syrup'] },
  { id: 'swt_019', name: 'Chum Chum', category: 'sweet', servingSize: 50, servingUnit: 'g', calories: 150, protein: 3, carbs: 24, fat: 5, fiber: 0, isVegetarian: true, isVegan: false, tags: ['chum chum', 'bengali', 'soft'] },
  { id: 'swt_020', name: 'Shrikhand', category: 'sweet', servingSize: 100, servingUnit: 'g', calories: 200, protein: 6, carbs: 30, fat: 6, fiber: 0, isVegetarian: true, isVegan: false, tags: ['shrikhand', 'gujarati', 'yogurt', 'saffron'] },
  { id: 'swt_021', name: 'Rasgulla (Canned)', category: 'sweet', servingSize: 50, servingUnit: 'g', calories: 140, protein: 2, carbs: 28, fat: 2, fiber: 0, isVegetarian: true, isVegan: false, tags: ['rasgulla', 'packaged'] },
  { id: 'swt_022', name: 'Modak', category: 'sweet', servingSize: 40, servingUnit: 'g', calories: 130, protein: 2, carbs: 20, fat: 5, fiber: 1, isVegetarian: true, isVegan: false, tags: ['modak', 'ganesh', 'maharashtrian', 'coconut'] },
  { id: 'swt_023', name: 'Ghevar', category: 'sweet', servingSize: 60, servingUnit: 'g', calories: 240, protein: 3, carbs: 30, fat: 12, fiber: 0, isVegetarian: true, isVegan: false, tags: ['ghevar', 'rajasthani', 'teej'] },
  { id: 'swt_024', name: 'Kala Jamun', category: 'sweet', servingSize: 50, servingUnit: 'g', calories: 185, protein: 2, carbs: 28, fat: 7, fiber: 0, isVegetarian: true, isVegan: false, tags: ['kala jamun', 'dark', 'syrup'] },
  { id: 'swt_025', name: 'Coconut Ladoo', category: 'sweet', servingSize: 30, servingUnit: 'g', calories: 120, protein: 1, carbs: 16, fat: 6, fiber: 1, isVegetarian: true, isVegan: false, tags: ['coconut', 'ladoo', 'south indian'] },
];

// ---------- SNACKS & STREET FOOD ----------
const snacks: FoodItem[] = [
  { id: 'snk_001', name: 'Samosa (Aloo)', category: 'snack', servingSize: 80, servingUnit: 'g', calories: 240, protein: 4, carbs: 28, fat: 12, fiber: 2, isVegetarian: true, isVegan: true, tags: ['samosa', 'fried', 'street food'] },
  { id: 'snk_002', name: 'Pakora (Mixed Veg)', category: 'snack', servingSize: 100, servingUnit: 'g', calories: 280, protein: 6, carbs: 24, fat: 18, fiber: 3, isVegetarian: true, isVegan: true, tags: ['pakora', 'bhajiya', 'fried'] },
  { id: 'snk_003', name: 'Pani Puri (6 pieces)', category: 'street_food', servingSize: 120, servingUnit: 'g', calories: 200, protein: 4, carbs: 32, fat: 6, fiber: 2, isVegetarian: true, isVegan: true, tags: ['pani puri', 'golgappa', 'street food'] },
  { id: 'snk_004', name: 'Bhel Puri', category: 'street_food', servingSize: 150, servingUnit: 'g', calories: 220, protein: 4, carbs: 36, fat: 6, fiber: 2, isVegetarian: true, isVegan: true, tags: ['bhel', 'chaat', 'mumbai'] },
  { id: 'snk_005', name: 'Sev Puri', category: 'street_food', servingSize: 120, servingUnit: 'g', calories: 240, protein: 4, carbs: 30, fat: 12, fiber: 2, isVegetarian: true, isVegan: true, tags: ['sev puri', 'chaat', 'crispy'] },
  { id: 'snk_006', name: 'Aloo Tikki', category: 'snack', servingSize: 80, servingUnit: 'g', calories: 180, protein: 3, carbs: 24, fat: 8, fiber: 2, isVegetarian: true, isVegan: true, tags: ['aloo tikki', 'patty', 'street food'] },
  { id: 'snk_007', name: 'Dahi Vada', category: 'snack', servingSize: 120, servingUnit: 'g', calories: 200, protein: 6, carbs: 26, fat: 8, fiber: 2, isVegetarian: true, isVegan: false, tags: ['dahi vada', 'curd', 'cold'] },
  { id: 'snk_008', name: 'Vada Pav', category: 'street_food', servingSize: 150, servingUnit: 'g', calories: 310, protein: 6, carbs: 40, fat: 14, fiber: 2, isVegetarian: true, isVegan: true, tags: ['vada pav', 'mumbai', 'burger'] },
  { id: 'snk_009', name: 'Pav Bhaji', category: 'street_food', servingSize: 250, servingUnit: 'g', calories: 380, protein: 10, carbs: 48, fat: 16, fiber: 4, isVegetarian: true, isVegan: false, tags: ['pav bhaji', 'mumbai', 'butter'] },
  { id: 'snk_010', name: 'Kachori', category: 'snack', servingSize: 60, servingUnit: 'g', calories: 220, protein: 4, carbs: 24, fat: 12, fiber: 2, isVegetarian: true, isVegan: true, tags: ['kachori', 'rajasthani', 'fried'] },
  { id: 'snk_011', name: 'Dhokla', category: 'snack', servingSize: 100, servingUnit: 'g', calories: 160, protein: 6, carbs: 24, fat: 4, fiber: 2, isVegetarian: true, isVegan: true, tags: ['dhokla', 'gujarati', 'steamed', 'light'] },
  { id: 'snk_012', name: 'Khandvi', category: 'snack', servingSize: 100, servingUnit: 'g', calories: 140, protein: 5, carbs: 20, fat: 4, fiber: 1, isVegetarian: true, isVegan: true, tags: ['khandvi', 'gujarati', 'rolled'] },
  { id: 'snk_013', name: 'Medu Vada', category: 'snack', servingSize: 50, servingUnit: 'g', calories: 150, protein: 5, carbs: 18, fat: 7, fiber: 2, isVegetarian: true, isVegan: true, tags: ['vada', 'south indian', 'urad dal'] },
  { id: 'snk_014', name: 'Idli (2 pieces)', category: 'snack', servingSize: 100, servingUnit: 'g', calories: 130, protein: 4, carbs: 26, fat: 0.5, fiber: 1, isVegetarian: true, isVegan: true, tags: ['idli', 'south indian', 'steamed', 'light'] },
  { id: 'snk_015', name: 'Upma', category: 'breakfast', servingSize: 200, servingUnit: 'g', calories: 240, protein: 6, carbs: 36, fat: 8, fiber: 3, isVegetarian: true, isVegan: true, tags: ['upma', 'semolina', 'breakfast'] },
  { id: 'snk_016', name: 'Poha', category: 'breakfast', servingSize: 200, servingUnit: 'g', calories: 250, protein: 5, carbs: 40, fat: 8, fiber: 2, isVegetarian: true, isVegan: true, tags: ['poha', 'flattened rice', 'breakfast', 'maharashtrian'] },
  { id: 'snk_017', name: 'Chilla (Besan)', category: 'breakfast', servingSize: 80, servingUnit: 'g', calories: 150, protein: 6, carbs: 16, fat: 7, fiber: 2, isVegetarian: true, isVegan: true, tags: ['chilla', 'gram flour', 'pancake', 'protein'] },
  { id: 'snk_018', name: 'Momos (Veg, 6 pieces)', category: 'snack', servingSize: 150, servingUnit: 'g', calories: 200, protein: 6, carbs: 30, fat: 6, fiber: 2, isVegetarian: true, isVegan: true, tags: ['momos', 'dumpling', 'northeast'] },
  { id: 'snk_019', name: 'Momos (Chicken, 6 pieces)', category: 'snack', servingSize: 150, servingUnit: 'g', calories: 240, protein: 14, carbs: 28, fat: 8, fiber: 1, isVegetarian: false, isVegan: false, tags: ['momos', 'chicken', 'dumpling'] },
  { id: 'snk_020', name: 'Egg Bhurji', category: 'breakfast', servingSize: 150, servingUnit: 'g', calories: 220, protein: 14, carbs: 4, fat: 16, fiber: 1, isVegetarian: false, isVegan: false, tags: ['egg', 'scrambled', 'breakfast', 'protein'] },
];

// ---------- CHUTNEYS & CONDIMENTS ----------
const chutneys: FoodItem[] = [
  { id: 'cht_001', name: 'Mint Chutney', category: 'chutney', servingSize: 30, servingUnit: 'g', calories: 15, protein: 0.5, carbs: 2, fat: 0.5, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['mint', 'green', 'fresh'] },
  { id: 'cht_002', name: 'Tamarind Chutney', category: 'chutney', servingSize: 30, servingUnit: 'g', calories: 60, protein: 0.5, carbs: 14, fat: 0, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['tamarind', 'sweet', 'dates'] },
  { id: 'cht_003', name: 'Coconut Chutney', category: 'chutney', servingSize: 40, servingUnit: 'g', calories: 70, protein: 1, carbs: 4, fat: 6, fiber: 1, isVegetarian: true, isVegan: true, tags: ['coconut', 'south indian'] },
  { id: 'cht_004', name: 'Mango Pickle (Aam ka Achar)', category: 'chutney', servingSize: 20, servingUnit: 'g', calories: 40, protein: 0.5, carbs: 4, fat: 2.5, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['pickle', 'mango', 'spicy'] },
  { id: 'cht_005', name: 'Raita (Boondi)', category: 'raita', servingSize: 100, servingUnit: 'g', calories: 80, protein: 3, carbs: 8, fat: 4, fiber: 0, isVegetarian: true, isVegan: false, tags: ['raita', 'yogurt', 'boondi'] },
  { id: 'cht_006', name: 'Raita (Cucumber)', category: 'raita', servingSize: 100, servingUnit: 'g', calories: 50, protein: 3, carbs: 4, fat: 2.5, fiber: 0.5, isVegetarian: true, isVegan: false, tags: ['raita', 'cucumber', 'cooling'] },
];

// ---------- BEVERAGES ----------
const beverages: FoodItem[] = [
  { id: 'bev_001', name: 'Masala Chai', category: 'beverage', servingSize: 150, servingUnit: 'ml', calories: 80, protein: 2, carbs: 12, fat: 2.5, fiber: 0, isVegetarian: true, isVegan: false, tags: ['chai', 'tea', 'daily'] },
  { id: 'bev_002', name: 'Chai (without sugar)', category: 'beverage', servingSize: 150, servingUnit: 'ml', calories: 30, protein: 2, carbs: 3, fat: 1.5, fiber: 0, isVegetarian: true, isVegan: false, tags: ['chai', 'no sugar', 'low cal'] },
  { id: 'bev_003', name: 'Filter Coffee (South Indian)', category: 'beverage', servingSize: 150, servingUnit: 'ml', calories: 90, protein: 2, carbs: 12, fat: 3, fiber: 0, isVegetarian: true, isVegan: false, tags: ['coffee', 'filter', 'south indian'] },
  { id: 'bev_004', name: 'Black Coffee', category: 'beverage', servingSize: 150, servingUnit: 'ml', calories: 5, protein: 0.5, carbs: 0, fat: 0, fiber: 0, isVegetarian: true, isVegan: true, tags: ['coffee', 'black', 'zero cal'] },
  { id: 'bev_005', name: 'Lassi (Sweet)', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 180, protein: 5, carbs: 28, fat: 5, fiber: 0, isVegetarian: true, isVegan: false, tags: ['lassi', 'yogurt', 'punjabi'] },
  { id: 'bev_006', name: 'Lassi (Salt/Chaas)', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 60, protein: 3, carbs: 5, fat: 2.5, fiber: 0, isVegetarian: true, isVegan: false, tags: ['chaas', 'buttermilk', 'cooling', 'low cal'] },
  { id: 'bev_007', name: 'Mango Lassi', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 210, protein: 5, carbs: 34, fat: 6, fiber: 1, isVegetarian: true, isVegan: false, tags: ['mango', 'lassi', 'summer'] },
  { id: 'bev_008', name: 'Nimbu Pani (Lemonade)', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 50, protein: 0, carbs: 12, fat: 0, fiber: 0, isVegetarian: true, isVegan: true, tags: ['lemon', 'refreshing', 'summer'] },
  { id: 'bev_009', name: 'Coconut Water', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 40, protein: 0.5, carbs: 9, fat: 0, fiber: 0, isVegetarian: true, isVegan: true, tags: ['coconut', 'hydrating', 'natural'] },
  { id: 'bev_010', name: 'Thandai', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 220, protein: 6, carbs: 28, fat: 10, fiber: 1, isVegetarian: true, isVegan: false, tags: ['thandai', 'holi', 'festive', 'nuts'] },
  { id: 'bev_011', name: 'Badam Milk', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 180, protein: 6, carbs: 22, fat: 8, fiber: 1, isVegetarian: true, isVegan: false, tags: ['almond', 'milk', 'saffron'] },
  { id: 'bev_012', name: 'Jaljeera', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 30, protein: 0.5, carbs: 6, fat: 0, fiber: 0, isVegetarian: true, isVegan: true, tags: ['jaljeera', 'digestive', 'cumin'] },
];

// ---------- DRY FRUITS & FRUITS ----------
const dryFruits: FoodItem[] = [
  { id: 'dry_001', name: 'Almonds (Badam)', category: 'dry_fruit', servingSize: 30, servingUnit: 'g', calories: 170, protein: 6, carbs: 6, fat: 15, fiber: 3, isVegetarian: true, isVegan: true, tags: ['almond', 'protein', 'healthy fat'] },
  { id: 'dry_002', name: 'Cashews (Kaju)', category: 'dry_fruit', servingSize: 30, servingUnit: 'g', calories: 165, protein: 5, carbs: 9, fat: 13, fiber: 1, isVegetarian: true, isVegan: true, tags: ['cashew', 'snack'] },
  { id: 'dry_003', name: 'Walnuts (Akhrot)', category: 'dry_fruit', servingSize: 30, servingUnit: 'g', calories: 195, protein: 5, carbs: 4, fat: 18, fiber: 2, isVegetarian: true, isVegan: true, tags: ['walnut', 'omega-3', 'brain'] },
  { id: 'dry_004', name: 'Peanuts (Moongfali)', category: 'dry_fruit', servingSize: 30, servingUnit: 'g', calories: 170, protein: 7, carbs: 6, fat: 14, fiber: 2, isVegetarian: true, isVegan: true, tags: ['peanut', 'protein', 'cheap'] },
  { id: 'dry_005', name: 'Dates (Khajoor)', category: 'dry_fruit', servingSize: 30, servingUnit: 'g', calories: 85, protein: 0.5, carbs: 22, fat: 0, fiber: 2, isVegetarian: true, isVegan: true, tags: ['dates', 'energy', 'iron'] },
  { id: 'dry_006', name: 'Raisins (Kishmish)', category: 'dry_fruit', servingSize: 30, servingUnit: 'g', calories: 90, protein: 1, carbs: 22, fat: 0, fiber: 1, isVegetarian: true, isVegan: true, tags: ['raisins', 'iron', 'sweet'] },
  { id: 'dry_007', name: 'Pistachios (Pista)', category: 'dry_fruit', servingSize: 30, servingUnit: 'g', calories: 160, protein: 6, carbs: 8, fat: 13, fiber: 3, isVegetarian: true, isVegan: true, tags: ['pistachio', 'protein', 'green'] },
  { id: 'dry_008', name: 'Banana', category: 'fruit', servingSize: 120, servingUnit: 'g', calories: 105, protein: 1, carbs: 27, fat: 0.5, fiber: 3, isVegetarian: true, isVegan: true, tags: ['banana', 'potassium', 'energy'] },
  { id: 'dry_009', name: 'Apple', category: 'fruit', servingSize: 150, servingUnit: 'g', calories: 78, protein: 0.5, carbs: 20, fat: 0, fiber: 3, isVegetarian: true, isVegan: true, tags: ['apple', 'fiber'] },
  { id: 'dry_010', name: 'Mango (Aam)', category: 'fruit', servingSize: 150, servingUnit: 'g', calories: 100, protein: 1, carbs: 25, fat: 0.5, fiber: 2, isVegetarian: true, isVegan: true, tags: ['mango', 'summer', 'vitamin a'] },
  { id: 'dry_011', name: 'Papaya', category: 'fruit', servingSize: 150, servingUnit: 'g', calories: 60, protein: 1, carbs: 15, fat: 0, fiber: 2, isVegetarian: true, isVegan: true, tags: ['papaya', 'digestion', 'vitamin c'] },
  { id: 'dry_012', name: 'Pomegranate (Anar)', category: 'fruit', servingSize: 100, servingUnit: 'g', calories: 83, protein: 1.5, carbs: 19, fat: 1, fiber: 4, isVegetarian: true, isVegan: true, tags: ['pomegranate', 'antioxidant'] },
  { id: 'dry_013', name: 'Guava (Amrood)', category: 'fruit', servingSize: 100, servingUnit: 'g', calories: 68, protein: 2.5, carbs: 14, fat: 1, fiber: 5, isVegetarian: true, isVegan: true, tags: ['guava', 'vitamin c', 'fiber'] },
  { id: 'dry_014', name: 'Chikoo (Sapota)', category: 'fruit', servingSize: 100, servingUnit: 'g', calories: 83, protein: 0.5, carbs: 20, fat: 1, fiber: 5, isVegetarian: true, isVegan: true, tags: ['chikoo', 'sweet', 'energy'] },
];

// ---------- NON-VEG EXTRA ----------
const nonVeg: FoodItem[] = [
  { id: 'nvg_001', name: 'Tandoori Chicken (Leg)', category: 'non_veg', servingSize: 150, servingUnit: 'g', calories: 260, protein: 30, carbs: 4, fat: 14, fiber: 0, isVegetarian: false, isVegan: false, tags: ['tandoori', 'grilled', 'protein'] },
  { id: 'nvg_002', name: 'Chicken Seekh Kebab (2 pcs)', category: 'non_veg', servingSize: 100, servingUnit: 'g', calories: 220, protein: 18, carbs: 6, fat: 14, fiber: 1, isVegetarian: false, isVegan: false, tags: ['kebab', 'seekh', 'grilled'] },
  { id: 'nvg_003', name: 'Fish Fry', category: 'seafood', servingSize: 100, servingUnit: 'g', calories: 220, protein: 18, carbs: 10, fat: 12, fiber: 0, isVegetarian: false, isVegan: false, tags: ['fish', 'fried', 'crispy'] },
  { id: 'nvg_004', name: 'Mutton Seekh Kebab (2 pcs)', category: 'non_veg', servingSize: 100, servingUnit: 'g', calories: 250, protein: 16, carbs: 6, fat: 18, fiber: 1, isVegetarian: false, isVegan: false, tags: ['mutton', 'kebab', 'grilled'] },
  { id: 'nvg_005', name: 'Chicken 65', category: 'non_veg', servingSize: 150, servingUnit: 'g', calories: 320, protein: 22, carbs: 14, fat: 20, fiber: 1, isVegetarian: false, isVegan: false, tags: ['chicken 65', 'fried', 'spicy', 'south indian'] },
  { id: 'nvg_006', name: 'Boiled Egg', category: 'non_veg', servingSize: 50, servingUnit: 'g', calories: 78, protein: 6, carbs: 0.5, fat: 5, fiber: 0, isVegetarian: false, isVegan: false, tags: ['egg', 'boiled', 'protein', 'healthy'] },
  { id: 'nvg_007', name: 'Egg Omelette (2 eggs)', category: 'non_veg', servingSize: 120, servingUnit: 'g', calories: 180, protein: 13, carbs: 2, fat: 14, fiber: 0, isVegetarian: false, isVegan: false, tags: ['egg', 'omelette', 'breakfast'] },
  { id: 'nvg_008', name: 'Grilled Chicken Breast', category: 'non_veg', servingSize: 150, servingUnit: 'g', calories: 230, protein: 34, carbs: 0, fat: 10, fiber: 0, isVegetarian: false, isVegan: false, tags: ['chicken', 'grilled', 'lean', 'protein'] },
];

// ============================================
// Combine all foods & export
// ============================================

export const INDIAN_FOODS: FoodItem[] = [
  ...curries,
  ...dals,
  ...breads,
  ...riceDishes,
  ...sweets,
  ...snacks,
  ...chutneys,
  ...beverages,
  ...dryFruits,
  ...nonVeg,
];

/**
 * Search foods by name, tags, or category.
 * Fuzzy matching with relevance scoring.
 */
export function searchFoods(query: string, limit: number = 20): FoodItem[] {
  if (!query || query.trim().length === 0) return INDIAN_FOODS.slice(0, limit);

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  return INDIAN_FOODS.map((food) => {
    let score = 0;
    const name = food.name.toLowerCase();
    const tags = food.tags.join(' ').toLowerCase();
    const category = food.category.toLowerCase();

    for (const term of terms) {
      // Exact name match (highest)
      if (name === term) score += 100;
      // Name starts with term
      else if (name.startsWith(term)) score += 50;
      // Name contains term
      else if (name.includes(term)) score += 30;
      // Tag match
      if (tags.includes(term)) score += 20;
      // Category match
      if (category.includes(term)) score += 15;
    }

    return { food, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.food);
}

/**
 * Get foods by category.
 */
export function getFoodsByCategory(category: FoodCategory): FoodItem[] {
  return INDIAN_FOODS.filter((f) => f.category === category);
}

/**
 * Get all available categories with counts.
 */
export function getFoodCategories(): { category: FoodCategory; count: number; label: string }[] {
  const labels: Record<FoodCategory, string> = {
    curry: 'Curries',
    dal: 'Dals & Lentils',
    bread: 'Breads & Rotis',
    rice: 'Rice Dishes',
    sweet: 'Sweets & Desserts',
    snack: 'Snacks',
    beverage: 'Beverages',
    chutney: 'Chutneys & Condiments',
    raita: 'Raita',
    salad: 'Salads',
    breakfast: 'Breakfast',
    street_food: 'Street Food',
    non_veg: 'Non-Veg',
    seafood: 'Seafood',
    dry_fruit: 'Dry Fruits & Nuts',
    fruit: 'Fruits',
    other: 'Other',
  };

  const counts: Partial<Record<FoodCategory, number>> = {};
  for (const food of INDIAN_FOODS) {
    counts[food.category] = (counts[food.category] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([cat, count]) => ({
      category: cat as FoodCategory,
      count: count as number,
      label: labels[cat as FoodCategory] || cat,
    }))
    .sort((a, b) => b.count - a.count);
}

export default INDIAN_FOODS;
