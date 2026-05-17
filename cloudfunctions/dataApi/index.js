const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const COLLECTIONS = {
  MATERIALS: 'materials',
  RECIPES: 'recipes',
  HISTORY: 'history',
};

// 云函数入口
exports.main = async (event, context) => {
  const { action, collection, data, id, query, update } = event;

  try {
    switch (action) {
      // 获取列表
      case 'get':
        if (!collection) return { success: false, error: '缺少 collection 参数' };
        const { data: list } = await db.collection(collection).get();
        return { success: true, data: list };

      // 按ID获取
      case 'getById':
        if (!collection || !id) return { success: false, error: '缺少参数' };
        const doc = await db.collection(collection).doc(id).get();
        return { success: true, data: doc.data };

      // 添加
      case 'add':
        if (!collection || !data) return { success: false, error: '缺少参数' };
        const addRes = await db.collection(collection).add({ data });
        return { success: true, id: addRes._id };

      // 更新
      case 'update':
        if (!collection || !id || !update) return { success: false, error: '缺少参数' };
        await db.collection(collection).doc(id).update({ data: update });
        return { success: true };

      // 删除
      case 'delete':
        if (!collection || !id) return { success: false, error: '缺少参数' };
        await db.collection(collection).doc(id).remove();
        return { success: true };

      // 查询（支持排序和限制）
      case 'query':
        if (!collection) return { success: false, error: '缺少 collection' };
        let queryRef = db.collection(collection);
        if (query?.orderBy) {
          queryRef = queryRef.orderBy(query.orderBy.field, query.orderBy.order);
        }
        if (query?.limit) {
          queryRef = queryRef.limit(query.limit);
        }
        if (query?.where) {
          queryRef = queryRef.where(query.where);
        }
        const queryRes = await queryRef.get();
        return { success: true, data: queryRes.data };

      // 清空集合
      case 'clear':
        if (!collection) return { success: false, error: '缺少 collection' };
        const { data: allDocs } = await db.collection(collection).get();
        for (const item of allDocs) {
          await db.collection(collection).doc(item._id).remove();
        }
        return { success: true };

      default:
        return { success: false, error: '未知操作' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};
