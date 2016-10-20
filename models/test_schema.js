/**
 * Created by yangw on 2016/10/19.
 * 测评题目的数据库模式
 */

/*
* 注:
* collection -- 存入的表名
* testType -- 评测类型,例如人格测试,性格测试, 情感测试, 交际测试等等
* testGroup -- 存储一组题目的所有题目,每个题目包含题目描述itemTitle,题号itemNumber,和选项数据itemChoise,选项数据包含选号和选项两个字段
* itemTitle -- 本道题的标题, itemNumber --本道题的编号, itemChoise -- 本道题所包含的选项, 隶属于Common模式的每道题可以单独定制信息
* choiseTag -- 选项标志,比如ABC, choiseContent -- 各个选项的内容, 比如A:符合,B:一般,C:不符合
* scoreMode -- 该组题目的得分模式
* abstract -- 该组题目的简要描述
* testTitle -- 该组题目的总标题
* frequency -- 该组题目的点击量
* scoreSection -- 该组题目的得分结果分段
* scoreHead -- 该分段起始处, scoreTail -- 该分段结束处, result -- 该分段的评测结果
* date -- 创建题目的日期
* scoreValue -- 单次得分的分值,用于最后累加计算得分, 必须为绝对值
*/

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var testSchema = new Schema({
    testType: {type: String, required: true, unique: true},
    date: String,
    testGroup: [{
        itemTitle: String,
        itemNumber: Number,
        itemMode: String,
        itemChoise: [{choiseTag: String, choiseContent: String}]
    }],
    scoreMode: String,
    scoreValue: Number,
    abstract: String,
    testTitle: String,
    frequency: Number,
    scoreSection: [{
        scoreHead: Number,
        scoreTail: Number,
        result: String,
    }]
}, {collection: 'tests'});

exports.testSchema = testSchema;