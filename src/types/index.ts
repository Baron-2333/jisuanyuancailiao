// 原材料类型
export interface Material {
  id: string;
  name: string;
  unit: string; // 单位：如个、kg、吨
  isRawMaterial: boolean; // 是否作为原材料（开启后不拆解）
  createdAt: number;
}

// 配方中的原材料项
export interface RecipeIngredient {
  materialId: string;
  materialName: string;
  quantity: number; // 合成1次需要的数量
}

// 配方类型
export interface Recipe {
  id: string;
  name: string; // 目标材料名称
  pinyin: string; // 名称首字母（自动计算）
  outputQuantity: number; // 产出数量
  ingredients: RecipeIngredient[]; // 原材料
  createdAt: number;
  updatedAt: number;
}

// 计算拼音首字母（仅支持常见汉字，配方创建时自动计算）
export function getPinyin(name: string): string {
  const map: { [key: string]: string } = {
    // 单字
    '工': 'g', '作': 'z', '台': 't', '合': 'h', '成': 'c', '熔': 'r', '炉': 'l',
    '高': 'g', '压': 'y', '力': 'l', '箱': 'x', '烟': 'y', '熏': 'x', '切': 'q',
    '石': 's', '机': 'j', '浇': 'j', '筑': 'z', '砧': 'z', '锻': 'd', '造': 'z',
    '砂': 's', '轮': 'l', '织': 'z', '布': 'b', '酿': 'n', '附': 'f', '魔': 'm',
    '书': 's', '架': 'j', '讲': 'j', '唱': 'c', '片': 'p', '发': 'f', '射': 's',
    '器': 'q', '投': 't', '掷': 'z', '活': 'h', '塞': 's', '漏': 'l', '斗': 'd',
    '命': 'm', '令': 'l', '花': 'h', '盆': 'p', '陶': 't', '壶': 'h', '锅': 'g',
    '碗': 'w', '运': 'y', '矿': 'k', '车': 'c', '测': 'c', '步': 'b', '卫': 'w',
    '星': 'x', '罗': 'l', '盘': 'p', '胡': 'h', '萝': 'l', '卜': 'b', '南': 'n',
    '瓜': 'g', '甜': 't', '菜': 'c', '紫': 'z', '颂': 's', '丛': 'c', '草': 'c',
    '昆': 'k', '虫': 'c', '滴': 'd', '蜜': 'm', '西': 'x', '泡': 'p', '芙': 'f',
    '蓉': 'r', '可': 'k', '棕': 'z', '榈': 'l', '竹': 'z', '子': 'z', '阳': 'y',
    '面': 'm', '下': 'x', '界': 'j', '地': 'd', '狱': 'y', '幽': 'y', '灵': 'l',
    '魂': 'h', '末': 'm', '影': 'y', '潜': 'q', '壳': 'k', '钻': 'z',
    '铁': 't', '金': 'j', '铜': 't', '甲': 'j', '铠': 'k', '护': 'h', '腿': 't',
    '靴': 'x', '剑': 'j', '弓': 'g', '弩': 'n', '钓': 'd', '竿': 'g', '鱼': 'y',
    '桶': 't', '剪': 'j', '羽': 'y', '毛': 'm', '绳': 's', '皮': 'p', '革': 'g',
    '肠': 'c', '纸': 'z', '指': 'z', '图': 't', '原': 'y', '木': 'm',
    '头': 't', '棍': 'g', '板': 'b', '锹': 'q', '锄': 'c', '镐': 'g', '斧': 'f',
    '铲': 'c', '帽': 'm', '绿': 'l', '宝': 'b', '珍': 'z', '珠': 'z', '琥': 'h',
    '珀': 'p', '红': 'h', '青': 'q', '蓝': 'l', '桦': 'h',
    '深': 's', '色': 's', '橡': 'x', '云': 'y', '杉': 's',
    '海': 'h', '磷': 'l', '骷髅': 'kl', '头颅': 'tl', '凋': 'd', '萧': 'x',
    '龙头': 'lt', '猪': 'z', '牛': 'n', '羊': 'y', '鸡': 'j', '兔': 't',
    '狼': 'l', '豹': 'b', '猫': 'm', '鹦': 'y', '羊驼': 'yt', '村民': 'cm',
    '流浪': 'll', '铁傀儡': 'tkg', '雪傀儡': 'xkg',
    // MC物品补充
    '栅': 'z', '栏': 'l', '木': 'm', '橡': 'x', '白': 'b', '杨': 'y', '杉': 's',
    '云杉': 'ys', '深色': 'ss', '丛林': 'cl', '金': 'j', '苹果': 'pg',
    '青苹果': 'qpg', '金苹果': 'jpg', '玫瑰': 'mg', '黑': 'h', '百合': 'bh',
    '向日葵': 'xrk', '甘蔗': 'gz', '西瓜': 'xg', '仙人掌': 'xrz', '藤': 't',
    '枯': 'k', '萎': 'w', '栓': 's', '活塞': 'hs', '投掷': 'tz', '陷阱': 'xj',
    '比较': 'bj', '中继': 'zj', '红石': 'hs', '充能': 'cn', '激活': 'jh',
    '探测': 'tc', '绊线': 'bx', '压力': 'yl', '按钮': 'an', '拉杆': 'lg',
    '铁轨': 'tg', '充能铁轨': 'cntg', '探测铁轨': 'tctg', '激活铁轨': 'jhtg',
    '铁门': 'tm', '活板门': 'hbm', '围栏': 'wl', '楼梯': 'lt', '梯子': 'tz',
    '鞍': 'a', '马': 'm', '命名': 'mm', '唱片': 'cp', '唱片机': 'cpj',
    '下界': 'xj', '末地': 'md', '末影': 'my', '龙': 'l', '凋零': 'dl',
    '命令': 'ml', '结构': 'jg', '屏障': 'pz', 'Builders': 'b', '光': 'g',
    '荧': 'y', '岩浆': 'yj', '黑曜石': 'hys', '哭泣': 'kz', '石英': 'sy',
    '花': 'h', '甘': 'g', '蔗': 'z', '西': 'x', '甜菜': 'tc',
  };
  
  let result = '';
  for (const char of name) {
    if (map[char]) {
      result += map[char];
    }
  }
  return result || name.toLowerCase();
}

// 计算历史记录
export interface CalculationHistory {
  id: string;
  timestamp: number;
  summary: string;
  targets: { recipeName: string; quantity: number }[];
  results: MaterialRequirement[];
}

// 计算结果
export interface MaterialRequirement {
  materialId: string;
  materialName: string;
  totalQuantity: number;
  unit: string;
}

// 目标配置
export interface TargetConfig {
  recipeId: string;
  quantity: number;
}

// 用途详情
export interface UsageDetail {
  forItem: string;      // 最终产物名称
  forQty: number;       // 最终产物数量
  qty: number;          // 需要多少原材料
  craftCount: number;   // 合成次数
  intermediate: string; // 中间产物名称
  intermediateQty: number; // 中间产物数量
}

// 展开后的需求（带合成次数）
export interface ExpandedRequirement extends MaterialRequirement {
  craftCount: number; // 需要合成的次数
  fromTargets: string[]; // 来源：哪些目标物品需要它
  usageDetails: UsageDetail[]; // 详细用途
}
