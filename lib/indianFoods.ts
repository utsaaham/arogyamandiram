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
  { id: 'cur_026', name: 'Paneer Butter Masala (home style)', category: 'curry', servingSize: 100, servingUnit: 'g', calories: 155, protein: 7, carbs: 6, fat: 12, fiber: 1, isVegetarian: true, isVegan: false, tags: ['paneer', 'butter masala', 'home style', '40ml cream', 'gravy'] },
  { id: 'cur_027', name: 'Paneer Curry (generic)', category: 'curry', servingSize: 100, servingUnit: 'g', calories: 176, protein: 8, carbs: 8, fat: 12, fiber: 1, isVegetarian: true, isVegan: false, tags: ['paneer', 'curry', 'gravy', 'generic'] },
  { id: 'cur_028', name: 'Kadai Paneer', category: 'curry', servingSize: 100, servingUnit: 'g', calories: 110, protein: 7, carbs: 7, fat: 8, fiber: 1, isVegetarian: true, isVegan: false, tags: ['paneer', 'kadai', 'bell pepper', 'capsicum'] },
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
  { id: 'dal_009', name: 'Tomato Dal (Tomato Pappu)', category: 'dal', servingSize: 200, servingUnit: 'g', calories: 200, protein: 10, carbs: 30, fat: 6, fiber: 6, isVegetarian: true, isVegan: true, tags: ['toor dal', 'tomato', 'pappu', 'andhra', 'south indian'] },
];

// ---------- BREADS ----------
const breads: FoodItem[] = [
  { id: 'brd_001', name: 'Roti / Chapati', category: 'bread', servingSize: 40, servingUnit: 'g', calories: 104, protein: 3, carbs: 18, fat: 2.5, fiber: 2, isVegetarian: true, isVegan: true, tags: ['roti', 'chapati', 'whole wheat', 'everyday'] },
  { id: 'brd_002', name: 'Naan (Plain)', category: 'bread', servingSize: 80, servingUnit: 'g', calories: 260, protein: 8, carbs: 42, fat: 6, fiber: 2, isVegetarian: true, isVegan: false, tags: ['naan', 'tandoor', 'maida'] },
  { id: 'brd_003', name: 'Butter Naan', category: 'bread', servingSize: 85, servingUnit: 'g', calories: 310, protein: 8, carbs: 42, fat: 12, fiber: 2, isVegetarian: true, isVegan: false, tags: ['naan', 'butter', 'tandoor'] },
  { id: 'brd_004', name: 'Garlic Naan', category: 'bread', servingSize: 1, servingUnit: 'piece', calories: 280, protein: 8, carbs: 47, fat: 6, fiber: 2, isVegetarian: true, isVegan: false, tags: ['naan', 'garlic', 'tandoor'] },
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
  { id: 'swt_026', name: 'Badam Rakhi', category: 'sweet', servingSize: 1, servingUnit: 'piece', calories: 150, protein: 4, carbs: 11, fat: 10, fiber: 2, isVegetarian: true, isVegan: false, tags: ['badam', 'almond', 'dry fruit sweet', 'ghee', 'cardamom'] },
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
  { id: 'cht_007', name: 'Peanut Chutney (Andhra)', category: 'chutney', servingSize: 10, servingUnit: 'g', calories: 50, protein: 2, carbs: 2, fat: 4, fiber: 0.6, isVegetarian: true, isVegan: true, tags: ['peanut chutney', 'verusenaga pachadi', 'andhra', 'south indian', 'chutney'] },
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
  { id: 'dry_005', name: 'Dates (Khajoor, 1 piece)', category: 'dry_fruit', servingSize: 1, servingUnit: 'piece', calories: 28, protein: 0.2, carbs: 7, fat: 0, fiber: 0.7, isVegetarian: true, isVegan: true, tags: ['dates', 'energy', 'iron', 'per piece'] },
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

// ---------- MORE INDIAN (everyday & regional) ----------
const moreIndian: FoodItem[] = [
  { id: 'ind_001', name: 'Pav Bhaji Masala', category: 'curry', servingSize: 150, servingUnit: 'g', calories: 180, protein: 4, carbs: 22, fat: 9, fiber: 3, isVegetarian: true, isVegan: true, tags: ['pav bhaji', 'mumbai', 'mashed veg'] },
  { id: 'ind_002', name: 'Kadai Chicken', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 290, protein: 26, carbs: 10, fat: 18, fiber: 2, isVegetarian: false, isVegan: false, tags: ['kadai', 'chicken', 'bell pepper'] },
  { id: 'ind_003', name: 'Hyderabadi Biryani (Chicken)', category: 'rice', servingSize: 280, servingUnit: 'g', calories: 420, protein: 20, carbs: 48, fat: 18, fiber: 2, isVegetarian: false, isVegan: false, tags: ['biryani', 'hyderabadi', 'dum'] },
  { id: 'ind_004', name: 'Pongal (Ven Pongal)', category: 'breakfast', servingSize: 200, servingUnit: 'g', calories: 240, protein: 8, carbs: 36, fat: 7, fiber: 2, isVegetarian: true, isVegan: true, tags: ['pongal', 'south indian', 'rice', 'pepper'] },
  { id: 'ind_005', name: 'Ven Pongal', category: 'breakfast', servingSize: 200, servingUnit: 'g', calories: 250, protein: 8, carbs: 38, fat: 8, fiber: 2, isVegetarian: true, isVegan: true, tags: ['pongal', 'tamil', 'ghee'] },
  { id: 'ind_006', name: 'Pesarattu (Green Gram Dosa)', category: 'bread', servingSize: 120, servingUnit: 'g', calories: 160, protein: 8, carbs: 24, fat: 4, fiber: 4, isVegetarian: true, isVegan: true, tags: ['pesarattu', 'andhra', 'protein', 'moong'] },
  { id: 'ind_007', name: 'Rava Dosa', category: 'bread', servingSize: 100, servingUnit: 'g', calories: 140, protein: 3, carbs: 24, fat: 4, fiber: 1, isVegetarian: true, isVegan: true, tags: ['rava dosa', 'crispy', 'semolina'] },
  { id: 'ind_008', name: 'Set Dosa (3 pieces)', category: 'bread', servingSize: 150, servingUnit: 'g', calories: 180, protein: 5, carbs: 32, fat: 4, fiber: 1, isVegetarian: true, isVegan: true, tags: ['set dosa', 'spongy', 'karnataka'] },
  { id: 'ind_009', name: 'Pav', category: 'bread', servingSize: 50, servingUnit: 'g', calories: 150, protein: 5, carbs: 28, fat: 2, fiber: 1, isVegetarian: true, isVegan: true, tags: ['pav', 'bread', 'mumbai'] },
  { id: 'ind_010', name: 'Bisi Bele Bath', category: 'rice', servingSize: 250, servingUnit: 'g', calories: 320, protein: 10, carbs: 48, fat: 10, fiber: 4, isVegetarian: true, isVegan: true, tags: ['bisi bele bath', 'karnataka', 'one pot'] },
  { id: 'ind_011', name: 'Pulao (Chicken)', category: 'rice', servingSize: 250, servingUnit: 'g', calories: 340, protein: 18, carbs: 40, fat: 12, fiber: 2, isVegetarian: false, isVegan: false, tags: ['chicken pulao', 'aromatic'] },
  { id: 'ind_012', name: 'Tomato Rice', category: 'rice', servingSize: 200, servingUnit: 'g', calories: 260, protein: 4, carbs: 44, fat: 7, fiber: 2, isVegetarian: true, isVegan: true, tags: ['tomato rice', 'south indian', 'tangy'] },
  { id: 'ind_013', name: 'Coconut Rice', category: 'rice', servingSize: 200, servingUnit: 'g', calories: 280, protein: 4, carbs: 42, fat: 10, fiber: 2, isVegetarian: true, isVegan: true, tags: ['coconut rice', 'south indian', 'festive'] },
  { id: 'ind_014', name: 'Papad (1 piece)', category: 'snack', servingSize: 15, servingUnit: 'g', calories: 55, protein: 2, carbs: 8, fat: 1.5, fiber: 1, isVegetarian: true, isVegan: true, tags: ['papad', 'crispy', 'side'] },
  { id: 'ind_015', name: 'Murukku (2 pieces)', category: 'snack', servingSize: 30, servingUnit: 'g', calories: 150, protein: 2, carbs: 18, fat: 8, fiber: 1, isVegetarian: true, isVegan: true, tags: ['murukku', 'south indian', 'diwali'] },
  { id: 'ind_016', name: 'Chakli', category: 'snack', servingSize: 30, servingUnit: 'g', calories: 145, protein: 2, carbs: 16, fat: 8, fiber: 1, isVegetarian: true, isVegan: true, tags: ['chakli', 'spiral', 'festive'] },
  { id: 'ind_017', name: 'Pongal (Sweet)', category: 'sweet', servingSize: 150, servingUnit: 'g', calories: 280, protein: 6, carbs: 42, fat: 10, fiber: 1, isVegetarian: true, isVegan: false, tags: ['sweet pongal', 'sakkarai', 'jaggery'] },
  { id: 'ind_018', name: 'Semiya Payasam', category: 'sweet', servingSize: 150, servingUnit: 'g', calories: 250, protein: 5, carbs: 40, fat: 8, fiber: 0.5, isVegetarian: true, isVegan: false, tags: ['vermicelli', 'payasam', 'south indian'] },
  { id: 'ind_019', name: 'Watermelon', category: 'fruit', servingSize: 150, servingUnit: 'g', calories: 45, protein: 1, carbs: 11, fat: 0, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['watermelon', 'summer', 'hydrating'] },
  { id: 'ind_020', name: 'Orange (Santra)', category: 'fruit', servingSize: 130, servingUnit: 'g', calories: 62, protein: 1, carbs: 15, fat: 0, fiber: 3, isVegetarian: true, isVegan: true, tags: ['orange', 'vitamin c'] },
  { id: 'ind_021', name: 'Grapes (Angoor)', category: 'fruit', servingSize: 100, servingUnit: 'g', calories: 69, protein: 0.7, carbs: 18, fat: 0, fiber: 0.9, isVegetarian: true, isVegan: true, tags: ['grapes', 'antioxidant'] },
  { id: 'ind_022', name: 'Custard Apple (Sitaphal)', category: 'fruit', servingSize: 100, servingUnit: 'g', calories: 94, protein: 1.5, carbs: 24, fat: 0.4, fiber: 4, isVegetarian: true, isVegan: true, tags: ['sitaphal', 'custard apple', 'tropical'] },
  { id: 'ind_023', name: 'Dragon Fruit', category: 'fruit', servingSize: 100, servingUnit: 'g', calories: 60, protein: 1, carbs: 13, fat: 0, fiber: 3, isVegetarian: true, isVegan: true, tags: ['dragon fruit', 'tropical'] },
  { id: 'ind_024', name: 'Sweet Lime (Mosambi)', category: 'fruit', servingSize: 100, servingUnit: 'g', calories: 43, protein: 0.8, carbs: 10, fat: 0, fiber: 2.8, isVegetarian: true, isVegan: true, tags: ['mosambi', 'sweet lime', 'juice'] },
  { id: 'ind_025', name: 'Fig (Anjeer)', category: 'fruit', servingSize: 50, servingUnit: 'g', calories: 37, protein: 0.5, carbs: 10, fat: 0, fiber: 1.5, isVegetarian: true, isVegan: true, tags: ['fig', 'anjeer', 'fiber'] },
  { id: 'ind_026', name: 'Sambar Rice (full plate)', category: 'rice', servingSize: 350, servingUnit: 'g', calories: 320, protein: 12, carbs: 52, fat: 8, fiber: 5, isVegetarian: true, isVegan: true, tags: ['sambar rice', 'south indian', 'combo'] },
  { id: 'ind_027', name: 'Curd Rice (full plate)', category: 'rice', servingSize: 250, servingUnit: 'g', calories: 280, protein: 8, carbs: 44, fat: 8, fiber: 0.5, isVegetarian: true, isVegan: false, tags: ['curd rice', 'tamil', 'cooling'] },
  { id: 'ind_028', name: 'Rava Upma', category: 'breakfast', servingSize: 200, servingUnit: 'g', calories: 260, protein: 6, carbs: 38, fat: 9, fiber: 2, isVegetarian: true, isVegan: true, tags: ['upma', 'rava', 'south indian'] },
  { id: 'ind_029', name: 'Idiyappam (String Hoppers)', category: 'bread', servingSize: 100, servingUnit: 'g', calories: 130, protein: 2, carbs: 28, fat: 0.5, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['idiyappam', 'kerala', 'rice noodles'] },
  { id: 'ind_030', name: 'Puttu', category: 'bread', servingSize: 120, servingUnit: 'g', calories: 150, protein: 3, carbs: 32, fat: 1, fiber: 2, isVegetarian: true, isVegan: true, tags: ['puttu', 'kerala', 'steamed', 'rice'] },
];

// ---------- ALL INDIAN: MORE CURRIES ----------
const moreCurries: FoodItem[] = [
  { id: 'in_cur_026', name: 'Dum Aloo', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 280, protein: 4, carbs: 28, fat: 16, fiber: 3, isVegetarian: true, isVegan: true, tags: ['aloo', 'kashmiri', 'potato', 'gravy'] },
  { id: 'in_cur_027', name: 'Lauki (Bottle Gourd) Curry', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 120, protein: 2, carbs: 14, fat: 6, fiber: 2, isVegetarian: true, isVegan: true, tags: ['lauki', 'light', 'healthy'] },
  { id: 'in_cur_028', name: 'Vendakkai (Okra) Curry', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 140, protein: 4, carbs: 16, fat: 8, fiber: 5, isVegetarian: true, isVegan: true, tags: ['okra', 'tamil', 'south indian'] },
  { id: 'in_cur_029', name: 'Kadhi (Gujarati)', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 160, protein: 6, carbs: 18, fat: 8, fiber: 2, isVegetarian: true, isVegan: false, tags: ['kadhi', 'gujarati', 'yogurt'] },
  { id: 'in_cur_030', name: 'Pumpkin Curry (Kaddu)', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 130, protein: 2, carbs: 20, fat: 5, fiber: 2, isVegetarian: true, isVegan: true, tags: ['pumpkin', 'kaddu', 'sweet'] },
  { id: 'in_cur_031', name: 'Chana Masala', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 250, protein: 12, carbs: 36, fat: 8, fiber: 10, isVegetarian: true, isVegan: true, tags: ['chana', 'chickpea', 'punjabi'] },
  { id: 'in_cur_032', name: 'Goat Curry (Mutton Curry)', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 300, protein: 28, carbs: 8, fat: 18, fiber: 2, isVegetarian: false, isVegan: false, tags: ['mutton', 'goat', 'spicy'] },
  { id: 'in_cur_033', name: 'Chettinad Chicken', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 310, protein: 26, carbs: 12, fat: 20, fiber: 2, isVegetarian: false, isVegan: false, tags: ['chettinad', 'tamil', 'spicy'] },
  { id: 'in_cur_034', name: 'Pav Bhaji (Gravy)', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 200, protein: 5, carbs: 26, fat: 10, fiber: 4, isVegetarian: true, isVegan: true, tags: ['pav bhaji', 'mumbai', 'mashed'] },
  { id: 'in_cur_035', name: 'Navratan Korma', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 300, protein: 8, carbs: 24, fat: 20, fiber: 3, isVegetarian: true, isVegan: false, tags: ['navratan', 'korma', 'nine gems', 'creamy'] },
];

// ---------- ALL INDIAN: MORE DALS ----------
const moreDals: FoodItem[] = [
  { id: 'in_dal_009', name: 'Dal Palak', category: 'dal', servingSize: 200, servingUnit: 'g', calories: 170, protein: 12, carbs: 22, fat: 5, fiber: 6, isVegetarian: true, isVegan: true, tags: ['dal', 'spinach', 'palak'] },
  { id: 'in_dal_010', name: 'Khatti Meethi Dal', category: 'dal', servingSize: 200, servingUnit: 'g', calories: 190, protein: 10, carbs: 26, fat: 6, fiber: 6, isVegetarian: true, isVegan: true, tags: ['khatti meethi', 'sweet sour', 'everyday'] },
  { id: 'in_dal_011', name: 'Urad Dal (Whole)', category: 'dal', servingSize: 200, servingUnit: 'g', calories: 220, protein: 14, carbs: 30, fat: 6, fiber: 6, isVegetarian: true, isVegan: true, tags: ['urad', 'whole', 'punjabi'] },
  { id: 'in_dal_012', name: 'Moong Dal Khichdi', category: 'dal', servingSize: 200, servingUnit: 'g', calories: 180, protein: 10, carbs: 30, fat: 4, fiber: 4, isVegetarian: true, isVegan: true, tags: ['khichdi', 'moong', 'light'] },
  { id: 'in_dal_013', name: 'Paruppu (Tamil Dal)', category: 'dal', servingSize: 200, servingUnit: 'g', calories: 175, protein: 10, carbs: 24, fat: 5, fiber: 5, isVegetarian: true, isVegan: true, tags: ['paruppu', 'tamil', 'toor'] },
];

// ---------- ALL INDIAN: MORE BREADS ----------
const moreBreads: FoodItem[] = [
  { id: 'in_brd_025', name: 'Neer Dosa', category: 'bread', servingSize: 80, servingUnit: 'g', calories: 100, protein: 2, carbs: 20, fat: 1, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['neer dosa', 'mangalorean', 'thin'] },
  { id: 'in_brd_026', name: 'Adai (2 pieces)', category: 'bread', servingSize: 120, servingUnit: 'g', calories: 200, protein: 10, carbs: 28, fat: 6, fiber: 4, isVegetarian: true, isVegan: true, tags: ['adai', 'tamil', 'lentil', 'protein'] },
  { id: 'in_brd_027', name: 'Ragi Roti', category: 'bread', servingSize: 50, servingUnit: 'g', calories: 110, protein: 3, carbs: 20, fat: 2, fiber: 3, isVegetarian: true, isVegan: true, tags: ['ragi', 'finger millet', 'karnataka', 'calcium'] },
  { id: 'in_brd_028', name: 'Phulka', category: 'bread', servingSize: 35, servingUnit: 'g', calories: 90, protein: 3, carbs: 16, fat: 1.5, fiber: 2, isVegetarian: true, isVegan: true, tags: ['phulka', 'roti', 'puffed'] },
  { id: 'in_brd_029', name: 'Bajra Khichdi', category: 'bread', servingSize: 200, servingUnit: 'g', calories: 220, protein: 8, carbs: 38, fat: 5, fiber: 4, isVegetarian: true, isVegan: true, tags: ['bajra', 'millet', 'rajasthani'] },
  { id: 'in_brd_030', name: 'Pesarattu (2 pieces)', category: 'bread', servingSize: 150, servingUnit: 'g', calories: 200, protein: 10, carbs: 28, fat: 6, fiber: 5, isVegetarian: true, isVegan: true, tags: ['pesarattu', 'andhra', 'green gram'] },
];

// ---------- ALL INDIAN: MORE RICE ----------
const moreRice: FoodItem[] = [
  { id: 'in_ric_014', name: 'Vangi Bath (Brinjal Rice)', category: 'rice', servingSize: 220, servingUnit: 'g', calories: 280, protein: 5, carbs: 44, fat: 9, fiber: 3, isVegetarian: true, isVegan: true, tags: ['vangi bath', 'karnataka', 'brinjal'] },
  { id: 'in_ric_015', name: 'Bisi Bele Bath', category: 'rice', servingSize: 260, servingUnit: 'g', calories: 340, protein: 12, carbs: 50, fat: 12, fiber: 5, isVegetarian: true, isVegan: true, tags: ['bisi bele bath', 'karnataka', 'one pot'] },
  { id: 'in_ric_016', name: 'Pulao (Egg)', category: 'rice', servingSize: 220, servingUnit: 'g', calories: 320, protein: 12, carbs: 42, fat: 12, fiber: 2, isVegetarian: false, isVegan: false, tags: ['egg pulao', 'aromatic'] },
  { id: 'in_ric_017', name: 'Jeera Pulao', category: 'rice', servingSize: 200, servingUnit: 'g', calories: 250, protein: 4, carbs: 44, fat: 6, fiber: 1, isVegetarian: true, isVegan: true, tags: ['jeera pulao', 'cumin', 'simple'] },
  { id: 'in_ric_018', name: 'Kashmiri Pulao', category: 'rice', servingSize: 200, servingUnit: 'g', calories: 280, protein: 5, carbs: 46, fat: 10, fiber: 2, isVegetarian: true, isVegan: false, tags: ['kashmiri', 'dry fruits', 'saffron'] },
  { id: 'in_ric_019', name: 'Tehri (Veg Pulao)', category: 'rice', servingSize: 220, servingUnit: 'g', calories: 270, protein: 6, carbs: 44, fat: 8, fiber: 2, isVegetarian: true, isVegan: true, tags: ['tehri', 'awadhi', 'veg'] },
];

// ---------- ALL INDIAN: MORE SWEETS ----------
const moreSweets: FoodItem[] = [
  { id: 'in_swt_026', name: 'Soan Papdi', category: 'sweet', servingSize: 40, servingUnit: 'g', calories: 180, protein: 2, carbs: 28, fat: 7, fiber: 0, isVegetarian: true, isVegan: false, tags: ['soan papdi', 'flaky', 'diwali'] },
  { id: 'in_swt_027', name: 'Balushahi', category: 'sweet', servingSize: 50, servingUnit: 'g', calories: 220, protein: 2, carbs: 26, fat: 12, fiber: 0, isVegetarian: true, isVegan: false, tags: ['balushahi', 'badusha', 'fried'] },
  { id: 'in_swt_028', name: 'Patisha', category: 'sweet', servingSize: 40, servingUnit: 'g', calories: 170, protein: 2, carbs: 24, fat: 8, fiber: 0, isVegetarian: true, isVegan: false, tags: ['patisha', 'maharashtrian', 'besan'] },
  { id: 'in_swt_029', name: 'Chhena Poda', category: 'sweet', servingSize: 80, servingUnit: 'g', calories: 200, protein: 8, carbs: 24, fat: 8, fiber: 0, isVegetarian: true, isVegan: false, tags: ['chhena poda', 'odisha', 'baked'] },
  { id: 'in_swt_030', name: 'Pootharekulu', category: 'sweet', servingSize: 50, servingUnit: 'g', calories: 190, protein: 2, carbs: 30, fat: 7, fiber: 0, isVegetarian: true, isVegan: false, tags: ['pootharekulu', 'andhra', 'paper sweet'] },
  { id: 'in_swt_031', name: 'Kaju Katli (1 piece)', category: 'sweet', servingSize: 20, servingUnit: 'g', calories: 100, protein: 2, carbs: 10, fat: 6, fiber: 0.5, isVegetarian: true, isVegan: false, tags: ['kaju katli', 'cashew', 'diwali'] },
  { id: 'in_swt_032', name: 'Gajar ka Halwa (1 bowl)', category: 'sweet', servingSize: 120, servingUnit: 'g', calories: 300, protein: 5, carbs: 36, fat: 16, fiber: 2, isVegetarian: true, isVegan: false, tags: ['gajar halwa', 'carrot', 'winter'] },
  { id: 'in_swt_033', name: 'Phirni', category: 'sweet', servingSize: 120, servingUnit: 'g', calories: 200, protein: 5, carbs: 28, fat: 8, fiber: 0.5, isVegetarian: true, isVegan: false, tags: ['phirni', 'rice', 'eid', 'milk'] },
  { id: 'in_swt_034', name: 'Seviyan (Vermicelli)', category: 'sweet', servingSize: 150, servingUnit: 'g', calories: 260, protein: 5, carbs: 42, fat: 8, fiber: 0.5, isVegetarian: true, isVegan: false, tags: ['seviyan', 'eid', 'vermicelli'] },
  { id: 'in_swt_035', name: 'Lapsi (Sweet Dalia)', category: 'sweet', servingSize: 150, servingUnit: 'g', calories: 280, protein: 6, carbs: 44, fat: 10, fiber: 2, isVegetarian: true, isVegan: false, tags: ['lapsi', 'gujarati', 'broken wheat'] },
];

// ---------- ALL INDIAN: MORE SNACKS & STREET FOOD ----------
const moreSnacksStreet: FoodItem[] = [
  { id: 'in_snk_021', name: 'Dahi Puri (6 pieces)', category: 'street_food', servingSize: 150, servingUnit: 'g', calories: 220, protein: 6, carbs: 32, fat: 8, fiber: 2, isVegetarian: true, isVegan: false, tags: ['dahi puri', 'chaat', 'curd'] },
  { id: 'in_snk_022', name: 'Papdi Chaat', category: 'street_food', servingSize: 150, servingUnit: 'g', calories: 260, protein: 5, carbs: 34, fat: 12, fiber: 3, isVegetarian: true, isVegan: false, tags: ['papdi chaat', 'chaat', 'delhi'] },
  { id: 'in_snk_023', name: 'Sabudana Khichdi', category: 'breakfast', servingSize: 200, servingUnit: 'g', calories: 280, protein: 2, carbs: 52, fat: 8, fiber: 1, isVegetarian: true, isVegan: true, tags: ['sabudana', 'fasting', 'maharashtrian'] },
  { id: 'in_snk_024', name: 'Sabudana Vada (2 pieces)', category: 'snack', servingSize: 80, servingUnit: 'g', calories: 200, protein: 2, carbs: 36, fat: 6, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['sabudana', 'vada', 'fasting'] },
  { id: 'in_snk_025', name: 'Pav Bhaji (Full)', category: 'street_food', servingSize: 300, servingUnit: 'g', calories: 450, protein: 12, carbs: 54, fat: 20, fiber: 5, isVegetarian: true, isVegan: false, tags: ['pav bhaji', 'mumbai', 'full'] },
  { id: 'in_snk_026', name: 'Misal Pav', category: 'street_food', servingSize: 300, servingUnit: 'g', calories: 420, protein: 18, carbs: 48, fat: 18, fiber: 6, isVegetarian: true, isVegan: true, tags: ['misal', 'maharashtrian', 'sprouts'] },
  { id: 'in_snk_027', name: 'Dabeli', category: 'street_food', servingSize: 120, servingUnit: 'g', calories: 320, protein: 6, carbs: 42, fat: 14, fiber: 3, isVegetarian: true, isVegan: true, tags: ['dabeli', 'gujarati', 'burger'] },
  { id: 'in_snk_028', name: 'Kachori with Sabzi', category: 'street_food', servingSize: 150, servingUnit: 'g', calories: 340, protein: 8, carbs: 38, fat: 18, fiber: 3, isVegetarian: true, isVegan: true, tags: ['kachori', 'sabzi', 'breakfast'] },
  { id: 'in_snk_029', name: 'Samosa (2 pieces)', category: 'snack', servingSize: 120, servingUnit: 'g', calories: 360, protein: 6, carbs: 42, fat: 18, fiber: 3, isVegetarian: true, isVegan: true, tags: ['samosa', 'aloo', 'fried'] },
  { id: 'in_snk_030', name: 'Pav Bhaji (Single Pav)', category: 'street_food', servingSize: 180, servingUnit: 'g', calories: 280, protein: 7, carbs: 34, fat: 12, fiber: 3, isVegetarian: true, isVegan: false, tags: ['pav bhaji', 'single', 'mumbai'] },
  { id: 'in_snk_031', name: 'Bread Pakora (2 pieces)', category: 'snack', servingSize: 100, servingUnit: 'g', calories: 280, protein: 6, carbs: 28, fat: 16, fiber: 1, isVegetarian: true, isVegan: false, tags: ['bread pakora', 'fried', 'breakfast'] },
  { id: 'in_snk_032', name: 'Aloo Chaat', category: 'street_food', servingSize: 150, servingUnit: 'g', calories: 200, protein: 3, carbs: 28, fat: 8, fiber: 2, isVegetarian: true, isVegan: true, tags: ['aloo chaat', 'potato', 'chaat'] },
  { id: 'in_snk_033', name: 'Raj Kachori', category: 'street_food', servingSize: 200, servingUnit: 'g', calories: 380, protein: 8, carbs: 42, fat: 20, fiber: 4, isVegetarian: true, isVegan: false, tags: ['raj kachori', 'chaat', 'big'] },
  { id: 'in_snk_034', name: 'Pav (2 piece with bhaji)', category: 'bread', servingSize: 100, servingUnit: 'g', calories: 300, protein: 10, carbs: 56, fat: 4, fiber: 2, isVegetarian: true, isVegan: true, tags: ['pav', 'double', 'mumbai'] },
];

// ---------- ALL INDIAN: ALL DRINKS & BEVERAGES ----------
const allIndianDrinks: FoodItem[] = [
  { id: 'in_bev_013', name: 'Aam Panna', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 60, protein: 0.5, carbs: 14, fat: 0, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['aam panna', 'raw mango', 'summer', 'cooling'] },
  { id: 'in_bev_014', name: 'Sugarcane Juice (1 glass)', category: 'beverage', servingSize: 250, servingUnit: 'ml', calories: 110, protein: 0, carbs: 28, fat: 0, fiber: 0, isVegetarian: true, isVegan: true, tags: ['sugarcane', 'ganne ka ras', 'street'] },
  { id: 'in_bev_015', name: 'Sol Kadi', category: 'beverage', servingSize: 150, servingUnit: 'ml', calories: 35, protein: 1, carbs: 6, fat: 1, fiber: 0, isVegetarian: true, isVegan: true, tags: ['sol kadi', 'kokum', 'konkan', 'digestive'] },
  { id: 'in_bev_016', name: 'Neer Mor (Spiced Buttermilk)', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 45, protein: 2, carbs: 5, fat: 2, fiber: 0, isVegetarian: true, isVegan: false, tags: ['neer mor', 'tamil', 'buttermilk', 'cooling'] },
  { id: 'in_bev_017', name: 'Rose Milk', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 160, protein: 5, carbs: 24, fat: 5, fiber: 0, isVegetarian: true, isVegan: false, tags: ['rose milk', 'rose', 'summer'] },
  { id: 'in_bev_018', name: 'Banana Shake', category: 'beverage', servingSize: 250, servingUnit: 'ml', calories: 220, protein: 6, carbs: 36, fat: 6, fiber: 2, isVegetarian: true, isVegan: false, tags: ['banana', 'shake', 'milk'] },
  { id: 'in_bev_019', name: 'Mango Shake', category: 'beverage', servingSize: 250, servingUnit: 'ml', calories: 240, protein: 5, carbs: 40, fat: 6, fiber: 1, isVegetarian: true, isVegan: false, tags: ['mango', 'shake', 'summer'] },
  { id: 'in_bev_020', name: 'Chikoo Shake', category: 'beverage', servingSize: 250, servingUnit: 'ml', calories: 200, protein: 5, carbs: 34, fat: 5, fiber: 2, isVegetarian: true, isVegan: false, tags: ['chikoo', 'sapota', 'shake'] },
  { id: 'in_bev_021', name: 'Sweet Lime Juice (Mosambi)', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 90, protein: 1, carbs: 22, fat: 0, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['mosambi', 'sweet lime', 'juice', 'vitamin c'] },
  { id: 'in_bev_022', name: 'Pomegranate Juice (Anar)', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 130, protein: 1, carbs: 32, fat: 0.5, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['pomegranate', 'anar', 'juice', 'antioxidant'] },
  { id: 'in_bev_023', name: 'Watermelon Juice', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 60, protein: 1, carbs: 14, fat: 0, fiber: 0, isVegetarian: true, isVegan: true, tags: ['watermelon', 'juice', 'summer'] },
  { id: 'in_bev_024', name: 'Kokum Sherbet', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 40, protein: 0, carbs: 10, fat: 0, fiber: 0, isVegetarian: true, isVegan: true, tags: ['kokum', 'konkan', 'cooling'] },
  { id: 'in_bev_025', name: 'Iced Tea', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 50, protein: 0, carbs: 12, fat: 0, fiber: 0, isVegetarian: true, isVegan: true, tags: ['iced tea', 'cold', 'refreshing'] },
  { id: 'in_bev_026', name: 'Bournvita (1 cup)', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 140, protein: 4, carbs: 24, fat: 4, fiber: 0, isVegetarian: true, isVegan: false, tags: ['bournvita', 'chocolate', 'malt'] },
  { id: 'in_bev_027', name: 'Horlicks (1 cup)', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 150, protein: 5, carbs: 26, fat: 4, fiber: 0, isVegetarian: true, isVegan: false, tags: ['horlicks', 'malt', 'energy'] },
  { id: 'in_bev_028', name: 'Complan (1 cup)', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 160, protein: 6, carbs: 26, fat: 4, fiber: 0, isVegetarian: true, isVegan: false, tags: ['complan', 'health drink'] },
  { id: 'in_bev_029', name: 'Sharbat (Rose)', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 100, protein: 0, carbs: 24, fat: 0, fiber: 0, isVegetarian: true, isVegan: true, tags: ['sharbat', 'rose', 'summer'] },
  { id: 'in_bev_030', name: 'Sharbat (Khus)', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 90, protein: 0, carbs: 22, fat: 0, fiber: 0, isVegetarian: true, isVegan: true, tags: ['sharbat', 'khus', 'vetiver', 'cooling'] },
  { id: 'in_bev_031', name: 'Sharbat (Bel)', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 80, protein: 0.5, carbs: 20, fat: 0, fiber: 0, isVegetarian: true, isVegan: true, tags: ['sharbat', 'bel', 'wood apple', 'digestive'] },
  { id: 'in_bev_032', name: 'Ginger Tea (Adrak Chai)', category: 'beverage', servingSize: 150, servingUnit: 'ml', calories: 70, protein: 2, carbs: 12, fat: 2, fiber: 0, isVegetarian: true, isVegan: false, tags: ['ginger', 'adrak chai', 'digestive'] },
  { id: 'in_bev_033', name: 'Elaichi Chai (Cardamom Tea)', category: 'beverage', servingSize: 150, servingUnit: 'ml', calories: 85, protein: 2, carbs: 14, fat: 2.5, fiber: 0, isVegetarian: true, isVegan: false, tags: ['elaichi', 'cardamom', 'chai'] },
  { id: 'in_bev_034', name: 'Irani Chai', category: 'beverage', servingSize: 150, servingUnit: 'ml', calories: 95, protein: 2, carbs: 14, fat: 3, fiber: 0, isVegetarian: true, isVegan: false, tags: ['irani chai', 'hyderabad', 'strong'] },
  { id: 'in_bev_035', name: 'Cold Coffee', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 140, protein: 4, carbs: 22, fat: 4, fiber: 0, isVegetarian: true, isVegan: false, tags: ['cold coffee', 'iced', 'summer'] },
  { id: 'in_bev_036', name: 'Falooda', category: 'beverage', servingSize: 250, servingUnit: 'ml', calories: 280, protein: 6, carbs: 44, fat: 8, fiber: 0.5, isVegetarian: true, isVegan: false, tags: ['falooda', 'rose', 'vermicelli', 'dessert drink'] },
  { id: 'in_bev_037', name: 'Shikanji (Spiced Lemonade)', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 55, protein: 0, carbs: 14, fat: 0, fiber: 0, isVegetarian: true, isVegan: true, tags: ['shikanji', 'nimbu', 'spiced', 'summer'] },
  { id: 'in_bev_038', name: 'Sattu Sharbat', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 120, protein: 6, carbs: 18, fat: 2, fiber: 2, isVegetarian: true, isVegan: true, tags: ['sattu', 'bihar', 'protein', 'cooling'] },
  { id: 'in_bev_039', name: 'Tender Coconut Water', category: 'beverage', servingSize: 250, servingUnit: 'ml', calories: 45, protein: 0, carbs: 11, fat: 0, fiber: 0, isVegetarian: true, isVegan: true, tags: ['tender coconut', 'nariyal pani', 'electrolytes'] },
  { id: 'in_bev_040', name: 'Mango Panna', category: 'beverage', servingSize: 200, servingUnit: 'ml', calories: 70, protein: 0.5, carbs: 18, fat: 0, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['mango panna', 'raw mango', 'cooling'] },
];

// ---------- ALL INDIAN: MORE CHUTNEYS & RAITA ----------
const moreChutneysRaita: FoodItem[] = [
  { id: 'in_cht_007', name: 'Coriander Chutney', category: 'chutney', servingSize: 30, servingUnit: 'g', calories: 20, protein: 1, carbs: 3, fat: 0.5, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['coriander', 'dhania', 'green'] },
  { id: 'in_cht_008', name: 'Tomato Chutney', category: 'chutney', servingSize: 40, servingUnit: 'g', calories: 35, protein: 0.5, carbs: 6, fat: 1, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['tomato', 'south indian'] },
  { id: 'in_cht_009', name: 'Ginger Chutney', category: 'chutney', servingSize: 25, servingUnit: 'g', calories: 30, protein: 0.5, carbs: 5, fat: 1, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['ginger', 'inji', 'tamil'] },
  { id: 'in_cht_010', name: 'Garlic Chutney', category: 'chutney', servingSize: 20, servingUnit: 'g', calories: 45, protein: 1, carbs: 4, fat: 3, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['garlic', 'lehsun', 'spicy'] },
  { id: 'in_cht_011', name: 'Onion Raita', category: 'raita', servingSize: 100, servingUnit: 'g', calories: 55, protein: 3, carbs: 5, fat: 2.5, fiber: 0.5, isVegetarian: true, isVegan: false, tags: ['raita', 'onion', 'cooling'] },
  { id: 'in_cht_012', name: 'Mixed Veg Raita', category: 'raita', servingSize: 100, servingUnit: 'g', calories: 60, protein: 3, carbs: 6, fat: 2.5, fiber: 0.5, isVegetarian: true, isVegan: false, tags: ['raita', 'mixed', 'veg'] },
  { id: 'in_cht_013', name: 'Brinjal Raita', category: 'raita', servingSize: 100, servingUnit: 'g', calories: 50, protein: 3, carbs: 5, fat: 2, fiber: 1, isVegetarian: true, isVegan: false, tags: ['raita', 'baingan', 'eggplant'] },
  { id: 'in_cht_014', name: 'Lemon Pickle', category: 'chutney', servingSize: 20, servingUnit: 'g', calories: 35, protein: 0.5, carbs: 4, fat: 2, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['lemon', 'nimbu', 'pickle'] },
  { id: 'in_cht_015', name: 'Mixed Pickle', category: 'chutney', servingSize: 25, servingUnit: 'g', calories: 50, protein: 0.5, carbs: 5, fat: 3, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['mixed', 'achar', 'pickle'] },
];

// ---------- ALL INDIAN: MORE BREAKFAST ----------
const moreBreakfast: FoodItem[] = [
  { id: 'in_bf_001', name: 'Dalia (Porridge)', category: 'breakfast', servingSize: 200, servingUnit: 'g', calories: 180, protein: 6, carbs: 34, fat: 3, fiber: 4, isVegetarian: true, isVegan: true, tags: ['dalia', 'broken wheat', 'porridge'] },
  { id: 'in_bf_002', name: 'Vermicelli Upma (Semiya)', category: 'breakfast', servingSize: 200, servingUnit: 'g', calories: 260, protein: 5, carbs: 42, fat: 8, fiber: 1, isVegetarian: true, isVegan: true, tags: ['semiya', 'vermicelli', 'upma'] },
  { id: 'in_bf_003', name: 'Idli (3 pieces)', category: 'breakfast', servingSize: 150, servingUnit: 'g', calories: 195, protein: 6, carbs: 39, fat: 0.5, fiber: 1.5, isVegetarian: true, isVegan: true, tags: ['idli', 'south indian', 'steamed'] },
  { id: 'in_bf_004', name: 'Dosa (2 pieces)', category: 'breakfast', servingSize: 180, servingUnit: 'g', calories: 240, protein: 6, carbs: 40, fat: 6, fiber: 2, isVegetarian: true, isVegan: true, tags: ['dosa', 'south indian', 'breakfast'] },
  { id: 'in_bf_010', name: 'Idli (1 piece)', category: 'breakfast', servingSize: 1, servingUnit: 'piece', calories: 65, protein: 2, carbs: 13, fat: 0.3, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['idli', 'single piece', 'south indian', 'steamed', 'idly'] },
  { id: 'in_bf_011', name: 'Dosa (1 piece, idli batter)', category: 'breakfast', servingSize: 1, servingUnit: 'piece', calories: 120, protein: 3, carbs: 20, fat: 3, fiber: 1, isVegetarian: true, isVegan: true, tags: ['dosa', 'idli batter', 'south indian', 'breakfast', 'idly dosa'] },
  { id: 'in_bf_005', name: 'Poha (with peanuts)', category: 'breakfast', servingSize: 220, servingUnit: 'g', calories: 280, protein: 6, carbs: 44, fat: 10, fiber: 2, isVegetarian: true, isVegan: true, tags: ['poha', 'batata poha', 'maharashtrian'] },
  { id: 'in_bf_006', name: 'Aloo Paratha (2 with curd)', category: 'breakfast', servingSize: 220, servingUnit: 'g', calories: 420, protein: 12, carbs: 56, fat: 16, fiber: 4, isVegetarian: true, isVegan: false, tags: ['aloo paratha', 'punjabi', 'breakfast'] },
  { id: 'in_bf_007', name: 'Besan Chilla (2 pieces)', category: 'breakfast', servingSize: 120, servingUnit: 'g', calories: 200, protein: 10, carbs: 22, fat: 8, fiber: 3, isVegetarian: true, isVegan: true, tags: ['chilla', 'besan', 'protein'] },
  { id: 'in_bf_008', name: 'Methi Thepla (2 pieces)', category: 'breakfast', servingSize: 80, servingUnit: 'g', calories: 220, protein: 6, carbs: 28, fat: 10, fiber: 3, isVegetarian: true, isVegan: true, tags: ['thepla', 'methi', 'gujarati'] },
  { id: 'in_bf_009', name: 'Rice Rava Upma', category: 'breakfast', servingSize: 150, servingUnit: 'g', calories: 210, protein: 5, carbs: 43, fat: 6, fiber: 2, isVegetarian: true, isVegan: true, tags: ['upma', 'rice rava', 'breakfast', 'south indian'] },
];

// ---------- ALL INDIAN: MORE NON-VEG & SEAFOOD ----------
const moreNonVegSeafood: FoodItem[] = [
  { id: 'in_nvg_009', name: 'Chicken Tikka (6 pcs)', category: 'non_veg', servingSize: 150, servingUnit: 'g', calories: 280, protein: 32, carbs: 8, fat: 14, fiber: 0, isVegetarian: false, isVegan: false, tags: ['chicken tikka', 'tandoori', 'grilled'] },
  { id: 'in_nvg_010', name: 'Fish Curry (Kerala Style)', category: 'seafood', servingSize: 200, servingUnit: 'g', calories: 240, protein: 24, carbs: 10, fat: 12, fiber: 1, isVegetarian: false, isVegan: false, tags: ['fish', 'kerala', 'coconut'] },
  { id: 'in_nvg_011', name: 'Prawn Fry', category: 'seafood', servingSize: 100, servingUnit: 'g', calories: 220, protein: 22, carbs: 6, fat: 12, fiber: 0, isVegetarian: false, isVegan: false, tags: ['prawn', 'fry', 'coastal'] },
  { id: 'in_nvg_012', name: 'Egg Curry (Andhra Style)', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 280, protein: 18, carbs: 12, fat: 18, fiber: 2, isVegetarian: false, isVegan: false, tags: ['egg', 'andhra', 'spicy'] },
  { id: 'in_nvg_013', name: 'Mutton Curry (South Indian)', category: 'curry', servingSize: 200, servingUnit: 'g', calories: 320, protein: 28, carbs: 10, fat: 20, fiber: 2, isVegetarian: false, isVegan: false, tags: ['mutton', 'south indian', 'spicy'] },
  { id: 'in_nvg_014', name: 'Crab Curry', category: 'seafood', servingSize: 200, servingUnit: 'g', calories: 200, protein: 24, carbs: 8, fat: 10, fiber: 1, isVegetarian: false, isVegan: false, tags: ['crab', 'coastal', 'mangalore'] },
  { id: 'in_nvg_015', name: 'Chicken Chettinad', category: 'non_veg', servingSize: 200, servingUnit: 'g', calories: 320, protein: 28, carbs: 14, fat: 20, fiber: 2, isVegetarian: false, isVegan: false, tags: ['chettinad', 'chicken', 'tamil'] },
];

// ---------- ALL INDIAN: MORE FRUITS & DRY FRUITS ----------
const moreFruitsDryFruits: FoodItem[] = [
  { id: 'in_fru_015', name: 'Lychee', category: 'fruit', servingSize: 100, servingUnit: 'g', calories: 66, protein: 0.8, carbs: 16, fat: 0, fiber: 1, isVegetarian: true, isVegan: true, tags: ['lychee', 'litchi', 'summer'] },
  { id: 'in_fru_016', name: 'Jamun (Black Plum)', category: 'fruit', servingSize: 100, servingUnit: 'g', calories: 60, protein: 0.7, carbs: 14, fat: 0.2, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['jamun', 'black plum', 'diabetic'] },
  { id: 'in_fru_017', name: 'Ber (Indian Jujube)', category: 'fruit', servingSize: 100, servingUnit: 'g', calories: 79, protein: 1.2, carbs: 20, fat: 0.1, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['ber', 'jujube', 'winter'] },
  { id: 'in_fru_018', name: 'Tender Coconut (Malai)', category: 'fruit', servingSize: 100, servingUnit: 'g', calories: 35, protein: 0, carbs: 6, fat: 3, fiber: 0, isVegetarian: true, isVegan: true, tags: ['tender coconut', 'malai', 'soft'] },
  { id: 'in_fru_019', name: 'Pineapple (Ananas)', category: 'fruit', servingSize: 100, servingUnit: 'g', calories: 50, protein: 0.5, carbs: 13, fat: 0, fiber: 1.5, isVegetarian: true, isVegan: true, tags: ['pineapple', 'ananas', 'vitamin c'] },
  { id: 'in_fru_020', name: 'Watermelon (1 slice)', category: 'fruit', servingSize: 200, servingUnit: 'g', calories: 60, protein: 1, carbs: 15, fat: 0, fiber: 1, isVegetarian: true, isVegan: true, tags: ['watermelon', 'tarbooz', 'summer'] },
  { id: 'in_fru_021', name: 'Cherry Plum', category: 'fruit', servingSize: 1, servingUnit: 'piece', calories: 16, protein: 0.4, carbs: 4, fat: 0, fiber: 0.3, isVegetarian: true, isVegan: true, tags: ['cherry plum', 'verry cherry plum', 'fresh fruit', 'low calorie'] },
  { id: 'in_fru_022', name: 'Strawberry', category: 'fruit', servingSize: 1, servingUnit: 'piece', calories: 4, protein: 0.1, carbs: 1, fat: 0, fiber: 0.3, isVegetarian: true, isVegan: true, tags: ['strawberry', 'berry', 'vitamin c', 'low calorie'] },
  { id: 'in_dry_015', name: 'Apricot (Khumani)', category: 'dry_fruit', servingSize: 30, servingUnit: 'g', calories: 70, protein: 1, carbs: 16, fat: 0, fiber: 2, isVegetarian: true, isVegan: true, tags: ['apricot', 'khumani', 'iron'] },
  { id: 'in_dry_016', name: 'Figs (Anjeer)', category: 'dry_fruit', servingSize: 30, servingUnit: 'g', calories: 75, protein: 1, carbs: 18, fat: 0, fiber: 2.5, isVegetarian: true, isVegan: true, tags: ['fig', 'anjeer', 'fiber'] },
  { id: 'in_dry_017', name: 'Prunes', category: 'dry_fruit', servingSize: 30, servingUnit: 'g', calories: 70, protein: 0.5, carbs: 18, fat: 0, fiber: 2, isVegetarian: true, isVegan: true, tags: ['prunes', 'digestion'] },
  { id: 'in_dry_018', name: 'Melon Seeds (Magaj)', category: 'dry_fruit', servingSize: 30, servingUnit: 'g', calories: 165, protein: 8, carbs: 4, fat: 14, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['magaj', 'melon seeds', 'snack'] },
  { id: 'in_dry_019', name: 'Sunflower Seeds', category: 'dry_fruit', servingSize: 30, servingUnit: 'g', calories: 175, protein: 6, carbs: 6, fat: 15, fiber: 2, isVegetarian: true, isVegan: true, tags: ['sunflower', 'seeds', 'vitamin e'] },
];

// ---------- ALL INDIAN: SALADS ----------
const indianSalads: FoodItem[] = [
  { id: 'in_sal_001', name: 'Kachumber', category: 'salad', servingSize: 100, servingUnit: 'g', calories: 25, protein: 1, carbs: 5, fat: 0, fiber: 1, isVegetarian: true, isVegan: true, tags: ['kachumber', 'cucumber', 'onion', 'tomato'] },
  { id: 'in_sal_002', name: 'Kosambari', category: 'salad', servingSize: 100, servingUnit: 'g', calories: 120, protein: 5, carbs: 16, fat: 4, fiber: 3, isVegetarian: true, isVegan: true, tags: ['kosambari', 'karnataka', 'lentil'] },
  { id: 'in_sal_003', name: 'Fruit Chaat', category: 'salad', servingSize: 150, servingUnit: 'g', calories: 120, protein: 2, carbs: 28, fat: 1, fiber: 3, isVegetarian: true, isVegan: true, tags: ['fruit chaat', 'mixed fruit', 'chaat'] },
  { id: 'in_sal_004', name: 'Green Salad (Indian)', category: 'salad', servingSize: 120, servingUnit: 'g', calories: 35, protein: 2, carbs: 6, fat: 0.5, fiber: 2, isVegetarian: true, isVegan: true, tags: ['green salad', 'cucumber', 'carrot'] },
  { id: 'in_sal_005', name: 'Sprout Salad', category: 'salad', servingSize: 120, servingUnit: 'g', calories: 140, protein: 10, carbs: 20, fat: 3, fiber: 5, isVegetarian: true, isVegan: true, tags: ['sprouts', 'protein', 'healthy'] },
];

// ---------- PROTEIN SHAKES & SUPPLEMENTS ----------
// Per 1 scoop: 24g protein from powder (ON Gold Standard) + milk (~65% of liquid, rest water). Scale by scoops.
const proteinShakes: FoodItem[] = [
  { id: 'pro_001', name: 'Optimum Nutrition Protein Shake (Vanilla Ice Cream)', category: 'beverage', servingSize: 1, servingUnit: 'scoop', calories: 185, protein: 27, carbs: 8, fat: 5, fiber: 0, isVegetarian: true, isVegan: false, tags: ['optimum', 'protein shake', 'vanilla ice cream', 'whey', 'scoop', '24g protein per scoop', 'milk'] },
];

// ---------- DAIRY (Homemade from Amul Gold 6% milk) ----------
const dairy: FoodItem[] = [
  { id: 'dry_100', name: 'Curd / Dahi (Full-Fat, 100g)', category: 'other', servingSize: 100, servingUnit: 'g', calories: 100, protein: 3.5, carbs: 4.5, fat: 6, fiber: 0, isVegetarian: true, isVegan: false, tags: ['curd', 'dahi', 'yogurt', 'dairy', 'homemade', 'amul gold', '6% milk', 'probiotic', 'calcium'] },
  { id: 'dry_101', name: 'Curd / Dahi (Full-Fat, 1 cup ~245g)', category: 'other', servingSize: 245, servingUnit: 'g', calories: 245, protein: 9, carbs: 11, fat: 15, fiber: 0, isVegetarian: true, isVegan: false, tags: ['curd', 'dahi', 'yogurt', 'dairy', 'homemade', 'amul gold', '6% milk', 'probiotic', 'calcium', '1 cup'] },
  { id: 'dry_102', name: 'Curd / Dahi (Full-Fat, 200g)', category: 'other', servingSize: 200, servingUnit: 'g', calories: 200, protein: 7, carbs: 9, fat: 12, fiber: 0, isVegetarian: true, isVegan: false, tags: ['curd', 'dahi', 'yogurt', 'dairy', 'homemade', 'amul gold', '6% milk', 'probiotic', 'calcium'] },
  { id: 'dry_103', name: 'Curd / Dahi (Full-Fat, 150g)', category: 'other', servingSize: 150, servingUnit: 'g', calories: 150, protein: 5, carbs: 7, fat: 9, fiber: 0, isVegetarian: true, isVegan: false, tags: ['curd', 'dahi', 'yogurt', 'dairy', 'homemade', 'amul gold', '6% milk', 'probiotic', 'calcium'] },
];

// ---------- AMERICAN (USDA-style per serving) ----------
const american: FoodItem[] = [
  { id: 'usa_001', name: 'Cheeseburger (1 piece)', category: 'other', servingSize: 180, servingUnit: 'g', calories: 354, protein: 20, carbs: 32, fat: 17, fiber: 1, isVegetarian: false, isVegan: false, tags: ['american', 'burger', 'fast food'] },
  { id: 'usa_002', name: 'Pizza Slice (1/8 medium)', category: 'other', servingSize: 107, servingUnit: 'g', calories: 285, protein: 12, carbs: 36, fat: 10, fiber: 2, isVegetarian: true, isVegan: false, tags: ['american', 'pizza', 'italian-american'] },
  { id: 'usa_003', name: 'Grilled Cheese Sandwich', category: 'other', servingSize: 120, servingUnit: 'g', calories: 380, protein: 14, carbs: 28, fat: 24, fiber: 1, isVegetarian: true, isVegan: false, tags: ['american', 'sandwich', 'cheese'] },
  { id: 'usa_004', name: 'Mac and Cheese (1 cup)', category: 'other', servingSize: 200, servingUnit: 'g', calories: 310, protein: 11, carbs: 38, fat: 14, fiber: 2, isVegetarian: true, isVegan: false, tags: ['american', 'pasta', 'cheese'] },
  { id: 'usa_005', name: 'Hot Dog (1 piece)', category: 'other', servingSize: 100, servingUnit: 'g', calories: 290, protein: 10, carbs: 18, fat: 22, fiber: 0.5, isVegetarian: false, isVegan: false, tags: ['american', 'hot dog', 'sausage'] },
  { id: 'usa_006', name: 'French Fries (medium)', category: 'snack', servingSize: 117, servingUnit: 'g', calories: 365, protein: 4, carbs: 48, fat: 17, fiber: 4, isVegetarian: true, isVegan: true, tags: ['american', 'fries', 'potato'] },
  { id: 'usa_007', name: 'Chicken Sandwich (grilled)', category: 'other', servingSize: 200, servingUnit: 'g', calories: 380, protein: 28, carbs: 32, fat: 16, fiber: 1, isVegetarian: false, isVegan: false, tags: ['american', 'chicken', 'sandwich'] },
  { id: 'usa_008', name: 'Pancakes (2 medium)', category: 'breakfast', servingSize: 120, servingUnit: 'g', calories: 320, protein: 10, carbs: 52, fat: 8, fiber: 1, isVegetarian: true, isVegan: false, tags: ['american', 'breakfast', 'pancake'] },
  { id: 'usa_009', name: 'Scrambled Eggs (2 eggs)', category: 'breakfast', servingSize: 120, servingUnit: 'g', calories: 200, protein: 14, carbs: 2, fat: 15, fiber: 0, isVegetarian: false, isVegan: false, tags: ['american', 'egg', 'breakfast'] },
  { id: 'usa_010', name: 'Bacon (3 strips)', category: 'other', servingSize: 35, servingUnit: 'g', calories: 161, protein: 12, carbs: 0.5, fat: 12, fiber: 0, isVegetarian: false, isVegan: false, tags: ['american', 'bacon', 'breakfast'] },
  { id: 'usa_011', name: 'Caesar Salad (1 bowl)', category: 'salad', servingSize: 250, servingUnit: 'g', calories: 360, protein: 12, carbs: 18, fat: 28, fiber: 3, isVegetarian: false, isVegan: false, tags: ['american', 'salad', 'caesar'] },
  { id: 'usa_012', name: 'Cola (1 can 330ml)', category: 'beverage', servingSize: 330, servingUnit: 'ml', calories: 139, protein: 0, carbs: 35, fat: 0, fiber: 0, isVegetarian: true, isVegan: true, tags: ['american', 'soda', 'cola'] },
  { id: 'usa_013', name: 'Orange Juice (1 cup)', category: 'beverage', servingSize: 248, servingUnit: 'ml', calories: 112, protein: 2, carbs: 26, fat: 0.5, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['american', 'juice', 'vitamin c'] },
  { id: 'usa_014', name: 'Milk (1 cup whole)', category: 'beverage', servingSize: 244, servingUnit: 'ml', calories: 149, protein: 8, carbs: 12, fat: 8, fiber: 0, isVegetarian: true, isVegan: false, tags: ['american', 'milk', 'dairy', 'calcium'] },
  { id: 'usa_015', name: 'Peanut Butter (2 tbsp)', category: 'other', servingSize: 32, servingUnit: 'g', calories: 188, protein: 8, carbs: 7, fat: 16, fiber: 2, isVegetarian: true, isVegan: true, tags: ['american', 'peanut butter', 'protein'] },
  { id: 'usa_016', name: 'Oatmeal (1 cup cooked)', category: 'breakfast', servingSize: 234, servingUnit: 'g', calories: 158, protein: 6, carbs: 28, fat: 3, fiber: 4, isVegetarian: true, isVegan: true, tags: ['american', 'oatmeal', 'breakfast', 'fiber'] },
  { id: 'usa_017', name: 'Bagel (plain, 1 piece)', category: 'bread', servingSize: 100, servingUnit: 'g', calories: 257, protein: 10, carbs: 50, fat: 2, fiber: 2, isVegetarian: true, isVegan: true, tags: ['american', 'bagel', 'bread'] },
  { id: 'usa_022', name: 'Kirkland Everything Bagel (1 piece)', category: 'bread', servingSize: 1, servingUnit: 'piece', calories: 310, protein: 12, carbs: 61, fat: 2.5, fiber: 2, isVegetarian: true, isVegan: true, tags: ['american', 'bagel', 'bread', 'kirkland', 'costco', 'everything bagel'] },
  { id: 'usa_018', name: 'Muffin (blueberry, 1 piece)', category: 'snack', servingSize: 65, servingUnit: 'g', calories: 240, protein: 4, carbs: 38, fat: 9, fiber: 1, isVegetarian: true, isVegan: false, tags: ['american', 'muffin', 'bakery'] },
  { id: 'usa_019', name: 'Donut (glazed, 1 piece)', category: 'sweet', servingSize: 50, servingUnit: 'g', calories: 226, protein: 3, carbs: 28, fat: 11, fiber: 0.5, isVegetarian: true, isVegan: false, tags: ['american', 'donut', 'sweet'] },
  { id: 'usa_020', name: 'Apple Pie (1 slice)', category: 'sweet', servingSize: 120, servingUnit: 'g', calories: 296, protein: 2, carbs: 45, fat: 14, fiber: 2, isVegetarian: true, isVegan: false, tags: ['american', 'pie', 'dessert'] },
  { id: 'usa_021', name: 'Croissant (butter, 1 piece)', category: 'bread', servingSize: 1, servingUnit: 'piece', calories: 300, protein: 6, carbs: 30, fat: 17, fiber: 1, isVegetarian: true, isVegan: false, tags: ['american', 'croissant', 'bakery', 'breakfast'] },
];

// ---------- MEXICAN (per standard serving) ----------
const mexican: FoodItem[] = [
  { id: 'mex_001', name: 'Beef Tacos (2 tacos)', category: 'other', servingSize: 140, servingUnit: 'g', calories: 340, protein: 18, carbs: 28, fat: 18, fiber: 3, isVegetarian: false, isVegan: false, tags: ['mexican', 'tacos', 'beef'] },
  { id: 'mex_002', name: 'Chicken Tacos (2 tacos)', category: 'other', servingSize: 140, servingUnit: 'g', calories: 300, protein: 20, carbs: 26, fat: 14, fiber: 3, isVegetarian: false, isVegan: false, tags: ['mexican', 'tacos', 'chicken'] },
  { id: 'mex_003', name: 'Vegetarian Tacos (2 tacos)', category: 'other', servingSize: 130, servingUnit: 'g', calories: 260, protein: 8, carbs: 34, fat: 12, fiber: 5, isVegetarian: true, isVegan: true, tags: ['mexican', 'tacos', 'veg'] },
  { id: 'mex_004', name: 'Beef Burrito (1 piece)', category: 'other', servingSize: 300, servingUnit: 'g', calories: 550, protein: 26, carbs: 58, fat: 24, fiber: 6, isVegetarian: false, isVegan: false, tags: ['mexican', 'burrito', 'beef'] },
  { id: 'mex_005', name: 'Bean Burrito (1 piece)', category: 'other', servingSize: 280, servingUnit: 'g', calories: 380, protein: 14, carbs: 56, fat: 12, fiber: 10, isVegetarian: true, isVegan: true, tags: ['mexican', 'burrito', 'beans'] },
  { id: 'mex_006', name: 'Nachos with Cheese (1 serving)', category: 'snack', servingSize: 150, servingUnit: 'g', calories: 346, protein: 10, carbs: 32, fat: 22, fiber: 3, isVegetarian: true, isVegan: false, tags: ['mexican', 'nachos', 'cheese'] },
  { id: 'mex_007', name: 'Quesadilla (1 piece)', category: 'other', servingSize: 180, servingUnit: 'g', calories: 420, protein: 18, carbs: 34, fat: 26, fiber: 2, isVegetarian: true, isVegan: false, tags: ['mexican', 'quesadilla', 'cheese'] },
  { id: 'mex_008', name: 'Guacamole (4 tbsp)', category: 'other', servingSize: 60, servingUnit: 'g', calories: 110, protein: 1.5, carbs: 6, fat: 10, fiber: 4, isVegetarian: true, isVegan: true, tags: ['mexican', 'avocado', 'dip'] },
  { id: 'mex_016', name: 'Kirkland Signature Chunky Guacamole (1 cup)', category: 'other', servingSize: 1, servingUnit: 'cup', calories: 100, protein: 1, carbs: 6, fat: 8, fiber: 4, isVegetarian: true, isVegan: true, tags: ['mexican', 'avocado', 'dip', 'kirkland', 'costco', 'snack pack', 'organic', 'cup', '71g'] },
  { id: 'mex_009', name: 'Salsa (4 tbsp)', category: 'other', servingSize: 64, servingUnit: 'g', calories: 18, protein: 1, carbs: 4, fat: 0, fiber: 1, isVegetarian: true, isVegan: true, tags: ['mexican', 'salsa', 'tomato'] },
  { id: 'mex_010', name: 'Chicken Enchilada (1 piece)', category: 'other', servingSize: 200, servingUnit: 'g', calories: 320, protein: 20, carbs: 28, fat: 16, fiber: 2, isVegetarian: false, isVegan: false, tags: ['mexican', 'enchilada', 'chicken'] },
  { id: 'mex_011', name: 'Rice and Beans (1 cup)', category: 'rice', servingSize: 200, servingUnit: 'g', calories: 260, protein: 10, carbs: 44, fat: 4, fiber: 6, isVegetarian: true, isVegan: true, tags: ['mexican', 'rice', 'beans'] },
  { id: 'mex_012', name: 'Churros (2 pieces)', category: 'sweet', servingSize: 80, servingUnit: 'g', calories: 260, protein: 3, carbs: 36, fat: 12, fiber: 1, isVegetarian: true, isVegan: false, tags: ['mexican', 'churros', 'dessert'] },
  { id: 'mex_013', name: 'Horchata (1 glass)', category: 'beverage', servingSize: 240, servingUnit: 'ml', calories: 180, protein: 3, carbs: 32, fat: 4, fiber: 0, isVegetarian: true, isVegan: true, tags: ['mexican', 'horchata', 'rice milk'] },
  { id: 'mex_014', name: 'Tortilla Chips (1 oz)', category: 'snack', servingSize: 28, servingUnit: 'g', calories: 140, protein: 2, carbs: 18, fat: 7, fiber: 1, isVegetarian: true, isVegan: true, tags: ['mexican', 'chips', 'corn'] },
  { id: 'mex_015', name: 'Tamale (1 piece)', category: 'other', servingSize: 150, servingUnit: 'g', calories: 220, protein: 8, carbs: 28, fat: 9, fiber: 3, isVegetarian: true, isVegan: false, tags: ['mexican', 'tamale', 'corn'] },
];

// ---------- JAPANESE (per standard serving) ----------
const japanese: FoodItem[] = [
  { id: 'jpn_001', name: 'Salmon Sushi Roll (8 pieces)', category: 'other', servingSize: 200, servingUnit: 'g', calories: 350, protein: 16, carbs: 42, fat: 12, fiber: 1, isVegetarian: false, isVegan: false, tags: ['japanese', 'sushi', 'salmon'] },
  { id: 'jpn_002', name: 'Vegetable Sushi Roll (8 pieces)', category: 'other', servingSize: 180, servingUnit: 'g', calories: 280, protein: 6, carbs: 52, fat: 4, fiber: 2, isVegetarian: true, isVegan: true, tags: ['japanese', 'sushi', 'veg'] },
  { id: 'jpn_003', name: 'Ramen (1 bowl)', category: 'other', servingSize: 450, servingUnit: 'g', calories: 450, protein: 18, carbs: 58, fat: 18, fiber: 2, isVegetarian: false, isVegan: false, tags: ['japanese', 'ramen', 'noodles'] },
  { id: 'jpn_004', name: 'Miso Soup (1 bowl)', category: 'other', servingSize: 200, servingUnit: 'ml', calories: 40, protein: 3, carbs: 5, fat: 1.5, fiber: 1, isVegetarian: true, isVegan: true, tags: ['japanese', 'miso', 'soup'] },
  { id: 'jpn_005', name: 'Tempura (6 pieces)', category: 'other', servingSize: 120, servingUnit: 'g', calories: 320, protein: 8, carbs: 28, fat: 20, fiber: 1, isVegetarian: true, isVegan: true, tags: ['japanese', 'tempura', 'fried'] },
  { id: 'jpn_006', name: 'Edamame (1 cup)', category: 'snack', servingSize: 100, servingUnit: 'g', calories: 122, protein: 11, carbs: 10, fat: 5, fiber: 5, isVegetarian: true, isVegan: true, tags: ['japanese', 'edamame', 'soybean', 'protein'] },
  { id: 'jpn_007', name: 'Teriyaki Chicken', category: 'other', servingSize: 200, servingUnit: 'g', calories: 310, protein: 28, carbs: 24, fat: 12, fiber: 0.5, isVegetarian: false, isVegan: false, tags: ['japanese', 'teriyaki', 'chicken'] },
  { id: 'jpn_008', name: 'Udon Noodles (1 bowl)', category: 'other', servingSize: 350, servingUnit: 'g', calories: 350, protein: 12, carbs: 62, fat: 6, fiber: 2, isVegetarian: true, isVegan: true, tags: ['japanese', 'udon', 'noodles'] },
  { id: 'jpn_009', name: 'Onigiri (1 piece)', category: 'snack', servingSize: 120, servingUnit: 'g', calories: 185, protein: 4, carbs: 38, fat: 2, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['japanese', 'onigiri', 'rice ball'] },
  { id: 'jpn_010', name: 'Tofu (100g)', category: 'other', servingSize: 100, servingUnit: 'g', calories: 76, protein: 8, carbs: 2, fat: 5, fiber: 0.5, isVegetarian: true, isVegan: true, tags: ['japanese', 'tofu', 'protein', 'soy'] },
  { id: 'jpn_011', name: 'Gyoza (5 pieces)', category: 'snack', servingSize: 125, servingUnit: 'g', calories: 250, protein: 10, carbs: 28, fat: 12, fiber: 1, isVegetarian: false, isVegan: false, tags: ['japanese', 'gyoza', 'dumpling'] },
  { id: 'jpn_012', name: 'Green Tea (1 cup)', category: 'beverage', servingSize: 240, servingUnit: 'ml', calories: 2, protein: 0, carbs: 0, fat: 0, fiber: 0, isVegetarian: true, isVegan: true, tags: ['japanese', 'green tea', 'tea'] },
  { id: 'jpn_013', name: 'Sashimi (salmon, 6 pcs)', category: 'seafood', servingSize: 90, servingUnit: 'g', calories: 140, protein: 18, carbs: 0, fat: 7, fiber: 0, isVegetarian: false, isVegan: false, tags: ['japanese', 'sashimi', 'raw fish'] },
  { id: 'jpn_014', name: 'Yakitori (2 skewers)', category: 'other', servingSize: 100, servingUnit: 'g', calories: 180, protein: 18, carbs: 8, fat: 8, fiber: 0, isVegetarian: false, isVegan: false, tags: ['japanese', 'yakitori', 'grilled chicken'] },
  { id: 'jpn_015', name: 'Matcha Latte (1 cup)', category: 'beverage', servingSize: 300, servingUnit: 'ml', calories: 120, protein: 4, carbs: 18, fat: 4, fiber: 0, isVegetarian: true, isVegan: false, tags: ['japanese', 'matcha', 'latte'] },
];

// ---------- SPANISH (per standard serving) ----------
const spanish: FoodItem[] = [
  { id: 'esp_001', name: 'Paella (1 serving)', category: 'rice', servingSize: 300, servingUnit: 'g', calories: 380, protein: 22, carbs: 42, fat: 14, fiber: 2, isVegetarian: false, isVegan: false, tags: ['spanish', 'paella', 'seafood', 'rice'] },
  { id: 'esp_002', name: 'Spanish Tortilla (1 slice)', category: 'other', servingSize: 120, servingUnit: 'g', calories: 220, protein: 10, carbs: 14, fat: 14, fiber: 1, isVegetarian: true, isVegan: false, tags: ['spanish', 'tortilla', 'potato', 'egg'] },
  { id: 'esp_003', name: 'Gazpacho (1 bowl)', category: 'other', servingSize: 250, servingUnit: 'ml', calories: 80, protein: 2, carbs: 14, fat: 2, fiber: 2, isVegetarian: true, isVegan: true, tags: ['spanish', 'gazpacho', 'cold soup'] },
  { id: 'esp_004', name: 'Churros (3 pieces)', category: 'sweet', servingSize: 90, servingUnit: 'g', calories: 280, protein: 4, carbs: 38, fat: 12, fiber: 1, isVegetarian: true, isVegan: false, tags: ['spanish', 'churros', 'dessert'] },
  { id: 'esp_005', name: 'Patatas Bravas (1 serving)', category: 'snack', servingSize: 200, servingUnit: 'g', calories: 320, protein: 4, carbs: 38, fat: 18, fiber: 3, isVegetarian: true, isVegan: true, tags: ['spanish', 'potato', 'tapas'] },
  { id: 'esp_006', name: 'Olives (10 pieces)', category: 'snack', servingSize: 30, servingUnit: 'g', calories: 45, protein: 0.5, carbs: 2, fat: 4, fiber: 1, isVegetarian: true, isVegan: true, tags: ['spanish', 'olives', 'tapas'] },
  { id: 'esp_007', name: 'Jamón Serrano (30g)', category: 'other', servingSize: 30, servingUnit: 'g', calories: 60, protein: 8, carbs: 0, fat: 3, fiber: 0, isVegetarian: false, isVegan: false, tags: ['spanish', 'ham', 'cured'] },
  { id: 'esp_008', name: 'Manchego Cheese (30g)', category: 'snack', servingSize: 30, servingUnit: 'g', calories: 110, protein: 7, carbs: 0.5, fat: 9, fiber: 0, isVegetarian: true, isVegan: false, tags: ['spanish', 'cheese', 'manchego'] },
  { id: 'esp_009', name: 'Spanish Rice (1 cup)', category: 'rice', servingSize: 200, servingUnit: 'g', calories: 240, protein: 4, carbs: 44, fat: 6, fiber: 1, isVegetarian: true, isVegan: true, tags: ['spanish', 'rice', 'tomato'] },
  { id: 'esp_010', name: 'Flan (1 serving)', category: 'sweet', servingSize: 120, servingUnit: 'g', calories: 220, protein: 6, carbs: 32, fat: 8, fiber: 0, isVegetarian: true, isVegan: false, tags: ['spanish', 'flan', 'custard', 'dessert'] },
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
  ...moreIndian,
  ...moreCurries,
  ...moreDals,
  ...moreBreads,
  ...moreRice,
  ...moreSweets,
  ...moreSnacksStreet,
  ...allIndianDrinks,
  ...moreChutneysRaita,
  ...moreBreakfast,
  ...moreNonVegSeafood,
  ...moreFruitsDryFruits,
  ...indianSalads,
  ...proteinShakes,
  ...dairy,
  ...american,
  ...mexican,
  ...japanese,
  ...spanish,
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
